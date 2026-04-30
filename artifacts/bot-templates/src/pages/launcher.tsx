import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Square, Download, Terminal, ChevronRight, Loader2, Wifi, WifiOff, Send, FileText, AlertTriangle } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/language";
import { apiFetch } from "@/lib/api";

interface BotEntry {
  id: string; nameEs: string; nameEn: string; file: string;
  category: "telegram" | "whatsapp" | "ctf-osint" | "utility";
  descEs: string; descEn: string; commands: string[]; envVars: string[];
  usageEs: string; usageEn: string; tags: string[];
}

interface BotRun { runId: string; botId: string; status: string; startedAt: string; }

const CAT_LABELS: Record<string, { es: string; en: string; color: string }> = {
  telegram:    { es: "Telegram",   en: "Telegram",    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  whatsapp:    { es: "WhatsApp",   en: "WhatsApp",    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  "ctf-osint": { es: "CTF/OSINT",  en: "CTF/OSINT",   color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  utility:     { es: "Utilidad",   en: "Utility",     color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
};

const CATS = ["all", "telegram", "whatsapp", "ctf-osint", "utility"] as const;

export default function LauncherPage() {
  const { lang, t } = useLanguage();
  const [bots, setBots] = useState<BotEntry[]>([]);
  const [cat, setCat] = useState<typeof CATS[number]>("all");
  const [selected, setSelected] = useState<BotEntry | null>(null);
  const [activeRun, setActiveRun] = useState<BotRun | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [stdinLine, setStdinLine] = useState("");
  const [loading, setLoading] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    apiFetch<{ bots: BotEntry[] }>("/bots").then((d) => setBots(d.bots)).catch(() => {});
  }, []);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [output]);

  const closeSSE = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
  }, []);

  const connectSSE = useCallback((runId: string) => {
    closeSSE();
    const BASE = import.meta.env.VITE_API_URL ?? "";
    const es = new EventSource(`${BASE}/api/bots/output/${runId}`, { withCredentials: true });
    esRef.current = es;
    es.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as { type: string; text?: string; status?: string };
      if (msg.type === "line" && msg.text) setOutput((prev) => [...prev, msg.text!]);
      if (msg.type === "close") {
        setActiveRun((r) => r ? { ...r, status: msg.status ?? "stopped" } : r);
        es.close();
      }
    };
    es.onerror = () => es.close();
  }, [closeSSE]);

  const onLaunch = async () => {
    if (!selected || loading) return;
    setLoading(true);
    setOutput([]);
    closeSSE();
    try {
      const data = await apiFetch<BotRun>("/bots/start", { method: "POST", body: JSON.stringify({ botId: selected.id }) });
      setActiveRun(data);
      connectSSE(data.runId);
    } catch (e: unknown) {
      setOutput([`[ERROR] ${String(e)}`]);
    } finally { setLoading(false); }
  };

  const onStop = async () => {
    if (!activeRun) return;
    try { await apiFetch(`/bots/stop/${activeRun.runId}`, { method: "POST" }); } catch {}
    closeSSE();
    setActiveRun((r) => r ? { ...r, status: "stopped" } : r);
  };

  const onStdin = async () => {
    if (!activeRun || !stdinLine.trim()) return;
    setOutput((p) => [...p, `> ${stdinLine}`]);
    await apiFetch(`/bots/input/${activeRun.runId}`, { method: "POST", body: JSON.stringify({ line: stdinLine }) }).catch(() => {});
    setStdinLine("");
  };

  const exportCSV = () => {
    const csv = ["timestamp,text", ...output.map((l) => `"${l.substring(0, 10)}","${l.replace(/"/g, '""')}"`)].join("\n");
    dl(csv, "bot-output.csv", "text/csv");
  };

  const exportHTML = () => {
    const rows = output.map((l) => `<tr><td>${l.replace(/</g, "&lt;")}</td></tr>`).join("\n");
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Bot Output</title>
<style>body{font-family:monospace;background:#0d1117;color:#c9d1d9;padding:1rem}
table{width:100%;border-collapse:collapse}td{padding:4px 8px;border-bottom:1px solid #30363d}
</style></head><body><h2>Salida del bot: ${selected?.nameEs ?? ""}</h2><table>${rows}</table></body></html>`;
    dl(html, "bot-output.html", "text/html");
  };

  const dl = (content: string, filename: string, mime: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename; a.click();
  };

  const filtered = cat === "all" ? bots : bots.filter((b) => b.category === cat);
  const isRunning = activeRun?.status === "running";

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Terminal className="h-7 w-7 text-primary" />
            {t("launcherTitle")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("launcherSubtitle")}</p>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Panel izquierdo — lista de bots */}
          <div className="space-y-3">
            {/* Filtro de categoría */}
            <div className="flex flex-wrap gap-1.5">
              {CATS.map((c) => (
                <button key={c} onClick={() => setCat(c)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {c === "all" ? (lang === "es" ? "Todos" : "All") : CAT_LABELS[c][lang === "es" ? "es" : "en"]}
                </button>
              ))}
            </div>

            {/* Lista scrolleable */}
            <div className="border rounded-lg overflow-hidden divide-y divide-border max-h-[calc(100vh-280px)] overflow-y-auto">
              {filtered.map((bot) => {
                const isActive = activeRun?.botId === bot.id && isRunning;
                const isSel = selected?.id === bot.id;
                return (
                  <button key={bot.id} onClick={() => setSelected(bot)} className={`w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors ${
                    isSel ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted"
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{lang === "es" ? bot.nameEs : bot.nameEn}</span>
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />}
                      </div>
                      <Badge variant="outline" className={`text-[10px] mt-0.5 border ${CAT_LABELS[bot.category].color}`}>
                        {CAT_LABELS[bot.category][lang === "es" ? "es" : "en"]}
                      </Badge>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {lang === "es" ? "Sin bots en esta categoría" : "No bots in this category"}
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho — detalle + consola */}
          <div className="space-y-4">
            {selected ? (
              <>
                {/* Info del bot */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-xl font-bold">{lang === "es" ? selected.nameEs : selected.nameEn}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{lang === "es" ? selected.descEs : selected.descEn}</p>
                      </div>
                      <Badge variant="outline" className={`border ${CAT_LABELS[selected.category].color} shrink-0`}>
                        {CAT_LABELS[selected.category][lang === "es" ? "es" : "en"]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          {lang === "es" ? "Comandos / mensajes" : "Commands / messages"}
                        </p>
                        <div className="space-y-0.5">
                          {selected.commands.map((c) => (
                            <code key={c} className="block text-xs bg-muted rounded px-2 py-0.5 font-mono">{c}</code>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          {lang === "es" ? "Variables de entorno requeridas" : "Required env vars"}
                        </p>
                        <div className="space-y-0.5">
                          {selected.envVars.map((v) => (
                            <code key={v} className="block text-xs bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5 font-mono text-amber-700 dark:text-amber-400">{v}</code>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Ejemplo de uso */}
                    <div className="rounded-md bg-muted/50 border px-3 py-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        {lang === "es" ? "Cómo interactuar con el bot:" : "How to interact with the bot:"}
                      </p>
                      <p className="text-xs">{lang === "es" ? selected.usageEs : selected.usageEn}</p>
                    </div>

                    {/* Archivo */}
                    <p className="text-xs text-muted-foreground font-mono">📄 {selected.file}</p>

                    {/* CTF warning */}
                    {selected.category === "ctf-osint" && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          {lang === "es"
                            ? "Solo en sistemas autorizados. Uso educativo / CTF permitido."
                            : "Authorized systems only. Educational / CTF use permitted."}
                        </p>
                      </div>
                    )}

                    {/* Controles de lanzamiento */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" onClick={onLaunch} disabled={loading || isRunning}>
                        {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                        {lang === "es" ? "Lanzar bot" : "Launch bot"}
                      </Button>
                      {isRunning && (
                        <Button size="sm" variant="destructive" onClick={onStop}>
                          <Square className="h-3.5 w-3.5 mr-1.5" />
                          {lang === "es" ? "Detener" : "Stop"}
                        </Button>
                      )}
                      {output.length > 0 && (
                        <>
                          <Button size="sm" variant="outline" onClick={exportCSV}>
                            <Download className="h-3.5 w-3.5 mr-1.5" />CSV
                          </Button>
                          <Button size="sm" variant="outline" onClick={exportHTML}>
                            <FileText className="h-3.5 w-3.5 mr-1.5" />HTML
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Estado del proceso */}
                    {activeRun && activeRun.botId === selected.id && (
                      <div className={`flex items-center gap-2 text-xs rounded-md px-3 py-1.5 border ${
                        isRunning
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted border-border text-muted-foreground"
                      }`}>
                        {isRunning ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                        {isRunning ? (lang === "es" ? "Proceso corriendo" : "Process running") : `${lang === "es" ? "Proceso terminado" : "Process ended"} (${activeRun.status})`}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Consola */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        {lang === "es" ? "Salida del proceso" : "Process output"}
                      </h3>
                      {output.length > 0 && (
                        <span className="text-xs text-muted-foreground">{output.length} {lang === "es" ? "líneas" : "lines"}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      ref={consoleRef}
                      className="h-72 overflow-y-auto rounded-md bg-zinc-950 dark:bg-black border p-3 font-mono text-xs space-y-0.5 text-zinc-300"
                    >
                      {output.length === 0 ? (
                        <span className="text-zinc-600">{lang === "es" ? "— Lanzá el bot para ver su salida —" : "— Launch the bot to see its output —"}</span>
                      ) : output.map((line, i) => (
                        <div key={i} className={line.startsWith("⚠") ? "text-amber-400" : line.startsWith("[ERROR]") ? "text-red-400" : line.startsWith(">") ? "text-cyan-400" : undefined}>
                          {line}
                        </div>
                      ))}
                    </div>

                    {/* Entrada stdin */}
                    {isRunning && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          className="font-mono text-xs h-8"
                          placeholder={lang === "es" ? "Enviar a stdin del proceso..." : "Send to process stdin..."}
                          value={stdinLine}
                          onChange={(e) => setStdinLine(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") onStdin(); }}
                        />
                        <Button size="sm" variant="outline" onClick={onStdin} className="h-8 px-2.5">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-72 border rounded-lg border-dashed text-muted-foreground text-sm gap-3">
                <Terminal className="h-10 w-10 opacity-20" />
                <p>{lang === "es" ? "Seleccioná un bot de la lista para comenzar" : "Select a bot from the list to get started"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
