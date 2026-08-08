import rateLimit from 'express-rate-limit';

/** POST /api/links: called only by our backend, but rate-limit anyway as defense in depth. */
export const createLinkLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

/** GET /:slug: public and unauthenticated by design, so throttle to blunt scraping. */
export const redirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
