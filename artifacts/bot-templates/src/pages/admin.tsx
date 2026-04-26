import { useEffect, useState } from "react";
import { Lock, KeyRound, Shield, RefreshCw, Eye, EyeOff, Save, Copy, Check } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/language";
import { apiFetch } from "@/lib/api";

const TOKEN_FIELDS: { key: string; labelKey: string; placeholder: string; secret: boolean }[] = [
  { key: "TELEGRAM_BOT_TOKEN", labelKey: "tokTelegramBot", placeholder: "123456:ABC-...", secret: true },
  { key: "TELEGRAM_OWNER_ID", labelKey: "tokTelegramOwner", placeholder: "123456789", secret: false },
  { key: "WHATSAPP_API_KEY", labelKey: "tokWaApiKey", placeholder: "EAAG...", secret: true },
  { key: "WHATSAPP_PHONE_NUMBER_ID", labelKey: "tokWaPhone", placeholder: "1234567890", secret: false },
  { key: "WHATSAPP_VERIFY_TOKEN", labelKey: "tokWaVerify", placeholder: "mi_token_verificacion", secret: true },
  { key: "WHATSAPP_ACCESS_TOKEN", labelKey: "tokWaAccess", placeholder: "EAAG...", secret: true },
  { key: "OPENAI_API_KEY", labelKey: "tokOpenAi", placeholder: "sk-...", secret: true },
  { key: "ANTHROPIC_API_KEY", labelKey: "tokAnthropic", placeholder: "sk-ant-...", secret: true },
  { key: "GEMINI_API_KEY", labelKey: "tokGemini", placeholder: "AI...", secret: true },
];

export default function AdminPage() {
  const { user, changePassword, randomPassword, setLocked } = useAuth();
  const { t } = useLanguage();

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState(false);
  const [tokSubmitting, setTokSubmitting] = useState(false);
  const [tokMsg, setTokMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadTokens = async (revealNow: boolean) => {
    const data = await apiFetch<{ values: Record<string, string> }>(
      `/tokens${revealNow ? "?reveal=1" : ""}`,
    );
    setTokens(data.values ?? {});
  };

  useEffect(() => { void loadTokens(false); }, []);

  const onChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) {
      setPwdMsg({ ok: false, text: t("adminPwdMismatch") });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ ok: false, text: t("adminPwdWeak") });
      return;
    }
    setPwdSubmitting(true);
    const r = await changePassword(currentPwd, newPwd);
    setPwdSubmitting(false);
    if (r.ok) {
      setPwdMsg({ ok: true, text: t("adminPwdChanged") });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } else {
      setPwdMsg({
        ok: false,
        text: r.error === "invalid_current" ? t("adminPwdInvalidCurrent") :
              r.error === "weak_password" ? t("adminPwdWeak") :
              t("adminPwdFailed"),
      });
    }
  };

  const onGenerate = async () => {
    const p = await randomPassword();
    setGenerated(p);
    setNewPwd(p);
    setConfirmPwd(p);
    setCopied(false);
  };

  const onCopy = async () => {
    if (!generated) return;
    try { await navigator.clipboard.writeText(generated); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const onLockToggle = async (next: boolean) => {
    await setLocked(next);
  };

  const onRevealToggle = async (next: boolean) => {
    setReveal(next);
    await loadTokens(next);
  };

  const onSaveTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokMsg(null);
    setTokSubmitting(true);
    try {
      const payload: Record<string, string> = {};
      for (const f of TOKEN_FIELDS) payload[f.key] = tokens[f.key] ?? "";
      await apiFetch("/tokens", { method: "PUT", body: JSON.stringify(payload) });
      setTokMsg({ ok: true, text: t("adminTokensSaved") });
      await loadTokens(reveal);
    } catch {
      setTokMsg({ ok: false, text: t("adminTokensError") });
    } finally {
      setTokSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            {t("adminTitle")}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{t("adminSubtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5" /> {t("adminAccountTitle")}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {user && (
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                <div><dt className="text-muted-foreground">{t("adminAccountUser")}</dt><dd className="font-medium" data-testid="text-account-user">{user.username}</dd></div>
                <div><dt className="text-muted-foreground">{t("adminAccountId")}</dt><dd className="font-mono text-xs break-all" data-testid="text-account-id">{user.id}</dd></div>
                <div><dt className="text-muted-foreground">{t("adminAccountCreated")}</dt><dd>{new Date(user.createdAt).toLocaleString()}</dd></div>
                <div><dt className="text-muted-foreground">{t("adminAccountUpdated")}</dt><dd>{new Date(user.updatedAt).toLocaleString()}</dd></div>
              </dl>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("adminLockTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("adminLockHint")}</p>
              </div>
              <Switch
                checked={user?.locked ?? false}
                onCheckedChange={onLockToggle}
                data-testid="switch-lock-account"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> {t("adminPwdTitle")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{t("adminPwdRotateHint")}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onChangePwd} className="space-y-3">
              <div>
                <Label htmlFor="cur">{t("adminPwdCurrent")}</Label>
                <Input id="cur" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required data-testid="input-current-password" />
              </div>
              <div>
                <Label htmlFor="new">{t("adminPwdNew")}</Label>
                <Input id="new" type="text" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required minLength={8} data-testid="input-new-password" />
              </div>
              <div>
                <Label htmlFor="cnf">{t("adminPwdConfirm")}</Label>
                <Input id="cnf" type="text" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required minLength={8} data-testid="input-confirm-password" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onGenerate} data-testid="button-generate-password">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {t("adminPwdGenerate")}
                </Button>
                {generated && (
                  <Button type="button" variant="ghost" size="sm" onClick={onCopy} data-testid="button-copy-password">
                    {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copied ? t("copied") : t("copyCode")}
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={pwdSubmitting} data-testid="button-submit-password">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {pwdSubmitting ? t("loginLoading") : t("adminPwdSave")}
                </Button>
              </div>

              {pwdMsg && (
                <div
                  className={`rounded-md px-3 py-2 text-sm ${pwdMsg.ok ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 border border-destructive/30 text-destructive"}`}
                  data-testid="text-password-msg"
                >
                  {pwdMsg.text}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold">{t("adminTokensTitle")}</h2>
                <p className="text-xs text-muted-foreground mt-1">{t("adminTokensSubtitle")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRevealToggle(!reveal)}
                data-testid="button-reveal-tokens"
              >
                {reveal ? <EyeOff className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
                {reveal ? t("adminTokensHide") : t("adminTokensReveal")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSaveTokens} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                {TOKEN_FIELDS.map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={f.key} className="text-xs">{t(f.labelKey)}</Label>
                    <Input
                      id={f.key}
                      type={reveal || !f.secret ? "text" : "password"}
                      placeholder={f.placeholder}
                      value={tokens[f.key] ?? ""}
                      onChange={(e) => setTokens((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="font-mono text-xs"
                      data-testid={`input-token-${f.key}`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button type="submit" disabled={tokSubmitting} data-testid="button-save-tokens">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {tokSubmitting ? t("loginLoading") : t("adminTokensSave")}
                </Button>
                {tokMsg && (
                  <span
                    className={`text-sm ${tokMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                    data-testid="text-tokens-msg"
                  >
                    {tokMsg.text}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground leading-snug">{t("adminTokensFootnote")}</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
