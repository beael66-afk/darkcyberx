import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search, ShoppingCart, Clock, CheckCircle2, XCircle, Calendar, User, Key, DollarSign, UserPlus,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ─────────────────────────────────────────────
interface RenewalRequest {
  id: string;
  days: number;
  amount: number;
  status: string;
  telegram_chat_id: number | null;
  receipt_note: string | null;
  admin_note: string | null;
  created_at: string;
  customers: { id: string; name: string; email: string } | null;
  licenses: { id: string; license_key: string; expire_at: string | null; products: { name: string } | null } | null;
}

interface RegistrationRequest {
  id: string;
  telegram_chat_id: number;
  name: string;
  email: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pending: { label: "قيد الانتظار", variant: "outline", icon: Clock },
  confirmed: { label: "مؤكد", variant: "default", icon: CheckCircle2 },
  rejected: { label: "مرفوض", variant: "destructive", icon: XCircle },
  approved: { label: "مفعّل", variant: "default", icon: CheckCircle2 },
};

// ─── Main Component ────────────────────────────────────
const RenewalOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectType, setRejectType] = useState<"renewal" | "registration">("renewal");
  const queryClient = useQueryClient();

  // ─── Renewal Requests Query ────────────────────────
  const { data: requests, isLoading } = useQuery({
    queryKey: ["renewal-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renewal_requests")
        .select("*, customers(id, name, email), licenses(id, license_key, expire_at, products(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as RenewalRequest[];
    },
  });

  // ─── Registration Requests Query ───────────────────
  const { data: regRequests, isLoading: regLoading } = useQuery({
    queryKey: ["registration-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registration_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RegistrationRequest[];
    },
  });

  // ─── Renewal Mutations ─────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: async ({ requestId, action, adminNote }: { requestId: string; action: string; adminNote?: string }) => {
      const { data, error } = await supabase.functions.invoke("confirm-renewal", {
        body: { requestId, action, adminNote },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-requests"] });
      toast.success(variables.action === "confirm" ? "تم تأكيد الطلب وتجديد الترخيص" : "تم رفض الطلب");
    },
    onError: (error: any) => toast.error("حدث خطأ: " + (error.message || "فشل العملية")),
  });

  // ─── Registration Mutations ────────────────────────
  const approveRegMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      // Get the request details
      const { data: req, error: fetchErr } = await supabase
        .from("registration_requests")
        .select("*")
        .eq("id", requestId)
        .single();
      if (fetchErr) throw fetchErr;

      // Create customer
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .insert({ name: req.name, email: req.email })
        .select()
        .single();
      if (custErr) throw custErr;

      // Link telegram
      await supabase
        .from("telegram_links")
        .insert({ customer_id: customer.id, telegram_chat_id: req.telegram_chat_id });

      // Update request status
      await supabase
        .from("registration_requests")
        .update({ status: "approved" })
        .eq("id", requestId);

      // Notify via Telegram
      const TELEGRAM_BOT_TOKEN = await getSecretForNotification();
      if (TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: req.telegram_chat_id,
            text: "━━━━━━━━━━━━━━━━━━━━━\n✅ *تم تفعيل حسابك بنجاح!*\n━━━━━━━━━━━━━━━━━━━━━\n\nيمكنك الآن استخدام البوت لعرض تراخيصك والتجديد.\n\nاضغط /start للبدء.",
            parse_mode: "Markdown",
          }),
        });
      }

      return customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registration-requests"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("تم تفعيل الحساب وربطه بالبوت بنجاح");
    },
    onError: (error: any) => toast.error("حدث خطأ: " + (error.message || "فشل")),
  });

  const rejectRegMutation = useMutation({
    mutationFn: async ({ requestId, adminNote }: { requestId: string; adminNote?: string }) => {
      const { data: req } = await supabase
        .from("registration_requests")
        .select("telegram_chat_id")
        .eq("id", requestId)
        .single();

      await supabase
        .from("registration_requests")
        .update({ status: "rejected", admin_note: adminNote || null })
        .eq("id", requestId);

      if (req?.telegram_chat_id) {
        const TELEGRAM_BOT_TOKEN = await getSecretForNotification();
        if (TELEGRAM_BOT_TOKEN) {
          const reason = adminNote ? `\n📝 السبب: ${adminNote}` : "";
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: req.telegram_chat_id,
              text: `❌ *تم رفض طلب التسجيل*${reason}\n\nيمكنك المحاولة مرة أخرى أو التواصل مع الدعم.`,
              parse_mode: "Markdown",
            }),
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registration-requests"] });
      toast.success("تم رفض طلب التسجيل");
    },
    onError: (error: any) => toast.error("حدث خطأ: " + (error.message || "فشل")),
  });

  // Helper to get bot token for notifications from edge function
  async function getSecretForNotification(): Promise<string | null> {
    try {
      // We'll use the edge function to send notifications instead
      return null;
    } catch {
      return null;
    }
  }

  // ─── Stats ─────────────────────────────────────────
  const pendingCount = requests?.filter((r) => r.status === "pending").length || 0;
  const confirmedCount = requests?.filter((r) => r.status === "confirmed").length || 0;
  const totalRevenue = requests?.filter((r) => r.status === "confirmed").reduce((sum, r) => sum + r.amount, 0) || 0;
  const pendingRegCount = regRequests?.filter((r) => r.status === "pending").length || 0;

  const filteredRequests = requests?.filter((r) => {
    const matchesSearch =
      r.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customers?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.licenses?.license_key?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRegRequests = regRequests?.filter((r) => {
    const matchesSearch =
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReject = () => {
    if (!selectedRequestId) return;
    if (rejectType === "renewal") {
      confirmMutation.mutate({ requestId: selectedRequestId, action: "reject", adminNote: rejectNote });
    } else {
      rejectRegMutation.mutate({ requestId: selectedRequestId, adminNote: rejectNote });
    }
    setRejectDialogOpen(false);
    setRejectNote("");
    setSelectedRequestId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-primary" />
            الطلبات
          </h1>
          <p className="text-muted-foreground mt-1">إدارة طلبات التسجيل والتجديد</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-blue-500/15 p-3"><UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
            <div>
              <p className="text-sm text-muted-foreground">طلبات تسجيل</p>
              <p className="text-2xl font-bold">{pendingRegCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-orange-500/15 p-3"><Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" /></div>
            <div>
              <p className="text-sm text-muted-foreground">تجديدات معلقة</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-green-500/15 p-3"><CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
            <div>
              <p className="text-sm text-muted-foreground">مؤكدة</p>
              <p className="text-2xl font-bold">{confirmedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-primary/15 p-3"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold">{totalRevenue} جنيه</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="ابحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "confirmed", "rejected"].map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
              {s === "all" ? "الكل" : statusConfig[s]?.label || s}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="renewals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="renewals" className="gap-2">
            🔄 طلبات التجديد
            {pendingCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-xs">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="registrations" className="gap-2">
            📝 طلبات التسجيل
            {pendingRegCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-xs">{pendingRegCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Renewal Requests Tab */}
        <TabsContent value="renewals">
          <Card className="border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">العميل</TableHead>
                  <TableHead className="font-semibold">الترخيص</TableHead>
                  <TableHead className="font-semibold">الأيام</TableHead>
                  <TableHead className="font-semibold">المبلغ</TableHead>
                  <TableHead className="font-semibold">الحالة</TableHead>
                  <TableHead className="font-semibold">التاريخ</TableHead>
                  <TableHead className="font-semibold text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : filteredRequests?.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12"><div className="flex flex-col items-center gap-2 text-muted-foreground"><ShoppingCart className="h-10 w-10 opacity-30" /><p>لا توجد طلبات</p></div></TableCell></TableRow>
                ) : (
                  filteredRequests?.map((req) => {
                    const config = statusConfig[req.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <TableRow key={req.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{req.customers?.name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{req.customers?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-mono text-xs">{req.licenses?.license_key || "—"}</p>
                              <p className="text-xs text-muted-foreground">{req.licenses?.products?.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{req.days} يوم</TableCell>
                        <TableCell className="font-semibold">{req.amount} جنيه</TableCell>
                        <TableCell><Badge variant={config.variant} className="gap-1"><StatusIcon className="h-3 w-3" />{config.label}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(req.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                        </TableCell>
                        <TableCell>
                          {req.status === "pending" ? (
                            <div className="flex gap-1">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" className="h-8 gap-1"><CheckCircle2 className="h-4 w-4" />تأكيد</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>تأكيد طلب التجديد</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      سيتم إضافة <strong>{req.days} يوم</strong> للترخيص وإبلاغ العميل <strong>{req.customers?.name}</strong>.
                                      <br /><br />المبلغ: <strong>{req.amount} جنيه</strong>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => confirmMutation.mutate({ requestId: req.id, action: "confirm" })} disabled={confirmMutation.isPending}>تأكيد التجديد</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Button size="sm" variant="ghost" className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setSelectedRequestId(req.id); setRejectType("renewal"); setRejectDialogOpen(true); }}>
                                <XCircle className="h-4 w-4" />رفض
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{req.admin_note && `📝 ${req.admin_note}`}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Registration Requests Tab */}
        <TabsContent value="registrations">
          <Card className="border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">الاسم</TableHead>
                  <TableHead className="font-semibold">البريد الإلكتروني</TableHead>
                  <TableHead className="font-semibold">الحالة</TableHead>
                  <TableHead className="font-semibold">التاريخ</TableHead>
                  <TableHead className="font-semibold text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : filteredRegRequests?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12"><div className="flex flex-col items-center gap-2 text-muted-foreground"><UserPlus className="h-10 w-10 opacity-30" /><p>لا توجد طلبات تسجيل</p></div></TableCell></TableRow>
                ) : (
                  filteredRegRequests?.map((req) => {
                    const config = statusConfig[req.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{req.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{req.email}</TableCell>
                        <TableCell><Badge variant={config.variant} className="gap-1"><StatusIcon className="h-3 w-3" />{config.label}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(req.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                        </TableCell>
                        <TableCell>
                          {req.status === "pending" ? (
                            <div className="flex gap-1">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" className="h-8 gap-1"><CheckCircle2 className="h-4 w-4" />تفعيل</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>تفعيل حساب العميل</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      سيتم إنشاء عميل جديد باسم <strong>{req.name}</strong> وربط حسابه بالبوت تلقائياً.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => approveRegMutation.mutate({ requestId: req.id })} disabled={approveRegMutation.isPending}>تفعيل الحساب</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Button size="sm" variant="ghost" className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setSelectedRequestId(req.id); setRejectType("registration"); setRejectDialogOpen(true); }}>
                                <XCircle className="h-4 w-4" />رفض
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{req.admin_note && `📝 ${req.admin_note}`}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الطلب</DialogTitle>
            <DialogDescription>سيتم إبلاغ العميل بالرفض عبر التليجرام.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="سبب الرفض (اختياري)..." value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleReject} disabled={confirmMutation.isPending || rejectRegMutation.isPending}>رفض الطلب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RenewalOrders;
