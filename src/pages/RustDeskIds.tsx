import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Monitor, Search, Copy, Trash2, ExternalLink, RefreshCw, Users, Key, ChevronDown, ChevronRight, Plus, Pencil,
} from "lucide-react";
import RustDeskDeviceDialog from "@/components/rustdesk/RustDeskDeviceDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const RUSTDESK_PASSWORD = "123456medoissaA";

interface RustDeskEntry {
  id: string;
  customer_id: string;
  rustdesk_id: string;
  device_label: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
}

interface CustomerGroup {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  devices: RustDeskEntry[];
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const getInitials = (name: string) =>
  name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const RustDeskIds = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openCustomers, setOpenCustomers] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<RustDeskEntry | null>(null);
  const queryClient = useQueryClient();

  const toggleCustomer = (customerId: string) => {
    setOpenCustomers(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["rustdesk-ids"],
    queryFn: async () => {
      const [{ data: rdData }, { data: custData }] = await Promise.all([
        supabase.from("rustdesk_ids").select("*").order("customer_id").order("updated_at", { ascending: false }),
        supabase.from("customers").select("id, name, email"),
      ]);
      const custMap = new Map((custData || []).map(c => [c.id, c]));
      return (rdData || []).map(r => ({
        ...r,
        customer_name: custMap.get(r.customer_id)?.name || "—",
        customer_email: custMap.get(r.customer_id)?.email || "",
      })) as RustDeskEntry[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rustdesk_ids").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rustdesk-ids"] });
      toast.success("تم حذف الـ ID");
    },
    onError: () => toast.error("فشل الحذف"),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; customer_id: string; rustdesk_id: string; device_label: string }) => {
      if (data.id) {
        const { error } = await supabase.from("rustdesk_ids").update({
          customer_id: data.customer_id,
          rustdesk_id: data.rustdesk_id,
          device_label: data.device_label || null,
        }).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rustdesk_ids").insert({
          customer_id: data.customer_id,
          rustdesk_id: data.rustdesk_id,
          device_label: data.device_label || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rustdesk-ids"] });
      setDialogOpen(false);
      setEditingDevice(null);
      toast.success(editingDevice ? "تم تعديل الجهاز" : "تم إضافة الجهاز");
    },
    onError: (error: any) => {
      const msg = error?.message?.includes("rustdesk_ids_rustdesk_id_key")
        ? "هذا الـ RustDesk ID مسجّل بالفعل لعميل آخر"
        : "فشلت العملية";
      toast.error(msg);
    },
  });

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}`);
  };

  const openRustDeskApp = (rustdeskId: string) => {
    const cleanId = rustdeskId.replace(/\s+/g, "");
    navigator.clipboard.writeText(RUSTDESK_PASSWORD);
    toast.success("تم نسخ كلمة المرور للحافظة 🔑", { description: RUSTDESK_PASSWORD });
    window.location.href = `rustdesk://connection/new/${cleanId}`;
  };

  const openRustDeskWeb = (rustdeskId: string) => {
    const cleanId = rustdeskId.replace(/\s+/g, "");
    navigator.clipboard.writeText(RUSTDESK_PASSWORD);
    toast.success("تم نسخ كلمة المرور للحافظة 🔑", { description: RUSTDESK_PASSWORD });
    window.open(`https://rustdesk.com/web/#${cleanId}`, "_blank");
  };




  // Group entries by customer
  const grouped: CustomerGroup[] = [];
  const filtered = entries?.filter(e =>
    e.rustdesk_id.includes(searchTerm) ||
    e.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.device_label?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  filtered.forEach(entry => {
    const existing = grouped.find(g => g.customer_id === entry.customer_id);
    if (existing) {
      existing.devices.push(entry);
    } else {
      grouped.push({
        customer_id: entry.customer_id,
        customer_name: entry.customer_name || "—",
        customer_email: entry.customer_email || "",
        devices: [entry],
      });
    }
  });

  const totalCount = entries?.length || 0;
  const uniqueCustomers = new Set(entries?.map(e => e.customer_id)).size;

  // Color accents to rotate per customer card for visual variety
  const accentPalette = [
    { ring: "ring-violet-500/30", bar: "bg-gradient-to-b from-violet-500 to-violet-700", chip: "bg-violet-500/15 text-violet-600 dark:text-violet-300", soft: "from-violet-500/10" },
    { ring: "ring-sky-500/30", bar: "bg-gradient-to-b from-sky-500 to-sky-700", chip: "bg-sky-500/15 text-sky-600 dark:text-sky-300", soft: "from-sky-500/10" },
    { ring: "ring-emerald-500/30", bar: "bg-gradient-to-b from-emerald-500 to-emerald-700", chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", soft: "from-emerald-500/10" },
    { ring: "ring-amber-500/30", bar: "bg-gradient-to-b from-amber-500 to-amber-700", chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300", soft: "from-amber-500/10" },
    { ring: "ring-pink-500/30", bar: "bg-gradient-to-b from-pink-500 to-pink-700", chip: "bg-pink-500/15 text-pink-600 dark:text-pink-300", soft: "from-pink-500/10" },
    { ring: "ring-cyan-500/30", bar: "bg-gradient-to-b from-cyan-500 to-cyan-700", chip: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300", soft: "from-cyan-500/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-6 shadow-sm">
        <div className="absolute -top-10 -left-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 right-10 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-3 shadow-lg shadow-primary/20">
              <Monitor className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text">
                RustDesk IDs
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                معرّفات الأجهزة للدعم عن بعد — مرتبة حسب العميل
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => { setEditingDevice(null); setDialogOpen(true); }}
              className="shadow-md shadow-primary/20"
            >
              <Plus className="h-4 w-4 ml-1" />
              إضافة جهاز
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="bg-background/60 backdrop-blur">
              <RefreshCw className="h-4 w-4 ml-1" />
              تحديث
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border bg-gradient-to-br from-violet-500/10 via-card to-card hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-l from-violet-500 to-violet-700" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-violet-500/15 p-3 ring-1 ring-violet-500/20">
              <Monitor className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">إجمالي الأجهزة</p>
              <p className="text-3xl font-bold mt-0.5 text-foreground">{totalCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border bg-gradient-to-br from-emerald-500/10 via-card to-card hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-l from-emerald-500 to-emerald-700" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-500/15 p-3 ring-1 ring-emerald-500/20">
              <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">عملاء نشطون</p>
              <p className="text-3xl font-bold mt-0.5 text-foreground">{uniqueCustomers}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border bg-gradient-to-br from-amber-500/10 via-card to-card hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-l from-amber-500 to-amber-700" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-amber-500/15 p-3 ring-1 ring-amber-500/20 shrink-0">
              <Key className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">كلمة المرور الثابتة</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-md border border-amber-500/20 truncate">
                  {RUSTDESK_PASSWORD}
                </code>
                <button
                  onClick={() => copyText(RUSTDESK_PASSWORD, "كلمة المرور")}
                  className="p-1.5 rounded-md hover:bg-amber-500/15 transition-colors shrink-0"
                  title="نسخ"
                >
                  <Copy className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث باسم العميل أو ID الجهاز أو اسم الجهاز..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10 h-11 bg-card border-border/60 focus-visible:ring-primary/40 shadow-sm"
        />
      </div>

      {/* Grouped by customer */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Monitor className="h-10 w-10 mx-auto mb-3 opacity-30 animate-pulse" />
          جاري التحميل...
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Monitor className="h-12 w-12 opacity-20" />
            <p className="font-medium">لا توجد أجهزة مسجّلة بعد</p>
            <p className="text-xs">سيظهر ID الجهاز هنا بعد أن يسجّله العميل عبر البوت</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const isCollapsed = !openCustomers.has(group.customer_id);
            return (
              <Card key={group.customer_id} className="overflow-hidden border shadow-sm">
                {/* Customer Header */}
                <CardHeader
                  className="p-0 cursor-pointer select-none"
                  onClick={() => toggleCustomer(group.customer_id)}
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">
                          {getInitials(group.customer_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{group.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{group.customer_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Monitor className="h-3 w-3" />
                        {group.devices.length} {group.devices.length === 1 ? "جهاز" : "أجهزة"}
                      </Badge>
                      {isCollapsed
                        ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </CardHeader>

                {/* Devices */}
                {!isCollapsed && (
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {group.devices.map((entry, idx) => (
                        <div
                          key={entry.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group"
                        >
                          {/* Device info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded">
                                  {entry.rustdesk_id}
                                </code>
                                <button
                                  onClick={() => copyText(entry.rustdesk_id, "ID الجهاز")}
                                  className="opacity-50 hover:opacity-100 transition-opacity"
                                  title="نسخ ID"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                {entry.device_label && (
                                  <Badge variant="outline" className="text-xs">
                                    {entry.device_label}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                آخر تحديث: {formatDate(entry.updated_at)}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Button
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              onClick={() => openRustDeskApp(entry.rustdesk_id)}
                              title="فتح تطبيق RustDesk"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              اتصل
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-xs"
                              onClick={() => openRustDeskWeb(entry.rustdesk_id)}
                              title="فتح ويب RustDesk"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              ويب
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => { setEditingDevice(entry); setDialogOpen(true); }}
                              title="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>حذف ID الجهاز</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم حذف ID الجهاز{" "}
                                    <code className="font-mono bg-muted px-1 rounded">{entry.rustdesk_id}</code>{" "}
                                    للعميل <strong>{group.customer_name}</strong>.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate(entry.id)}
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <RustDeskDeviceDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingDevice(null); }}
        device={editingDevice}
        onSave={(data) => saveMutation.mutate({ ...data, id: editingDevice?.id })}
        isSaving={saveMutation.isPending}
      />
    </div>
  );
};

export default RustDeskIds;
