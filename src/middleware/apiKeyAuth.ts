import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of matching length so this branch isn't a free timing tell.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Guards POST /api/links — only splash-helper-backend should ever call this. */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['x-api-key'];
  if (typeof provided !== 'string' || !timingSafeEqual(provided, config.apiKey)) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }
  next();
}
