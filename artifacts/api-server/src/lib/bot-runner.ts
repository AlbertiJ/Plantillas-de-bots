import { spawn, ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { logger } from "./logger";

// ── REPO_ROOT ─────────────────────────────────────────────────────────────────
// MODIFICAR: si la detección automática falla, setea REPO_ROOT en tu .env
// apuntando al directorio raíz del repositorio clonado (donde está el .env.example).
//
// Lógica automática:
//  • Si se ejecuta el bundle compilado (dist/index.mjs) → __dirname = .../artifacts/api-server/dist/
//    Necesitamos subir 3 niveles: dist/ → api-server/ → artifacts/ → repo-root/
//  • Si se ejecuta con tsx en desarrollo → __dirname = .../artifacts/api-server/src/lib/
//    Necesitamos subir 4 niveles: lib/ → src/ → api-server/ → artifacts/ → repo-root/

const _dir = typeof __dirname !== "undefined"
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

function computeRepoRoot(dir: string): string {
  // Detectar si estamos en el bundle (dist/) o en desarrollo (src/lib/)
  const inDist = dir.includes("/dist/") || dir.includes("\\dist\\") || dir.endsWith("/dist") || dir.endsWith("\\dist");
  const levels = inDist ? "../../../" : "../../../../";
  return resolve(dir, levels);
}

export const REPO_ROOT: string =
  process.env.REPO_ROOT
    ? resolve(process.env.REPO_ROOT)
    : computeRepoRoot(_dir);

const MAX_OUTPUT_LINES = 800;
const RUN_RETENTION_MS = 30 * 60 * 1000; // 30 minutos tras finalizar

export interface BotRun {
  id: string;
  botId: string;
  botFile: string;
  botName: string;
  pid: number | null;
  startedAt: string;
  stoppedAt: string | null;
  status: "running" | "stopped" | "crashed" | "not-found";
  exitCode: number | null;
  outputLines: string[];
  emitter: EventEmitter;
}

// Procesos activos (runId → ChildProcess)
const procs = new Map<string, ChildProcess>();
// Todos los runs (activos + recientes)
const runs = new Map<string, BotRun>();

function ts(): string {
  return new Date().toISOString().substring(11, 19);
}

/**
 * Inicia un bot Python como subproceso.
 * Devuelve el BotRun inmediatamente; el proceso inicia en background.
 */
export function startBot(botId: string, botFile: string, botName: string): BotRun {
  const runId = randomUUID();
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);

  const run: BotRun = {
    id: runId,
    botId,
    botFile,
    botName,
    pid: null,
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    status: "running",
    exitCode: null,
    outputLines: [],
    emitter,
  };
  runs.set(runId, run);

  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  const absFile = resolve(REPO_ROOT, botFile);

  const addLine = (raw: string) => {
    const formatted = `[${ts()}] ${raw}`;
    run.outputLines.push(formatted);
    if (run.outputLines.length > MAX_OUTPUT_LINES) run.outputLines.shift();
    emitter.emit("line", formatted);
  };

  addLine(`--- Iniciando: ${pythonCmd} -u ${botFile} ---`);
  addLine(`--- Directorio: ${REPO_ROOT} ---`);

  let proc: ChildProcess;
  try {
    proc = spawn(pythonCmd, ["-u", absFile], {
      cwd: REPO_ROOT,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err: unknown) {
    run.status = "not-found";
    run.stoppedAt = new Date().toISOString();
    addLine(`--- Error al iniciar proceso: ${String(err)} ---`);
    return run;
  }

  if (!proc.pid) {
    run.status = "not-found";
    run.stoppedAt = new Date().toISOString();
    addLine(`--- El archivo no existe o Python no está disponible: ${absFile} ---`);
    return run;
  }

  run.pid = proc.pid;
  procs.set(runId, proc);

  proc.stdout?.on("data", (d: Buffer) => {
    String(d).split("\n").filter(Boolean).forEach(addLine);
  });
  proc.stderr?.on("data", (d: Buffer) => {
    String(d).split("\n").filter(Boolean).forEach((l) => addLine(`⚠ ${l}`));
  });
  proc.on("error", (err) => {
    addLine(`--- Error del proceso: ${err.message} ---`);
  });
  proc.on("close", (code) => {
    run.status = code === 0 ? "stopped" : "crashed";
    run.exitCode = code;
    run.stoppedAt = new Date().toISOString();
    addLine(`--- Proceso terminado (código ${code}) ---`);
    emitter.emit("close", code);
    procs.delete(runId);
    logger.info({ runId, botId, code }, "Bot process closed");
    setTimeout(() => runs.delete(runId), RUN_RETENTION_MS);
  });

  logger.info({ runId, botId, pid: proc.pid, botFile }, "Bot process started");
  return run;
}

/** Detiene un bot por su runId. Retorna false si no existía o no estaba corriendo. */
export function stopBot(runId: string): boolean {
  const proc = procs.get(runId);
  const run = runs.get(runId);
  if (!proc || !run || run.status !== "running") return false;
  try {
    proc.kill("SIGTERM");
    // Si no termina en 3s, SIGKILL
    setTimeout(() => { try { proc.kill("SIGKILL"); } catch {} }, 3000);
  } catch {}
  return true;
}

/** Envía texto a stdin del proceso (para bots que lean stdin). */
export function sendInput(runId: string, line: string): boolean {
  const proc = procs.get(runId);
  if (!proc || !proc.stdin) return false;
  try {
    proc.stdin.write(line + "\n");
    return true;
  } catch { return false; }
}

export function getRun(runId: string): BotRun | undefined {
  return runs.get(runId);
}

export function getAllRuns(): BotRun[] {
  return [...runs.values()].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

export function getRunningBots(): BotRun[] {
  return [...runs.values()].filter((r) => r.status === "running");
}
