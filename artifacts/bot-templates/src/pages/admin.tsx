import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Lock, KeyRound, Shield, RefreshCw, Eye, EyeOff, Save, Copy, Check, AlertTriangle, Rocket, Activity, Terminal, ChevronRight, CheckCircle, XCircle, Package, Plus, Pencil, Trash2, Star } from "lucide-react";
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

interface SystemStatus {
  python: { raw: string; ok: boolean };
  node: { raw: string; ok: boolean };
  packages: { name: string; installed: boolean; optional: boolean }[];
  botFiles: { exists: boolean }[];
  envExists: boolean;
}

interface TelegramProfile {
  id: string;
  name: string;
  telegramBotToken: string;
  telegramOwnerId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  const { user, needsPasswordChange, changePassword, randomPassword, setLocked } = useAuth();
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();

  const T = (es: string, en: string) => lang === "es" ? es : en;

  const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null);
  useEffect(() => {
    apiFetch<SystemStatus>("/bots/status").then(setSysStatus).catch(() => {});
  }, []);

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

  // ── Perfiles de API de Telegram ─────────────────────────────────────────────
  const [profiles, setProfiles] = useState<TelegramProfile[]>([]);
  const [profileForm, setProfileForm] = useState<{
    open: boolean; editId: string | null;
    name: string; telegramBotToken: string; telegramOwnerId: string;
    submitting: boolean; msg: string | null;
  }>({ open: false, editId: null, name: "", telegramBotToken: "", telegramOwnerId: "", submitting: false, msg: null });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadProfiles = async () => {
    try {
      const data = await apiFetch<{ profiles: TelegramProfile[] }>("/bot-profiles");
      setProfiles(data.profiles ?? []);
    } catch {}
  };

  useEffect(() => { void loadProfiles(); }, []);

  const openAddProfile = () =>
    setProfileForm({ open: true, editId: null, name: "", telegramBotToken: "", telegramOwnerId: "", submitting: false, msg: null });

  const openEditProfile = (p: TelegramProfile) =>
    setProfileForm({ open: true, editId: p.id, name: p.name, telegramBotToken: "", telegramOwnerId: "", submitting: false, msg: null });

  const closeProfileForm = () =>
    setProfileForm((f) => ({ ...f, open: false, editId: null, msg: null }));

  const onSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileForm((f) => ({ ...f, submitting: true, msg: null }));
    try {
      if (profileForm.editId) {
        const body: Record<string, string> = { name: profileForm.name };
        if (profileForm.telegramBotToken) body.telegramBotToken = profileForm.telegramBotToken;
        if (profileForm.telegramOwnerId)  body.telegramOwnerId  = profileForm.telegramOwnerId;
        await apiFetch(`/bot-profiles/${profileForm.editId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/bot-profiles", {
          method: "POST",
          body: JSON.stringify({
            name: profileForm.name,
            telegramBotToken: profileForm.telegramBotToken,
            telegramOwnerId: profileForm.telegramOwnerId,
          }),
        });
      }
      await loadProfiles();
      closeProfileForm();
    } catch {
      setProfileForm((f) => ({ ...f, submitting: false, msg: T("Error al guardar el perfil.", "Error saving the profile.") }));
    }
  };

  const onSetDefault = async (id: string) => {
    await apiFetch(`/bot-profiles/${id}/default`, { method: "POST" }).catch(() => {});
    void loadProfiles();
  };

  const onDeleteProfile = async (id: string) => {
    await apiFetch(`/bot-profiles/${id}`, { method: "DELETE" }).catch(() => {});
    setDeleteConfirm(null);
    void loadProfiles();
  };

  const loadTokens = async (revealNow: boolean) => {
    const data = await apiFetch<{ values: Record<string, string> }>(
      `/tokens${revealNow ? "?reveal=1" : ""}`,
    );
    setTokens(data.values ?? {});
  };

  useEffect(() => { void loadTokens(false); }, []);

  // Pre-rellenar la contraseña actual cuando es el primer arranque
  // Evita que el usuario tenga que tipear manualmente caracteres especiales
  useEffect(() => {
    if (!needsPasswordChange) return;
    apiFetch<{ firstRun: boolean; password?: string }>("/auth/first-run")
      .then((data) => { if (data.firstRun && data.password) setCurrentPwd(data.password); })
      .catch(() => {});
  }, [needsPasswordChange]);

  const onChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) { setPwdMsg({ ok: false, text: t("adminPwdMismatch") }); return; }
    if (newPwd.length < 8) { setPwdMsg({ ok: false, text: t("adminPwdWeak") }); return; }
    setPwdSubmitting(true);
    const r = await changePassword(currentPwd, newPwd);
    setPwdSubmitting(false);
    if (r.ok) {
      setPwdMsg({ ok: true, text: t("adminPwdChanged") });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      // Si era el primer login, redirigir al inicio luego del cambio
      setTimeout(() => navigate("/"), 1200);
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
    setGenerated(p); setNewPwd(p); setConfirmPwd(p); setCopied(false);
  };

  const onCopy = async () => {
    if (!generated) return;
    try { await navigator.clipboard.writeText(generated); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
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

  const pkgOk    = sysStatus ? sysStatus.packages.filter(p => p.installed).length : 0;
  const pkgTotal = sysStatus ? sysStatus.packages.filter(p => !p.optional).length : 0;
  const botsOk   = sysStatus ? sysStatus.botFiles.filter(f => f.exists).length    : 0;
  const botsTotal= sysStatus ? sysStatus.botFiles.length                           : 0;
  const sysOk    = sysStatus ? sysStatus.python.ok && sysStatus.node.ok && pkgOk === pkgTotal && botsOk === botsTotal : null;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Banner de primer arranque — obligar cambio de contraseña */}
        {needsPasswordChange && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
                {t("adminMustChangePwdTitle")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("adminMustChangePwdDesc")}
              </p>
            </div>
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            {t("adminTitle")}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{t("adminSubtitle")}</p>
        </div>

        {/* Acceso rápido + resumen del sistema */}
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Lanzador */}
          <Link href="/launcher">
            <div className="group rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors p-4 cursor-pointer flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{T("Lanzador de Bots", "Bot Launcher")}</p>
                <p className="text-xs text-muted-foreground truncate">{T("Ejecutar bots Python", "Run Python bots")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </Link>

          {/* Actividad */}
          <Link href="/activity">
            <div className="group rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors p-4 cursor-pointer flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2.5 shrink-0">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{T("Actividad", "Activity")}</p>
                <p className="text-xs text-muted-foreground truncate">{T("Historial de ejecuciones", "Execution history")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </Link>

          {/* Estado del Sistema — resumen compacto */}
          <Link href="/status">
            <div className="group rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors p-4 cursor-pointer flex items-center gap-3">
              <div className={`rounded-lg p-2.5 shrink-0 ${sysOk === null ? "bg-muted" : sysOk ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                <Terminal className={`h-5 w-5 ${sysOk === null ? "text-muted-foreground" : sysOk ? "text-emerald-500" : "text-amber-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{T("Estado del Sistema", "System Status")}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {sysStatus
                    ? `${T("Paquetes", "Packages")} ${pkgOk}/${pkgTotal} · Bots ${botsOk}/${botsTotal}`
                    : T("Cargando…", "Loading…")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </Link>
        </div>

        {/* Mini resumen del sistema si hay problemas */}
        {sysStatus && !sysOk && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 space-y-2">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {T("Problemas detectados en el sistema local", "Issues detected in local system")}
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <div className="flex items-center gap-2">
                {sysStatus.python.ok ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                <span className="text-muted-foreground">Python: <code>{sysStatus.python.raw || "—"}</code></span>
              </div>
              <div className="flex items-center gap-2">
                {sysStatus.node.ok ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                <span className="text-muted-foreground">Node.js: <code>{sysStatus.node.raw || "—"}</code></span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{T("Paquetes", "Packages")}: {pkgOk}/{pkgTotal}</span>
              </div>
              <div className="flex items-center gap-2">
                {sysStatus.envExists ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                <span className="text-muted-foreground">.env: {sysStatus.envExists ? T("Presente", "Present") : T("No encontrado", "Not found")}</span>
              </div>
            </div>
            <Link href="/status">
              <span className="text-xs text-primary hover:underline cursor-pointer">{T("Ver Estado completo →", "See full Status →")}</span>
            </Link>
          </div>
        )}

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
              <Switch checked={user?.locked ?? false} onCheckedChange={setLocked} data-testid="switch-lock-account" />
            </div>
          </CardContent>
        </Card>

        <Card id="cambiar-contrasena">
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
                <Input id="new" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required minLength={8} data-testid="input-new-password" />
              </div>
              <div>
                <Label htmlFor="cnf">{t("adminPwdConfirm")}</Label>
                <Input id="cnf" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required minLength={8} data-testid="input-confirm-password" />
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
              <Button type="button" variant="outline" size="sm" onClick={() => onRevealToggle(!reveal)} data-testid="button-reveal-tokens">
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
                  <span className={`text-sm ${tokMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`} data-testid="text-tokens-msg">
                    {tokMsg.text}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">{t("adminTokensFootnote")}</p>
            </form>
          </CardContent>
        </Card>

        {/* ── Perfiles de API de Telegram ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-blue-500" />
                  {T("Perfiles de API de Telegram", "Telegram API Profiles")}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {T(
                    "Guardá varios pares de token+owner para identificar qué credencial usa cada bot al lanzarlo.",
                    "Store multiple token+owner pairs to identify which credentials each bot uses when launched.",
                  )}
                </p>
              </div>
              <Button size="sm" onClick={openAddProfile} data-testid="button-add-profile">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {T("Agregar API Key", "Add API Key")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Formulario de creación/edición inline */}
            {profileForm.open && (
              <form onSubmit={onSubmitProfile} className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <p className="text-sm font-semibold">
                  {profileForm.editId
                    ? T("Editar perfil", "Edit profile")
                    : T("Nuevo perfil de API", "New API profile")}
                </p>
                <div>
                  <Label htmlFor="pf-name" className="text-xs">{T("Nombre del perfil", "Profile name")}</Label>
                  <Input
                    id="pf-name"
                    placeholder={T("Ej: Bot principal, Bot de ventas…", "E.g.: Main bot, Sales bot…")}
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="text-sm"
                    data-testid="input-profile-name"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="pf-token" className="text-xs">TELEGRAM_BOT_TOKEN</Label>
                    <Input
                      id="pf-token"
                      type="password"
                      placeholder={profileForm.editId ? T("Dejar vacío para no cambiar", "Leave empty to keep current") : "123456:ABC-..."}
                      value={profileForm.telegramBotToken}
                      onChange={(e) => setProfileForm((f) => ({ ...f, telegramBotToken: e.target.value }))}
                      required={!profileForm.editId}
                      className="font-mono text-xs"
                      data-testid="input-profile-token"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pf-owner" className="text-xs">TELEGRAM_OWNER_ID</Label>
                    <Input
                      id="pf-owner"
                      placeholder={profileForm.editId ? T("Dejar vacío para no cambiar", "Leave empty to keep current") : "123456789"}
                      value={profileForm.telegramOwnerId}
                      onChange={(e) => setProfileForm((f) => ({ ...f, telegramOwnerId: e.target.value }))}
                      required={!profileForm.editId}
                      className="font-mono text-xs"
                      data-testid="input-profile-owner"
                    />
                  </div>
                </div>
                {profileForm.msg && (
                  <p className="text-xs text-destructive">{profileForm.msg}</p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={profileForm.submitting} data-testid="button-save-profile">
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {profileForm.submitting ? T("Guardando…", "Saving…") : T("Guardar", "Save")}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={closeProfileForm}>
                    {T("Cancelar", "Cancel")}
                  </Button>
                </div>
              </form>
            )}

            {/* Lista de perfiles */}
            {profiles.length === 0 && !profileForm.open ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {T("No hay perfiles aún. Agregá uno para asociar tokens a bots específicos.", "No profiles yet. Add one to associate tokens with specific bots.")}
              </p>
            ) : (
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{p.name}</span>
                        {p.isDefault && (
                          <span className="flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                            <Star className="h-2.5 w-2.5" />
                            {T("Predeterminado", "Default")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!p.isDefault && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => onSetDefault(p.id)}
                            title={T("Establecer como predeterminado", "Set as default")}
                            data-testid={`button-set-default-${p.id}`}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            {T("Predeterminado", "Set default")}
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => openEditProfile(p)}
                          title={T("Editar", "Edit")}
                          data-testid={`button-edit-profile-${p.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm" variant="destructive" className="h-7 px-2 text-[10px]"
                              onClick={() => onDeleteProfile(p.id)}
                              data-testid={`button-confirm-delete-${p.id}`}
                            >
                              {T("Confirmar", "Confirm")}
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-7 px-2 text-[10px]"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              {T("Cancelar", "Cancel")}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteConfirm(p.id)}
                            title={T("Eliminar", "Delete")}
                            data-testid={`button-delete-profile-${p.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-28 shrink-0">BOT_TOKEN</span>
                        <code className="font-mono truncate text-foreground/80">{p.telegramBotToken || "—"}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-28 shrink-0">OWNER_ID</span>
                        <code className="font-mono truncate text-foreground/80">{p.telegramOwnerId || "—"}</code>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {T("Creado:", "Created:")} {new Date(p.createdAt).toLocaleString()}
                      {p.updatedAt !== p.createdAt && ` · ${T("Actualizado:", "Updated:")} ${new Date(p.updatedAt).toLocaleString()}`}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground leading-snug pt-1">
              {T(
                "Al lanzar un bot de Telegram podés elegir qué perfil usar. Los tokens sobreescriben el .env solo para ese proceso.",
                "When launching a Telegram bot you can choose which profile to use. Tokens override .env only for that process.",
              )}
            </p>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
