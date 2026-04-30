import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Terminal, Package, FileCode, Folder, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language";
import { apiFetch } from "@/lib/api";

interface PkgInfo  { name: string; installed: boolean; version: string; fix: string; optional: boolean; }
interface FileInfo { id: string; path: string; exists: boolean; absPath: string; }
interface StatusData {
  repoRoot: string;
  python:   { raw: string; ok: boolean };
  node:     { raw: string; ok: boolean };
  packages: PkgInfo[];
  botFiles: FileInfo[];
  envExists: boolean;
  checkedAt: string;
}

const OK  = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
const ERR = <XCircle      className="h-4 w-4 text-red-500 shrink-0" />;
const WARN= <AlertCircle  className="h-4 w-4 text-amber-500 shrink-0" />;

export default function StatusPage() {
  const { lang } = useLanguage();
  const [data, setData]   = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ts, setTs] = useState(Date.now());

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiFetch<StatusData>("/bots/status");
      setData(d);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [ts]);

  const T = (es: string, en: string) => lang === "es" ? es : en;

  const missingBots  = data?.botFiles.filter((f) => !f.exists) ?? [];
  const missingRequired = data?.packages.filter((p) => !p.installed && !p.optional) ?? [];
  const missingOptional = data?.packages.filter((p) => !p.installed && p.optional)  ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Terminal className="h-7 w-7 text-primary" />
              {T("Estado del Sistema", "System Status")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {T(
                "Verificación de dependencias, archivos de bots y configuración del entorno.",
                "Dependency check, bot files verification and environment configuration."
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTs(Date.now())} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {T("Verificar", "Check")}
          </Button>
        </div>

        {loading && !data && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && (
          <div className="space-y-5">
            {/* Resumen rápido */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Python",  ok: data.python.ok, val: data.python.raw.replace("Python ","") },
                { label: "Node.js", ok: data.node.ok,   val: data.node.raw },
                { label: T("Paquetes faltantes","Missing packages"), ok: missingRequired.length === 0, val: missingRequired.length > 0 ? `${missingRequired.length} ${T("requeridos","required")}` : T("Todos instalados","All installed") },
                { label: T("Archivos de bots","Bot files"), ok: missingBots.length === 0, val: missingBots.length > 0 ? `${missingBots.length} ${T("faltantes","missing")}` : T("Todos presentes","All present") },
              ].map((item) => (
                <Card key={item.label} className={`border ${item.ok ? "border-emerald-500/30" : "border-red-500/30"}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">{item.ok ? OK : ERR}<span className="text-sm font-semibold">{item.label}</span></div>
                    <p className="text-xs text-muted-foreground font-mono">{item.val || "—"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Directorio raíz / .env */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold flex items-center gap-2"><Folder className="h-4 w-4" />{T("Directorio raíz del proyecto","Project root directory")}</h2></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono flex-1 truncate">{data.repoRoot}</code>
                </div>
                <div className="flex items-center gap-2">
                  {data.envExists ? OK : WARN}
                  <span className="text-sm">{T("Archivo .env","File .env")}</span>
                  {!data.envExists && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">
                      {T("No encontrado. Copiá .env.example como .env y completá los tokens.","Not found. Copy .env.example as .env and fill in your tokens.")}
                    </span>
                  )}
                </div>
                {!data.envExists && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-700 dark:text-amber-400">
                    <p className="font-semibold mb-1">{T("Solución:","Fix:")}</p>
                    <p>cp .env.example .env</p>
                    <p># {T("Luego editá .env con tus credenciales","Then edit .env with your credentials")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Paquetes Python */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />{T("Paquetes Python","Python Packages")}
                </h2>
              </CardHeader>
              <CardContent>
                {/* Instalación rápida si hay faltantes */}
                {missingRequired.length + missingOptional.length > 0 && (
                  <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 font-mono text-xs mb-4">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">{T("Instalación rápida de todo:","Quick install all:")}</p>
                    <p className="text-blue-700 dark:text-blue-300">pip install python-telegram-bot python-dotenv openai anthropic google-generativeai apscheduler flask twilio aiohttp requests</p>
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

            {/* Archivos de bots */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <FileCode className="h-4 w-4" />{T("Archivos de bots","Bot files")}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {data.botFiles.filter((f) => f.exists).length}/{data.botFiles.length} {T("presentes","present")}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {missingBots.length > 0 && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs mb-4">
                    <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                      {T("Archivos faltantes — ¿no hiciste git pull?","Missing files — did you git pull?")}
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

            {/* Errores comunes y soluciones */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold">{T("Errores comunes y soluciones","Common errors & fixes")}</h2></CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  {[
                    {
                      err: T("No such file or directory (bot .py)","No such file or directory (bot .py)"),
                      fix: T("Ejecutá `git pull origin main` para descargar los archivos de bots que faltan.", "Run `git pull origin main` to download missing bot files."),
                      cmd: "git pull origin main",
                    },
                    {
                      err: T("ModuleNotFoundError: No module named 'telegram'", "ModuleNotFoundError: No module named 'telegram'"),
                      fix: T("Instalá la librería python-telegram-bot.", "Install the python-telegram-bot library."),
                      cmd: "pip install python-telegram-bot",
                    },
                    {
                      err: T("Unauthorized (token inválido)","Unauthorized (invalid token)"),
                      fix: T("Verificá TELEGRAM_BOT_TOKEN en tu archivo .env. Obtené uno con @BotFather en Telegram.", "Check TELEGRAM_BOT_TOKEN in your .env. Get one from @BotFather on Telegram."),
                    },
                    {
                      err: T("ConnectionError / requests timeout","ConnectionError / requests timeout"),
                      fix: T("El proceso Python no tiene conexión a internet o el servidor de Telegram está caído.", "The Python process has no internet or Telegram's servers are down."),
                    },
                    {
                      err: T("python3 not found","python3 not found"),
                      fix: T("Instalá Python 3.10 o superior. En Ubuntu: `sudo apt install python3 python3-pip`.", "Install Python 3.10+. On Ubuntu: `sudo apt install python3 python3-pip`."),
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
                        <code className="block ml-6 text-xs bg-muted px-2 py-1 rounded font-mono">{item.cmd}</code>
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
