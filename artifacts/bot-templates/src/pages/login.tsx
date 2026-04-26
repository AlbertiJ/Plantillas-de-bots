import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bot, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/language";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const r = await login(username, password);
    setSubmitting(false);
    if (!r.ok) {
      const code = r.error ?? "invalid";
      setError(
        code === "locked" ? t("loginLocked") :
        code === "no_credentials" ? t("loginNoCreds") :
        t("loginInvalid"),
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="rounded-full bg-primary/10 p-4 border border-primary/20">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t("appTitle")}</h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm">{t("loginSubtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">{t("loginTitle")}</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">{t("loginUsername")}</Label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    required
                    data-testid="input-username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t("loginPassword")}</Label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                    aria-label={show ? "hide" : "show"}
                    data-testid="button-toggle-password"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive" data-testid="text-login-error">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting} data-testid="button-login-submit">
                {submitting ? t("loginLoading") : t("loginButton")}
              </Button>
            </form>

            <p className="text-[11px] text-muted-foreground mt-4 leading-snug">
              {t("loginFirstHint")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
