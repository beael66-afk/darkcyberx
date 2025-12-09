import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller's token and check admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.log("Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "رمز غير صالح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !adminRole) {
      console.log("User is not an admin:", user.id);
      return new Response(
        JSON.stringify({ error: "يجب أن تكون مسؤولاً لتنفيذ هذا الإجراء" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, customerName } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "البريد الإلكتروني مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.id} resetting password for customer: ${email}`);

    // Generate a new temporary password
    const generatePassword = () => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
      let password = "";
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const newPassword = generatePassword();

    // Find the user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      throw new Error("فشل البحث عن المستخدم");
    }

    const customerUser = users.users.find((u) => u.email === email);
    
    if (!customerUser) {
      return new Response(
        JSON.stringify({ error: "لم يتم العثور على حساب بهذا البريد الإلكتروني" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      customerUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("فشل تحديث كلمة المرور");
    }

    // Send email with new credentials using Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "خدمة البريد الإلكتروني غير مكونة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "License Manager <onboarding@resend.dev>",
        to: [email],
        subject: "كلمة مرور جديدة لحسابك",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">كلمة مرور جديدة</h2>
            <p>مرحباً <strong>${customerName}</strong>،</p>
            <p>تم إعادة تعيين كلمة المرور الخاصة بحسابك. يمكنك الآن تسجيل الدخول باستخدام البيانات التالية:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>البريد الإلكتروني:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>كلمة المرور الجديدة:</strong> <code style="background-color: #e9ecef; padding: 2px 8px; border-radius: 4px;">${newPassword}</code></p>
            </div>
            <p style="color: #dc3545;"><strong>⚠️ تنبيه:</strong> يُنصح بشدة بتغيير كلمة المرور بعد تسجيل الدخول الأول.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">هذه الرسالة تم إرسالها تلقائياً، يرجى عدم الرد عليها.</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Error sending email:", errorText);
      // Password was updated but email failed - still return success with warning
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: "تم تحديث كلمة المرور ولكن فشل إرسال البريد الإلكتروني",
          newPassword: newPassword // Return password so admin can share it manually
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Password reset successful for: ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "تم إرسال كلمة المرور الجديدة بنجاح" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
    console.error("Error in reset-customer-password:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
