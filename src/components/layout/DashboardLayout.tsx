import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { AiAssistant } from "@/components/ai/AiAssistant";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/contexts/AuthContext";

export const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminCheckFailed, setAdminCheckFailed] = useState(false);
  const adminCheckRef = useRef<{ userId: string; promise: Promise<boolean | null> } | null>(null);
  const navigate = useNavigate();

  const checkAdminRole = useCallback(async (userId: string, retry = 0): Promise<boolean | null> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error) {
      console.error("checkAdminRole error:", error);
      if (retry < 2) {
        await new Promise((r) => setTimeout(r, 700 * (retry + 1)));
        return checkAdminRole(userId, retry + 1);
      }
      return null;
    }

    if (!data) {
      navigate("/auth", { replace: true });
      return false;
    }
    return true;
  }, [navigate]);

  const runAdminCheck = useCallback((userId: string) => {
    setAdminCheckFailed(false);

    if (adminCheckRef.current?.userId !== userId) {
      const promise = checkAdminRole(userId).finally(() => {
        if (adminCheckRef.current?.userId === userId) {
          adminCheckRef.current = null;
        }
      });
      adminCheckRef.current = { userId, promise };
    }

    const activeCheck = adminCheckRef.current;
    if (!activeCheck) return;

    activeCheck.promise.then((result) => {
      if (result === null) {
        setAdminCheckFailed(true);
        return;
      }
      setIsAdmin(result);
    });
  }, [checkAdminRole]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setIsAdmin(null);
      setAdminCheckFailed(false);
      adminCheckRef.current = null;
      navigate("/auth", { replace: true });
      return;
    }

    runAdminCheck(user.id);
  }, [loading, navigate, runAdminCheck, user]);

  if (loading || !user || (isAdmin === null && !adminCheckFailed)) {
    return null;
  }

  if (adminCheckFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">تعذر التحقق من صلاحية الأدمن</h1>
          <p className="text-muted-foreground">انتظر لحظات ثم أعد المحاولة. لن يتم تسجيل خروجك تلقائياً.</p>
          <Button onClick={() => user && runAdminCheck(user.id)}>إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
