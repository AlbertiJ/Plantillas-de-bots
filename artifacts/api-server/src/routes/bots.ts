import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../lib/auth-middleware";
import { BOT_CATALOG, getBotById } from "../lib/bot-catalog";
import { startBot, stopBot, sendInput, getRun, getAllRuns, getRunningBots } from "../lib/bot-runner";
import { logStart, logStop, getAll, getStats } from "../lib/activity-store";

const router: IRouter = Router();

// ── Catálogo ──────────────────────────────────────────────

/** GET /api/bots — lista todos los bots disponibles */
router.get("/bots", requireAuth, (_req, res) => {
  res.json({ bots: BOT_CATALOG });
});

// ── Runs activos ──────────────────────────────────────────

/** GET /api/bots/status — bots corriendo ahora */
router.get("/bots/status", requireAuth, (_req, res) => {
  const running = getRunningBots();
  res.json({
    running: running.map((r) => ({
      id: r.id, botId: r.botId, botName: r.botName, pid: r.pid,
      startedAt: r.startedAt, status: r.status,
    })),
  });
});

/** POST /api/bots/start — inicia un bot */
router.post("/bots/start", requireAuth, (req, res) => {
  const { botId } = req.body ?? {};
  if (!botId || typeof botId !== "string") {
    res.status(400).json({ error: "botId requerido" });
    return;
  }
  const entry = getBotById(botId);
  if (!entry) { res.status(404).json({ error: "bot_not_found" }); return; }

  const run = startBot(entry.id, entry.file, entry.nameEs);

  // Log en actividad
  logStart({
    runId: run.id,
    botId: entry.id,
    botName: entry.nameEs,
    category: entry.category,
    startedAt: run.startedAt,
    status: "running",
  });

  // Actualizar actividad al cerrar
  run.emitter.on("close", (code: number | null) => {
    logStop(run.id, run.status, code, run.outputLines.length);
  });

  res.json({
    runId: run.id,
    botId: entry.id,
    botName: entry.nameEs,
    status: run.status,
    startedAt: run.startedAt,
  });
});

/** POST /api/bots/stop/:runId — detiene un bot */
router.post("/bots/stop/:runId", requireAuth, (req, res) => {
  const ok = stopBot(req.params.runId);
  if (!ok) { res.status(404).json({ error: "run_not_found_or_not_running" }); return; }
  res.json({ ok: true });
});

/** POST /api/bots/input/:runId — envía texto a stdin del bot */
router.post("/bots/input/:runId", requireAuth, (req, res) => {
  const { line } = req.body ?? {};
  if (typeof line !== "string") { res.status(400).json({ error: "line requerido" }); return; }
  const ok = sendInput(req.params.runId, line);
  if (!ok) { res.status(404).json({ error: "run_not_found" }); return; }
  res.json({ ok: true });
});

/** GET /api/bots/output/:runId — SSE stream del output del bot */
router.get("/bots/output/:runId", requireAuth, (req: Request, res: Response) => {
  const run = getRun(req.params.runId);
  if (!run) { res.status(404).json({ error: "run_not_found" }); return; }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Mandar output histórico ya acumulado
  for (const line of run.outputLines) {
    send({ type: "line", text: line });
  }

  // Indicar si el proceso ya terminó
  if (run.status !== "running") {
    send({ type: "close", status: run.status, exitCode: run.exitCode });
    res.end();
    return;
  }

  const onLine = (text: string) => send({ type: "line", text });
  const onClose = (code: number | null) => {
    send({ type: "close", status: run.status, exitCode: code });
    res.end();
  };

  run.emitter.on("line", onLine);
  run.emitter.on("close", onClose);

  req.on("close", () => {
    run.emitter.off("line", onLine);
    run.emitter.off("close", onClose);
  });
});

// ── Actividad ─────────────────────────────────────────────

/** GET /api/bots/activity — historial de ejecuciones */
router.get("/bots/activity", requireAuth, (_req, res) => {
  res.json({ entries: getAll(), stats: getStats() });
});

export default router;
