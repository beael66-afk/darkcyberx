import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, FileText, Laptop, Key, Calendar, AlertCircle, Receipt } from "lucide-react";

interface CustomerData {
  id: string;
  name: string;
  email: string;
  company: string | null;
}

interface License {
  id: string;
  license_key: string;
  status: string;
  expire_at: string | null;
  max_devices: number;
  products: {
    name: string;
    version: string | null;
  };
  devices: Array<{
    id: string;
    device_name: string | null;
    is_active: boolean;
  }>;
}

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/customer");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "customer")
      .single();

    if (!roles) {
      toast.error("غير مصرح لك بالدخول");
      await supabase.auth.signOut();
      navigate("/customer");
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch customer info with ID
      const { data: customerData } = await supabase
        .from("customers")
        .select("id, name, email, company")
        .eq("user_id", user.id)
        .single();

      if (customerData) {
        setCustomer(customerData);

        // Fetch licenses with products and devices using customer_id
        const { data: licensesData } = await supabase
          .from("licenses")
          .select(`
            id,
            license_key,
            status,
            expire_at,
            max_devices,
            products (name, version),
            devices (id, device_name, is_active)
          `)
          .eq("customer_id", customerData.id);

        if (licensesData) {
          setLicenses(licensesData as any);
        }
      }
    } catch (error: any) {
      toast.error("خطأ في تحميل البيانات");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/customer");
    toast.success("تم تسجيل الخروج بنجاح");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      active: { variant: "default", label: "نشط" },
      expired: { variant: "destructive", label: "منتهي" },
      suspended: { variant: "secondary", label: "معلق" },
      pending: { variant: "outline", label: "قيد الانتظار" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDaysUntilExpiry = (expireAt: string | null) => {
    if (!expireAt) return null;
    const days = Math.ceil((new Date(expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">بوابة العملاء</h1>
            <p className="text-sm text-muted-foreground">
              {customer?.name} {customer?.company && `- ${customer.company}`}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="ml-2 h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي التراخيص</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{licenses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">التراخيص النشطة</CardTitle>
              <Key className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {licenses.filter(l => l.status === "active").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الأجهزة المسجلة</CardTitle>
              <Laptop className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {licenses.reduce((acc, l) => acc + (l.devices?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/customer/invoices")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الفواتير</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-primary">عرض الفواتير ←</div>
            </CardContent>
          </Card>
        </div>

        {/* Licenses List */}
        <Card>
          <CardHeader>
            <CardTitle>تراخيصي</CardTitle>
            <CardDescription>عرض وإدارة جميع تراخيصك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {licenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد تراخيص</p>
            ) : (
              licenses.map((license) => {
                const daysUntilExpiry = getDaysUntilExpiry(license.expire_at);
                const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

                return (
                  <Card key={license.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{license.products?.name}</h3>
                            {getStatusBadge(license.status)}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Key className="h-4 w-4" />
                            <code className="bg-muted px-2 py-1 rounded">{license.license_key}</code>
                          </div>

                          {license.expire_at && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4" />
                              <span>ينتهي في: {new Date(license.expire_at).toLocaleDateString("ar-EG")}</span>
                              {isExpiringSoon && (
                                <Badge variant="destructive" className="mr-2">
                                  <AlertCircle className="h-3 w-3 ml-1" />
                                  ينتهي قريباً ({daysUntilExpiry} يوم)
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm">
                            <Laptop className="h-4 w-4" />
                            <span>الأجهزة: {license.devices?.length || 0} / {license.max_devices}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/customer/licenses/${license.id}`)}>
                            <FileText className="ml-2 h-4 w-4" />
                            التفاصيل
                          </Button>
                          {isExpiringSoon && (
                            <Button size="sm">طلب تجديد</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerDashboard;
