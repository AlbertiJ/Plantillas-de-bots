import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/language";
import { Spinner } from "@/components/ui/spinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Spinner className="h-6 w-6" />
        <span className="text-sm">{t("loadingSession")}</span>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
