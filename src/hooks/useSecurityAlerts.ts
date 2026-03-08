import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SecurityAlert {
  id: string;
  type: "suspicious_ip" | "shared_hwid" | "expiring_license" | "pending_renewal";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  count?: number;
  link: string;
  metadata?: Record<string, unknown>;
}

export function useSecurityAlerts() {
  return useQuery({
    queryKey: ["security-alerts"],
    refetchInterval: 60_000, // refresh every minute
    staleTime: 30_000,
    queryFn: async (): Promise<SecurityAlert[]> => {
      const alerts: SecurityAlert[] = [];

      // ── 1. Suspicious IPs: many failed attempts, not blocked ──────────────
      const [ipLogsResult, blockedIpsResult] = await Promise.all([
        supabase
          .from("logs")
          .select("ip_address")
          .eq("entity_type", "security")
          .not("ip_address", "is", null),
        supabase.from("blocked_ips").select("ip_address"),
      ]);

      if (ipLogsResult.data) {
        const blockedSet = new Set(
          (blockedIpsResult.data || []).map((b) => b.ip_address)
        );

        // Count per IP
        const ipCounts: Record<string, number> = {};
        ipLogsResult.data.forEach(({ ip_address }) => {
          if (ip_address && !blockedSet.has(ip_address)) {
            ipCounts[ip_address] = (ipCounts[ip_address] || 0) + 1;
          }
        });

        // Threshold: 20+ failed attempts → alert
        Object.entries(ipCounts)
          .filter(([, count]) => count >= 20)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([ip, count]) => {
            alerts.push({
              id: `suspicious_ip_${ip}`,
              type: "suspicious_ip",
              severity: count >= 40 ? "high" : "medium",
              title: `IP مشبوه: ${ip}`,
              description: `${count} محاولة فاشلة ولم يتم حجبه بعد`,
              count,
              link: "/ip-management",
              metadata: { ip },
            });
          });
      }

      // ── 2. Shared HWIDs across different licenses ─────────────────────────
      const { data: deviceRows } = await supabase
        .from("devices")
        .select("hwid, license_id, licenses(customer_id, customers(name))")
        .eq("is_active", true);

      if (deviceRows) {
        // Map hwid → set of customer_ids
        const hwidCustomers: Record<string, Set<string>> = {};
        const hwidNames: Record<string, string[]> = {};

        deviceRows.forEach((d) => {
          const hwid = d.hwid;
          const custId = (d.licenses as any)?.customer_id as string | undefined;
          const custName = (d.licenses as any)?.customers?.name as
            | string
            | undefined;
          if (!custId) return;
          if (!hwidCustomers[hwid]) {
            hwidCustomers[hwid] = new Set();
            hwidNames[hwid] = [];
          }
          if (!hwidCustomers[hwid].has(custId)) {
            hwidCustomers[hwid].add(custId);
            if (custName && !hwidNames[hwid].includes(custName)) {
              hwidNames[hwid].push(custName);
            }
          }
        });

        Object.entries(hwidCustomers)
          .filter(([, customers]) => customers.size >= 2)
          .slice(0, 5)
          .forEach(([hwid, customers]) => {
            const names = hwidNames[hwid].slice(0, 3).join("، ");
            alerts.push({
              id: `shared_hwid_${hwid}`,
              type: "shared_hwid",
              severity: "high",
              title: `HWID مشترك بين ${customers.size} عملاء`,
              description: `${hwid.substring(0, 12)}... — ${names}`,
              count: customers.size,
              link: "/devices",
              metadata: { hwid, customerNames: hwidNames[hwid] },
            });
          });
      }

      // ── 3. Licenses expiring within 7 days ────────────────────────────────
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      const now = new Date().toISOString();

      const { data: expiringLicenses } = await supabase
        .from("licenses")
        .select("id, license_key, expire_at, customers(name)")
        .eq("status", "active")
        .not("expire_at", "is", null)
        .lte("expire_at", in7Days.toISOString())
        .gte("expire_at", now)
        .limit(50);

      if (expiringLicenses && expiringLicenses.length > 0) {
        alerts.push({
          id: "expiring_licenses",
          type: "expiring_license",
          severity: expiringLicenses.length >= 5 ? "high" : "medium",
          title: `${expiringLicenses.length} ترخيص ينتهي خلال 7 أيام`,
          description: expiringLicenses
            .slice(0, 2)
            .map(
              (l) =>
                `${(l.customers as any)?.name || "—"}: ${l.license_key}`
            )
            .join(" • "),
          count: expiringLicenses.length,
          link: "/licenses",
        });
      }

      // ── 4. Pending renewal requests ───────────────────────────────────────
      const { data: pendingRenewals } = await supabase
        .from("renewal_requests")
        .select("id, status")
        .eq("status", "pending");

      const pendingCount =
        (pendingRenewals?.length || 0);

      const { data: pendingRegistrations } = await supabase
        .from("registration_requests")
        .select("id")
        .eq("status", "pending");

      const regCount = pendingRegistrations?.length || 0;
      const totalPending = pendingCount + regCount;

      if (totalPending > 0) {
        alerts.push({
          id: "pending_renewals",
          type: "pending_renewal",
          severity: totalPending >= 5 ? "medium" : "low",
          title: `${totalPending} طلب انتظار`,
          description: [
            pendingCount > 0 ? `${pendingCount} طلب تجديد` : "",
            regCount > 0 ? `${regCount} طلب تسجيل` : "",
          ]
            .filter(Boolean)
            .join(" • "),
          count: totalPending,
          link: "/renewal-orders",
        });
      }

      // Sort: high → medium → low
      const order = { high: 0, medium: 1, low: 2 };
      alerts.sort((a, b) => order[a.severity] - order[b.severity]);

      return alerts;
    },
  });
}
