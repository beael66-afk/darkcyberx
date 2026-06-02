import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueData {
  dailyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  activeSubscribers: number;
}

export const RevenueStats = () => {
  const [data, setData] = useState<RevenueData>({
    dailyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    activeSubscribers: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchRevenue = async () => {
    try {
      // Get all telegram-linked customers
      const { data: telegramLinks } = await supabase
        .from("telegram_links")
        .select("customer_id");

      const linkedIds = (telegramLinks || []).map((l) => l.customer_id).filter(Boolean) as string[];

      // Get manually-included customers (not linked but marked include_in_revenue)
      const { data: includedCustomers } = await supabase
        .from("customers")
        .select("id")
        .eq("include_in_revenue", true);

      const includedIds = (includedCustomers || []).map((c) => c.id);

      const allRelevantIds = [...new Set([...linkedIds, ...includedIds])];

      if (allRelevantIds.length === 0) {
        setData({ dailyRevenue: 0, monthlyRevenue: 0, yearlyRevenue: 0, activeSubscribers: 0 });
        setLoading(false);
        return;
      }

      // Get active licenses for these customers
      const { data: activeLicenses } = await supabase
        .from("licenses")
        .select("customer_id")
        .in("customer_id", allRelevantIds)
        .eq("status", "active");

      if (!activeLicenses || activeLicenses.length === 0) {
        setData({ dailyRevenue: 0, monthlyRevenue: 0, yearlyRevenue: 0, activeSubscribers: 0 });
        setLoading(false);
        return;
      }

      const activeCustomerIds = [...new Set(activeLicenses.map((l) => l.customer_id).filter(Boolean))] as string[];

      const { data: customers } = await supabase
        .from("customers")
        .select("id, daily_rate")
        .in("id", activeCustomerIds);

      if (!customers) {
        setLoading(false);
        return;
      }

      const dailyRevenue = customers.reduce((sum, c) => sum + Number(c.daily_rate || 10), 0);
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysInYear = (now.getFullYear() % 4 === 0 && (now.getFullYear() % 100 !== 0 || now.getFullYear() % 400 === 0)) ? 366 : 365;

      setData({
        dailyRevenue,
        monthlyRevenue: dailyRevenue * daysInMonth,
        yearlyRevenue: dailyRevenue * daysInYear,
        activeSubscribers: customers.length,
      });

    } catch (error) {
      console.error("Error fetching revenue:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();

    // Poll every 60 seconds instead of realtime
    const interval = setInterval(fetchRevenue, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const stats = [
    {
      title: "الإيراد اليومي",
      value: data.dailyRevenue,
      icon: DollarSign,
      gradient: "from-emerald-500/20 to-emerald-600/5",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-500",
      borderColor: "border-emerald-500/30",
    },
    {
      title: "الإيراد الشهري",
      value: data.monthlyRevenue,
      icon: Calendar,
      gradient: "from-blue-500/20 to-blue-600/5",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-500",
      borderColor: "border-blue-500/30",
    },
    {
      title: "الإيراد السنوي",
      value: data.yearlyRevenue,
      icon: CalendarDays,
      gradient: "from-purple-500/20 to-purple-600/5",
      iconBg: "bg-purple-500/15",
      iconColor: "text-purple-500",
      borderColor: "border-purple-500/30",
    },
    {
      title: "المشتركين النشطين",
      value: data.activeSubscribers,
      icon: TrendingUp,
      gradient: "from-amber-500/20 to-amber-600/5",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-500",
      borderColor: "border-amber-500/30",
      isCurrency: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className={`relative overflow-hidden border ${stat.borderColor} bg-gradient-to-br ${stat.gradient}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-28" />
            ) : (
              <div className="text-2xl font-bold tracking-tight">
                {stat.isCurrency === false
                  ? stat.value
                  : `${stat.value.toFixed(2)} ج.م`}
              </div>
            )}
          </CardContent>
          {/* Decorative glow */}
          <div className={`absolute -bottom-4 -left-4 w-24 h-24 rounded-full ${stat.iconBg} blur-2xl opacity-50`} />
        </Card>
      ))}
    </div>
  );
};
