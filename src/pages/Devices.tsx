import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Trash2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { logActivity } from "@/lib/logger";
import { usePagination } from "@/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

type Device = Tables<"devices">;

const Devices = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*, licenses(license_key)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive, deviceName }: { id: string; isActive: boolean; deviceName: string }) => {
      const { error } = await supabase
        .from("devices")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
      return { isActive: !isActive, deviceName };
    },
    onSuccess: async ({ isActive, deviceName }) => {
      await logActivity({
        action: isActive ? "activated" : "deactivated",
        entityType: "device",
        description: `تم ${isActive ? "تفعيل" : "تعطيل"} الجهاز: ${deviceName}`
      });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("تم تحديث حالة الجهاز بنجاح");
    },
    onError: () => toast.error("فشل تحديث حالة الجهاز")
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, deviceName }: { id: string; deviceName: string }) => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
      return deviceName;
    },
    onSuccess: async (deviceName) => {
      await logActivity({
        action: "deleted",
        entityType: "device",
        description: `تم حذف الجهاز: ${deviceName}`
      });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("تم حذف الجهاز بنجاح");
    },
    onError: () => toast.error("فشل حذف الجهاز")
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("devices")
        .delete()
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: async (count) => {
      await logActivity({
        action: "deleted",
        entityType: "device",
        description: `تم حذف ${count} جهاز`
      });
      setSelectedDevices(new Set());
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success(`تم حذف ${count} جهاز بنجاح`);
    },
    onError: () => toast.error("فشل حذف الأجهزة")
  });

  const filteredDevices = devices?.filter(device =>
    device.hwid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.os_info?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.licenses?.license_key?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    paginatedData,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    hasNext,
    hasPrev,
  } = usePagination({ data: filteredDevices || [], itemsPerPage: 10 });

  const handleSelectDevice = (deviceId: string, checked: boolean) => {
    const newSelected = new Set(selectedDevices);
    if (checked) {
      newSelected.add(deviceId);
    } else {
      newSelected.delete(deviceId);
    }
    setSelectedDevices(newSelected);
  };

  const handleSelectPage = (checked: boolean) => {
    const newSelected = new Set(selectedDevices);
    paginatedData.forEach(device => {
      if (checked) {
        newSelected.add(device.id);
      } else {
        newSelected.delete(device.id);
      }
    });
    setSelectedDevices(newSelected);
  };

  const handleSelectAll = () => {
    if (filteredDevices) {
      const newSelected = new Set(filteredDevices.map(d => d.id));
      setSelectedDevices(newSelected);
      toast.success(`تم تحديد ${filteredDevices.length} جهاز`);
    }
  };

  const isPageSelected = paginatedData.length > 0 && paginatedData.every(device => selectedDevices.has(device.id));
  const isPagePartiallySelected = paginatedData.some(device => selectedDevices.has(device.id)) && !isPageSelected;

  const handleBulkDelete = () => {
    if (selectedDevices.size === 0) return;
    if (confirm(`هل أنت متأكد من حذف ${selectedDevices.size} جهاز؟`)) {
      bulkDeleteMutation.mutate(Array.from(selectedDevices));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">الأجهزة</h1>
        <p className="text-muted-foreground">إدارة الأجهزة المرتبطة بالتراخيص</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن جهاز أو ترخيص..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        
        {selectedDevices.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              تم تحديد {selectedDevices.size} جهاز
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              تحديد الكل ({filteredDevices?.length || 0})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف المحدد
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isPageSelected}
                  ref={(el) => {
                    if (el) {
                      (el as any).indeterminate = isPagePartiallySelected;
                    }
                  }}
                  onCheckedChange={handleSelectPage}
                  aria-label="تحديد الصفحة"
                />
              </TableHead>
              <TableHead>اسم الجهاز</TableHead>
              <TableHead>HWID</TableHead>
              <TableHead>نظام التشغيل</TableHead>
              <TableHead>الترخيص</TableHead>
              <TableHead>آخر تحقق</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={10} columns={8} />
            ) : !paginatedData || paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">لا توجد أجهزة</TableCell>
              </TableRow>
            ) : (
              paginatedData.map((device) => (
                <TableRow key={device.id} className={selectedDevices.has(device.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDevices.has(device.id)}
                      onCheckedChange={(checked) => handleSelectDevice(device.id, checked as boolean)}
                      aria-label={`تحديد ${device.device_name || device.hwid}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{device.device_name || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{device.hwid}</TableCell>
                  <TableCell>{device.os_info || "-"}</TableCell>
                  <TableCell>
                    {device.licenses ? (
                      <span className="font-mono text-sm">{device.licenses.license_key}</span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {device.last_verified
                      ? format(new Date(device.last_verified), "dd MMM yyyy، HH:mm", { locale: ar })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={device.is_active ? "default" : "secondary"}>
                      {device.is_active ? "نشط" : "معطل"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActiveMutation.mutate({
                          id: device.id,
                          isActive: device.is_active ?? false,
                          deviceName: device.device_name || device.hwid
                        })}
                      >
                        {device.is_active ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا الجهاز؟")) {
                            deleteMutation.mutate({ 
                              id: device.id, 
                              deviceName: device.device_name || device.hwid 
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            عرض {((currentPage - 1) * 10) + 1} إلى {Math.min(currentPage * 10, filteredDevices?.length || 0)} من {filteredDevices?.length || 0} نتيجة
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={!hasPrev}
                >
                  السابق
                </Button>
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => goToPage(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!hasNext}
                >
                  التالي
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default Devices;
