import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const CustomerLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isCustomer, setIsCustomer] = useState<boolean | null>(null);
  const navigate = useNavigate();

  const checkCustomerRole = async (userId: string): Promise<boolean> => {
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "customer")
      .maybeSingle();

    if (error) {
      console.error("Error checking customer role:", error);
      return false;
    }

    return !!roles;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        if (!session) {
          setIsCustomer(null);
          navigate("/customer");
        } else {
          // Defer Supabase calls to avoid deadlock
          setTimeout(async () => {
            const hasCustomerRole = await checkCustomerRole(session.user.id);
            setIsCustomer(hasCustomerRole);
            
            if (!hasCustomerRole) {
              await supabase.auth.signOut();
              navigate("/customer");
            }
          }, 0);
        }
      }
    );

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (!session) {
        setIsCustomer(null);
        navigate("/customer");
      } else {
        const hasCustomerRole = await checkCustomerRole(session.user.id);
        setIsCustomer(hasCustomerRole);
        
        if (!hasCustomerRole) {
          await supabase.auth.signOut();
          navigate("/customer");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Show loading while checking
  if (!user || isCustomer === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isCustomer) {
    return null;
  }

  return <Outlet />;
};
