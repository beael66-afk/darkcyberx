
## الخلاصة — المشكلة والحل

المستخدم يقول إن المفتاح الوحيد المستخدم الآن هو `lm_NpgOrYc...` وليس لديه مفاتيح قديمة تقلقه. إذن طلبه الأصلي واضح: **إضافة زر تفعيل/تعطيل (toggle) لكل مفتاح API في الصفحة**.

## الخطة

**ملف واحد فقط: `src/pages/ApiCredentials.tsx`**

### التغييرات:

1. **إضافة import** لأيقونات `Power` و `PowerOff` من `lucide-react`

2. **إضافة دالة `toggleApiKey`**:
```typescript
const toggleApiKey = async (id: string, currentStatus: boolean) => {
  await supabase.from('api_keys').update({ is_active: !currentStatus }).eq('id', id);
  fetchApiKeys();
};
```

3. **تحديث عرض بطاقة كل مفتاح**:
   - إضافة badge يوضح الحالة: أخضر "نشط" / أحمر "معطّل"
   - إضافة زر toggle بجانب زر الحذف:
     - لو نشط → زر أصفر أيقونة `PowerOff` نص "تعطيل"
     - لو معطّل → زر أخضر أيقونة `Power` نص "تفعيل"

### لا تغييرات في قاعدة البيانات أو Edge Functions
الـ `validate-license` يتحقق بالفعل من `is_active` ويرجع `force_shutdown: true` عند التعطيل.

### النتيجة العملية
- الأدمن يضغط "تعطيل" على أي مفتاح API
- أي أداة تستخدم ذلك المفتاح تحصل فوراً على `{ valid: false, force_shutdown: true }`
- يمكن إعادة تفعيله لاحقاً دون إنشاء مفتاح جديد
