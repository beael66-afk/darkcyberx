import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the calling user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { requestId, action, adminNote } = await req.json();

    if (!requestId || !action) {
      return new Response(JSON.stringify({ error: "Missing requestId or action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the renewal request
    const { data: request, error: fetchError } = await supabase
      .from("renewal_requests")
      .select("*, licenses(id, license_key, expire_at, status, products(name)), customers(name)")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError || !request) {
      return new Response(JSON.stringify({ error: "Request not found or already processed" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm") {
      // Calculate new expiry date
      const currentExpiry = request.licenses?.expire_at ? new Date(request.licenses.expire_at) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      baseDate.setDate(baseDate.getDate() + request.days);

      // Update license
      const { error: licenseError } = await supabase
        .from("licenses")
        .update({
          status: "active",
          expire_at: baseDate.toISOString(),
        })
        .eq("id", request.license_id);

      if (licenseError) {
        console.error("License update error:", licenseError);
        return new Response(JSON.stringify({ error: "Failed to update license" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update request status
      await supabase
        .from("renewal_requests")
        .update({ status: "confirmed", admin_note: adminNote || null })
        .eq("id", requestId);

      // Notify customer via Telegram
      const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (telegramToken && request.telegram_chat_id) {
        const msg =
          "━━━━━━━━━━━━━━━━━━━━━\n" +
          "✅ *تم تأكيد تجديد ترخيصك!*\n" +
          "━━━━━━━━━━━━━━━━━━━━━\n\n" +
          `🔑 المنتج: *${request.licenses?.products?.name || "منتج"}*\n` +
          `📅 تم إضافة: *${request.days} يوم*\n` +
          `📅 تاريخ الانتهاء الجديد: *${baseDate.toLocaleDateString("ar-EG")}*\n` +
          `📊 الحالة: نشط 🟢\n\n` +
          "شكراً لك! 🙏\n" +
          "━━━━━━━━━━━━━━━━━━━━━";

        await fetch(`${TELEGRAM_API}${telegramToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: request.telegram_chat_id, text: msg, parse_mode: "Markdown" }),
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `تم تأكيد التجديد - ${request.days} يوم`,
        newExpiry: baseDate.toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "reject") {
      await supabase
        .from("renewal_requests")
        .update({ status: "rejected", admin_note: adminNote || null })
        .eq("id", requestId);

      // Notify customer
      const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (telegramToken && request.telegram_chat_id) {
        const msg =
          "━━━━━━━━━━━━━━━━━━━━━\n" +
          "❌ *تم رفض طلب التجديد*\n" +
          "━━━━━━━━━━━━━━━━━━━━━\n\n" +
          `🔑 المنتج: *${request.licenses?.products?.name || "منتج"}*\n` +
          (adminNote ? `📝 السبب: ${adminNote}\n\n` : "\n") +
          "يرجى التواصل مع الإدارة للمزيد من المعلومات.\n" +
          "━━━━━━━━━━━━━━━━━━━━━";

        await fetch(`${TELEGRAM_API}${telegramToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: request.telegram_chat_id, text: msg, parse_mode: "Markdown" }),
        });
      }

      return new Response(JSON.stringify({ success: true, message: "تم رفض الطلب" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Confirm renewal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
