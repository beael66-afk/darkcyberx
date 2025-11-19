import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAccountRequest {
  customerId: string;
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { customerId, email, name }: CreateAccountRequest = await req.json();

    // Generate temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

    // Create user account
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    // Link customer to user
    const { error: updateError } = await supabaseAdmin
      .from("customers")
      .update({ 
        user_id: user.user.id,
        account_created: true 
      })
      .eq("id", customerId);

    if (updateError) {
      throw new Error(`Failed to link customer: ${updateError.message}`);
    }

    // Assign customer role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ 
        user_id: user.user.id,
        role: "customer" 
      });

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    // Send email with credentials if Resend is configured
    if (resendApiKey) {
      const emailHtml = `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">مرحباً ${name}!</h1>
            <p style="font-size: 16px; color: #555;">تم إنشاء حسابك في بوابة العملاء بنجاح.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #333; margin-top: 0;">بيانات الدخول الخاصة بك:</h2>
              <p style="margin: 10px 0;"><strong>البريد الإلكتروني:</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong>كلمة المرور المؤقتة:</strong> <code style="background-color: #fff; padding: 5px 10px; border-radius: 4px;">${tempPassword}</code></p>
            </div>

            <p style="color: #d9534f; font-weight: bold;">⚠️ مهم: يرجى تغيير كلمة المرور عند أول تسجيل دخول.</p>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              إذا لم تطلب هذا الحساب، يرجى تجاهل هذه الرسالة.
            </p>
          </div>
        </div>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "نظام التراخيص <onboarding@resend.dev>",
          to: [email],
          subject: "تم إنشاء حسابك - بيانات الدخول",
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        console.error("Failed to send email:", await resendResponse.text());
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tempPassword,
        message: resendApiKey ? "تم إرسال بيانات الدخول للعميل" : "تم إنشاء الحساب بنجاح"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
