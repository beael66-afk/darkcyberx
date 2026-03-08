import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Cpu,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSecurityAlerts, SecurityAlert } from "@/hooks/useSecurityAlerts";
import { exportToCSV } from "@/lib/exportUtils";
import { useQueryClient } from "@tanstack/react-query";

// ── config ───────────────────────────────────────────────────────────────────
const typeLabels: Record<SecurityAlert["type"], string> = {
  suspicious_ip: "IP مشبوه",
  shared_hwid: "HWID مشترك",
  expiring_license: "ترخيص منتهٍ",
  pending_renewal: "طلب انتظار",
};

const typeIcons: Record<SecurityAlert["type"], React.ReactNode> = {
  suspicious_ip: <Shield className="h-5 w-5" />,
  shared_hwid: <Cpu className="h-5 w-5" />,
  expiring_license: <Clock className="h-5 w-5" />,
  pending_renewal: <AlertTriangle className="h-5 w-5" />,
};

const severityLabels: Record<SecurityAlert["severity"], string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

const severityConfig: Record<
  SecurityAlert["severity"],
  { dot: string; bg: string; border: string; text: string; badge: string; badgeVariant: string }
> = {
  high: {
    dot: "bg-destructive",
    bg: "bg-destructive/5 hover:bg-destructive/10",
    border: "border-destructive/30",
    text: "text-destructive",
    badge: "bg-destructive text-destructive-foreground",
    badgeVariant: "destructive",
  },
  medium: {
    dot: "bg-warning",
    bg: "bg-warning/5 hover:bg-warning/10",
    border: "border-warning/30",
    text: "text-warning-foreground",
    badge: "bg-warning text-warning-foreground",
    badgeVariant: "warning",
  },
  low: {
    dot: "bg-primary",
    bg: "bg-primary/5 hover:bg-primary/10",
    border: "border-primary/30",
    text: "text-primary",
    badge: "bg-primary text-primary-foreground",
    badgeVariant: "default",
  },
};

// ── stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border", className)}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function Alerts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: alerts = [], isLoading, isRefetching, dataUpdatedAt } =
    useSecurityAlerts();

  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  // ── derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filterType !== "all" && a.type !== filterType) return false;
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      return true;
    });
  }, [alerts, filterType, filterSeverity]);

  const highCount = alerts.filter((a) => a.severity === "high").length;
  const medCount = alerts.filter((a) => a.severity === "medium").length;
  const lowCount = alerts.filter((a) => a.severity === "low").length;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("ar-EG")
    : "—";

  // ── export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map((a) => ({
      النوع: typeLabels[a.type],
      الخطورة: severityLabels[a.severity],
      العنوان: a.title,
      التفاصيل: a.description,
      العدد: a.count ?? "",
      الرابط: a.link,
    }));
    exportToCSV(rows, `security-alerts-${new Date().toISOString().slice(0, 10)}`);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            التنبيهات الأمنية
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            آخر تحديث: {lastUpdated} — يتجدد تلقائياً كل دقيقة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["security-alerts"] })}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4 ml-1.5", isRefetching && "animate-spin")} />
            تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4 ml-1.5" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="إجمالي التنبيهات"
          value={alerts.length}
          icon={<Shield className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="خطورة عالية"
          value={highCount}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          className={highCount > 0 ? "border-destructive/40" : ""}
        />
        <StatCard
          label="خطورة متوسطة"
          value={medCount}
          icon={<Clock className="h-4 w-4 text-warning-foreground" />}
          className={medCount > 0 ? "border-warning/40" : ""}
        />
        <StatCard
          label="خطورة منخفضة"
          value={lowCount}
          icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            فلترة النتائج
            {(filterType !== "all" || filterSeverity !== "all") && (
              <Badge variant="secondary" className="text-[10px]">
                فعّال
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">النوع:</span>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="suspicious_ip">IP مشبوه</SelectItem>
                <SelectItem value="shared_hwid">HWID مشترك</SelectItem>
                <SelectItem value="expiring_license">ترخيص منتهٍ</SelectItem>
                <SelectItem value="pending_renewal">طلب انتظار</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">الخطورة:</span>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="high">عالية 🔴</SelectItem>
                <SelectItem value="medium">متوسطة 🟡</SelectItem>
                <SelectItem value="low">منخفضة 🔵</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(filterType !== "all" || filterSeverity !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setFilterType("all"); setFilterSeverity("all"); }}
            >
              مسح الفلاتر
            </Button>
          )}
          <span className="text-xs text-muted-foreground self-center mr-auto">
            {filtered.length} من {alerts.length} تنبيه
          </span>
        </CardContent>
      </Card>

      {/* Alert list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm animate-pulse">
              جاري فحص النظام...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold">لا توجد تنبيهات</p>
              <p className="text-sm text-muted-foreground">
                {filterType !== "all" || filterSeverity !== "all"
                  ? "جرّب تغيير الفلاتر"
                  : "كل شيء على ما يرام ✅"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((alert) => {
                const cfg = severityConfig[alert.severity];
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors group",
                      cfg.bg
                    )}
                    onClick={() => navigate(alert.link)}
                  >
                    {/* Severity dot */}
                    <div className="mt-1 shrink-0">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          cfg.dot,
                          alert.severity === "high" && "animate-pulse"
                        )}
                      />
                    </div>

                    {/* Icon */}
                    <div className={cn("mt-0.5 shrink-0", cfg.text)}>
                      {typeIcons[alert.type]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm">{alert.title}</p>
                        <span
                          className={cn(
                            "text-[10px] font-bold rounded-full px-2 py-0.5",
                            cfg.badge
                          )}
                        >
                          {severityLabels[alert.severity]}
                        </span>
                        <span className="text-[10px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
                          {typeLabels[alert.type]}
                        </span>
                        {alert.count !== undefined && (
                          <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-secondary text-secondary-foreground mr-auto">
                            العدد: {alert.count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
