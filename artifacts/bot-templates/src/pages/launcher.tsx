import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Square, Download, Terminal, ChevronRight, Loader2,
  Wifi, WifiOff, Send, FileText, AlertTriangle, Info
} from "lucide-react";
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
  telegram:    { es: "Telegram",   en: "Telegram",  color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  whatsapp:    { es: "WhatsApp",   en: "WhatsApp",  color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  "ctf-osint": { es: "CTF/OSINT", en: "CTF/OSINT", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  utility:     { es: "Utilidad",  en: "Utility",   color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
};

const CATS = ["all", "telegram", "whatsapp", "ctf-osint", "utility"] as const;

export default function LauncherPage() {
  const { lang } = useLanguage();
  const [bots, setBots]           = useState<BotEntry[]>([]);
  const [cat, setCat]             = useState<typeof CATS[number]>("all");
  const [selected, setSelected]   = useState<BotEntry | null>(null);
  const [activeRun, setActiveRun] = useState<BotRun | null>(null);
  const [output, setOutput]       = useState<string[]>([]);
  const [stdinHistory, setStdinHistory] = useState<string[]>([]);
  const [stdinLine, setStdinLine] = useState("");
  const [loading, setLoading]     = useState(false);
  const outputRef   = useRef<HTMLDivElement>(null);
  const stdinRef    = useRef<HTMLDivElement>(null);
  const esRef       = useRef<EventSource | null>(null);

  useEffect(() => {
    apiFetch<{ bots: BotEntry[] }>("/bots").then((d) => setBots(d.bots)).catch(() => {});
  }, []);

  // Limpiar consola al cambiar de bot
  useEffect(() => {
    setOutput([]);
    setStdinHistory([]);
    closeSSE();
    setActiveRun(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);
  useEffect(() => {
    if (stdinRef.current) stdinRef.current.scrollTop = stdinRef.current.scrollHeight;
  }, [stdinHistory]);

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
      if (msg.type === "line" && msg.text) {
        // Las líneas que empiezan con "> " son stdin ecos — ya las tenemos en stdinHistory
        if (!msg.text.startsWith("> ")) {
          setOutput((prev) => [...prev, msg.text!]);
        }
      }
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
    setStdinHistory([]);
    closeSSE();
    try {
      const data = await apiFetch<BotRun>("/bots/start", {
        method: "POST",
        body: JSON.stringify({ botId: selected.id }),
      });
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
    const line = stdinLine;
    setStdinHistory((p) => [...p, line]);
    setStdinLine("");
    await apiFetch(`/bots/input/${activeRun.runId}`, {
      method: "POST", body: JSON.stringify({ line }),
    }).catch(() => {});
  };

  const exportCSV = () => dl(
    ["timestamp,text", ...output.map((l) => `"${l.substring(0, 10)}","${l.replace(/"/g, '""')}"`)].join("\n"),
    "bot-output.csv", "text/csv"
  );

  const exportHTML = () => {
    const rows = output.map((l) => `<tr><td>${l.replace(/</g, "&lt;")}</td></tr>`).join("\n");
    dl(
      `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Bot Output</title>
<style>body{font-family:monospace;background:#0d1117;color:#c9d1d9;padding:1rem}
table{width:100%;border-collapse:collapse}td{padding:4px 8px;border-bottom:1px solid #30363d}</style>
</head><body><h2>${selected?.nameEs ?? ""}</h2><table>${rows}</table></body></html>`,
      "bot-output.html", "text/html"
    );
  };

  const dl = (content: string, filename: string, mime: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename; a.click();
  };

  const filtered   = cat === "all" ? bots : bots.filter((b) => b.category === cat);
  const isRunning  = activeRun?.status === "running";
  const isBotActive = activeRun?.botId === selected?.id;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Terminal className="h-7 w-7 text-primary" />
            {lang === "es" ? "Lanzador de Bots" : "Bot Launcher"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {lang === "es"
              ? "Seleccioná un bot, configurá el .env y lanzalo para ver su salida en tiempo real."
              : "Select a bot, configure the .env file and launch it to see real-time output."}
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* ── Lista de bots ── */}
          <div className="space-y-3">
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
            <div className="border rounded-lg overflow-hidden divide-y divide-border max-h-[calc(100vh-260px)] overflow-y-auto">
              {filtered.map((bot) => {
                const isSel = selected?.id === bot.id;
                const running = activeRun?.botId === bot.id && activeRun?.status === "running";
                return (
                  <button key={bot.id} onClick={() => setSelected(bot)}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors ${
                      isSel ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted"
                    }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{lang === "es" ? bot.nameEs : bot.nameEn}</span>
                        {running && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />}
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

          {/* ── Panel derecho ── */}
          {selected ? (
            <div className="space-y-4">
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
                        {lang === "es" ? "Variables requeridas en .env" : "Required .env variables"}
                      </p>
                      <div className="space-y-0.5">
                        {selected.envVars.map((v) => (
                          <code key={v} className="block text-xs bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5 font-mono text-amber-700 dark:text-amber-400">{v}</code>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Instrucciones .env paso a paso */}
                  <div className="rounded-md border border-blue-500/30 bg-blue-500/8 px-3 py-3 space-y-2">
                    <p className="text-xs font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <Info className="h-3.5 w-3.5" />
                      {lang === "es" ? "Cómo configurar antes de lanzar:" : "How to configure before launching:"}
                    </p>
                    <ol className="text-xs text-muted-foreground space-y-1 ml-5 list-decimal">
                      <li>{lang === "es"
                        ? "Abrí el archivo .env en la raíz del proyecto con tu editor de texto."
                        : "Open the .env file at the project root with your text editor."}</li>
                      <li>
                        {lang === "es" ? "Agregá o modificá las siguientes líneas:" : "Add or modify these lines:"}
                        <div className="mt-1 space-y-0.5">
                          {selected.envVars.map((v) => (
                            <code key={v} className="block bg-muted rounded px-2 py-0.5 font-mono">
                              {v}=<span className="text-amber-600 dark:text-amber-400">{lang === "es" ? "tu_valor_aquí" : "your_value_here"}</span>
                            </code>
                          ))}
                        </div>
                      </li>
                      <li>{lang === "es" ? "Guardá el archivo." : "Save the file."}</li>
                      <li>{lang === "es" ? "Hacé clic en \"Lanzar bot\"." : "Click \"Launch bot\"."}</li>
                    </ol>
                    <p className="text-xs text-muted-foreground italic">
                      {lang === "es" ? "Luego interactuá:" : "Then interact:"} {lang === "es" ? selected.usageEs : selected.usageEn}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground font-mono">📄 {selected.file}</p>

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

                  {/* Controles */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={onLaunch} disabled={loading || (isRunning && isBotActive)}>
                      {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                      {lang === "es" ? "Lanzar bot" : "Launch bot"}
                    </Button>
                    {isRunning && isBotActive && (
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

                  {activeRun && isBotActive && (
                    <div className={`flex items-center gap-2 text-xs rounded-md px-3 py-1.5 border ${
                      isRunning
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted border-border text-muted-foreground"
                    }`}>
                      {isRunning ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {isRunning
                        ? (lang === "es" ? "Proceso corriendo" : "Process running")
                        : `${lang === "es" ? "Proceso terminado" : "Process ended"} (${activeRun.status})`}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Dos consolas ── */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Consola de comandos enviados (stdin) */}
                <Card>
                  <CardHeader className="pb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Send className="h-3.5 w-3.5" />
                      {lang === "es" ? "Comandos enviados al bot" : "Commands sent to bot"}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <div
                      ref={stdinRef}
                      className="h-44 overflow-y-auto rounded-md bg-zinc-950 dark:bg-black border p-3 font-mono text-xs space-y-0.5 text-cyan-300"
                    >
                      {stdinHistory.length === 0 ? (
                        <span className="text-zinc-600">
                          {lang === "es" ? "— Enviá un mensaje mientras el bot está corriendo —" : "— Send a message while the bot is running —"}
                        </span>
                      ) : stdinHistory.map((line, i) => (
                        <div key={i} className="flex gap-1"><span className="text-cyan-600 select-none">❯</span><span>{line}</span></div>
                      ))}
                    </div>
                    {isRunning && isBotActive && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          className="font-mono text-xs h-8"
                          placeholder={lang === "es" ? "Escribí y presioná Enter para enviar a stdin..." : "Type and press Enter to send to stdin..."}
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

                {/* Consola de salida del proceso */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Terminal className="h-3.5 w-3.5" />
                        {lang === "es" ? "Salida del proceso" : "Process output"}
                      </h3>
                      {output.length > 0 && (
                        <span className="text-xs text-muted-foreground">{output.length} {lang === "es" ? "líneas" : "lines"}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      ref={outputRef}
                      className="h-44 overflow-y-auto rounded-md bg-zinc-950 dark:bg-black border p-3 font-mono text-xs space-y-0.5 text-zinc-300"
                    >
                      {output.length === 0 ? (
                        <span className="text-zinc-600">
                          {lang === "es" ? "— Lanzá el bot para ver su salida —" : "— Launch the bot to see its output —"}
                        </span>
                      ) : output.map((line, i) => (
                        <div key={i} className={
                          line.includes("[ERROR]") ? "text-red-400" :
                          line.startsWith("⚠") ? "text-amber-400" :
                          line.startsWith("[") && line.includes("]") ? "text-zinc-500" : undefined
                        }>{line}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-72 border rounded-lg border-dashed text-muted-foreground text-sm gap-3">
              <Terminal className="h-10 w-10 opacity-20" />
              <p>{lang === "es" ? "Seleccioná un bot de la lista para comenzar" : "Select a bot from the list to get started"}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
