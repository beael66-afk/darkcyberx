import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Monitor, Search, Copy, Trash2, ExternalLink, RefreshCw, Users, Key,
} from "lucide-react";
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

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const RustDeskIds = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["rustdesk-ids"],
    queryFn: async () => {
      const [{ data: rdData }, { data: custData }] = await Promise.all([
        supabase.from("rustdesk_ids").select("*").order("updated_at", { ascending: false }),
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

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}`);
  };

  const openRustDesk = (rustdeskId: string) => {
    window.open(`https://web.rustdesk.com/?id=${rustdeskId}&password=${RUSTDESK_PASSWORD}`, "_blank");
  };

  const filtered = entries?.filter(e =>
    e.rustdesk_id.includes(searchTerm) ||
    e.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.device_label?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCount = entries?.length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Monitor className="h-8 w-8 text-primary" />
            RustDesk IDs
          </h1>
          <p className="text-muted-foreground mt-1">معرّفات الأجهزة للدعم عن بعد عبر RustDesk</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 ml-1" />
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2.5"><Monitor className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الأجهزة المسجّلة</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-green-500/15 p-2.5"><Users className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">كلمة المرور الثابتة</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <code className="text-sm font-mono font-bold">{RUSTDESK_PASSWORD}</code>
                <button onClick={() => copyText(RUSTDESK_PASSWORD, "كلمة المرور")}>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/15 p-2.5"><Key className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">طريقة التسجيل</p>
              <p className="text-sm font-medium mt-0.5">عبر بوت التليجرام</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث باسم العميل أو ID الجهاز..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">العميل</TableHead>
              <TableHead className="font-semibold">RustDesk ID</TableHead>
              <TableHead className="font-semibold">اسم الجهاز</TableHead>
              <TableHead className="font-semibold">آخر تحديث</TableHead>
              <TableHead className="font-semibold text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Monitor className="h-10 w-10 opacity-30" />
                    <p>لا توجد أجهزة مسجّلة بعد</p>
                    <p className="text-xs">سيظهر ID الجهاز هنا بعد أن يسجّله العميل عبر البوت</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.id} className="group">
                  <TableCell>
                    <div>
                      <p className="font-medium">{entry.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{entry.customer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded">
                        {entry.rustdesk_id}
                      </code>
                      <button
                        onClick={() => copyText(entry.rustdesk_id, "ID الجهاز")}
                        className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.device_label ? (
                      <Badge variant="secondary" className="text-xs">
                        {entry.device_label}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(entry.updated_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => openRustDesk(entry.rustdesk_id)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        اتصل الآن
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
                              للعميل <strong>{entry.customer_name}</strong>.
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default RustDeskIds;
