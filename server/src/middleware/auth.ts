import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export type AuthPayload = { uid: string };

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

const cookieBaseOptions = {
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: "lax" as const
};

const cookieOptions = {
  ...cookieBaseOptions,
  maxAge: 30 * 24 * 60 * 60 * 1000
};

export const setAuthCookie = (res: Response, uid: string) => {
  const token = jwt.sign({ uid }, config.jwtSecret, { expiresIn: "30d" });
  res.cookie("token", token, cookieOptions);
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie("token", cookieBaseOptions);
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Sign in is required." });
  try {
    req.auth = jwt.verify(token, config.jwtSecret) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Sign in again." });
  }
};
