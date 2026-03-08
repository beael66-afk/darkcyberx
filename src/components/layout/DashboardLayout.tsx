import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { AiAssistant } from "@/components/ai/AiAssistant";
import { User } from "@supabase/supabase-js";

export const DashboardLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!data) {
      await supabase.auth.signOut();
      navigate("/auth");
      return false;
    }
    return true;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          setIsAdmin(null);
          navigate("/auth");
        } else {
          setTimeout(() => {
            checkAdminRole(session.user.id).then(setIsAdmin);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        setIsAdmin(null);
        navigate("/auth");
      } else {
        checkAdminRole(session.user.id).then(setIsAdmin);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user || isAdmin === null || !isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {/* ── Header ── */}
          <header className="h-14 border-b border-border/60 bg-background/80 backdrop-blur-md flex items-center px-6 gap-4 sticky top-0 z-20">
            {/* subtle gold line at top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors" />
            <div className="flex-1" />
            <ThemeToggle />
          </header>

          {/* ── Page Content ── */}
          <div className="flex-1 p-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <AiAssistant />
    </SidebarProvider>
  );
};
