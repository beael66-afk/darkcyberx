import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "./AuthContextCore";

const EXPLICIT_LOGOUT_KEY = "license-manager-explicit-logout";
const TRANSIENT_SIGNED_OUT_GRACE_MS = 5000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastGoodSessionRef = useRef<Session | null>(null);
  const lastSignInAtRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session) {
        lastGoodSessionRef.current = data.session;
      }
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (!isMounted) return;
      setSession(null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;

      if (nextSession) {
        lastGoodSessionRef.current = nextSession;
        if (_event === "SIGNED_IN") {
          lastSignInAtRef.current = Date.now();
          sessionStorage.removeItem(EXPLICIT_LOGOUT_KEY);
        }
      }

      if (_event === "SIGNED_OUT") {
        const isExplicitLogout = sessionStorage.getItem(EXPLICIT_LOGOUT_KEY) === "true";
        const justSignedIn = Date.now() - lastSignInAtRef.current < TRANSIENT_SIGNED_OUT_GRACE_MS;

        if (!isExplicitLogout && justSignedIn && lastGoodSessionRef.current) {
          setSession(lastGoodSessionRef.current);
          setLoading(false);
          return;
        }

        lastGoodSessionRef.current = null;
      }

      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};