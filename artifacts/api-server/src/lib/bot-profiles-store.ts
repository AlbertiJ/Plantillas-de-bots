// bot-profiles-store.ts — Perfiles de API de Telegram.
// Cada perfil guarda un BOT_TOKEN + OWNER_ID para identificar qué credencial usa cada bot.
// MODIFICAR: agregar más plataformas (whatsapp, etc.) según necesidad.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dataPath } from "./data-dir";
import { logger } from "./logger";

const PROFILES_FILE = dataPath("bot-profiles.json");

export interface TelegramProfile {
  id: string;
  name: string;
  telegramBotToken: string;
  telegramOwnerId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

function read(): TelegramProfile[] {
  if (!existsSync(PROFILES_FILE)) return [];
  try { return JSON.parse(readFileSync(PROFILES_FILE, "utf-8")); } catch { return []; }
}

function write(profiles: TelegramProfile[]): void {
  writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), "utf-8");
}

export function getAllProfiles(): TelegramProfile[] {
  return read();
}

export function getProfileById(id: string): TelegramProfile | undefined {
  return read().find((p) => p.id === id);
}

export function getDefaultProfile(): TelegramProfile | undefined {
  const all = read();
  return all.find((p) => p.isDefault) ?? all[0];
}

/** Devuelve el perfil enmascarado (token y ownerId parcialmente ocultos). */
function mask(p: TelegramProfile): TelegramProfile {
  const maskStr = (s: string) =>
    s.length <= 8 ? "•".repeat(s.length) : `${s.slice(0, 4)}${"•".repeat(Math.max(4, s.length - 8))}${s.slice(-4)}`;
  return {
    ...p,
    telegramBotToken: p.telegramBotToken ? maskStr(p.telegramBotToken) : "",
    telegramOwnerId:  p.telegramOwnerId  ? maskStr(p.telegramOwnerId)  : "",
  };
}

export function getAllProfilesMasked(): TelegramProfile[] {
  return read().map(mask);
}

export function createProfile(input: { name: string; telegramBotToken: string; telegramOwnerId: string }): TelegramProfile {
  const all = read();
  const now = new Date().toISOString();
  const profile: TelegramProfile = {
    id:               randomUUID(),
    name:             input.name.trim(),
    telegramBotToken: input.telegramBotToken.trim(),
    telegramOwnerId:  input.telegramOwnerId.trim(),
    isDefault:        all.length === 0, // El primero es automáticamente el predeterminado
    createdAt:        now,
    updatedAt:        now,
  };
  all.push(profile);
  write(all);
  logger.info({ profileId: profile.id, name: profile.name }, "Bot profile created");
  return profile;
}

export function updateProfile(
  id: string,
  input: Partial<{ name: string; telegramBotToken: string; telegramOwnerId: string }>,
): TelegramProfile | null {
  const all = read();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  if (input.name !== undefined)             all[idx].name             = input.name.trim();
  if (input.telegramBotToken !== undefined) all[idx].telegramBotToken = input.telegramBotToken.trim();
  if (input.telegramOwnerId !== undefined)  all[idx].telegramOwnerId  = input.telegramOwnerId.trim();
  all[idx].updatedAt = new Date().toISOString();
  write(all);
  logger.info({ profileId: id }, "Bot profile updated");
  return all[idx];
}

export function setDefaultProfile(id: string): boolean {
  const all = read();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  for (const p of all) p.isDefault = false;
  all[idx].isDefault = true;
  write(all);
  logger.info({ profileId: id }, "Default profile changed");
  return true;
}

export function deleteProfile(id: string): boolean {
  const all = read();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  const wasDefault = all[idx].isDefault;
  all.splice(idx, 1);
  if (wasDefault && all.length > 0) all[0].isDefault = true;
  write(all);
  logger.info({ profileId: id }, "Bot profile deleted");
  return true;
}
