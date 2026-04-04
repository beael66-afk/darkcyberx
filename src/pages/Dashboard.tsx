import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Users, Package, Monitor, TrendingUp, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/DashboardStats";
import { LicenseChart } from "@/components/LicenseChart";
import { RevenueStats } from "@/components/RevenueStats";

interface Stats {
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  pendingLicenses: number;
  suspendedLicenses: number;
  totalCustomers: number;
  totalProducts: number;
  totalDevices: number;
  expiringSoon: number;
}


const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalLicenses: 0,
    activeLicenses: 0,
    expiredLicenses: 0,
    pendingLicenses: 0,
    suspendedLicenses: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalDevices: 0,
    expiringSoon: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const [
        totalLicenses,
        activeLicenses,
        expiredLicenses,
        pendingLicenses,
        suspendedLicenses,
        expiringSoon,
        customers,
        products,
        devices,
      ] = await Promise.all([
        supabase.from("licenses").select("*", { count: "exact", head: true }),
        supabase.from("licenses").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("licenses").select("*", { count: "exact", head: true }).eq("status", "expired"),
        supabase.from("licenses").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("licenses").select("*", { count: "exact", head: true }).eq("status", "suspended"),
        supabase.from("licenses").select("*", { count: "exact", head: true })
          .eq("status", "active")
          .not("expire_at", "is", null)
          .lte("expire_at", thirtyDaysFromNow.toISOString()),
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("devices").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalLicenses: totalLicenses.count || 0,
        activeLicenses: activeLicenses.count || 0,
        expiredLicenses: expiredLicenses.count || 0,
        pendingLicenses: pendingLicenses.count || 0,
        suspendedLicenses: suspendedLicenses.count || 0,
        totalCustomers: customers.count || 0,
        totalProducts: products.count || 0,
        totalDevices: devices.count || 0,
        expiringSoon: expiringSoon.count || 0,
      });

      
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Realtime subscriptions for all dashboard tables
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "licenses" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "logs" }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  const statCards = [
    {
      title: "إجمالي التراخيص",
      value: stats.totalLicenses,
      icon: KeyRound,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "التراخيص النشطة",
      value: stats.activeLicenses,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "العملاء",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "المنتجات",
      value: stats.totalProducts,
      icon: Package,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "الأجهزة المسجلة",
      value: stats.totalDevices,
      icon: Monitor,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "تنتهي قريباً",
      value: stats.expiringSoon,
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على نظام إدارة التراخيص</p>
      </div>

      <RevenueStats />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <StatCard
            key={card.title}
            {...card}
            index={index}
            loading={loading}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LicenseChart
          active={stats.activeLicenses}
          expired={stats.expiredLicenses}
          pending={stats.pendingLicenses}
          suspended={stats.suspendedLicenses}
        />
        <RecentActivity logs={logs} loading={loading} />
      </div>
    </div>
  );
};

export default Dashboard;
