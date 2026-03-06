import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, Clock, Calendar, Save, Plus, X, Send, Bot, CheckCircle2 } from "lucide-react";

interface NotificationSettings {
  id: string;
  notification_days: number[];
  notification_time: string;
  email_subject: string;
  email_enabled: boolean;
}

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [newDay, setNewDay] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الإعدادات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("notification_settings")
        .update({
          notification_days: settings.notification_days,
          notification_time: settings.notification_time,
          email_subject: settings.email_subject,
          email_enabled: settings.email_enabled,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "تم الحفظ ✅",
        description: "تم حفظ إعدادات الإشعارات بنجاح",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setTesting(true);
      const { data, error } = await supabase.functions.invoke("check-expiring-licenses");

      if (error) throw error;

      toast({
        title: "تم الإرسال ✅",
        description: `${data?.message || "تم إرسال الإشعارات التجريبية بنجاح عبر التليجرام"}`,
      });
    } catch (error: any) {
      console.error("Error sending test:", error);
      toast({
        title: "خطأ في الإرسال",
        description: "فشل في إرسال الإشعار التجريبي. تأكد من ضبط إعدادات البوت.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const addNotificationDay = () => {
    const day = parseInt(newDay);
    if (isNaN(day) || day < 1 || day > 365) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم صحيح بين 1 و 365",
        variant: "destructive",
      });
      return;
    }

    if (settings?.notification_days.includes(day)) {
      toast({
        title: "تنبيه",
        description: "هذا اليوم موجود بالفعل",
        variant: "destructive",
      });
      return;
    }

    setSettings({
      ...settings!,
      notification_days: [...settings!.notification_days, day].sort((a, b) => b - a),
    });
    setNewDay("");
  };

  const removeNotificationDay = (day: number) => {
    setSettings({
      ...settings!,
      notification_days: settings!.notification_days.filter((d) => d !== day),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">لا توجد إعدادات</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            إعدادات الإشعارات
          </h1>
          <p className="text-muted-foreground mt-2">
            تحكم في توقيت إرسال تنبيهات انتهاء التراخيص عبر بوت التليجرام
          </p>
        </div>

        {/* Test Button */}
        <Button
          onClick={handleSendTest}
          disabled={testing}
          variant="outline"
          size="lg"
          className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
        >
          {testing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {testing ? "جاري الإرسال..." : "إرسال تجريبي"}
        </Button>
      </div>

      {/* Telegram Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
        <Bot className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-primary">الإشعارات تُرسل حصرياً عبر بوت التليجرام</p>
          <p className="text-sm text-muted-foreground mt-1">
            يتلقى العملاء المرتبطون بالبوت تنبيهاً تلقائياً قبل انتهاء ترخيصهم بالأيام المحددة أدناه.
            العملاء غير المرتبطين يتلقون الإشعار عبر البريد الإلكتروني كبديل تلقائي.
          </p>
        </div>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            كيف يعمل النظام؟
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
              <span className="font-medium text-primary">① الفحص اليومي</span>
              <span className="text-muted-foreground">يفحص النظام يومياً التراخيص التي ستنتهي في الأيام المحددة</span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
              <span className="font-medium text-primary">② إرسال عبر التليجرام</span>
              <span className="text-muted-foreground">يُرسل رسالة تنبيه للعميل مباشرة عبر بوت التليجرام</span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
              <span className="font-medium text-primary">③ رابط التجديد</span>
              <span className="text-muted-foreground">تتضمن الرسالة أمر /renew جاهز لبدء عملية التجديد فوراً</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {/* Notification Days */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              أيام الإشعار
            </CardTitle>
            <CardDescription>
              الأيام قبل انتهاء الترخيص التي يتم فيها إرسال تنبيه للعميل عبر التليجرام
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {settings.notification_days.map((day) => (
                <Badge
                  key={day}
                  variant="secondary"
                  className="text-base py-2 px-4 gap-2"
                >
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  {day} {day === 1 ? "يوم" : "أيام"}
                  <button
                    onClick={() => removeNotificationDay(day)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Badge>
              ))}
              {settings.notification_days.length === 0 && (
                <p className="text-sm text-muted-foreground">لا توجد أيام محددة. أضف يوماً واحداً على الأقل.</p>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="عدد الأيام (مثال: 30)"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNotificationDay()}
                min="1"
                max="365"
              />
              <Button onClick={addNotificationDay} variant="outline">
                <Plus className="h-4 w-4 ml-2" />
                إضافة
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              مثال: أضف <strong>7</strong> و <strong>3</strong> و <strong>1</strong> لإرسال تنبيه قبل أسبوع وثلاثة أيام ويوم واحد من الانتهاء
            </p>
          </CardContent>
        </Card>

        {/* Notification Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              وقت الإرسال اليومي
            </CardTitle>
            <CardDescription>
              الوقت الذي يتم فيه فحص التراخيص وإرسال التنبيهات عبر التليجرام يومياً
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notification-time">الوقت</Label>
              <Input
                id="notification-time"
                type="time"
                value={settings.notification_time}
                onChange={(e) =>
                  setSettings({ ...settings, notification_time: e.target.value })
                }
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                سيتم إرسال الإشعارات يومياً عند هذا الوقت (توقيت الخادم)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSendTest}
            disabled={testing}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            {testing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            {testing ? "جاري الإرسال..." : "اختبار الإرسال الآن"}
          </Button>

          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 ml-2" />
                حفظ التغييرات
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
