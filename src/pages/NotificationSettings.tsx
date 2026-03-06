import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, Mail, Clock, Calendar, Save, Plus, X, Send } from "lucide-react";

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
        title: "تم الحفظ",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            إعدادات الإشعارات
          </h1>
          <p className="text-muted-foreground mt-2">
            تحكم في أوقات إرسال الإشعارات والرسائل المخصصة
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              إعدادات البريد الإلكتروني
            </CardTitle>
            <CardDescription>
              تفعيل وتخصيص رسائل البريد الإلكتروني
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-enabled">تفعيل الإشعارات بالبريد</Label>
                <p className="text-sm text-muted-foreground">
                  إرسال إشعارات انتهاء التراخيص عبر البريد الإلكتروني
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={settings.email_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, email_enabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">عنوان البريد الإلكتروني</Label>
              <Input
                id="email-subject"
                value={settings.email_subject}
                onChange={(e) =>
                  setSettings({ ...settings, email_subject: e.target.value })
                }
                placeholder="تنبيه: اقتراب انتهاء ترخيصك"
                disabled={!settings.email_enabled}
              />
              <p className="text-sm text-muted-foreground">
                عنوان الرسالة الذي سيراه العملاء
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Days */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              أيام الإشعار
            </CardTitle>
            <CardDescription>
              الأيام قبل انتهاء الترخيص التي يتم فيها إرسال الإشعارات
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
                  {day} يوم
                  <button
                    onClick={() => removeNotificationDay(day)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Badge>
              ))}
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
              سيتم إرسال إشعار للعملاء في كل يوم من الأيام المحددة قبل انتهاء
              الترخيص
            </p>
          </CardContent>
        </Card>

        {/* Notification Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              وقت الإرسال
            </CardTitle>
            <CardDescription>
              الوقت اليومي لفحص وإرسال الإشعارات
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
              />
              <p className="text-sm text-muted-foreground">
                سيتم فحص التراخيص وإرسال الإشعارات يومياً في هذا الوقت
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
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
