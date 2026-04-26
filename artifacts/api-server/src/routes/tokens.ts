import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth-middleware";
import { TOKEN_KEYS, getTokens, getTokensMasked, saveTokens } from "../lib/tokens-store";

const router: IRouter = Router();

const TokensBody = z
  .object(Object.fromEntries(TOKEN_KEYS.map((k) => [k, z.string().optional()])) as Record<(typeof TOKEN_KEYS)[number], z.ZodOptional<z.ZodString>>)
  .partial();

router.get("/tokens", requireAuth, (req, res) => {
  const masked = req.query["reveal"] === "1";
  res.json({
    keys: TOKEN_KEYS,
    values: masked ? getTokens() : getTokensMasked(),
    revealed: masked,
  });
});

router.put("/tokens", requireAuth, (req, res) => {
  const parsed = TokensBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }
  const next = saveTokens(parsed.data);
  res.json({ ok: true, values: next });
});

export default router;
