import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  KeyRound,
  Users,
  Package,
  Monitor,
  ScrollText,
  BarChart3,
  Settings,
  LogOut,
  KeySquare,
  Code2,
  Bell,
  Bot,
  ShoppingCart,
  Shield,
  MonitorPlay,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "لوحة التحكم", url: "/dashboard", icon: LayoutDashboard },
  { title: "التراخيص", url: "/licenses", icon: KeyRound },
  { title: "العملاء", url: "/customers", icon: Users },
  { title: "المنتجات", url: "/products", icon: Package },
  { title: "الأجهزة", url: "/devices", icon: Monitor },
  { title: "RustDesk IDs", url: "/rustdesk-ids", icon: MonitorPlay },
  { title: "التقارير", url: "/reports", icon: BarChart3 },
  { title: "السجلات", url: "/logs", icon: ScrollText },
  { title: "بيانات الاعتماد", url: "/api-credentials", icon: Code2 },
  { title: "إعدادات الإشعارات", url: "/notification-settings", icon: Bell },
  { title: "بوت التليجرام", url: "/telegram-settings", icon: Bot },
  { title: "الطلبات", url: "/renewal-orders", icon: ShoppingCart },
  { title: "إدارة الـ IP", url: "/ip-management", icon: Shield },
  { title: "الإعدادات", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isCollapsed = state === "collapsed";

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "تم تسجيل الخروج", description: "إلى اللقاء!" });
      navigate("/auth");
    } catch {
      toast({ title: "حدث خطأ", description: "فشل تسجيل الخروج", variant: "destructive" });
    }
  };

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"}>
      <SidebarContent className="bg-sidebar">
        {/* ── Logo ── */}
        <div className={`p-4 flex items-center gap-3 border-b border-sidebar-border ${isCollapsed ? "justify-center" : ""}`}>
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-gold animate-pulse-glow">
              <KeySquare className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="font-bold text-base text-sidebar-accent-foreground tracking-tight leading-none">
                License Manager
              </h2>
              <p className="text-xs text-sidebar-foreground/50 mt-0.5">نظام إدارة التراخيص</p>
            </div>
          )}
        </div>

        {/* ── Nav Items ── */}
        <SidebarGroup className="px-2 py-3">
          {!isCollapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] font-semibold tracking-widest uppercase px-3 mb-1">
              القائمة
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      title={isCollapsed ? item.title : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-primary/15 to-transparent border-r-2 border-primary text-primary shadow-sm"
                            : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                        } ${isCollapsed ? "justify-center" : ""}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={`flex-shrink-0 h-4 w-4 transition-all ${
                              isActive ? "text-primary" : ""
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.title}</span>}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="p-3 border-t border-sidebar-border bg-sidebar">
        <Button
          variant="ghost"
          className={`w-full gap-3 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all ${
            isCollapsed ? "justify-center px-0" : "justify-start"
          }`}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">تسجيل الخروج</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
