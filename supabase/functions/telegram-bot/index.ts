import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";
const PRICE_PER_DAY = 10; // EGP per day
const PAYMENT_NUMBER = "01009046911";

// Track user states for multi-step flows
const userStates = new Map<number, { step: string; licenseKey?: string }>();

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

    // Check if user is in a multi-step flow
    const state = userStates.get(chatId);

    if (state?.step === "awaiting_days" && /^\d+$/.test(text)) {
      await handleDaysInput(supabase, chatId, parseInt(text), state.licenseKey!, TELEGRAM_BOT_TOKEN);
      userStates.delete(chatId);
      return new Response("OK", { status: 200 });
    }

    // Clear state on new command
    if (text.startsWith("/")) {
      userStates.delete(chatId);
    }

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
        if (text.includes("@") && text.includes(".")) {
          await handleStart(supabase, chatId, text, TELEGRAM_BOT_TOKEN);
        } else {
          await sendMessage(chatId, TELEGRAM_BOT_TOKEN,
            "❓ أمر غير معروف.\n\n" +
            "📧 إذا تريد ربط حسابك، أرسل بريدك الإلكتروني مباشرة.\n" +
            "📋 أرسل /help لعرض الأوامر المتاحة."
          );
        }
    }
  } catch (error) {
    console.error("Telegram bot error:", error);
  }

  return new Response("OK", { status: 200 });
});

async function handleStart(supabase: any, chatId: number, email: string, token: string) {
  if (!email) {
    await sendMessage(chatId, token,
      "━━━━━━━━━━━━━━━━━━━━━\n" +
      "🎉 *أهلاً وسهلاً بك!*\n" +
      "━━━━━━━━━━━━━━━━━━━━━\n\n" +
      "🤖 أنا بوت إدارة التراخيص الخاص بك\n" +
      "أقدر أساعدك في:\n\n" +
      "📋 عرض تراخيصك ومتابعة حالتها\n" +
      "🔄 تجديد التراخيص\n" +
      "📊 معرفة تفاصيل اشتراكاتك\n\n" +
      "💰 سعر الاشتراك: 300 جنيه / 30 يوم\n" +
      "📌 سعر اليوم: 10 جنيه\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━\n" +
      "✉️ *للبدء، أدخل بريدك الإلكتروني*\n" +
      "المسجّل في النظام:\n\n" +
      "مثال: `example@email.com`\n" +
      "━━━━━━━━━━━━━━━━━━━━━",
      "Markdown"
    );
    return;
  }

  const { data: existingLink } = await supabase
    .from("telegram_links")
    .select("id, customer_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (existingLink) {
    await sendMessage(chatId, token, "✅ حسابك مربوط بالفعل! أرسل /licenses لعرض تراخيصك.");
    return;
  }

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

  const { error } = await supabase
    .from("telegram_links")
    .insert({ customer_id: customer.id, telegram_chat_id: chatId });

  if (error) {
    console.error("Error linking telegram:", error);
    await sendMessage(chatId, token, "❌ حدث خطأ أثناء ربط الحساب. حاول مرة أخرى.");
    return;
  }

  await sendMessage(chatId, token,
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    `✅ *تم ربط حسابك بنجاح!*\n\n` +
    `👤 مرحباً *${customer.name}*\n\n` +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "📋 الأوامر المتاحة:\n\n" +
    "/licenses - 📄 عرض تراخيصك\n" +
    "/renew - 🔄 تجديد ترخيص\n" +
    "/help - ❓ المساعدة\n" +
    "━━━━━━━━━━━━━━━━━━━━━",
    "Markdown"
  );
}

async function handleLicenses(supabase: any, chatId: number, token: string) {
  const customer = await getCustomerByChatId(supabase, chatId);
  if (!customer) {
    await sendMessage(chatId, token, "⚠️ حسابك غير مربوط. أرسل:\n/start your@email.com");
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

  const statusEmoji: Record<string, string> = { active: "🟢", expired: "🔴", suspended: "🟡", pending: "⚪" };
  const statusAr: Record<string, string> = { active: "نشط", expired: "منتهي", suspended: "معلق", pending: "قيد الانتظار" };

  let msg = "📋 *تراخيصك:*\n\n";
  licenses.forEach((l: any, i: number) => {
    const emoji = statusEmoji[l.status] || "⚪";
    const status = statusAr[l.status] || l.status;
    const expiry = l.expire_at ? new Date(l.expire_at).toLocaleDateString("ar-EG") : "غير محدد";
    const daysLeft = l.expire_at ? Math.ceil((new Date(l.expire_at).getTime() - Date.now()) / 86400000) : null;

    msg += `${i + 1}. ${emoji} *${l.products?.name || "منتج"}*\n`;
    msg += `   🔑 \`${l.license_key}\`\n`;
    msg += `   📊 الحالة: ${status}\n`;
    msg += `   📅 ينتهي: ${expiry}`;
    if (daysLeft !== null && daysLeft > 0 && daysLeft <= 30) {
      msg += ` ⚠️ (${daysLeft} يوم)`;
    }
    msg += "\n\n";
  });

  msg += "💰 *التجديد:* 10 جنيه/يوم (300 جنيه/شهر)\n";
  msg += "لتجديد ترخيص أرسل:\n/renew XXXX-XXXX-XXXX-XXXX";

  await sendMessage(chatId, token, msg, "Markdown");
}

async function handleRenew(supabase: any, chatId: number, licenseKey: string, token: string) {
  const customer = await getCustomerByChatId(supabase, chatId);
  if (!customer) {
    await sendMessage(chatId, token, "⚠️ حسابك غير مربوط. أرسل:\n/start your@email.com");
    return;
  }

  if (!licenseKey) {
    await sendMessage(chatId, token, "⚠️ يرجى إرسال مفتاح الترخيص:\n/renew XXXX-XXXX-XXXX-XXXX");
    return;
  }

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

  // Set state to await days input
  userStates.set(chatId, { step: "awaiting_days", licenseKey: license.license_key });

  await sendMessage(chatId, token,
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "🔄 *تجديد الترخيص*\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `🔑 المنتج: *${license.products?.name || "منتج"}*\n` +
    `📅 ينتهي: ${license.expire_at ? new Date(license.expire_at).toLocaleDateString("ar-EG") : "منتهي"}\n\n` +
    "💰 *الأسعار:*\n" +
    "• اليوم الواحد = 10 جنيه\n" +
    "• 30 يوم (شهر) = 300 جنيه\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "📝 *كم يوم تريد تجديد؟*\n" +
    "أرسل عدد الأيام (مثال: `30`)\n" +
    "━━━━━━━━━━━━━━━━━━━━━",
    "Markdown"
  );
}

async function handleDaysInput(supabase: any, chatId: number, days: number, licenseKey: string, token: string) {
  if (days < 1 || days > 365) {
    await sendMessage(chatId, token, "⚠️ يرجى إدخال عدد أيام بين 1 و 365.");
    return;
  }

  const customer = await getCustomerByChatId(supabase, chatId);
  if (!customer) return;

  const amount = days * PRICE_PER_DAY;

  const { data: license } = await supabase
    .from("licenses")
    .select("id, products(name)")
    .eq("customer_id", customer.customer_id)
    .eq("license_key", licenseKey.toUpperCase())
    .maybeSingle();

  if (!license) {
    await sendMessage(chatId, token, "❌ حدث خطأ. حاول مرة أخرى.");
    return;
  }

  // Create renewal request
  const { error } = await supabase
    .from("renewal_requests")
    .insert({
      customer_id: customer.customer_id,
      license_id: license.id,
      days: days,
      amount: amount,
      status: "pending",
      telegram_chat_id: chatId,
    });

  if (error) {
    console.error("Error creating renewal request:", error);
    await sendMessage(chatId, token, "❌ حدث خطأ. حاول لاحقاً.");
    return;
  }

  await sendMessage(chatId, token,
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "💰 *تفاصيل طلب التجديد*\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `🔑 المنتج: *${license.products?.name || "منتج"}*\n` +
    `📅 عدد الأيام: *${days} يوم*\n` +
    `💵 المبلغ المطلوب: *${amount} جنيه*\n\n` +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "📱 *خطوات الدفع:*\n\n" +
    `1️⃣ حوّل المبلغ (*${amount} جنيه*) على الرقم:\n` +
    `📞 \`${PAYMENT_NUMBER}\`\n\n` +
    "2️⃣ بعد التحويل، أرسل صورة الإيصال أو رقم العملية هنا\n\n" +
    "3️⃣ سيتم مراجعة طلبك وتأكيده من الإدارة\n\n" +
    "4️⃣ بمجرد التأكيد، سيتم تجديد ترخيصك تلقائياً ✅\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "⏳ *تم تسجيل طلبك بنجاح!*\n" +
    "سيتم إبلاغك فور تأكيد التجديد.\n" +
    "━━━━━━━━━━━━━━━━━━━━━",
    "Markdown"
  );
}

async function handleHelp(chatId: number, token: string) {
  await sendMessage(chatId, token,
    "🤖 *أوامر البوت:*\n\n" +
    "/start email - ربط حسابك بالبريد الإلكتروني\n" +
    "/licenses - عرض جميع تراخيصك\n" +
    "/renew KEY - تجديد ترخيص\n" +
    "/help - عرض هذه المساعدة\n\n" +
    "💰 *الأسعار:*\n" +
    "• 10 جنيه / يوم\n" +
    "• 300 جنيه / 30 يوم\n\n" +
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

async function sendMessage(chatId: number, token: string, text: string, parseMode?: string) {
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
