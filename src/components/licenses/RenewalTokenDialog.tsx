import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Trash2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RenewalToken {
  id: string;
  token: string;
  is_used: boolean;
  renewal_days: number;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

interface RenewalTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenseId: string;
  licenseKey: string;
  customerName: string | null;
}

export const RenewalTokenDialog = ({
  open,
  onOpenChange,
  licenseId,
  licenseKey,
  customerName,
}: RenewalTokenDialogProps) => {
  const [tokens, setTokens] = useState<RenewalToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [renewalDays, setRenewalDays] = useState("30");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTokens();
    }
  }, [open, licenseId]);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("renewal_tokens")
        .select("*")
        .eq("license_id", licenseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTokens((data as RenewalToken[]) || []);
    } catch (error) {
      console.error("Error fetching renewal tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    setCreating(true);
    try {
      const { error } = await supabase.from("renewal_tokens").insert({
        license_id: licenseId,
        renewal_days: parseInt(renewalDays),
      });

      if (error) throw error;

      toast({
        title: "تم الإنشاء",
        description: "تم إنشاء رمز التجديد بنجاح",
      });
      fetchTokens();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل إنشاء رمز التجديد",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from("renewal_tokens")
        .delete()
        .eq("id", tokenId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف رمز التجديد",
      });
      fetchTokens();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل حذف الرمز",
        variant: "destructive",
      });
    }
  };

  const copyTelegramMessage = (token: RenewalToken) => {
    const message =
      `مرحباً${customerName ? ` ${customerName}` : ""}!\n\n` +
      `يمكنك تجديد ترخيصك عبر بوت التليجرام:\n\n` +
      `1. افتح البوت وأرسل:\n/renew ${licenseKey}\n\n` +
      `رمز التجديد صالح حتى: ${new Date(token.expires_at).toLocaleDateString("ar-EG")}\n` +
      `مدة التجديد: ${token.renewal_days} يوم`;

    navigator.clipboard.writeText(message);
    toast({
      title: "تم النسخ",
      description: "تم نسخ رسالة التجديد",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>رموز تجديد الترخيص</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {licenseKey} {customerName && `- ${customerName}`}
          </p>
        </DialogHeader>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="renewal_days">مدة التجديد (بالأيام)</Label>
            <Input
              id="renewal_days"
              type="number"
              min="1"
              max="365"
              value={renewalDays}
              onChange={(e) => setRenewalDays(e.target.value)}
            />
          </div>
          <Button onClick={createToken} disabled={creating}>
            <RefreshCw className={`ml-2 h-4 w-4 ${creating ? "animate-spin" : ""}`} />
            إنشاء رمز تجديد
          </Button>
        </div>

        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الحالة</TableHead>
                <TableHead>المدة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>ينتهي في</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : tokens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    لا توجد رموز تجديد
                  </TableCell>
                </TableRow>
              ) : (
                tokens.map((token) => {
                  const isExpired = new Date(token.expires_at) < new Date();
                  return (
                    <TableRow key={token.id}>
                      <TableCell>
                        {token.is_used ? (
                          <Badge variant="secondary">مستخدم</Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive">منتهي</Badge>
                        ) : (
                          <Badge variant="default">نشط</Badge>
                        )}
                      </TableCell>
                      <TableCell>{token.renewal_days} يوم</TableCell>
                      <TableCell>
                        {new Date(token.created_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell>
                        {new Date(token.expires_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!token.is_used && !isExpired && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="نسخ رسالة التجديد"
                              onClick={() => copyTelegramMessage(token)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="حذف"
                            onClick={() => deleteToken(token.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
