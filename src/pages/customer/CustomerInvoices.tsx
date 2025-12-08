import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowRight, FileText, Download, Receipt, CreditCard } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  licenses: {
    license_key: string;
    products: {
      name: string;
    } | null;
  } | null;
}

const CustomerInvoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/customer");
        return;
      }

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          amount,
          currency,
          status,
          due_date,
          paid_at,
          created_at,
          licenses (
            license_key,
            products (name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data as Invoice[]);
    } catch (error: any) {
      toast.error("خطأ في تحميل الفواتير");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      paid: { variant: "default", label: "مدفوعة" },
      pending: { variant: "outline", label: "قيد الانتظار" },
      overdue: { variant: "destructive", label: "متأخرة" },
      cancelled: { variant: "secondary", label: "ملغاة" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: currency || "EGP",
    }).format(amount);
  };

  const totalPaid = invoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPending = invoices
    .filter(inv => inv.status === "pending")
    .reduce((sum, inv) => sum + inv.amount, 0);

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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/customer/dashboard")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">الفواتير</h1>
              <p className="text-sm text-muted-foreground">عرض جميع فواتيرك</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المدفوع</CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid, "EGP")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
              <FileText className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalPending, "EGP")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>سجل الفواتير</CardTitle>
            <CardDescription>جميع الفواتير المرتبطة بحسابك</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد فواتير</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ الاستحقاق</TableHead>
                      <TableHead>تاريخ الدفع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.licenses?.products?.name || "-"}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          {invoice.due_date
                            ? new Date(invoice.due_date).toLocaleDateString("ar-EG")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {invoice.paid_at
                            ? new Date(invoice.paid_at).toLocaleDateString("ar-EG")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerInvoices;
