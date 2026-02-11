import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return new Response("OK", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const update = await req.json();
    const message = update?.message;
    if (!message?.text) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const command = text.split(" ")[0].toLowerCase();
    const args = text.split(" ").slice(1).join(" ").trim();

    switch (command) {
      case "/start":
        await handleStart(supabase, chatId, args, TELEGRAM_BOT_TOKEN);
        break;
      case "/licenses":
      case "/تراخيصي":
        await handleLicenses(supabase, chatId, TELEGRAM_BOT_TOKEN);
        break;
      case "/renew":
      case "/تجديد":
        await handleRenew(supabase, chatId, args, TELEGRAM_BOT_TOKEN);
        break;
      case "/help":
      case "/مساعدة":
        await handleHelp(chatId, TELEGRAM_BOT_TOKEN);
        break;
      default:
        await sendMessage(chatId, TELEGRAM_BOT_TOKEN,
          "❓ أمر غير معروف. أرسل /help لعرض الأوامر المتاحة."
        );
    }
  } catch (error) {
    console.error("Telegram bot error:", error);
  }

  return new Response("OK", { status: 200 });
});

async function handleStart(
  supabase: any,
  chatId: number,
  email: string,
  token: string
) {
  if (!email) {
    await sendMessage(chatId, token,
      "👋 مرحباً بك في بوت إدارة التراخيص!\n\n" +
      "لربط حسابك، أرسل:\n" +
      "/start your@email.com\n\n" +
      "📋 الأوامر المتاحة:\n" +
      "/licenses - عرض تراخيصك\n" +
      "/renew - تجديد ترخيص\n" +
      "/help - المساعدة"
    );
    return;
  }

  // Check if already linked
  const { data: existingLink } = await supabase
    .from("telegram_links")
    .select("id, customer_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (existingLink) {
    await sendMessage(chatId, token, "✅ حسابك مربوط بالفعل! أرسل /licenses لعرض تراخيصك.");
    return;
  }

  // Find customer by email
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!customer) {
    await sendMessage(chatId, token,
      "❌ لم يتم العثور على حساب بهذا البريد الإلكتروني.\n" +
      "تأكد من استخدام نفس البريد المسجل في النظام."
    );
    return;
  }

  // Link telegram to customer
  const { error } = await supabase
    .from("telegram_links")
    .insert({ customer_id: customer.id, telegram_chat_id: chatId });

  if (error) {
    console.error("Error linking telegram:", error);
    await sendMessage(chatId, token, "❌ حدث خطأ أثناء ربط الحساب. حاول مرة أخرى.");
    return;
  }

  await sendMessage(chatId, token,
    `✅ تم ربط حسابك بنجاح! مرحباً ${customer.name}\n\n` +
    "أرسل /licenses لعرض تراخيصك."
  );
}

async function handleLicenses(supabase: any, chatId: number, token: string) {
  const customer = await getCustomerByChatId(supabase, chatId);
  if (!customer) {
    await sendMessage(chatId, token,
      "⚠️ حسابك غير مربوط. أرسل:\n/start your@email.com"
    );
    return;
  }

  const { data: licenses } = await supabase
    .from("licenses")
    .select("id, license_key, status, expire_at, max_devices, products(name)")
    .eq("customer_id", customer.customer_id);

  if (!licenses || licenses.length === 0) {
    await sendMessage(chatId, token, "📋 لا توجد تراخيص مسجلة على حسابك.");
    return;
  }

  const statusEmoji: Record<string, string> = {
    active: "🟢",
    expired: "🔴",
    suspended: "🟡",
    pending: "⚪",
  };

  const statusAr: Record<string, string> = {
    active: "نشط",
    expired: "منتهي",
    suspended: "معلق",
    pending: "قيد الانتظار",
  };

  let msg = "📋 *تراخيصك:*\n\n";
  licenses.forEach((l: any, i: number) => {
    const emoji = statusEmoji[l.status] || "⚪";
    const status = statusAr[l.status] || l.status;
    const expiry = l.expire_at
      ? new Date(l.expire_at).toLocaleDateString("ar-EG")
      : "غير محدد";
    const daysLeft = l.expire_at
      ? Math.ceil((new Date(l.expire_at).getTime() - Date.now()) / 86400000)
      : null;

    msg += `${i + 1}. ${emoji} *${l.products?.name || "منتج"}*\n`;
    msg += `   🔑 \`${l.license_key}\`\n`;
    msg += `   📊 الحالة: ${status}\n`;
    msg += `   📅 ينتهي: ${expiry}`;
    if (daysLeft !== null && daysLeft > 0 && daysLeft <= 30) {
      msg += ` ⚠️ (${daysLeft} يوم)`;
    }
    msg += "\n\n";
  });

  msg += "لتجديد ترخيص أرسل:\n/renew XXXX-XXXX-XXXX-XXXX";

  await sendMessage(chatId, token, msg, "Markdown");
}

async function handleRenew(
  supabase: any,
  chatId: number,
  licenseKey: string,
  token: string
) {
  const customer = await getCustomerByChatId(supabase, chatId);
  if (!customer) {
    await sendMessage(chatId, token,
      "⚠️ حسابك غير مربوط. أرسل:\n/start your@email.com"
    );
    return;
  }

  if (!licenseKey) {
    await sendMessage(chatId, token,
      "⚠️ يرجى إرسال مفتاح الترخيص:\n/renew XXXX-XXXX-XXXX-XXXX"
    );
    return;
  }

  // Find the license
  const { data: license } = await supabase
    .from("licenses")
    .select("id, license_key, status, expire_at, products(name)")
    .eq("customer_id", customer.customer_id)
    .eq("license_key", licenseKey.toUpperCase())
    .maybeSingle();

  if (!license) {
    await sendMessage(chatId, token,
      "❌ لم يتم العثور على ترخيص بهذا المفتاح.\nتأكد من المفتاح وأرسل /licenses لعرض تراخيصك."
    );
    return;
  }

  // Check for existing unused renewal token
  const { data: existingToken } = await supabase
    .from("renewal_tokens")
    .select("id, token, expires_at")
    .eq("license_id", license.id)
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existingToken) {
    // Use existing token - auto renew
    const newExpiry = new Date(license.expire_at || Date.now());
    if (newExpiry < new Date()) {
      newExpiry.setTime(Date.now());
    }
    newExpiry.setDate(newExpiry.getDate() + 30);

    const { error: updateError } = await supabase
      .from("licenses")
      .update({
        status: "active",
        expire_at: newExpiry.toISOString(),
      })
      .eq("id", license.id);

    if (updateError) {
      console.error("Error renewing license:", updateError);
      await sendMessage(chatId, token, "❌ حدث خطأ أثناء التجديد. حاول لاحقاً.");
      return;
    }

    // Mark token as used
    await supabase
      .from("renewal_tokens")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("id", existingToken.id);

    await sendMessage(chatId, token,
      `✅ *تم تجديد الترخيص بنجاح!*\n\n` +
      `🔑 المنتج: ${license.products?.name || "منتج"}\n` +
      `📅 تاريخ الانتهاء الجديد: ${newExpiry.toLocaleDateString("ar-EG")}\n` +
      `📊 الحالة: نشط 🟢`,
      "Markdown"
    );
    return;
  }

  // No renewal token available - notify
  await sendMessage(chatId, token,
    "⚠️ لا يوجد رمز تجديد متاح لهذا الترخيص حالياً.\n" +
    "يرجى التواصل مع الإدارة لإصدار رمز تجديد."
  );
}

async function handleHelp(chatId: number, token: string) {
  await sendMessage(chatId, token,
    "🤖 *أوامر البوت:*\n\n" +
    "/start email - ربط حسابك بالبريد الإلكتروني\n" +
    "/licenses - عرض جميع تراخيصك\n" +
    "/renew KEY - تجديد ترخيص\n" +
    "/help - عرض هذه المساعدة\n\n" +
    "🌐 يمكنك أيضاً استخدام الأوامر بالعربية:\n" +
    "/تراخيصي - عرض التراخيص\n" +
    "/تجديد KEY - تجديد ترخيص\n" +
    "/مساعدة - المساعدة",
    "Markdown"
  );
}

async function getCustomerByChatId(supabase: any, chatId: number) {
  const { data } = await supabase
    .from("telegram_links")
    .select("customer_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  return data;
}

async function sendMessage(
  chatId: number,
  token: string,
  text: string,
  parseMode?: string
) {
  const body: any = { chat_id: chatId, text };
  if (parseMode) body.parse_mode = parseMode;

  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Telegram sendMessage failed:", await res.text());
  }
}
