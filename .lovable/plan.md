

# إضافة قسم إدارة Webhook لبوت التليجرام

## الهدف
إضافة قسم في صفحة إعدادات بوت التليجرام (`/telegram-settings`) يسمح بإدارة Webhook الخاص بالبوت - كما هو موضح في الصورة المرفقة.

## التغييرات

### 1. تعديل `src/pages/TelegramSettings.tsx`
إضافة قسم جديد أعلى الجدول يحتوي على:

- **عرض رابط المشروع الحالي** (Supabase Project URL) مع زر نسخ
- **أمر تحديث Webhook**: عرض الأمر الكامل لتحديث الـ webhook مع استبدال `{TOKEN}` و`{URL}` تلقائياً
  ```
  https://api.telegram.org/bot{TOKEN}/setWebhook?url={PROJECT_URL}/functions/v1/telegram-bot
  ```
- **زر "اختبار الاتصال"**: يستدعي edge function للتحقق من حالة الـ webhook عبر Telegram API (`getWebhookInfo`)
- **عرض حالة الـ Webhook** (active/inactive) مع Badge ملونة
- **زر "اذهب لصفحة بوت التليجرام"** كرابط سريع

### 2. إنشاء/تعديل Edge Function لفحص حالة Webhook
إضافة action جديد في `supabase/functions/telegram-bot/index.ts` يستجيب لـ `action: "check_webhook"`:
- يستدعي `getWebhookInfo` من Telegram API
- يرجع حالة الـ webhook (URL، pending_update_count، last_error)

### التصميم
- قسم بتصميم بطاقة (Card) مع خطوات مرقمة كما في الصورة
- كل خطوة تحتوي على checkbox/radio للإشارة للاكتمال (تصميم فقط)
- استخدام ألوان متناسقة مع باقي الصفحة
- RTL بالكامل

