import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  Globe,
  Link2,
  Bot,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL as string;
const WEBHOOK_URL = `${PROJECT_URL}/functions/v1/telegram-bot`;

interface WebhookInfo {
  ok: boolean;
  result: {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
    max_connections?: number;
  };
}

const WebhookSetup = () => {
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  const checkWebhook = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "check_webhook" },
      });
      if (error) throw error;
      setWebhookInfo(data as WebhookInfo);
      if (data?.result?.url) {
        toast.success("Webhook متصل وفعال");
      } else {
        toast.warning("Webhook غير مُعد بعد");
      }
    } catch {
      toast.error("فشل فحص الـ Webhook");
    } finally {
      setIsChecking(false);
    }
  };

  const activateWebhook = async () => {
    setIsActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "set_webhook" },
      });
      if (error) throw new Error(error.message || "invoke error");
      if (data?.ok) {
        toast.success("تم تفعيل Webhook بنجاح ✅");
      } else {
        toast.error(`فشل التفعيل: ${data?.description || "خطأ غير معروف"}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطأ غير معروف";
      toast.error(`حدث خطأ أثناء تفعيل الـ Webhook: ${msg}`);
    } finally {
      setIsActivating(false);
    }
    // فحص الحالة بعد التفعيل بشكل مستقل
    await checkWebhook();
  };


  const isActive = webhookInfo?.result?.url && webhookInfo.result.url.length > 0;
  const isCorrectUrl = webhookInfo?.result?.url === WEBHOOK_URL;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            إعداد Webhook البوت
          </CardTitle>
          {webhookInfo && (
            <Badge
              variant={isActive && isCorrectUrl ? "default" : "destructive"}
              className="gap-1"
            >
              {isActive && isCorrectUrl ? (
                <>
                  <Wifi className="h-3 w-3" />
                  متصل
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  {isActive ? "رابط مختلف" : "غير متصل"}
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Step 1: Project URL */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
              1
            </span>
            رابط الـ Webhook الخاص بمشروعك
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
              {WEBHOOK_URL}
            </code>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => copyToClipboard(WEBHOOK_URL)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>نسخ الرابط</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Step 2: Activate directly */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
              2
            </span>
            تفعيل الـ Webhook مباشرة
          </div>
          <p className="text-xs text-muted-foreground">
            اضغط الزر لربط بوت التليجرام بهذا المشروع تلقائياً — لا حاجة للمتصفح.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={activateWebhook}
              disabled={isActivating || isChecking}
              className="gap-2"
            >
              {isActivating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isActivating ? "جاري التفعيل..." : "تفعيل Webhook الآن"}
            </Button>
            <Button
              variant="outline"
              onClick={checkWebhook}
              disabled={isChecking || isActivating}
              className="gap-2"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              فحص الحالة
            </Button>
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Bot className="h-4 w-4" />
                BotFather
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          </div>
        </div>

        {/* Webhook Status Details */}
        {webhookInfo?.result && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-medium">
              {isActive && isCorrectUrl ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              تفاصيل الـ Webhook
            </div>
            <div className="grid gap-1.5 text-muted-foreground">
              <div className="flex items-start gap-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="font-mono text-xs break-all">
                  {webhookInfo.result.url || "غير مُعد"}
                </span>
              </div>
              {isActive && !isCorrectUrl && (
                <p className="text-xs text-amber-500 dark:text-amber-400">
                  ⚠️ الرابط المُسجّل يختلف عن رابط هذا المشروع — اضغط "تفعيل" لتحديثه.
                </p>
              )}
              <div>
                تحديثات معلقة: <strong>{webhookInfo.result.pending_update_count}</strong>
              </div>
              {webhookInfo.result.last_error_message && (
                <div className="text-destructive text-xs">
                  آخر خطأ: {webhookInfo.result.last_error_message}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WebhookSetup;
