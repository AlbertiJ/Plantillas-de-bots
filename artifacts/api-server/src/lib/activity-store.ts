import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dataPath, ensureDir } from "./data-dir";

const ACTIVITY_DIR = dataPath("activity");
const ACTIVITY_FILE = `${ACTIVITY_DIR}/runs.json`;
const MAX_ENTRIES = 200;

ensureDir(ACTIVITY_DIR);

export interface ActivityEntry {
  runId: string;
  botId: string;
  botName: string;
  category: string;
  startedAt: string;
  stoppedAt: string | null;
  status: "running" | "stopped" | "crashed" | "not-found";
  exitCode: number | null;
  lineCount: number;
}

function read(): ActivityEntry[] {
  if (!existsSync(ACTIVITY_FILE)) return [];
  try { return JSON.parse(readFileSync(ACTIVITY_FILE, "utf-8")); } catch { return []; }
}

function write(entries: ActivityEntry[]): void {
  writeFileSync(ACTIVITY_FILE, JSON.stringify(entries.slice(0, MAX_ENTRIES), null, 2), "utf-8");
}

export function logStart(entry: Omit<ActivityEntry, "stoppedAt" | "exitCode" | "lineCount">): void {
  const all = read();
  all.unshift({ ...entry, stoppedAt: null, exitCode: null, lineCount: 0 });
  write(all);
}

export function logStop(runId: string, status: ActivityEntry["status"], exitCode: number | null, lineCount: number): void {
  const all = read();
  const idx = all.findIndex((e) => e.runId === runId);
  if (idx >= 0) {
    all[idx].stoppedAt = new Date().toISOString();
    all[idx].status = status;
    all[idx].exitCode = exitCode;
    all[idx].lineCount = lineCount;
    write(all);
  }
}

export function getAll(): ActivityEntry[] {
  return read();
}

export function getStats(): { totalRuns: number; byBot: Record<string, number>; byCategory: Record<string, number>; successRate: number } {
  const all = read();
  const byBot: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let success = 0;
  let finished = 0;
  for (const e of all) {
    byBot[e.botId] = (byBot[e.botId] ?? 0) + 1;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    if (e.status === "stopped" || e.status === "crashed") {
      finished++;
      if (e.status === "stopped") success++;
    }
  }
  return { totalRuns: all.length, byBot, byCategory, successRate: finished > 0 ? Math.round((success / finished) * 100) : 0 };
}
