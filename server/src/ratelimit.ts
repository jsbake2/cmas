/**
 * Tiny in-memory rate limiting for the single-process server. Two pieces:
 *
 *  - rateLimit():   sliding-window cap per key (e.g. per kid profile). Protects
 *                   against a spammed "Analyze" button driving up Claude cost.
 *  - singleFlight(): rejects a request whose key already has one in flight, so
 *                   double-submits don't run the same analysis twice in parallel.
 *
 * State lives in memory; it resets on restart, which is fine for a home,
 * single-container deployment.
 */

import type { Request, Response, NextFunction } from "express";

export function rateLimit(opts: {
  windowMs: number;
  max: number;
  keyOf: (req: Request) => string;
  message?: string;
}) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const cutoff = now - opts.windowMs;
    const key = opts.keyOf(req);

    const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
    if (recent.length >= opts.max) {
      const retrySec = Math.max(
        1,
        Math.ceil((recent[0] + opts.windowMs - now) / 1000),
      );
      res.setHeader("Retry-After", String(retrySec));
      hits.set(key, recent); // keep the trimmed window
      return res.status(429).json({
        error:
          opts.message ??
          `Too many requests — please wait ${retrySec}s and try again.`,
        retryAfter: retrySec,
      });
    }

    recent.push(now);
    hits.set(key, recent);

    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (hits.size > 1000) {
      for (const [k, v] of hits) {
        if (v.every((t) => t <= cutoff)) hits.delete(k);
      }
    }

    next();
  };
}

export function singleFlight(opts: {
  keyOf: (req: Request) => string;
  message?: string;
}) {
  const active = new Set<string>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = opts.keyOf(req);
    if (active.has(key)) {
      return res.status(429).json({
        error: opts.message ?? "Already in progress — hold on a moment.",
      });
    }
    active.add(key);
    const release = () => active.delete(key);
    res.on("finish", release);
    res.on("close", release);
    next();
  };
}
