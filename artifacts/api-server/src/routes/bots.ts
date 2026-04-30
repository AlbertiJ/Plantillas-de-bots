// Rutas para el Lanzador de Bots, Actividad y Estado del sistema.
// MODIFICAR: adaptar los paths de bots si la estructura del repo cambia.

import { Router, type Request, type Response } from "express";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { BOT_CATALOG } from "../lib/bot-catalog";
import { startBot, stopBot, sendInput, getRun, getAllRuns, REPO_ROOT } from "../lib/bot-runner";
import { recordRun, markRunStopped, getActivityEntries, getStats } from "../lib/activity-store";

const router = Router();

// ── GET /bots — lista el catálogo completo ──────────────────────────────────
router.get("/bots", (_req: Request, res: Response) => {
  res.json({ bots: BOT_CATALOG });
});

// ── POST /bots/start — inicia un bot Python ─────────────────────────────────
router.post("/bots/start", (req: Request, res: Response) => {
  const { botId } = req.body as { botId?: string };
  if (!botId) { res.status(400).json({ error: "botId requerido" }); return; }
  const entry = BOT_CATALOG.find((b) => b.id === botId);
  if (!entry) { res.status(404).json({ error: "Bot no encontrado en catálogo" }); return; }
  const run = startBot(entry.id, entry.file, entry.nameEs);
  recordRun(run.id, entry.id, entry.nameEs, entry.category);
  res.json({ runId: run.id, botId: run.botId, status: run.status, startedAt: run.startedAt });
});

// ── POST /bots/stop/:runId — detiene un proceso ─────────────────────────────
router.post("/bots/stop/:runId", (req: Request, res: Response) => {
  const ok = stopBot(req.params.runId);
  markRunStopped(req.params.runId, "stopped");
  res.json({ stopped: ok });
});

// ── POST /bots/input/:runId — envía línea a stdin ───────────────────────────
router.post("/bots/input/:runId", (req: Request, res: Response) => {
  const { line } = req.body as { line?: string };
  const ok = sendInput(req.params.runId, line ?? "");
  res.json({ sent: ok });
});

// ── GET /bots/output/:runId — SSE streaming de salida ───────────────────────
router.get("/bots/output/:runId", (req: Request, res: Response) => {
  const run = getRun(req.params.runId);
  if (!run) { res.status(404).json({ error: "Run no encontrado" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Enviar líneas históricas
  run.outputLines.forEach((l) => send({ type: "line", text: l }));

  if (run.status !== "running") {
    send({ type: "close", status: run.status });
    res.end();
    return;
  }

  const onLine = (l: string) => send({ type: "line", text: l });
  const onClose = (code: number | null) => {
    markRunStopped(req.params.runId, (code === 0 || code === null) ? "stopped" : "crashed");
    send({ type: "close", status: run.status });
    res.end();
  };

  run.emitter.on("line", onLine);
  run.emitter.once("close", onClose);

  req.on("close", () => {
    run.emitter.off("line", onLine);
    run.emitter.off("close", onClose);
  });
});

// ── GET /bots/activity — historial de ejecuciones ───────────────────────────
router.get("/bots/activity", (_req: Request, res: Response) => {
  const runs = getAllRuns();
  const entries = runs.map((r) => ({
    runId: r.id,
    botId: r.botId,
    botName: r.botName,
    category: BOT_CATALOG.find((b) => b.id === r.botId)?.category ?? "utility",
    startedAt: r.startedAt,
    stoppedAt: r.stoppedAt,
    status: r.status,
    exitCode: r.exitCode,
    lineCount: r.outputLines.length,
  }));
  res.json({ entries, stats: getStats() });
});

// ── GET /bots/status — estado del sistema y dependencias ────────────────────
router.get("/bots/status", (_req: Request, res: Response) => {
  const run = (cmd: string): string => {
    try { return execSync(cmd, { timeout: 8000, encoding: "utf8" }).trim(); }
    catch { return ""; }
  };

  // Python
  const pythonRaw = run("python3 --version 2>&1");
  const pythonOk  = pythonRaw.includes("Python");

  // Node
  const nodeRaw = run("node --version");

  // pip packages — nombre:import_name:install_cmd
  const PACKAGES: Array<{ name: string; pip: string; fix: string; optional?: boolean }> = [
    { name: "python-dotenv",         pip: "dotenv",               fix: "pip install python-dotenv" },
    { name: "python-telegram-bot",   pip: "telegram",             fix: "pip install python-telegram-bot" },
    { name: "requests",              pip: "requests",             fix: "pip install requests" },
    { name: "openai",                pip: "openai",               fix: "pip install openai",              optional: true },
    { name: "anthropic",             pip: "anthropic",            fix: "pip install anthropic",           optional: true },
    { name: "google-generativeai",   pip: "google.generativeai",  fix: "pip install google-generativeai", optional: true },
    { name: "apscheduler",           pip: "apscheduler",          fix: "pip install apscheduler",         optional: true },
    { name: "flask",                 pip: "flask",                fix: "pip install flask",               optional: true },
    { name: "twilio",                pip: "twilio",               fix: "pip install twilio",              optional: true },
    { name: "aiohttp",               pip: "aiohttp",              fix: "pip install aiohttp",             optional: true },
  ];

  const pipListRaw = run("pip3 list --format=columns 2>/dev/null || pip list --format=columns 2>/dev/null");
  const pipLines   = pipListRaw.toLowerCase().split("\n");

  const packages = PACKAGES.map((pkg) => {
    const installed = pipLines.some((l) => l.startsWith(pkg.name.toLowerCase()));
    let version = "";
    if (installed) {
      const m = pipLines.find((l) => l.startsWith(pkg.name.toLowerCase()));
      version = m ? m.split(/\s+/)[1] ?? "" : "";
    }
    return { name: pkg.name, installed, version, fix: pkg.fix, optional: !!pkg.optional };
  });

  // Bot files
  const botFiles = BOT_CATALOG.map((b) => {
    const absPath = resolve(REPO_ROOT, b.file);
    const exists  = existsSync(absPath);
    return { id: b.id, path: b.file, exists, absPath };
  });

  // .env
  const envExists = existsSync(resolve(REPO_ROOT, ".env"));

  res.json({
    repoRoot: REPO_ROOT,
    python:   { raw: pythonRaw, ok: pythonOk },
    node:     { raw: nodeRaw,   ok: nodeRaw.startsWith("v") },
    packages,
    botFiles,
    envExists,
    checkedAt: new Date().toISOString(),
  });
});

export default router;
