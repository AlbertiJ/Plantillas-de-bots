import { useEffect, useState } from "react";
import {
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Terminal,
  Package, FileCode, Folder, Loader2, Wrench, Github,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language";

// MODIFICAR: Cambiar la URL base si el API server corre en otro puerto
const API_BASE = import.meta.env.BASE_URL
  ? `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`
  : "/api";

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

interface PkgInfo  { name: string; installed: boolean; version: string; fix: string; optional: boolean; }
interface FileInfo { id: string; path: string; exists: boolean; absPath: string; }
interface ExtraFile { id: string; path: string; exists: boolean; absPath: string; }
interface StatusData {
  repoRoot:   string;
  repoUrl?:   string;
  python:     { raw: string; ok: boolean };
  node:       { raw: string; ok: boolean };
  packages:   PkgInfo[];
  botFiles:   FileInfo[];
  extraFiles?: ExtraFile[];
  envExists:  boolean;
  checkedAt:  string;
}

interface FixResult {
  fixed:    string[];
  errors:   string[];
  skipped:  number;
  repoRoot: string;
  message:  string;
}

const OK   = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
const ERR  = <XCircle      className="h-4 w-4 text-red-500 shrink-0" />;
const WARN = <AlertCircle  className="h-4 w-4 text-amber-500 shrink-0" />;

export default function StatusPage() {
  const { lang } = useLanguage();
  const [data, setData]       = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [ts, setTs]           = useState(Date.now());

  const [fixing, setFixing]     = useState(false);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiFetch<StatusData>("/bots/status");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [ts]);

  const handleFix = async () => {
    setFixing(true);
    setFixResult(null);
    try {
      const result = await apiFetch<FixResult>("/bots/fix", { method: "POST" });
      setFixResult(result);
      // Re-check status after fix
      setTimeout(() => setTs(Date.now()), 800);
    } catch (e) {
      setFixResult({
        fixed: [],
        errors: [e instanceof Error ? e.message : String(e)],
        skipped: 0,
        repoRoot: data?.repoRoot ?? "",
        message: "Error al conectar con el servidor.",
      });
    } finally {
      setFixing(false);
    }
  };

  const T = (es: string, en: string) => lang === "es" ? es : en;

  const missingBots     = data?.botFiles.filter((f) => !f.exists) ?? [];
  const missingRequired = data?.packages.filter((p) => !p.installed && !p.optional) ?? [];
  const missingOptional = data?.packages.filter((p) => !p.installed && p.optional)  ?? [];
  const hasMissing      = missingBots.length > 0 || (data?.extraFiles ?? []).some((f) => !f.exists);

  return (
    <Layout>
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Terminal className="h-6 w-6 text-primary" />
              {T("Estado del Sistema", "System Status")}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {T(
                "Verificación del repositorio local: dependencias, archivos de bots y variables de entorno.",
                "Local repository check: dependencies, bot files and environment variables."
              )}
            </p>
            {data?.repoRoot && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {T("Directorio verificado:", "Checked directory:")} <span className="text-foreground">{data.repoRoot}</span>
              </p>
            )}
          </div>

          {/* ── Botones Comprobar + Arreglo ──────────────────────────────── */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setFixResult(null); setTs(Date.now()); }}
              disabled={loading || fixing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              {T("Comprobar", "Check")}
            </Button>

            <Button
              variant={hasMissing ? "default" : "outline"}
              size="sm"
              onClick={handleFix}
              disabled={fixing || loading}
              title={T(
                "Descarga desde GitHub los archivos de bots que falten en el directorio local",
                "Downloads from GitHub the bot files missing in the local directory"
              )}
            >
              {fixing
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Wrench className="h-3.5 w-3.5 mr-1.5" />}
              {T("Arreglo", "Fix")}
            </Button>

            {data?.repoUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a href={data.repoUrl} target="_blank" rel="noreferrer">
                  <Github className="h-3.5 w-3.5 mr-1.5" />
                  GitHub
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* ── Resultado del Arreglo ─────────────────────────────────────── */}
        {fixResult && (
          <Card className={`border ${fixResult.errors.length > 0 ? "border-amber-500/40" : "border-emerald-500/40"}`}>
            <CardContent className="pt-4 pb-3 space-y-2">
              <p className={`text-sm font-semibold flex items-center gap-2 ${fixResult.fixed.length > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {fixResult.fixed.length > 0 ? OK : WARN}
                {fixResult.message}
              </p>
              {fixResult.fixed.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{T("Archivos descargados:", "Downloaded files:")}</p>
                  <ul className="space-y-0.5">
                    {fixResult.fixed.map((f) => (
                      <li key={f} className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        {OK} {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fixResult.errors.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{T("Errores:", "Errors:")}</p>
                  <ul className="space-y-0.5">
                    {fixResult.errors.map((e, i) => (
                      <li key={i} className="text-xs font-mono text-red-500">{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {fixResult.skipped > 0 && (
                <p className="text-xs text-muted-foreground">
                  {fixResult.skipped} {T("archivo(s) ya existían (sin cambios).", "file(s) already existed (no changes).")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Error de conexión ─────────────────────────────────────────── */}
        {error && (
          <Card className="border-red-500/40">
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-red-500 flex items-center gap-2">
                {ERR}
                {T("No se pudo conectar con el servidor API.", "Could not connect to the API server.")}
                {" "}<code className="text-xs bg-muted px-1 rounded">{error}</code>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {T(
                  "Asegurate de que el servidor API está corriendo. Revisá la terminal donde lo iniciaste.",
                  "Make sure the API server is running. Check the terminal where you started it."
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {loading && !data && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && (
          <div className="space-y-5">
            {/* ── Resumen rápido ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Python",  ok: data.python.ok, val: data.python.raw.replace("Python ","") || T("No encontrado","Not found") },
                { label: "Node.js", ok: data.node.ok,   val: data.node.raw || T("No encontrado","Not found") },
                {
                  label: T("Paquetes faltantes","Missing packages"),
                  ok: missingRequired.length === 0,
                  val: missingRequired.length > 0
                    ? `${missingRequired.length} ${T("requeridos","required")}`
                    : T("Todos instalados","All installed"),
                },
                {
                  label: T("Archivos de bots","Bot files"),
                  ok: missingBots.length === 0,
                  val: missingBots.length > 0
                    ? `${missingBots.length} ${T("faltantes","missing")}`
                    : T("Todos presentes","All present"),
                },
              ].map((item) => (
                <Card key={item.label} className={`border ${item.ok ? "border-emerald-500/30" : "border-red-500/30"}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      {item.ok ? OK : ERR}
                      <span className="text-xs sm:text-sm font-semibold truncate">{item.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{item.val}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Directorio raíz / .env ─────────────────────────────────── */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  {T("Directorio raíz del proyecto","Project root directory")}
                </h2>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2 flex-wrap">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">{data.repoRoot}</code>
                  {data.repoUrl && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      <Github className="h-3 w-3 mr-1" />
                      {GITHUB_REPO_NAME(data.repoUrl)}
                    </Badge>
                  )}
                </div>

                {/* .env status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {data.envExists ? OK : WARN}
                  <span className="text-sm font-medium">{T("Archivo .env","File .env")}</span>
                  {!data.envExists && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {T("No encontrado — normal si aún no lo creaste.","Not found — normal if you haven't created it yet.")}
                    </span>
                  )}
                </div>

                {!data.envExists && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-700 dark:text-amber-400">
                    <p className="font-semibold mb-1">{T("Crear el .env desde la plantilla:","Create .env from template:")}</p>
                    <p>cp .env.example .env</p>
                    <p className="mt-1 font-sans text-[11px] opacity-80">
                      {T("Luego editá .env y completá tus tokens.","Then edit .env and fill in your tokens.")}
                    </p>
                  </div>
                )}

                {/* Extra files */}
                {data.extraFiles && data.extraFiles.length > 0 && (
                  <div className="divide-y divide-border/40">
                    {data.extraFiles.map((f) => (
                      <div key={f.path} className="py-1.5 flex items-center gap-2">
                        {f.exists ? OK : WARN}
                        <span className="font-mono text-xs">{f.path}</span>
                        {!f.exists && (
                          <span className="text-xs text-muted-foreground">
                            {T("faltante — usá el botón Arreglo","missing — use the Fix button")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Paquetes Python ─────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {T("Paquetes Python","Python Packages")}
                </h2>
              </CardHeader>
              <CardContent>
                {missingRequired.length + missingOptional.length > 0 && (
                  <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 font-mono text-xs mb-4">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                      {T("Instalación rápida de todo:","Quick install all:")}
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 break-all">
                      pip install python-telegram-bot python-dotenv openai anthropic google-generativeai apscheduler flask twilio aiohttp requests beautifulsoup4 dnspython
                    </p>
                  </div>
                )}
                <div className="divide-y divide-border/50">
                  {data.packages.map((pkg) => (
                    <div key={pkg.name} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {pkg.installed ? OK : (pkg.optional ? WARN : ERR)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium">{pkg.name}</span>
                            {pkg.optional && (
                              <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                                {T("opcional","optional")}
                              </Badge>
                            )}
                          </div>
                          {pkg.installed && pkg.version && (
                            <p className="text-xs text-muted-foreground">v{pkg.version}</p>
                          )}
                          {!pkg.installed && (
                            <p className="text-xs font-mono text-amber-600 dark:text-amber-400 mt-0.5">{pkg.fix}</p>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${pkg.installed ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {pkg.installed ? T("✓ instalado","✓ installed") : T("✗ faltante","✗ missing")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Archivos de bots ─────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    {T("Archivos de bots","Bot files")}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {data.botFiles.filter((f) => f.exists).length}/{data.botFiles.length} {T("presentes","present")}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {missingBots.length > 0 && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs mb-4 space-y-1.5">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">
                      {T(
                        `Faltan ${missingBots.length} archivo(s). Usá el botón "Arreglo" para descargarlos del repositorio GitHub automáticamente, o hacé git pull si ya tenés el repo clonado.`,
                        `${missingBots.length} file(s) missing. Use the "Fix" button to download them from GitHub automatically, or run git pull if you already have the repo cloned.`
                      )}
                    </p>
                    <p className="font-mono text-amber-700 dark:text-amber-300">git pull origin main</p>
                  </div>
                )}
                <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
                  {data.botFiles.map((f) => (
                    <div key={f.path} className="py-2 flex items-center gap-2">
                      {f.exists ? OK : ERR}
                      <span className={`font-mono text-xs ${f.exists ? "" : "text-red-500"}`}>{f.path}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Errores comunes ──────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">{T("Errores comunes y soluciones","Common errors & fixes")}</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  {[
                    {
                      err: T("No such file or directory (bot .py)","No such file or directory (bot .py)"),
                      fix: T(
                        `Usá el botón "Arreglo" arriba para descargar los archivos desde GitHub. O ejecutá git pull.`,
                        `Use the "Fix" button above to download files from GitHub. Or run git pull.`
                      ),
                      cmd: "git pull origin main",
                    },
                    {
                      err: T("ModuleNotFoundError: No module named 'telegram'","ModuleNotFoundError: No module named 'telegram'"),
                      fix: T("Instalá la librería python-telegram-bot en tu entorno virtual.","Install the python-telegram-bot library in your virtual environment."),
                      cmd: "pip install python-telegram-bot",
                    },
                    {
                      err: T("Unauthorized (token inválido)","Unauthorized (invalid token)"),
                      fix: T("Verificá TELEGRAM_BOT_TOKEN en tu .env. Obtené uno con @BotFather en Telegram.","Check TELEGRAM_BOT_TOKEN in your .env. Get one from @BotFather on Telegram."),
                    },
                    {
                      err: T("KeyError: REPO_ROOT incorrecto","KeyError: REPO_ROOT incorrect"),
                      fix: T(
                        `El servidor API apunta al directorio equivocado. Agregá REPO_ROOT=/ruta/a/tu/repo en el .env del servidor.`,
                        `The API server points to the wrong directory. Add REPO_ROOT=/path/to/your/repo in the server's .env.`
                      ),
                      cmd: `REPO_ROOT=/home/tu_usuario/Documentos/github/Plantillas-de-bots`,
                    },
                    {
                      err: T("python3 not found","python3 not found"),
                      fix: T("Instalá Python 3.10+. En Ubuntu: sudo apt install python3 python3-pip.","Install Python 3.10+. On Ubuntu: sudo apt install python3 python3-pip."),
                      cmd: "sudo apt install python3 python3-pip",
                    },
                  ].map((item, i) => (
                    <div key={i} className="border rounded-md px-3 py-2.5 space-y-1.5">
                      <div className="flex items-start gap-2">
                        {ERR}
                        <span className="font-mono text-xs text-red-600 dark:text-red-400">{item.err}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">{item.fix}</p>
                      {item.cmd && (
                        <code className="block ml-6 text-xs bg-muted px-2 py-1 rounded font-mono break-all">{item.cmd}</code>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-right">
              {T("Verificado","Checked")}: {new Date(data.checkedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function GITHUB_REPO_NAME(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.slice(-2).join("/");
  } catch {
    return url;
  }
}
