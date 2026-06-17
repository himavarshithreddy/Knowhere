import type { NextFunction, Request, Response } from "express";

const hits = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of hits.entries()) {
    if (val.resetAt <= now) {
      hits.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export const rateLimit = (key: string, limit: number, windowMs: number) =>
  (req: Request, res: Response, next: NextFunction) => {
    const bucket = `${key}:${req.ip ?? "unknown"}`;
    const now = Date.now();
    const current = hits.get(bucket);
    if (!current || current.resetAt <= now) {
      hits.set(bucket, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (current.count >= limit) {
      res.status(429).json({ error: "Too many attempts. Try again in a minute." });
      return;
    }
    current.count += 1;
    next();
  };
