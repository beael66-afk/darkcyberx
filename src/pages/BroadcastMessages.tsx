import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Send, Loader2, MessageSquare, Users, UserCheck, Search, CheckCircle2, XCircle, Bot, Megaphone,
} from "lucide-react";
import { toast } from "sonner";

interface TelegramCustomer {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  telegram_chat_id: number;
}

const BroadcastMessages = () => {
  const [message, setMessage] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch customers linked to telegram
  const { data: telegramCustomers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["telegram-customers-broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telegram_links")
        .select("telegram_chat_id, customer_id, customers(name, email)");
      if (error) throw error;
      return (data || []).map((link) => ({
        customer_id: link.customer_id,
        customer_name: (link as any).customers?.name || "—",
        customer_email: (link as any).customers?.email || "",
        telegram_chat_id: link.telegram_chat_id,
      })) as TelegramCustomer[];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { message: message.trim(), send_to_all: sendToAll };
      if (!sendToAll) {
        payload.customer_ids = Array.from(selectedCustomers);
      }
      const { data, error } = await supabase.functions.invoke("send-broadcast", {
        body: payload,
      });
      if (error) throw error;
      if (data?.error && data?.sent === undefined) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const { sent, failed, total } = data;
      if (failed > 0) {
        toast.warning(`تم الإرسال إلى ${sent} من ${total} عميل — فشل ${failed}`, {
          description: data.errors?.join("\n"),
        });
      } else {
        toast.success(`تم إرسال الرسالة بنجاح إلى ${sent} عميل ✅`);
      }
      setMessage("");
      setSelectedCustomers(new Set());
    },
    onError: (error: any) => {
      toast.error("فشل إرسال الرسالة", { description: error.message });
    },
  });

  const filteredCustomers = telegramCustomers?.filter(
    (c) =>
      c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCustomer = (id: string) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (!filteredCustomers) return;
    setSelectedCustomers(new Set(filteredCustomers.map((c) => c.customer_id)));
  };

  const canSend =
    message.trim().length > 0 &&
    (sendToAll || selectedCustomers.size > 0) &&
    !sendMutation.isPending;

  const recipientCount = sendToAll
    ? telegramCustomers?.length || 0
    : selectedCustomers.size;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary" />
          إرسال رسالة
        </h1>
        <p className="text-muted-foreground mt-1">
          أرسل رسالة فورية لعملائك المرتبطين ببوت التليجرام
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
        <Bot className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-primary">
            الرسالة تُرسل عبر بوت التليجرام فقط
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            سيتلقى فقط العملاء المرتبطون بالبوت هذه الرسالة. عدد العملاء
            المتاحين: <strong>{telegramCustomers?.length || 0}</strong>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Message Composer */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                نص الرسالة
              </CardTitle>
              <CardDescription>
                اكتب الرسالة التي تريد إرسالها. يدعم تنسيق Markdown: *غامق*
                و _مائل_ و `كود`
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="اكتب رسالتك هنا..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="resize-none text-base"
                dir="rtl"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {message.length} حرف
                </p>
                {message.length > 4096 && (
                  <p className="text-xs text-destructive">
                    تجاوزت الحد الأقصى (4096 حرف)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {message.trim() && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Bot className="h-4 w-4" />
                  معاينة الرسالة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed" dir="rtl">
                    {message}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Send Button */}
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              onClick={() => sendMutation.mutate()}
              disabled={!canSend}
              className="gap-2 min-w-[200px]"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {sendMutation.isPending
                ? "جاري الإرسال..."
                : `إرسال إلى ${recipientCount} عميل`}
            </Button>

            {sendMutation.isSuccess && (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                تم الإرسال بنجاح
              </div>
            )}
            {sendMutation.isError && (
              <div className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                فشل الإرسال
              </div>
            )}
          </div>
        </div>

        {/* Recipients */}
        <div className="lg:col-span-2">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                المستلمون
              </CardTitle>
              <CardDescription>اختر من سيتلقى الرسالة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Send to all toggle */}
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  sendToAll
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
                onClick={() => {
                  setSendToAll(true);
                  setSelectedCustomers(new Set());
                }}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    sendToAll ? "border-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {sendToAll && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">جميع العملاء</p>
                  <p className="text-xs text-muted-foreground">
                    إرسال لكل المرتبطين بالبوت ({telegramCustomers?.length || 0})
                  </p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>

              <div
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  !sendToAll
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
                onClick={() => setSendToAll(false)}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    !sendToAll ? "border-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {!sendToAll && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">عملاء محددون</p>
                  <p className="text-xs text-muted-foreground">
                    اختر من القائمة أدناه
                  </p>
                </div>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Customer list */}
              {!sendToAll && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن عميل..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10"
                      />
                    </div>

                    {selectedCustomers.size > 0 && (
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="gap-1">
                          <UserCheck className="h-3 w-3" />
                          {selectedCustomers.size} محدد
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={selectAllFiltered}
                        >
                          تحديد الكل
                        </Button>
                      </div>
                    )}

                    <ScrollArea className="h-[300px]">
                      <div className="space-y-1">
                        {loadingCustomers ? (
                          <p className="text-center py-4 text-muted-foreground text-sm">
                            جاري التحميل...
                          </p>
                        ) : filteredCustomers?.length === 0 ? (
                          <p className="text-center py-4 text-muted-foreground text-sm">
                            لا يوجد عملاء
                          </p>
                        ) : (
                          filteredCustomers?.map((customer) => (
                            <label
                              key={customer.customer_id}
                              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                                selectedCustomers.has(customer.customer_id)
                                  ? "bg-primary/5"
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              <Checkbox
                                checked={selectedCustomers.has(customer.customer_id)}
                                onCheckedChange={() => toggleCustomer(customer.customer_id)}
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                                  {customer.customer_name
                                    .split(" ")
                                    .map((w) => w[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {customer.customer_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {customer.customer_email}
                                </p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BroadcastMessages;
