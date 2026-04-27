import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  getActive,
  publicView,
  verifyLogin,
  changePassword,
  setLocked,
  generateRandomPassword,
} from "../lib/credentials-store";
import { createSession, destroySession, SESSION_COOKIE } from "../lib/sessions";
import { requireAuth, type AuthedRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

const isProd = process.env["NODE_ENV"] === "production";

function setSessionCookie(res: any, token: string, expiresAt: number) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    expires: new Date(expiresAt),
    path: "/",
  });
}

function clearSessionCookie(res: any) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const { username, password } = parsed.data;
  const result = verifyLogin(username, password);
  if (!result.ok) {
    res.status(401).json({ error: result.reason ?? "invalid" });
    return;
  }
  const { token, expiresAt } = createSession(result.record!.username, result.record!.id);
  setSessionCookie(res, token, expiresAt);
  res.json({ ok: true, user: publicView(result.record!) });
});

router.post("/logout", (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  destroySession(token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (_req: AuthedRequest, res) => {
  const rec = getActive();
  if (!rec) {
    res.status(404).json({ error: "no_credentials" });
    return;
  }
  res.json({ user: publicView(rec) });
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post("/change-password", requireAuth, (req, res) => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;
  const result = changePassword(currentPassword, newPassword);
  if (!result.ok) {
    res.status(400).json({ error: result.reason ?? "failed" });
    return;
  }
  const rec = getActive();
  res.json({ ok: true, user: rec ? publicView(rec) : null });
});

router.post("/random-password", requireAuth, (_req, res) => {
  res.json({ password: generateRandomPassword(20) });
});

const LockBody = z.object({ locked: z.boolean() });

router.post("/lock", requireAuth, (req, res) => {
  const parsed = LockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  const result = setLocked(parsed.data.locked);
  if (!result.ok) {
    res.status(400).json({ error: "failed" });
    return;
  }
  const rec = getActive();
  res.json({ ok: true, user: rec ? publicView(rec) : null });
});

export default router;
