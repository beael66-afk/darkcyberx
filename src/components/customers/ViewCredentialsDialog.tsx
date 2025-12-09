import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Key, Mail, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ViewCredentialsDialogProps {
  customerName: string;
  customerEmail: string;
}

export const ViewCredentialsDialog = ({
  customerName,
  customerEmail,
}: ViewCredentialsDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(customerEmail);
    toast.success("تم نسخ البريد الإلكتروني");
  };

  const handleResendCredentials = async () => {
    setIsResending(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("reset-customer-password", {
        body: {
          email: customerEmail,
          customerName: customerName,
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("تم إرسال كلمة مرور جديدة للعميل عبر البريد الإلكتروني");
    } catch (error: any) {
      console.error("Error resending credentials:", error);
      toast.error(error.message || "فشل إعادة إرسال بيانات الدخول");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Key className="h-3 w-3" />
          بيانات الدخول
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>بيانات دخول العميل</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>البريد الإلكتروني للدخول:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={customerEmail}
                readOnly
                className="flex-1 bg-background"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyEmail}
                title="نسخ البريد الإلكتروني"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-dashed space-y-3">
            <p className="text-sm text-muted-foreground">
              لأسباب أمنية، لا يتم تخزين كلمات المرور. يمكنك إرسال كلمة مرور جديدة للعميل.
            </p>
            <Button
              onClick={handleResendCredentials}
              disabled={isResending}
              className="w-full"
              variant="secondary"
            >
              <RefreshCw className={`ml-2 h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
              {isResending ? "جاري الإرسال..." : "إرسال كلمة مرور جديدة"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>• سيتم إرسال كلمة مرور مؤقتة جديدة إلى: {customerEmail}</p>
            <p>• يُنصح العميل بتغيير كلمة المرور بعد تسجيل الدخول</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
