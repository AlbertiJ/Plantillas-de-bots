import type { Request, Response, NextFunction } from "express";
import { SESSION_COOKIE, getSession } from "./sessions";

export interface AuthedRequest extends Request {
  auth?: {
    username: string;
    credentialId: string;
  };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = getSession(token);
  if (!session) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  req.auth = { username: session.username, credentialId: session.credentialId };
  next();
}
