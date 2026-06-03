import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { AiAssistant } from "@/components/ai/AiAssistant";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/contexts/useAuth";

export const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const redirectTimer = window.setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 1500);

      return () => window.clearTimeout(redirectTimer);
    }
  }, [loading, navigate, user]);

  if (loading || !user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-10 transition-colors">
            <SidebarTrigger />
            <div className="flex-1" />
            <NotificationBell />
            <ThemeToggle />
          </header>
          <div className="flex-1 p-6 transition-colors">
            <Outlet />
          </div>
        </main>
      </div>
      <AiAssistant />
    </SidebarProvider>
  );
};
