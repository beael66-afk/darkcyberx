
## خطة اختبار شاملة للموقع

### ما الذي سيتم اختباره؟

بعد مراجعة الكود الكامل، الموقع يحتوي على **12 صفحة رئيسية** + **10 Edge Functions** + **بوت تليجرام**. الخطة تقسم الاختبار إلى محاور واضحة.

---

### المحور 1: الأمان والمصادقة (Authentication)

| الاختبار | الملف | الحالة المتوقعة |
|---|---|---|
| الدخول بإيميل وكلمة مرور صحيحة | `Auth.tsx` | توجيه لـ `/dashboard` |
| الدخول ببيانات خاطئة | `Auth.tsx` | رسالة خطأ عربية |
| الدخول بحساب غير admin | `DashboardLayout.tsx` | تسجيل خروج تلقائي + توجيه لـ `/auth` |
| فتح `/dashboard` بدون تسجيل دخول | `DashboardLayout.tsx` | توجيه لـ `/auth` |
| تسجيل حساب جديد | `AuthForm.tsx` | رسالة تأكيد |

---

### المحور 2: صفحات CRUD الأساسية

**Products** (`/products`):
- إضافة منتج جديد ← التحقق من ظهوره في القائمة
- تعديل منتج موجود ← التحقق من التحديث
- حذف منتج ← التحقق من اختفائه
- تفعيل/تعطيل المنتج (Switch)
- تصدير Excel/CSV

**Customers** (`/customers`):
- إضافة عميل جديد ببيانات كاملة
- تعديل عميل
- حذف عميل
- البحث في قائمة العملاء
- أيقونة تليجرام للعملاء المربوطين بالبوت
- عرض بيانات تسجيل الدخول (View Credentials)

**Licenses** (`/licenses`):
- إنشاء ترخيص جديد
- تعديل الحالة (active/suspended/expired)
- نسخ مفتاح الترخيص
- تجديد مفتاح الترخيص (Regenerate)
- حذف ترخيص
- فلترة حسب الحالة
- تصدير Excel/CSV

---

### المحور 3: الوظائف الحيوية

**Devices** (`/devices`):
- عرض الأجهزة المسجلة
- حذف جهاز

**Renewal Orders** (`/renewal-orders`):
- عرض طلبات التجديد
- الموافقة على طلب تجديد ← التحقق من تحديث تاريخ انتهاء الترخيص
- رفض طلب تجديد ← إرسال إشعار للعميل
- عرض طلبات التسجيل الجديدة
- الموافقة على تسجيل ← إنشاء عميل + ترخيص تلقائي

**IP Management** (`/ip-management`):
- عرض IPs النشطة وعدد طلباتها
- حجب IP يدوياً
- رفع حجب IP
- عرض المحاولات الفاشلة

---

### المحور 4: Edge Functions

| الدالة | الاختبار |
|---|---|
| `validate-license` | إرسال مفتاح صحيح ← `valid: true` |
| `validate-license` | إرسال مفتاح خاطئ ← تسجيل IP + `invalid: true` |
| `validate-license` | إرسال بدون API Key ← 401 |
| `validate-license` | Rate limiting (31 طلب/دقيقة) ← 429 |
| `geo-lookup` | إرسال IP ← إحداثيات وبيانات جغرافية |
| `regenerate-license-key` | تجديد مفتاح ← مفتاح جديد في DB |
| `confirm-renewal` | تأكيد طلب تجديد ← تحديث expire_at |
| `check-expiring-licenses` | تشغيل يدوي ← إرسال إشعارات |
| `create-customer-account` | إنشاء حساب ← customer.user_id يُحدَّث |
| `reset-customer-password` | إعادة تعيين كلمة مرور |
| `ai-assistant` | إرسال رسالة ← رد من الـ AI |

---

### المحور 5: بوت التليجرام

- فتح البوت على Desktop ← القائمة الرئيسية تظهر مباشرة بدون طلب موقع ✅
- ربط حساب بالبريد الإلكتروني ← ظهور ربط في لوحة التحكم
- عرض التراخيص عبر البوت
- طلب تجديد ← ظهور الطلب في `/renewal-orders`
- زر "شارك موقعك (اختياري)" يظهر في القائمة
- تسجيل جديد (New User) ← ظهور الطلب في `/renewal-orders` تبويب Registration

---

### المحور 6: الإعدادات والتقارير

**Settings** (`/settings`):
- تحديث الاسم في الملف الشخصي ← حفظ والتحقق من قاعدة البيانات
- تغيير كلمة المرور

**Notification Settings** (`/notification-settings`):
- تعديل قالب رسالة التنبيه
- معاينة القالب (Preview)
- حفظ الإعدادات
- إرسال إشعار اختباري

**Reports** (`/reports`):
- التحقق من صحة الأرقام في Charts
- مقارنة بأرقام Dashboard

**Logs** (`/logs`):
- التحقق من تسجيل كل عملية (إضافة/حذف/تعديل)
- فلترة السجلات

---

### المحور 7: واجهة المستخدم العامة

- الـ Dark/Light Mode Toggle
- استجابة الموقع على الشاشات الصغيرة (Mobile)
- AI Assistant (أيقونة الذكاء الاصطناعي)
- الـ Sidebar يفتح ويغلق
- الـ Pagination في الجداول الكبيرة
- بحث في كل الجداول
- Skeleton Loading عند تحميل البيانات

---

### ملخص الملفات التي ستُختبر

```text
Frontend (12 Pages):
  Auth → Dashboard → Products → Customers → Licenses
  Devices → Logs → Reports → Settings → NotificationSettings
  TelegramSettings → RenewalOrders → IpManagement → RustDeskIds

Backend (10 Edge Functions):
  validate-license → telegram-bot → confirm-renewal
  create-customer-account → geo-lookup → regenerate-license-key
  reset-customer-password → send-expiry-notification
  check-expiring-licenses → ai-assistant

Database (13 Tables):
  customers → licenses → products → devices → logs
  telegram_links → renewal_requests → registration_requests
  blocked_ips → notification_settings → profiles
  user_roles → rustdesk_ids
```

---

### الأولويات

**عالي الأهمية (يؤثر على العمل مباشرة):**
1. validate-license Edge Function
2. ربط وإدارة التراخيص
3. Renewal Orders (الموافقة/الرفض)
4. بوت التليجرام (Desktop compatibility)

**متوسط الأهمية:**
5. IP Management
6. Notification Settings
7. Reports accuracy

**منخفض الأهمية:**
8. Visual/UI tests
9. Export functionality

---

### ماذا سيحدث عند التنفيذ؟

سأستخدم Browser Automation لفتح كل صفحة واختبارها، وأستخدم Edge Function testing للـ APIs، وأتحقق من console logs وnetwork requests للتأكد من سلامة الاستجابات. أي خلل أجده سأوثقه وأصلحه فوراً.

هل تريد البدء بمحور معين أولاً، أم تريد الاختبار الكامل بالترتيب؟
