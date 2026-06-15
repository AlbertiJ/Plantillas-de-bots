// routes/bot-profiles.ts — CRUD de perfiles de API de Telegram.
// MODIFICAR: si se agregan más plataformas, extender el modelo aquí.

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth-middleware";
import {
  getAllProfilesMasked, getAllProfiles, getProfileById,
  createProfile, updateProfile, setDefaultProfile, deleteProfile,
} from "../lib/bot-profiles-store";

const router = Router();

const CreateSchema = z.object({
  name:              z.string().min(1).max(60),
  telegramBotToken:  z.string().min(1),
  telegramOwnerId:   z.string().min(1),
});

const UpdateSchema = z.object({
  name:              z.string().min(1).max(60).optional(),
  telegramBotToken:  z.string().min(1).optional(),
  telegramOwnerId:   z.string().min(1).optional(),
});

// GET /bot-profiles — lista todos los perfiles (enmascarados)
router.get("/bot-profiles", requireAuth, (_req: Request, res: Response) => {
  res.json({ profiles: getAllProfilesMasked() });
});

// GET /bot-profiles/raw — lista todos los perfiles en texto claro (para inyectar al lanzar)
// Solo uso interno — NO exponer como endpoint público
router.get("/bot-profiles/raw/:id", requireAuth, (req: Request, res: Response) => {
  const profile = getProfileById(req.params.id);
  if (!profile) { res.status(404).json({ error: "profile_not_found" }); return; }
  res.json({ profile });
});

// POST /bot-profiles — crear un nuevo perfil
router.post("/bot-profiles", requireAuth, (req: Request, res: Response) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }
  const profile = createProfile(parsed.data);
  // Devolver enmascarado
  const masked = getAllProfilesMasked().find((p) => p.id === profile.id)!;
  res.status(201).json({ ok: true, profile: masked });
});

// PUT /bot-profiles/:id — actualizar nombre o tokens
router.put("/bot-profiles/:id", requireAuth, (req: Request, res: Response) => {
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }
  const updated = updateProfile(req.params.id, parsed.data);
  if (!updated) { res.status(404).json({ error: "profile_not_found" }); return; }
  const masked = getAllProfilesMasked().find((p) => p.id === updated.id)!;
  res.json({ ok: true, profile: masked });
});

// POST /bot-profiles/:id/default — establecer como predeterminado
router.post("/bot-profiles/:id/default", requireAuth, (req: Request, res: Response) => {
  const ok = setDefaultProfile(req.params.id);
  if (!ok) { res.status(404).json({ error: "profile_not_found" }); return; }
  res.json({ ok: true, profiles: getAllProfilesMasked() });
});

// DELETE /bot-profiles/:id — eliminar perfil
router.delete("/bot-profiles/:id", requireAuth, (req: Request, res: Response) => {
  const ok = deleteProfile(req.params.id);
  if (!ok) { res.status(404).json({ error: "profile_not_found" }); return; }
  res.json({ ok: true, profiles: getAllProfilesMasked() });
});

export default router;
