import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, navigate, session]);

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="absolute inset-0 -z-10 pointer-events-none bg-grid-pattern opacity-5" />
      <AuthForm />
    </div>
  );
};

export default Auth;
