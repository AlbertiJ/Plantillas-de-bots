import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { dataPath, ensureDir } from "./data-dir";
import { logger } from "./logger";

const CREDS_DIR = dataPath("credentials");
const INDEX_FILE = `${CREDS_DIR}/index.json`;

export interface CredentialRecord {
  id: string;
  username: string;
  passwordHash: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IndexFile {
  activeId: string;
}

ensureDir(CREDS_DIR);

function credPath(id: string): string {
  return `${CREDS_DIR}/cred-${id}.json`;
}

function readIndex(): IndexFile | null {
  if (!existsSync(INDEX_FILE)) return null;
  try {
    return JSON.parse(readFileSync(INDEX_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeIndex(idx: IndexFile): void {
  writeFileSync(INDEX_FILE, JSON.stringify(idx, null, 2), "utf-8");
}

function readCred(id: string): CredentialRecord | null {
  const path = credPath(id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function writeCred(rec: CredentialRecord): void {
  writeFileSync(credPath(rec.id), JSON.stringify(rec, null, 2), "utf-8");
}

function deleteCred(id: string): void {
  const path = credPath(id);
  if (existsSync(path)) unlinkSync(path);
}

function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function generateRandomPassword(length = 16): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
}

export function bootstrap(): { created: boolean; initialPassword?: string } {
  const idx = readIndex();
  if (idx && readCred(idx.activeId)) {
    return { created: false };
  }

  const orphans = readdirSync(CREDS_DIR).filter((f) => f.startsWith("cred-"));
  for (const f of orphans) {
    try { unlinkSync(`${CREDS_DIR}/${f}`); } catch {}
  }

  const id = randomUUID();
  const initialPassword = generateRandomPassword(16);
  const now = new Date().toISOString();
  const rec: CredentialRecord = {
    id,
    username: "admin",
    passwordHash: hashPassword(initialPassword),
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
  writeCred(rec);
  writeIndex({ activeId: id });

  return { created: true, initialPassword };
}

export function getActive(): CredentialRecord | null {
  const idx = readIndex();
  if (!idx) return null;
  return readCred(idx.activeId);
}

export function publicView(rec: CredentialRecord) {
  return {
    id: rec.id,
    username: rec.username,
    locked: rec.locked,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
}

export function verifyLogin(username: string, password: string): { ok: boolean; reason?: string; record?: CredentialRecord } {
  const rec = getActive();
  if (!rec) return { ok: false, reason: "no_credentials" };
  if (rec.locked) return { ok: false, reason: "locked", record: rec };
  if (rec.username !== username) return { ok: false, reason: "invalid" };
  if (!bcrypt.compareSync(password, rec.passwordHash)) return { ok: false, reason: "invalid" };
  return { ok: true, record: rec };
}

export function changePassword(currentPassword: string, newPassword: string): { ok: boolean; reason?: string; newId?: string } {
  const rec = getActive();
  if (!rec) return { ok: false, reason: "no_credentials" };
  if (rec.locked) return { ok: false, reason: "locked" };
  if (!bcrypt.compareSync(currentPassword, rec.passwordHash)) return { ok: false, reason: "invalid_current" };
  if (newPassword.length < 8) return { ok: false, reason: "weak_password" };

  const oldId = rec.id;
  const newId = randomUUID();
  const now = new Date().toISOString();
  const newRec: CredentialRecord = {
    ...rec,
    id: newId,
    passwordHash: hashPassword(newPassword),
    updatedAt: now,
  };
  writeCred(newRec);
  writeIndex({ activeId: newId });
  deleteCred(oldId);

  logger.info({ oldId, newId }, "Password rotated; credential file renamed");
  return { ok: true, newId };
}

export function setLocked(locked: boolean): { ok: boolean } {
  const rec = getActive();
  if (!rec) return { ok: false };
  rec.locked = locked;
  rec.updatedAt = new Date().toISOString();
  writeCred(rec);
  return { ok: true };
}
