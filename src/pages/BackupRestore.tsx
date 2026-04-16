import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload, Loader2, CheckCircle2, AlertCircle, HardDrive } from "lucide-react";

const ALL_TABLES = [
  "products",
  "customers",
  "licenses",
  "devices",
  "blocked_ips",
  "blocked_hwids",
  "revoked_keys",
  "notification_settings",
  "rustdesk_ids",
  "telegram_links",
  "telegram_delegates",
  "telegram_invite_codes",
  "telegram_user_states",
  "registration_requests",
  "renewal_requests",
  "invoices",
  "logs",
] as const;

const TABLE_LABELS: Record<string, string> = {
  products: "المنتجات",
  customers: "العملاء",
  licenses: "التراخيص",
  devices: "الأجهزة",
  blocked_ips: "IPs المحظورة",
  blocked_hwids: "HWIDs المحظورة",
  revoked_keys: "المفاتيح الملغاة",
  notification_settings: "إعدادات الإشعارات",
  rustdesk_ids: "RustDesk IDs",
  telegram_links: "روابط التليجرام",
  telegram_delegates: "مفوضي التليجرام",
  telegram_invite_codes: "أكواد الدعوة",
  telegram_user_states: "حالات المستخدمين",
  registration_requests: "طلبات التسجيل",
  renewal_requests: "طلبات التجديد",
  invoices: "الفواتير",
  logs: "السجلات",
};

const BackupRestore = () => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, number> | null>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    setExporting(true);
    setLastResult(null);
    try {
      const backup: Record<string, unknown[]> = {};
      const summary: Record<string, number> = {};

      for (const table of ALL_TABLES) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          console.error(`Error exporting ${table}:`, error);
          summary[table] = -1;
          backup[table] = [];
        } else {
          backup[table] = data || [];
          summary[table] = data?.length || 0;
        }
      }

      const blob = new Blob([JSON.stringify({ version: 1, exported_at: new Date().toISOString(), tables: backup }, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setLastResult(summary);
      toast({ title: "تم التصدير بنجاح", description: "تم تحميل ملف النسخة الاحتياطية" });
    } catch (err) {
      console.error(err);
      toast({ title: "خطأ في التصدير", description: "حدث خطأ أثناء تصدير البيانات", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImporting(true);
      setLastResult(null);
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (!parsed.tables) {
          throw new Error("ملف النسخة الاحتياطية غير صالح");
        }

        const { data, error } = await supabase.functions.invoke("import-data", {
          body: { tables: parsed.tables },
        });

        if (error) throw error;

        setLastResult(data.summary);
        toast({ title: "تم الاستيراد بنجاح", description: "تم استعادة البيانات من النسخة الاحتياطية" });
      } catch (err: any) {
        console.error(err);
        toast({ title: "خطأ في الاستيراد", description: err.message || "حدث خطأ أثناء استيراد البيانات", variant: "destructive" });
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">النسخ الاحتياطي والاستعادة</h1>
        <p className="text-muted-foreground">تصدير جميع بيانات النظام أو استعادتها من نسخة احتياطية سابقة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              تصدير نسخة احتياطية
            </CardTitle>
            <CardDescription>
              تصدير جميع بيانات النظام إلى ملف JSON يمكن استخدامه لاحقاً للاستعادة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={exporting || importing} className="w-full" size="lg">
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 ml-2" />
                  تصدير جميع البيانات
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              استعادة من نسخة احتياطية
            </CardTitle>
            <CardDescription>
              استعادة جميع البيانات من ملف نسخة احتياطية سابقة (سيتم تحديث البيانات الموجودة)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleImport} disabled={exporting || importing} variant="outline" className="w-full" size="lg">
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الاستيراد...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 ml-2" />
                  اختيار ملف واستعادة
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              نتائج العملية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.entries(lastResult).map(([table, count]) => (
                <div key={table} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                  {count >= 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{TABLE_LABELS[table] || table}</p>
                    <p className="text-xs text-muted-foreground">
                      {count >= 0 ? `${count} سجل` : "خطأ"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>الجداول المشمولة</CardTitle>
          <CardDescription>البيانات التي يتم تصديرها واستيرادها</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALL_TABLES.map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                {TABLE_LABELS[t] || t}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupRestore;
