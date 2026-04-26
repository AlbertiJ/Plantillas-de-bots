import { randomBytes } from "node:crypto";

const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

interface Session {
  username: string;
  credentialId: string;
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

export const SESSION_COOKIE = "ptb_sid";

export function createSession(username: string, credentialId: string): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  sessions.set(token, { username, credentialId, createdAt: now, expiresAt });
  return { token, expiresAt };
}

export function getSession(token: string | undefined): Session | null {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return s;
}

export function destroySession(token: string | undefined): void {
  if (!token) return;
  sessions.delete(token);
}

export function destroyAllSessions(): void {
  sessions.clear();
}

setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (s.expiresAt < now) sessions.delete(token);
  }
}, 1000 * 60 * 5).unref();
