// routes/bots.ts — Lanzador de Bots, Actividad y Estado del sistema.
// MODIFICAR: adaptar los paths de bots si la estructura del repo cambia.

import { Router, type Request, type Response } from "express";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { BOT_CATALOG } from "../lib/bot-catalog";
import {
  startBot, stopBot, sendInput, getRun, getAllRuns, REPO_ROOT,
} from "../lib/bot-runner";
import { logStart, logStop, getAll, getStats } from "../lib/activity-store";
import { getTokens, TOKEN_KEYS } from "../lib/tokens-store";
import { logger } from "../lib/logger";

const router = Router();

// GitHub repo donde están los bots
// MODIFICAR: cambiar si el repo cambia de nombre o dueño
const GITHUB_REPO = "AlbertiJ/Plantillas-de-bots";
const GITHUB_API  = "https://api.github.com";

async function ghFetch(path: string): Promise<Response | null> {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const r = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "plantillas-de-bots-panel",
      },
    });
    return r as unknown as Response;
  } catch {
    return null;
  }
}

// ── GET /bots — catálogo completo ────────────────────────────────────────────
router.get("/bots", (_req: Request, res: Response) => {
  res.json({ bots: BOT_CATALOG });
});

// ── POST /bots/start — inicia un proceso Python ──────────────────────────────
router.post("/bots/start", (req: Request, res: Response) => {
  const { botId } = req.body as { botId?: string };
  if (!botId) { res.status(400).json({ error: "botId requerido" }); return; }

  const entry = BOT_CATALOG.find((b) => b.id === botId);
  if (!entry) { res.status(404).json({ error: "Bot no encontrado en catálogo" }); return; }

  const run = startBot(entry.id, entry.file, entry.nameEs);

  logStart({
    runId:     run.id,
    botId:     entry.id,
    botName:   entry.nameEs,
    category:  entry.category,
    startedAt: run.startedAt,
    status:    "running",
  });

  res.json({
    runId:     run.id,
    botId:     run.botId,
    status:    run.status,
    startedAt: run.startedAt,
  });
});

// ── POST /bots/stop/:runId — detiene un proceso ──────────────────────────────
router.post("/bots/stop/:runId", (req: Request, res: Response) => {
  const run = getRun(req.params.runId);
  const ok  = stopBot(req.params.runId);
  logStop(req.params.runId, "stopped", null, run?.outputLines.length ?? 0);
  res.json({ stopped: ok });
});

// ── POST /bots/input/:runId — envía línea a stdin ────────────────────────────
router.post("/bots/input/:runId", (req: Request, res: Response) => {
  const { line } = req.body as { line?: string };
  const ok = sendInput(req.params.runId, line ?? "");
  res.json({ sent: ok });
});

// ── GET /bots/output/:runId — SSE streaming de salida ───────────────────────
router.get("/bots/output/:runId", (req: Request, res: Response) => {
  const run = getRun(req.params.runId);
  if (!run) { res.status(404).json({ error: "Run no encontrado" }); return; }

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  run.outputLines.forEach((l) => send({ type: "line", text: l }));

  if (run.status !== "running") {
    send({ type: "close", status: run.status });
    res.end();
    return;
  }

  const onLine = (l: string) => send({ type: "line", text: l });

  const onClose = (code: number | null) => {
    const finalRun = getRun(req.params.runId);
    const finalStatus = run.status === "running"
      ? (code === 0 ? "stopped" : "crashed")
      : run.status;
    logStop(req.params.runId, finalStatus, code, finalRun?.outputLines.length ?? 0);
    send({ type: "close", status: finalStatus });
    res.end();
  };

  run.emitter.on("line",    onLine);
  run.emitter.once("close", onClose);

  req.on("close", () => {
    run.emitter.off("line",  onLine);
    run.emitter.off("close", onClose);
  });
});

// ── GET /bots/activity — historial persistente ───────────────────────────────
router.get("/bots/activity", (_req: Request, res: Response) => {
  const stored = getAll();
  const inMemoryRunning = getAllRuns()
    .filter((r) => r.status === "running" && !stored.find((s) => s.runId === r.id))
    .map((r) => ({
      runId:     r.id,
      botId:     r.botId,
      botName:   r.botName,
      category:  BOT_CATALOG.find((b) => b.id === r.botId)?.category ?? "utility",
      startedAt: r.startedAt,
      stoppedAt: r.stoppedAt,
      status:    r.status,
      exitCode:  r.exitCode,
      lineCount: r.outputLines.length,
    }));

  const entries = [
    ...inMemoryRunning,
    ...stored.map((e) => ({
      runId:     e.runId,
      botId:     e.botId,
      botName:   e.botName,
      category:  e.category,
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
      status:    e.status,
      exitCode:  e.exitCode,
      lineCount: e.lineCount,
    })),
  ];

  res.json({ entries, stats: getStats() });
});

// ── GET /bots/status — estado del sistema y dependencias ─────────────────────
router.get("/bots/status", (_req: Request, res: Response) => {
  const run = (cmd: string): string => {
    try { return execSync(cmd, { timeout: 8000, encoding: "utf8" }).trim(); }
    catch { return ""; }
  };

  const pythonRaw = run("python3 --version 2>&1");
  const nodeRaw   = run("node --version");

  const PACKAGES: Array<{ name: string; optional: boolean; fix: string }> = [
    { name: "python-dotenv",       optional: false, fix: "pip install python-dotenv" },
    { name: "python-telegram-bot", optional: false, fix: "pip install python-telegram-bot" },
    { name: "requests",            optional: false, fix: "pip install requests" },
    { name: "flask",               optional: false, fix: "pip install flask" },
    { name: "twilio",              optional: false, fix: "pip install twilio" },
    { name: "apscheduler",         optional: false, fix: "pip install apscheduler" },
    { name: "beautifulsoup4",      optional: false, fix: "pip install beautifulsoup4" },
    { name: "dnspython",           optional: false, fix: "pip install dnspython" },
    { name: "openai",              optional: true,  fix: "pip install openai" },
    { name: "anthropic",           optional: true,  fix: "pip install anthropic" },
    { name: "google-generativeai", optional: true,  fix: "pip install google-generativeai" },
    { name: "rich",                optional: true,  fix: "pip install rich" },
  ];

  const pipRaw  = run("pip3 list --format=columns 2>/dev/null || pip list --format=columns 2>/dev/null");
  const pipLines = pipRaw.toLowerCase().split("\n");

  const packages = PACKAGES.map((pkg) => {
    const row     = pipLines.find((l) => l.startsWith(pkg.name.toLowerCase()));
    const installed = !!row;
    const version   = row ? (row.split(/\s+/)[1] ?? "") : "";
    return { name: pkg.name, installed, version, fix: pkg.fix, optional: pkg.optional };
  });

  const botFiles = BOT_CATALOG.map((b) => {
    const absPath = resolve(REPO_ROOT, b.file);
    return { id: b.id, path: b.file, exists: existsSync(absPath), absPath };
  });

  // También verificar watchdog_bot.py y otros archivos clave del repo
  const extraFiles = [
    { id: "watchdog", path: "watchdog_bot.py" },
    { id: "env_example", path: ".env.example" },
    { id: "requirements", path: "bots/requirements.txt" },
  ].map((f) => ({ ...f, exists: existsSync(resolve(REPO_ROOT, f.path)), absPath: resolve(REPO_ROOT, f.path) }));

  res.json({
    repoRoot:  REPO_ROOT,
    repoUrl:   `https://github.com/${GITHUB_REPO}`,
    python:    { raw: pythonRaw, ok: pythonRaw.includes("Python") },
    node:      { raw: nodeRaw,   ok: nodeRaw.startsWith("v") },
    packages,
    botFiles,
    extraFiles,
    envExists: existsSync(resolve(REPO_ROOT, ".env")),
    checkedAt: new Date().toISOString(),
  });
});

// ── POST /bots/fix — descarga archivos faltantes del repositorio GitHub ──────
// Busca en el repo de GitHub cada archivo de bot que no existe localmente
// y lo escribe en REPO_ROOT. Requiere GITHUB_PERSONAL_ACCESS_TOKEN en el .env.
router.post("/bots/fix", async (_req: Request, res: Response) => {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    res.status(503).json({ error: "GITHUB_PERSONAL_ACCESS_TOKEN no configurado en el servidor." });
    return;
  }

  // Construir lista de archivos a verificar
  const filesToCheck = [
    ...BOT_CATALOG.map((b) => b.file),
    "watchdog_bot.py",
    ".env.example",
    "bots/requirements.txt",
    "bots/shared/env.py",
    "bots/shared/logger.py",
    "bots/shared/disclaimer.py",
  ];

  const missing = filesToCheck.filter((f) => !existsSync(resolve(REPO_ROOT, f)));

  if (missing.length === 0) {
    res.json({ fixed: [], skipped: filesToCheck.length, message: "Todos los archivos ya existen en el directorio local." });
    return;
  }

  logger.info({ missing: missing.length, repoRoot: REPO_ROOT }, "Starting fix: downloading missing files from GitHub");

  const fixed: string[] = [];
  const errors: string[] = [];

  for (const filePath of missing) {
    try {
      const apiUrl = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${filePath}`;
      const r = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "plantillas-de-bots-panel",
        },
      });

      if (!r.ok) {
        errors.push(`${filePath}: HTTP ${r.status}`);
        continue;
      }

      const data = await r.json() as { content?: string; encoding?: string };
      if (!data.content) {
        errors.push(`${filePath}: sin contenido en la respuesta de GitHub`);
        continue;
      }

      const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
      const localPath = resolve(REPO_ROOT, filePath);
      const dir = dirname(localPath);

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(localPath, content, "utf8");
      fixed.push(filePath);
      logger.info({ filePath, localPath }, "Fixed: file downloaded from GitHub");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${filePath}: ${msg}`);
      logger.error({ filePath, err: msg }, "Error fixing file");
    }
  }

  res.json({
    fixed,
    errors,
    skipped: filesToCheck.length - missing.length,
    repoRoot: REPO_ROOT,
    message: fixed.length > 0
      ? `${fixed.length} archivo(s) descargados del repositorio GitHub.`
      : "No se pudo arreglar ningún archivo. Ver errores.",
  });
});

// ── GET /bots/token-status ────────────────────────────────────────────────────
router.get("/bots/token-status", (_req: Request, res: Response) => {
  const tokens = getTokens();
  const status: Record<string, boolean> = {};
  for (const k of TOKEN_KEYS) {
    const v = tokens[k];
    status[k] = typeof v === "string" && v.trim().length > 0;
  }
  res.json({ status });
});

export default router;
