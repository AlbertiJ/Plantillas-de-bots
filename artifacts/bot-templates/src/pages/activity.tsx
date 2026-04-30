import { useEffect, useState } from "react";
import { Activity, Bot, CheckCircle, XCircle, Clock, BarChart3, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language";
import { apiFetch } from "@/lib/api";

interface ActivityEntry {
  runId: string; botId: string; botName: string; category: string;
  startedAt: string; stoppedAt: string | null;
  status: "running" | "stopped" | "crashed" | "not-found";
  exitCode: number | null; lineCount: number;
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

  const load = async () => {
    try {
      const data = await apiFetch<{ entries: ActivityEntry[]; stats: Stats }>("/bots/activity");
      setEntries(data.entries);
      setStats(data.stats);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const statusLabel = (s: string) => ({
    running:    lang === "es" ? "Corriendo" : "Running",
    stopped:    lang === "es" ? "Detenido" : "Stopped",
    crashed:    lang === "es" ? "Error" : "Crashed",
    "not-found": lang === "es" ? "No encontrado" : "Not found",
  }[s] ?? s);

  const topBots = stats ? Object.entries(stats.byBot).sort((a, b) => b[1] - a[1]).slice(0, 5) : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            {lang === "es" ? "Actividad de Bots" : "Bot Activity"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {lang === "es" ? "Historial de lanzamientos y estadísticas de uso." : "Launch history and usage statistics."}
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
                    <p className="text-xs text-muted-foreground">{lang === "es" ? "Total ejecuciones" : "Total runs"}</p>
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
                    <p className="text-xs text-muted-foreground">{lang === "es" ? "Tasa de éxito" : "Success rate"}</p>
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
                    <p className="text-xs text-muted-foreground">{lang === "es" ? "Bots distintos usados" : "Distinct bots used"}</p>
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
                    <p className="text-xs text-muted-foreground">{lang === "es" ? "Corriendo ahora" : "Running now"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Historial */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {lang === "es" ? "Historial de ejecuciones" : "Execution history"}
              </h2>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : entries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {lang === "es" ? "Aún no hay ejecuciones. Lanzá un bot desde el Lanzador." : "No runs yet. Launch a bot from the Launcher."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left py-2 pr-4">{lang === "es" ? "Bot" : "Bot"}</th>
                        <th className="text-left py-2 pr-4">{lang === "es" ? "Inicio" : "Start"}</th>
                        <th className="text-left py-2 pr-4">{lang === "es" ? "Duración" : "Duration"}</th>
                        <th className="text-left py-2 pr-4">{lang === "es" ? "Líneas" : "Lines"}</th>
                        <th className="text-left py-2">{lang === "es" ? "Estado" : "Status"}</th>
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
                  {lang === "es" ? "Bots más usados" : "Most used bots"}
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
                          <span className="text-muted-foreground">{count} {lang === "es" ? "veces" : "times"}</span>
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
      </div>
    </Layout>
  );
}
