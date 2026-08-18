import { Request } from 'express';
import { isIP } from 'node:net';

/**
 * Resolves the real client IP for a request.
 *
 * Prefers Cloudflare's `CF-Connecting-IP` header — set by Cloudflare's edge to the true visitor
 * IP — over Express's `req.ip`. `req.ip` depends on `trust proxy` (see app.ts) correctly
 * counting *every* hop between the client and this app; that count has to be kept in sync by
 * hand any time the proxy topology changes (e.g. adding/removing Cloudflare in front of
 * Coolify's Traefik), and silently returns the wrong address if it's ever off by one.
 * `CF-Connecting-IP` doesn't have that problem — it's set once, by Cloudflare, regardless of how
 * many internal hops sit between it and this app.
 *
 * This is only trustworthy because the origin is expected to be locked down to accept traffic
 * only from Cloudflare's IP ranges — otherwise a client could hit the origin directly and spoof
 * this header. If that firewalling ever lapses, this header can no longer be trusted.
 *
 * Falls back to `req.ip` (still dependent on an accurate `trust proxy` hop count) when the
 * header is absent, e.g. in local dev without Cloudflare in front.
 */
export function getClientIp(req: Request): string {
  const header = req.headers['cf-connecting-ip'];
  const cfIp = Array.isArray(header) ? header[0] : header;
  if (cfIp && isIP(cfIp.trim())) return cfIp.trim();
  return req.ip ?? 'unknown';
}
