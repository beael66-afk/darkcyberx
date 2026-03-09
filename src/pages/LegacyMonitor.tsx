import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Activity,
  Globe,
  Key,
  Clock,
  Ban,
  RefreshCw,
  Search,
  AlertTriangle,
  Users,
  ShieldX,
  Cpu,
  PauseCircle,
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { arSA } from "date-fns/locale";

interface LegacyLog {
  id: string;
  created_at: string | null;
  ip_address: string | null;
  description: string;
}

function parseDescription(desc: string) {
  const keyMatch = desc.match(/مفتاح: ([^\s|]+)/);
  const hwidMatch = desc.match(/HWID: ([^\s|]+)/);
  const ipMatch = desc.match(/IP: ([^\s|]+)/);
  return {
    licenseKey: keyMatch?.[1] ?? null,
    hwid: hwidMatch?.[1] && hwidMatch[1] !== "غير" ? hwidMatch[1] : null,
    ip: ipMatch?.[1] ?? null,
  };
}

type DateFilter = "today" | "week" | "all";

export default function LegacyMonitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchIp, setSearchIp] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [blockDialog, setBlockDialog] = useState<{ ip: string; reason: string } | null>(null);
  const [blockAllDialog, setBlockAllDialog] = useState(false);
  const [blockHwidDialog, setBlockHwidDialog] = useState<{ hwid: string; reason: string } | null>(null);
  const [suspendDialog, setSuspendDialog] = useState<{ licenseKey: string; licenseId: string } | null>(null);

  // Fetch legacy tool logs
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["legacy-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs")
        .select("id, created_at, ip_address, description")
        .eq("entity_type", "legacy_tool")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as LegacyLog[];
    },
  });

  // Fetch already blocked IPs
  const { data: blockedIps = [] } = useQuery({
    queryKey: ["blocked-ips-set"],
    queryFn: async () => {
      const { data } = await supabase.from("blocked_ips").select("ip_address");
      return (data ?? []).map((r) => r.ip_address);
    },
  });

  // Fetch already blocked HWIDs
  const { data: blockedHwids = [] } = useQuery({
    queryKey: ["blocked-hwids-set"],
    queryFn: async () => {
      const { data } = await supabase.from("blocked_hwids").select("hwid");
      return (data ?? []).map((r) => r.hwid);
    },
  });

  const blockIpMutation = useMutation({
    mutationFn: async ({ ip, reason }: { ip: string; reason: string }) => {
      const { error } = await supabase.from("blocked_ips").insert({
        ip_address: ip,
        reason: reason || "حجب من صفحة مراقبة الأداة القديمة",
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: "✅ تم الحجب", description: `تم حجب IP: ${vars.ip}` });
      queryClient.invalidateQueries({ queryKey: ["blocked-ips-set"] });
      setBlockDialog(null);
    },
    onError: (e: Error) => {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    },
  });

  const blockHwidMutation = useMutation({
    mutationFn: async ({ hwid, reason }: { hwid: string; reason: string }) => {
      const { error } = await supabase.from("blocked_hwids").insert({
        hwid,
        reason: reason || "حجب من صفحة مراقبة الأداة القديمة",
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: "✅ تم حجب الجهاز", description: `HWID: ${vars.hwid.substring(0, 20)}...` });
      queryClient.invalidateQueries({ queryKey: ["blocked-hwids-set"] });
      setBlockHwidDialog(null);
    },
    onError: (e: Error) => {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    },
  });

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Date filter
    if (dateFilter === "today") {
      const today = startOfDay(new Date());
      result = result.filter((l) => l.created_at && new Date(l.created_at) >= today);
    } else if (dateFilter === "week") {
      const weekAgo = subDays(new Date(), 7);
      result = result.filter((l) => l.created_at && new Date(l.created_at) >= weekAgo);
    }

    // IP search
    if (searchIp.trim()) {
      const q = searchIp.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.ip_address?.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, dateFilter, searchIp]);

  // Stats
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const todayLogs = logs.filter((l) => l.created_at && new Date(l.created_at) >= today);
    const uniqueIps = new Set(logs.map((l) => l.ip_address).filter(Boolean));
    const uniqueKeys = new Set(
      logs.map((l) => parseDescription(l.description).licenseKey).filter(Boolean)
    );
    const lastAttempt = logs[0]?.created_at;
    return { todayCount: todayLogs.length, uniqueIps: uniqueIps.size, uniqueKeys: uniqueKeys.size, lastAttempt };
  }, [logs]);

  // All unique IPs from filtered results
  const uniqueFilteredIps = useMemo(() => {
    return [...new Set(filteredLogs.map((l) => l.ip_address).filter(Boolean) as string[])];
  }, [filteredLogs]);

  const handleBlockAll = async () => {
    const unblocked = uniqueFilteredIps.filter((ip) => !blockedIps.includes(ip));
    if (unblocked.length === 0) {
      toast({ title: "لا يوجد IPs جديدة للحجب", description: "كل الـ IPs محجوبة مسبقاً." });
      setBlockAllDialog(false);
      return;
    }
    const inserts = unblocked.map((ip) => ({
      ip_address: ip,
      reason: "حجب جماعي من صفحة مراقبة الأداة القديمة",
    }));
    const { error } = await supabase.from("blocked_ips").insert(inserts);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ تم الحجب الجماعي", description: `تم حجب ${inserts.length} عنوان IP` });
      queryClient.invalidateQueries({ queryKey: ["blocked-ips-set"] });
    }
    setBlockAllDialog(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-destructive" />
            مراقبة الأداة القديمة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            تتبع كل محاولات الوصول من الأداة القديمة واتخاذ الإجراءات اللازمة
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 ml-1" />
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Activity className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">محاولات اليوم</p>
              <p className="text-2xl font-bold text-foreground">{stats.todayCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 bg-warning/10 rounded-lg">
              <Globe className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">عناوين IP مختلفة</p>
              <p className="text-2xl font-bold text-foreground">{stats.uniqueIps}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <Key className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">مفاتيح مختلفة</p>
              <p className="text-2xl font-bold text-foreground">{stats.uniqueKeys}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">آخر محاولة</p>
              <p className="text-sm font-semibold text-foreground">
                {stats.lastAttempt
                  ? format(new Date(stats.lastAttempt), "HH:mm - dd MMM", { locale: arSA })
                  : "لا يوجد"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert banner if activity today */}
      {stats.todayCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{stats.todayCount}</strong> محاولة اليوم من {new Set(logs.filter(l => l.created_at && new Date(l.created_at) >= startOfDay(new Date())).map(l => l.ip_address)).size} عنوان IP مختلف — هؤلاء العملاء لم يحدّثوا الأداة بعد.
          </span>
        </div>
      )}

      {/* Filters & Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالـ IP أو المفتاح..."
                  value={searchIp}
                  onChange={(e) => setSearchIp(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">الأسبوع</SelectItem>
                  <SelectItem value="all">الكل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBlockAllDialog(true)}
              disabled={uniqueFilteredIps.length === 0}
            >
              <ShieldX className="h-4 w-4 ml-1" />
              حجب كل الـ IPs ({uniqueFilteredIps.filter(ip => !blockedIps.includes(ip)).length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>لا توجد محاولات من الأداة القديمة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الوقت</TableHead>
                  <TableHead className="text-right">عنوان IP</TableHead>
                  <TableHead className="text-right">مفتاح الترخيص</TableHead>
                  <TableHead className="text-right">HWID</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const parsed = parseDescription(log.description);
                  const ip = log.ip_address ?? parsed.ip ?? "unknown";
                  const isBlocked = blockedIps.includes(ip);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {log.created_at
                          ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{ip}</code>
                      </TableCell>
                      <TableCell>
                        {parsed.licenseKey && parsed.licenseKey !== "unknown" ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {parsed.licenseKey}
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-xs">غير محدد</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {parsed.hwid ? (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {parsed.hwid.substring(0, 20)}...
                            </code>
                            {blockedHwids.includes(parsed.hwid) ? (
                              <Badge variant="destructive" className="text-xs gap-1 shrink-0">
                                <Cpu className="h-3 w-3" />
                                محجوب
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs px-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"
                                onClick={() =>
                                  setBlockHwidDialog({
                                    hwid: parsed.hwid!,
                                    reason: `حجب من مراقبة الأداة القديمة — مفتاح: ${parsed.licenseKey ?? "غير محدد"} — IP: ${ip}`,
                                  })
                                }
                              >
                                <Cpu className="h-3 w-3 ml-1" />
                                حجب HWID
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isBlocked ? (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <Shield className="h-3 w-3" />
                            IP محجوب
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Activity className="h-3 w-3" />
                            نشط
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isBlocked && ip !== "unknown" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setBlockDialog({
                                ip,
                                reason: `حجب من مراقبة الأداة القديمة — مفتاح: ${parsed.licenseKey ?? "غير محدد"}`,
                              })
                            }
                          >
                            <Ban className="h-3 w-3 ml-1" />
                            حجب IP
                          </Button>
                        )}
                        {isBlocked && (
                          <span className="text-xs text-muted-foreground">تم حجب الـ IP</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Block Single IP Dialog */}
      <Dialog open={!!blockDialog} onOpenChange={() => setBlockDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              تأكيد حجب IP
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              سيتم حجب العنوان التالي من جميع عمليات التفعيل:
            </p>
            <code className="block bg-muted px-4 py-2 rounded text-sm font-mono text-center">
              {blockDialog?.ip}
            </code>
            <Input
              value={blockDialog?.reason ?? ""}
              onChange={(e) =>
                setBlockDialog((prev) => prev ? { ...prev, reason: e.target.value } : null)
              }
              placeholder="سبب الحجب..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                blockDialog && blockIpMutation.mutate({ ip: blockDialog.ip, reason: blockDialog.reason })
              }
              disabled={blockIpMutation.isPending}
            >
              {blockIpMutation.isPending ? "جاري الحجب..." : "تأكيد الحجب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block All Dialog */}
      <Dialog open={blockAllDialog} onOpenChange={setBlockAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldX className="h-5 w-5" />
              حجب جماعي
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              سيتم حجب <strong>{uniqueFilteredIps.filter(ip => !blockedIps.includes(ip)).length}</strong> عنوان IP من النتائج المعروضة حالياً (غير المحجوبة منهم).
            </p>
            <div className="bg-muted rounded p-3 max-h-32 overflow-y-auto space-y-1">
              {uniqueFilteredIps.filter(ip => !blockedIps.includes(ip)).map(ip => (
                <code key={ip} className="block text-xs font-mono">{ip}</code>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockAllDialog(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleBlockAll}>
              حجب الكل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block HWID Dialog */}
      <Dialog open={!!blockHwidDialog} onOpenChange={() => setBlockHwidDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Cpu className="h-5 w-5" />
              تأكيد حجب الجهاز (HWID)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              سيتم حجب هذا الجهاز من جميع عمليات التفعيل (الأداة القديمة والجديدة):
            </p>
            <code className="block bg-muted px-4 py-2 rounded text-xs font-mono break-all text-center">
              {blockHwidDialog?.hwid}
            </code>
            <Input
              value={blockHwidDialog?.reason ?? ""}
              onChange={(e) =>
                setBlockHwidDialog((prev) => prev ? { ...prev, reason: e.target.value } : null)
              }
              placeholder="سبب الحجب..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockHwidDialog(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                blockHwidDialog && blockHwidMutation.mutate({ hwid: blockHwidDialog.hwid, reason: blockHwidDialog.reason })
              }
              disabled={blockHwidMutation.isPending}
            >
              {blockHwidMutation.isPending ? "جاري الحجب..." : "تأكيد حجب الجهاز"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
