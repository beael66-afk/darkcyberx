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
  Search,
  Bot,
  Users,
  Link2,
  Unlink,
  MessageCircle,
  Calendar,
  Copy,
  ExternalLink,
  MapPin,
  UserPlus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import WebhookSetup from "@/components/telegram/WebhookSetup";

interface TelegramLink {
  id: string;
  telegram_chat_id: number;
  created_at: string;
  customer_id: string;
  latitude: number | null;
  longitude: number | null;
  location_updated_at: string | null;
  customers: {
    id: string;
    name: string;
    email: string;
    company: string | null;
  } | null;
}

interface TelegramDelegate {
  id: string;
  owner_customer_id: string;
  delegate_chat_id: number;
  delegate_name: string | null;
  permissions: string[];
  created_at: string;
  owner_customer_name?: string;
}

const TelegramSettings = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: links, isLoading } = useQuery({
    queryKey: ["telegram-links"],
    queryFn: async () => {
      const [{ data: linksData, error: linksError }, { data: customersData }] = await Promise.all([
        supabase.from("telegram_links").select("id, telegram_chat_id, created_at, customer_id, latitude, longitude, location_updated_at").order("created_at", { ascending: false }),
        supabase.from("customers").select("id, name, email, company"),
      ]);
      if (linksError) throw linksError;
      const customersMap = new Map((customersData || []).map((c) => [c.id, c]));
      return (linksData || []).map((link) => ({
        ...link,
        customers: customersMap.get(link.customer_id) || null,
      })) as TelegramLink[];
    },
  });

  const { data: totalCustomers } = useQuery({
    queryKey: ["customers-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("telegram_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-links"] });
      toast.success("تم فك ربط الحساب بنجاح");
    },
    onError: () => toast.error("فشل فك ربط الحساب"),
  });

  const unlinkDelegateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("telegram_delegates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-delegates"] });
      toast.success("تم إزالة الشريك بنجاح");
    },
    onError: () => toast.error("فشل إزالة الشريك"),
  });

  const { data: delegates } = useQuery({
    queryKey: ["telegram-delegates"],
    queryFn: async () => {
      const [{ data: delegatesData, error }, { data: customersData }] = await Promise.all([
        supabase.from("telegram_delegates").select("id, owner_customer_id, delegate_chat_id, delegate_name, permissions, created_at").order("created_at", { ascending: false }),
        supabase.from("customers").select("id, name"),
      ]);
      if (error) throw error;
      const customersMap = new Map((customersData || []).map((c) => [c.id, c.name]));
      return (delegatesData || []).map((d) => ({
        ...d,
        owner_customer_name: customersMap.get(d.owner_customer_id) || "غير معروف",
      })) as TelegramDelegate[];
    },
  });

  const linkedCount = links?.length || 0;
  const linkPercentage = totalCustomers ? Math.round((linkedCount / totalCustomers) * 100) : 0;

  const filteredLinks = links?.filter(
    (link) =>
      link.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.customers?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(link.telegram_chat_id).includes(searchTerm)
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            إعدادات بوت التليجرام
          </h1>
          <p className="text-muted-foreground mt-1">إدارة العملاء المربوطين ببوت التليجرام</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-primary/15 p-3">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">عملاء مربوطين</p>
              <p className="text-2xl font-bold">{linkedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-blue-500/15 p-3">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
              <p className="text-2xl font-bold">{totalCustomers || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-green-500/15 p-3">
              <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">نسبة الربط</p>
              <p className="text-2xl font-bold">{linkPercentage}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Setup */}
      <WebhookSetup />

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث بالاسم أو البريد أو معرف التليجرام..."
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
              <TableHead className="font-semibold">البريد الإلكتروني</TableHead>
              <TableHead className="font-semibold">معرف التليجرام</TableHead>
              <TableHead className="font-semibold">الموقع الجغرافي</TableHead>
              <TableHead className="font-semibold">تاريخ الربط</TableHead>
              <TableHead className="font-semibold text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={6} columns={6} />
            ) : filteredLinks?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Bot className="h-10 w-10 opacity-30" />
                    <p>لا يوجد عملاء مربوطين</p>
                    <p className="text-xs">العملاء يربطون حساباتهم عبر بوت التليجرام</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLinks?.map((link) => (
                <TableRow key={link.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                        {link.customers?.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <span className="font-medium">{link.customers?.name || "غير معروف"}</span>
                        {link.customers?.company && (
                          <p className="text-xs text-muted-foreground">{link.customers.company}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {link.customers?.email || "—"}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex items-center gap-1.5 font-mono text-sm bg-muted px-2 py-1 rounded-md hover:bg-muted/80 transition-colors"
                          onClick={() => copyToClipboard(String(link.telegram_chat_id))}
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
                          {link.telegram_chat_id}
                          <Copy className="h-3 w-3 opacity-50" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>انسخ معرف التليجرام</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {link.latitude && link.longitude ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={`https://www.google.com/maps?q=${link.latitude},${link.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-mono">
                              {link.latitude.toFixed(4)}, {link.longitude.toFixed(4)}
                            </span>
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>فتح في خرائط Google</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground text-sm flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 opacity-40" />
                        لم يُحدد
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {link.created_at
                        ? (() => {
                            const d = new Date(link.created_at);
                            return isNaN(d.getTime())
                              ? "—"
                              : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                          })()
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Unlink className="h-4 w-4" />
                            <span className="hidden sm:inline">فك الربط</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>فك ربط الحساب</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من فك ربط حساب{" "}
                              <strong>{link.customers?.name}</strong> من بوت التليجرام؟
                              سيحتاج العميل لربط حسابه مرة أخرى.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => unlinkMutation.mutate(link.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              فك الربط
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

      {/* Delegates Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-primary" />
          الشركاء (Co-owners)
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          العملاء المربوطين يمكنهم إضافة حتى 3 شركاء يتحكمون في حساباتهم (عرض التراخيص، التجديد، إدارة الأجهزة، RustDesk)
        </p>
        <Card className="border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">العميل (المالك)</TableHead>
                <TableHead className="font-semibold">اسم الشريك</TableHead>
                <TableHead className="font-semibold">معرف تليجرام الشريك</TableHead>
                <TableHead className="font-semibold">الصلاحيات</TableHead>
                <TableHead className="font-semibold">تاريخ الإضافة</TableHead>
                <TableHead className="font-semibold text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!delegates || delegates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <UserPlus className="h-10 w-10 opacity-30" />
                      <p>لا يوجد شركاء مضافون</p>
                      <p className="text-xs">العملاء يضيفون شركاء عبر بوت التليجرام</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                delegates.map((del) => (
                  <TableRow key={del.id} className="group">
                    <TableCell className="font-medium">{del.owner_customer_name}</TableCell>
                    <TableCell>{del.delegate_name || "—"}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="flex items-center gap-1.5 font-mono text-sm bg-muted px-2 py-1 rounded-md hover:bg-muted/80 transition-colors"
                            onClick={() => copyToClipboard(String(del.delegate_chat_id))}
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
                            {del.delegate_chat_id}
                            <Copy className="h-3 w-3 opacity-50" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>انسخ معرف التليجرام</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {del.permissions?.includes("view_licenses") && <Badge variant="secondary" className="text-xs">عرض</Badge>}
                        {del.permissions?.includes("renew_licenses") && <Badge variant="secondary" className="text-xs">تجديد</Badge>}
                        {del.permissions?.includes("manage_devices") && <Badge variant="secondary" className="text-xs">أجهزة</Badge>}
                        {del.permissions?.includes("manage_rustdesk") && <Badge variant="secondary" className="text-xs">RustDesk</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {del.created_at
                          ? (() => {
                              const d = new Date(del.created_at);
                              return isNaN(d.getTime())
                                ? "—"
                                : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                            })()
                          : "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Unlink className="h-4 w-4" />
                            <span className="hidden sm:inline">إزالة</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>إزالة الشريك</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من إزالة الشريك{" "}
                              <strong>{del.delegate_name || del.delegate_chat_id}</strong>؟
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => unlinkDelegateMutation.mutate(del.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              إزالة
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default TelegramSettings;
