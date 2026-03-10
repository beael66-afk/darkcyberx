import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface RustDeskDevice {
  id?: string;
  customer_id: string;
  rustdesk_id: string;
  device_label: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: RustDeskDevice | null;
  onSave: (data: { customer_id: string; rustdesk_id: string; device_label: string }) => void;
  isSaving: boolean;
}

const RustDeskDeviceDialog = ({ open, onOpenChange, device, onSave, isSaving }: Props) => {
  const [customerId, setCustomerId] = useState("");
  const [rustdeskId, setRustdeskId] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, name, email").order("name");
      return data || [];
    },
  });

  useEffect(() => {
    if (open) {
      setCustomerId(device?.customer_id || "");
      setRustdeskId(device?.rustdesk_id || "");
      setDeviceLabel(device?.device_label || "");
    }
  }, [open, device]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !rustdeskId.trim()) return;
    onSave({ customer_id: customerId, rustdesk_id: rustdeskId.trim(), device_label: deviceLabel.trim() });
  };

  const isEdit = !!device?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل جهاز" : "إضافة جهاز جديد"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>العميل</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر العميل..." />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>RustDesk ID</Label>
            <Input
              value={rustdeskId}
              onChange={(e) => setRustdeskId(e.target.value)}
              placeholder="مثال: 123456789"
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>اسم الجهاز (اختياري)</Label>
            <Input
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
              placeholder="مثال: كمبيوتر المكتب"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={!customerId || !rustdeskId.trim() || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
              {isEdit ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RustDeskDeviceDialog;
