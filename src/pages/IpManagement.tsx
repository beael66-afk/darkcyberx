import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Shield, ShieldOff, Search, Ban, Globe, Activity, AlertTriangle, Clock,
  Trash2, Plus, Copy, RefreshCw,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface BlockedIp {
  id: string;
  ip_address: string;
  reason: string | null;
  created_at: string;
}

interface IpActivity {
  ip_address: string;
  request_count: number;
  last_seen: string;
  is_blocked: boolean;
}

const IpManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [addIpOpen, setAddIpOpen] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const queryClient = useQueryClient();

  // Fetch blocked IPs
  const { data: blockedIps, isLoading: blockedLoading } = useQuery({
    queryKey: ["blocked-ips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_ips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlockedIp[];
    },
  });

  // Fetch IP activity from logs
  const { data: ipActivity, isLoading: activityLoading, refetch: refetchActivity } = useQuery({
    queryKey: ["ip-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs")
        .select("ip_address, created_at")
        .not("ip_address", "is", null)
        .neq("ip_address", "unknown")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;

      // Aggregate by IP
      const ipMap = new Map<string, { count: number; lastSeen: string }>();
      for (const log of data || []) {
        if (!log.ip_address) continue;
        const existing = ipMap.get(log.ip_address);
        if (!existing) {
          ipMap.set(log.ip_address, { count: 1, lastSeen: log.created_at || "" });
        } else {
          existing.count++;
          if ((log.created_at || "") > existing.lastSeen) {
            existing.lastSeen = log.created_at || "";
          }
        }
      }

      const blockedSet = new Set((await supabase.from("blocked_ips").select("ip_address")).data?.map(b => b.ip_address) || []);

      return Array.from(ipMap.entries())
        .map(([ip, { count, lastSeen }]) => ({
          ip_address: ip,
          request_count: count,
          last_seen: lastSeen,
          is_blocked: blockedSet.has(ip),
        }))
        .sort((a, b) => b.request_count - a.request_count) as IpActivity[];
    },
  });

  // Block IP mutation
  const blockMutation = useMutation({
    mutationFn: async ({ ip, reason }: { ip: string; reason?: string }) => {
      const { error } = await supabase.from("blocked_ips").insert({
        ip_address: ip.trim(),
        reason: reason?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-ips"] });
      queryClient.invalidateQueries({ queryKey: ["ip-activity"] });
      toast.success("تم حظر الـ IP بنجاح");
      setAddIpOpen(false);
      setNewIp("");
      setNewReason("");
    },
    onError: (e: any) => toast.error(e.message?.includes("unique") ? "هذا الـ IP محظور بالفعل" : "فشل حظر الـ IP"),
  });

  // Unblock IP mutation
  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_ips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-ips"] });
      queryClient.invalidateQueries({ queryKey: ["ip-activity"] });
      toast.success("تم رفع الحظر بنجاح");
    },
    onError: () => toast.error("فشل رفع الحظر"),
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const copyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    toast.success("تم نسخ الـ IP");
  };

  const filteredBlocked = blockedIps?.filter(b =>
    b.ip_address.includes(searchTerm) || b.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActivity = ipActivity?.filter(a =>
    a.ip_address.includes(searchTerm)
  );

  const totalRequests = ipActivity?.reduce((s, a) => s + a.request_count, 0) || 0;
  const uniqueIps = ipActivity?.length || 0;
  const blockedCount = blockedIps?.length || 0;
  const blockedRequestCount = ipActivity?.filter(a => a.is_blocked).reduce((s, a) => s + a.request_count, 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            إدارة الـ IP
          </h1>
          <p className="text-muted-foreground mt-1">مراقبة وحظر عناوين IP المشبوهة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchActivity()}>
            <RefreshCw className="h-4 w-4 ml-1" />
            تحديث
          </Button>
          <Dialog open={addIpOpen} onOpenChange={setAddIpOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Ban className="h-4 w-4 ml-1" />
                حظر IP يدوي
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>حظر عنوان IP</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>عنوان IP</Label>
                  <Input
                    placeholder="مثال: 192.168.1.1"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>سبب الحظر (اختياري)</Label>
                  <Textarea
                    placeholder="مثال: نشاط مشبوه، هجوم brute force..."
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAddIpOpen(false)}>إلغاء</Button>
                  <Button
                    onClick={() => blockMutation.mutate({ ip: newIp, reason: newReason })}
                    disabled={!newIp.trim() || blockMutation.isPending}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    <Ban className="h-4 w-4 ml-1" />
                    حظر
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2.5"><Globe className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">IPs فريدة</p>
              <p className="text-2xl font-bold">{uniqueIps}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/15 p-2.5"><Activity className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
              <p className="text-2xl font-bold">{totalRequests}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-destructive/10 to-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-destructive/15 p-2.5"><Ban className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-xs text-muted-foreground">IPs محظورة</p>
              <p className="text-2xl font-bold">{blockedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-orange-500/15 p-2.5"><AlertTriangle className="h-5 w-5 text-orange-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">طلبات محظورة</p>
              <p className="text-2xl font-bold">{blockedRequestCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث بعنوان IP..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            نشاط الـ IPs
            {uniqueIps > 0 && <Badge variant="secondary" className="h-5 min-w-5 text-xs">{uniqueIps}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-2">
            <Ban className="h-4 w-4" />
            IPs المحظورة
            {blockedCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-xs">{blockedCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card className="border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">عنوان IP</TableHead>
                  <TableHead className="font-semibold">عدد الطلبات</TableHead>
                  <TableHead className="font-semibold">آخر نشاط</TableHead>
                  <TableHead className="font-semibold">الحالة</TableHead>
                  <TableHead className="font-semibold text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : !filteredActivity?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Globe className="h-10 w-10 opacity-30" />
                        <p>لا توجد بيانات IP بعد</p>
                        <p className="text-xs">ستظهر هنا عند استخدام API التفعيل</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActivity.map((item) => (
                    <TableRow key={item.ip_address} className={`group ${item.is_blocked ? "bg-destructive/5" : ""}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                          <code className="font-mono text-sm font-medium">{item.ip_address}</code>
                          <button
                            onClick={() => copyIp(item.ip_address)}
                            className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 rounded-full bg-primary/60"
                            style={{ width: `${Math.min((item.request_count / (Math.max(...(filteredActivity?.map(a => a.request_count) || [1]))) * 80), 80)}px` }}
                          />
                          <span className="font-semibold tabular-nums">{item.request_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(item.last_seen)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.is_blocked ? (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <Ban className="h-3 w-3" />محظور
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200">
                            <Shield className="h-3 w-3" />نشط
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          {item.is_blocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-xs"
                              onClick={() => {
                                const found = blockedIps?.find(b => b.ip_address === item.ip_address);
                                if (found) unblockMutation.mutate(found.id);
                              }}
                              disabled={unblockMutation.isPending}
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                              رفع الحظر
                            </Button>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Ban className="h-3.5 w-3.5" />
                                  حظر
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>حظر عنوان IP</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل تريد حظر <code className="font-mono bg-muted px-1 rounded">{item.ip_address}</code>؟
                                    <br />سيتم رفض جميع طلبات التفعيل من هذا الـ IP فوراً.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => blockMutation.mutate({ ip: item.ip_address, reason: "محظور من لوحة التحكم" })}
                                  >
                                    حظر
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Blocked Tab */}
        <TabsContent value="blocked">
          <Card className="border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">عنوان IP</TableHead>
                  <TableHead className="font-semibold">سبب الحظر</TableHead>
                  <TableHead className="font-semibold">تاريخ الحظر</TableHead>
                  <TableHead className="font-semibold text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : !filteredBlocked?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Shield className="h-10 w-10 opacity-30" />
                        <p>لا توجد IPs محظورة</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBlocked.map((blocked) => (
                    <TableRow key={blocked.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Ban className="h-4 w-4 text-destructive shrink-0" />
                          <code className="font-mono text-sm font-medium">{blocked.ip_address}</code>
                          <button
                            onClick={() => copyIp(blocked.ip_address)}
                            className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {blocked.reason || <span className="text-muted-foreground/50 italic">بدون سبب</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(blocked.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs"
                            onClick={() => unblockMutation.mutate(blocked.id)}
                            disabled={unblockMutation.isPending}
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                            رفع الحظر
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف من القائمة المحظورة</AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيتم حذف <code className="font-mono bg-muted px-1 rounded">{blocked.ip_address}</code> من قائمة الحظر.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => unblockMutation.mutate(blocked.id)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IpManagement;
