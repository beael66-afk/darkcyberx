
## الهدف
تنفيذ خطتين متوازيتين:

**1. تفعيل API Key القديم + رفضه بـ force_shutdown مع رسالة تحديث واضحة**
**2. إنشاء صفحة "مراقبة الأداة القديمة" لتتبع كل من يستخدمها**

---

## الخطة التفصيلية

### الجزء الأول: تعديل validate-license/index.ts

**المشكلة الحالية**: دالة `validate_api_key_by_value` لا تُرجع `key_prefix` — لذلك لن نعتمد عليها للتمييز.

**الحل الأبسط**: نضيف عمود `key_prefix` لقائمة البيانات المُرجعة من الـ RPC بعمل migration لتعديلها، ثم نفعّل الـ API Key القديم ونضيف فحصاً في validate-license يرفض أي طلب قادم من `key_prefix = 'lm_s3hzo'`.

**تسلسل التغييرات في validate-license/index.ts**:

بعد السطر `await supabase.rpc('update_api_key_last_used', ...)` وبعد التحقق من صحة الـ API Key وتفعيله، نضيف:

```typescript
// ── Legacy Tool Block ──────────────────────────────────────────────────────
// API Key prefix 'lm_s3hzo' belongs to the old/legacy tool.
// Accept the connection but immediately force shutdown with update message.
if (apiKeyData.key_prefix === 'lm_s3hzo') {
  // Log the attempt for monitoring
  supabase.from('logs').insert({
    entity_type: 'legacy_tool',
    action: 'verified',
    description: `أداة قديمة حاولت التفعيل - مفتاح: ${license_key_from_body ?? 'unknown'} - IP: ${clientIp}`,
    ip_address: clientIp,
  }).then(() => {}).catch(() => {});
  return new Response(
    JSON.stringify({ 
      error: 'يرجى تحديث الأداة للإصدار الجديد', 
      valid: false, 
      force_shutdown: true,
      update_required: true 
    }),
    { status: 426, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**ملاحظة**: نقرأ `license_key` من الـ body قبل الرفض لتسجيله في اللوج. نحتاج نقرأ الـ body مبكرًا أو نستخدم `rawBody` الذي قرأناه مسبقاً في كود HWID.

**تعديل الـ RPC**: تعديل `validate_api_key_by_value` لتُرجع `key_prefix` أيضاً:

```sql
CREATE OR REPLACE FUNCTION public.validate_api_key_by_value(api_key_value text)
RETURNS TABLE(user_id uuid, is_active boolean, expires_at timestamptz, key_prefix text)
...
SELECT user_id, is_active, expires_at, key_prefix
FROM public.api_keys
WHERE key_hash = encode(sha256(api_key_value::bytea), 'hex')
LIMIT 1;
```

**تفعيل الـ API Key القديم** (data operation):
```sql
UPDATE public.api_keys SET is_active = true WHERE key_prefix = 'lm_s3hzo';
```

---

### الجزء الثاني: صفحة "مراقبة الأداة القديمة" `/legacy-monitor`

صفحة جديدة مخصصة تعرض كل اللوجات التي `entity_type = 'legacy_tool'` مع:

**إحصائيات في الأعلى**:
- عدد المحاولات اليوم
- عدد الـ IP المختلفة
- عدد المفاتيح المختلفة
- آخر محاولة

**جدول النشاط**:
- التاريخ والوقت
- عنوان IP
- مفتاح الترخيص المُستخدم (مأخوذ من الـ description)
- زر "حجب IP مباشرة" يفتح dialog
- زر "حجب HWID" (إذا وُجد في الـ description)

**فلترة**:
- بحث بالـ IP
- فلتر بالتاريخ (اليوم / الأسبوع / الكل)

**إجراءات جماعية**:
- "حجب كل هذه الـ IPs دفعة واحدة" (تضيفهم كلهم لـ blocked_ips)

---

### الملفات التي ستتغير

```text
supabase/migrations/
  └── [new].sql
      - تعديل validate_api_key_by_value لإرجاع key_prefix

supabase/functions/validate-license/index.ts
  - إضافة فحص key_prefix بعد التحقق من API Key
  - تسجيل محاولات الأداة القديمة في entity_type='legacy_tool'
  - استخدام rawBody المقروء مسبقاً لاستخراج license_key للتسجيل

DATA (insert tool):
  - UPDATE api_keys SET is_active=true WHERE key_prefix='lm_s3hzo'

src/pages/LegacyMonitor.tsx
  - صفحة جديدة كاملة لمراقبة الأداة القديمة

src/App.tsx
  - إضافة route /legacy-monitor

src/components/layout/AppSidebar.tsx
  - إضافة رابط "مراقبة الأداة القديمة" في القائمة
```

---

### تدفق العمل بعد التنفيذ

```text
الأداة القديمة تبدأ
        ↓
ترسل طلب لـ validate-license
        ↓
API Key لم يعد inactive → يمر فحص is_active ✓
        ↓
فحص key_prefix === 'lm_s3hzo' ← يتوقف هنا
        ↓
يُسجّل في logs (entity_type = legacy_tool)
        ↓
يُرجع: { valid: false, force_shutdown: true, update_required: true }
        ↓
الأداة تُغلق نفسها وتعرض رسالة التحديث
        ↓
الأدمن يرى في صفحة "مراقبة الأداة القديمة":
  - من هم؟ (IP)
  - كم مرة حاولوا؟
  - أي مفاتيح استخدموا؟
  - يضغط "حجب IP" لمنعهم حتى من الأداة الجديدة
```
