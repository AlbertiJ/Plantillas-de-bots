// credentials-store.ts — Gestión de credenciales de admin del panel.
// MODIFICAR: ajustar longitud de contraseña o charset si se desea diferente nivel de seguridad.

import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { dataPath, ensureDir } from "./data-dir";
import { logger } from "./logger";

const CREDS_DIR   = dataPath("credentials");
const INDEX_FILE  = `${CREDS_DIR}/index.json`;
const SETUP_PENDING_FILE = `${CREDS_DIR}/.setup-pending`;

export interface CredentialRecord {
  id: string;
  username: string;
  passwordHash: string;
  locked: boolean;
  /**
   * true mientras no se haya cambiado la contraseña inicial.
   * Se pone en false en changePassword(). Es el flag definitivo para saber
   * si el primer arranque está completo — más robusto que un archivo separado.
   */
  setupPending: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IndexFile { activeId: string }

ensureDir(CREDS_DIR);

// Contraseña inicial en memoria (caché entre llamadas dentro del mismo proceso)
let _initialPassword: string | null = null;

function credPath(id: string) { return `${CREDS_DIR}/cred-${id}.json`; }

function readIndex(): IndexFile | null {
  if (!existsSync(INDEX_FILE)) return null;
  try { return JSON.parse(readFileSync(INDEX_FILE, "utf-8")); } catch { return null; }
}

function writeIndex(idx: IndexFile): void {
  writeFileSync(INDEX_FILE, JSON.stringify(idx, null, 2), "utf-8");
}

function readCred(id: string): CredentialRecord | null {
  const p = credPath(id);
  if (!existsSync(p)) return null;
  try {
    const rec = JSON.parse(readFileSync(p, "utf-8")) as CredentialRecord;
    // Compatibilidad hacia atrás: registros sin setupPending (versión anterior)
    if (rec.setupPending === undefined) rec.setupPending = existsSync(SETUP_PENDING_FILE);
    return rec;
  } catch { return null; }
}

function writeCred(rec: CredentialRecord): void {
  writeFileSync(credPath(rec.id), JSON.stringify(rec, null, 2), "utf-8");
}

function deleteCred(id: string): void {
  const p = credPath(id);
  if (existsSync(p)) try { unlinkSync(p); } catch {}
}

function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function generateRandomPassword(length = 16): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length];
  return out;
}

export function bootstrap(): { created: boolean; initialPassword?: string } {
  const idx = readIndex();

  if (idx) {
    const rec = readCred(idx.activeId);
    if (rec) {
      // Credenciales existentes — cargar clave inicial en memoria si el setup sigue pendiente
      if (rec.setupPending) {
        if (_initialPassword === null && existsSync(SETUP_PENDING_FILE)) {
          try {
            const saved = readFileSync(SETUP_PENDING_FILE, "utf-8").trim();
            if (saved) _initialPassword = saved;
          } catch {}
        }
        if (_initialPassword) {
          logger.info("Primer arranque aún pendiente: contraseña inicial cargada");
        }
      } else {
        // El setup ya se completó — limpiar caché y archivo por si acaso
        _initialPassword = null;
        if (existsSync(SETUP_PENDING_FILE)) {
          try { unlinkSync(SETUP_PENDING_FILE); } catch {}
        }
      }
      return { created: false };
    }
  }

  // Primer arranque — limpiar archivos huérfanos y crear credenciales
  try {
    readdirSync(CREDS_DIR)
      .filter((f) => f.startsWith("cred-"))
      .forEach((f) => { try { unlinkSync(`${CREDS_DIR}/${f}`); } catch {} });
  } catch {}

  const id              = randomUUID();
  const initialPassword = generateRandomPassword(16);
  const now             = new Date().toISOString();

  const rec: CredentialRecord = {
    id,
    username:     "admin",
    passwordHash: hashPassword(initialPassword),
    locked:       false,
    setupPending: true,
    createdAt:    now,
    updatedAt:    now,
  };

  writeCred(rec);
  writeIndex({ activeId: id });

  _initialPassword = initialPassword;
  try { writeFileSync(SETUP_PENDING_FILE, initialPassword, "utf-8"); } catch {}

  logger.info({ id }, "Primer arranque: credenciales generadas");
  return { created: true, initialPassword };
}

/**
 * Devuelve la contraseña inicial si el setup todavía NO se completó.
 * Usa como fuente de verdad el flag `setupPending` del registro de credenciales.
 * Si setupPending=false (contraseña ya cambiada), siempre devuelve null.
 */
export function getInitialPassword(): string | null {
  // Fuente de verdad: el campo setupPending del registro de credenciales
  const idx = readIndex();
  if (!idx) return null;
  const rec = readCred(idx.activeId);
  if (!rec || !rec.setupPending) {
    // Setup completo — limpiar memoria y archivo residual
    _initialPassword = null;
    if (existsSync(SETUP_PENDING_FILE)) {
      try { unlinkSync(SETUP_PENDING_FILE); } catch {}
    }
    return null;
  }

  // Setup pendiente — devolver contraseña de memoria o archivo
  if (_initialPassword) return _initialPassword;
  if (existsSync(SETUP_PENDING_FILE)) {
    try {
      const saved = readFileSync(SETUP_PENDING_FILE, "utf-8").trim();
      if (saved) { _initialPassword = saved; return saved; }
    } catch {}
  }
  return null;
}

export function getActive(): CredentialRecord | null {
  const idx = readIndex();
  if (!idx) return null;
  return readCred(idx.activeId);
}

export function publicView(rec: CredentialRecord) {
  return {
    id:        rec.id,
    username:  rec.username,
    locked:    rec.locked,
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

export function changePassword(currentPassword: string, newPassword: string): { ok: boolean; reason?: string } {
  const rec = getActive();
  if (!rec) return { ok: false, reason: "no_credentials" };
  if (rec.locked) return { ok: false, reason: "locked" };
  if (!bcrypt.compareSync(currentPassword, rec.passwordHash)) return { ok: false, reason: "invalid_current" };
  if (newPassword.length < 8) return { ok: false, reason: "weak_password" };

  const oldId = rec.id;
  const newId = randomUUID();
  const now   = new Date().toISOString();

  const newRec: CredentialRecord = {
    ...rec,
    id:           newId,
    passwordHash: hashPassword(newPassword),
    setupPending: false,   // ← Setup completado: esto es el flag definitivo
    updatedAt:    now,
  };

  writeCred(newRec);
  writeIndex({ activeId: newId });
  deleteCred(oldId);

  // Limpiar contraseña inicial de memoria Y del archivo
  _initialPassword = null;
  if (existsSync(SETUP_PENDING_FILE)) {
    try { unlinkSync(SETUP_PENDING_FILE); } catch {}
  }

  logger.info({ oldId, newId }, "Contraseña rotada; primer arranque completado");
  return { ok: true };
}

export function setLocked(locked: boolean): { ok: boolean } {
  const rec = getActive();
  if (!rec) return { ok: false };
  rec.locked   = locked;
  rec.updatedAt = new Date().toISOString();
  writeCred(rec);
  return { ok: true };
}
