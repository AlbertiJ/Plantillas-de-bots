import { useEffect, useState } from "react";
import { Activity, Bot, CheckCircle, XCircle, Clock, BarChart3, Loader2, Terminal, Package, RefreshCw, AlertCircle } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language";
import { apiFetch } from "@/lib/api";

interface SystemStatus {
  python: { raw: string; ok: boolean };
  node: { raw: string; ok: boolean };
  packages: { name: string; installed: boolean; optional: boolean }[];
  botFiles: { exists: boolean }[];
  envExists: boolean;
}

interface ActivityEntry {
  runId: string; botId: string; botName: string; category: string;
  startedAt: string; stoppedAt: string | null;
  status: "running" | "stopped" | "crashed" | "not-found";
  exitCode: number | null; lineCount: number;
  profileId?: string; profileName?: string;
}

interface Stats {
  totalRuns: number;
  byBot: Record<string, number>;
  byCategory: Record<string, number>;
  successRate: number;
}

const STATUS_STYLES: Record<string, string> = {
  running:   "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  stopped:   "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  crashed:   "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  "not-found": "bg-zinc-500/15 text-muted-foreground border-zinc-500/30",
};

const CAT_COLORS: Record<string, string> = {
  telegram: "text-blue-500", whatsapp: "text-emerald-500",
  "ctf-osint": "text-amber-500", utility: "text-purple-500",
};

function duration(start: string, end: string | null): string {
  const ms = end ? new Date(end).getTime() - new Date(start).getTime() : Date.now() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function ActivityPage() {
  const { lang } = useLanguage();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null);
  const [sysLoading, setSysLoading] = useState(true);

  const load = async () => {
    try {
      const data = await apiFetch<{ entries: ActivityEntry[]; stats: Stats }>("/bots/activity");
      setEntries(data.entries);
      setStats(data.stats);
    } catch {}
    finally { setLoading(false); }
  };

  const loadSys = async () => {
    setSysLoading(true);
    try {
      const d = await apiFetch<SystemStatus>("/bots/status");
      setSysStatus(d);
    } catch {}
    finally { setSysLoading(false); }
  };

  useEffect(() => {
    void load();
    void loadSys();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const statusLabel = (s: string) => ({
    running:    lang === "es" ? "Corriendo" : "Running",
    stopped:    lang === "es" ? "Detenido" : "Stopped",
    crashed:    lang === "es" ? "Error" : "Crashed",
    "not-found": lang === "es" ? "No encontrado" : "Not found",
  }[s] ?? s);

  const topBots = stats ? Object.entries(stats.byBot).sort((a, b) => b[1] - a[1]).slice(0, 5) : [];

  const T = (es: string, en: string) => lang === "es" ? es : en;

  const pkgOk    = sysStatus ? sysStatus.packages.filter(p => p.installed).length : 0;
  const pkgTotal = sysStatus ? sysStatus.packages.filter(p => !p.optional).length : 0;
  const botsOk   = sysStatus ? sysStatus.botFiles.filter(f => f.exists).length    : 0;
  const botsTotal= sysStatus ? sysStatus.botFiles.length                           : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            {T("Actividad de Bots", "Bot Activity")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {T("Historial de lanzamientos y estadísticas de uso.", "Launch history and usage statistics.")}
          </p>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-primary opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalRuns}</p>
                    <p className="text-xs text-muted-foreground">{T("Total ejecuciones", "Total runs")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-emerald-500 opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">{stats.successRate}%</p>
                    <p className="text-xs text-muted-foreground">{T("Tasa de éxito", "Success rate")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Bot className="h-8 w-8 text-blue-500 opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">{Object.keys(stats.byBot).length}</p>
                    <p className="text-xs text-muted-foreground">{T("Bots distintos usados", "Distinct bots used")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-8 w-8 text-amber-500 opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">{entries.filter(e => e.status === "running").length}</p>
                    <p className="text-xs text-muted-foreground">{T("Corriendo ahora", "Running now")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Layout principal: historial + sidebar estado del sistema */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Columna izquierda: historial + top bots */}
          <div className="space-y-6">
            {/* Historial */}
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {T("Historial de ejecuciones", "Execution history")}
                </h2>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {T("Aún no hay ejecuciones. Lanzá un bot desde el Lanzador.", "No runs yet. Launch a bot from the Launcher.")}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-4">Bot</th>
                          <th className="text-left py-2 pr-4">{T("Perfil", "Profile")}</th>
                          <th className="text-left py-2 pr-4">{T("Inicio", "Start")}</th>
                          <th className="text-left py-2 pr-4">{T("Duración", "Duration")}</th>
                          <th className="text-left py-2 pr-4">{T("Líneas", "Lines")}</th>
                          <th className="text-left py-2">{T("Estado", "Status")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {entries.map((e) => (
                          <tr key={e.runId} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${CAT_COLORS[e.category] ?? "text-muted-foreground"} bg-current`} />
                                <span className="font-medium truncate max-w-[140px]">{e.botName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                              {e.profileName
                                ? <span className="flex items-center gap-1 text-primary/80 font-medium"><span>★</span>{e.profileName}</span>
                                : <span className="text-muted-foreground/60">—</span>
                              }
                            </td>
                            <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">{fmt(e.startedAt)}</td>
                            <td className="py-2.5 pr-4 text-xs whitespace-nowrap">{duration(e.startedAt, e.stoppedAt)}</td>
                            <td className="py-2.5 pr-4 text-xs">{e.lineCount}</td>
                            <td className="py-2.5">
                              <Badge variant="outline" className={`text-[10px] border ${STATUS_STYLES[e.status] ?? ""}`}>
                                {statusLabel(e.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top bots */}
            {topBots.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {T("Bots más usados", "Most used bots")}
                  </h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topBots.map(([botId, count]) => {
                      const pct = stats ? Math.round((count / stats.totalRuns) * 100) : 0;
                      return (
                        <div key={botId}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-mono truncate max-w-[160px]">{botId}</span>
                            <span className="text-muted-foreground">{count} {T("veces", "times")}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Columna derecha: Estado del Sistema */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    {T("Estado del Sistema", "System Status")}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={loadSys}
                    disabled={sysLoading}
                    title={T("Actualizar", "Refresh")}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${sysLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {sysLoading && !sysStatus ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : sysStatus ? (
                  <>
                    {/* Python y Node */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {T("Entornos", "Runtimes")}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Python</span>
                        <div className="flex items-center gap-1.5">
                          {sysStatus.python.ok
                            ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                          <code className="font-mono text-[10px]">{sysStatus.python.raw || "—"}</code>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Node.js</span>
                        <div className="flex items-center gap-1.5">
                          {sysStatus.node.ok
                            ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                          <code className="font-mono text-[10px]">{sysStatus.node.raw || "—"}</code>
                        </div>
                      </div>
                    </div>

                    {/* Paquetes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="h-3 w-3" />
                          {T("Paquetes", "Packages")}
                        </p>
                        <span className={`text-[10px] font-medium ${pkgOk === pkgTotal ? "text-emerald-500" : "text-amber-500"}`}>
                          {pkgOk}/{pkgTotal}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pkgOk === pkgTotal ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: pkgTotal ? `${Math.round((pkgOk / pkgTotal) * 100)}%` : "0%" }}
                        />
                      </div>
                      {pkgOk < pkgTotal && (
                        <div className="space-y-1">
                          {sysStatus.packages.filter(p => !p.installed && !p.optional).map(p => (
                            <div key={p.name} className="flex items-center gap-1.5 text-[10px] text-red-500">
                              <XCircle className="h-3 w-3 shrink-0" />
                              <code>{p.name}</code>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Archivos de bots */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {T("Archivos de bots", "Bot files")}
                        </p>
                        <span className={`text-[10px] font-medium ${botsOk === botsTotal ? "text-emerald-500" : "text-red-500"}`}>
                          {botsOk}/{botsTotal}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${botsOk === botsTotal ? "bg-emerald-500" : "bg-red-500"}`}
                          style={{ width: botsTotal ? `${Math.round((botsOk / botsTotal) * 100)}%` : "0%" }}
                        />
                      </div>
                    </div>

                    {/* .env */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                      <span className="text-muted-foreground font-mono">.env</span>
                      {sysStatus.envExists ? (
                        <div className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span className="text-[10px]">{T("Presente", "Present")}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-500">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="text-[10px]">{T("No encontrado", "Not found")}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {T("No se pudo cargar el estado del sistema.", "Could not load system status.")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
