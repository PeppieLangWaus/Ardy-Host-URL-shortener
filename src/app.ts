import express from 'express';
import helmet from 'helmet';
import healthRoute from './routes/health';
import linksRoute from './routes/links';
import redirectRoute from './routes/redirect';

export function createApp(): express.Express {
  const app = express();

  // Two hops in front of this container: Cloudflare's edge, then Coolify's Traefik. `trust
  // proxy` has to count both or req.ip resolves to the wrong hop. That said, the rate limiters
  // (middleware/rateLimit.ts) key on utils/clientIp.ts's getClientIp() instead, which prefers
  // Cloudflare's CF-Connecting-IP header specifically so it doesn't depend on this hop count
  // staying accurate — this still needs to be right for req.ip itself and anything else that
  // reads it directly.
  app.set('trust proxy', 2);

  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  app.use(healthRoute);
  app.use(linksRoute);
  // Must be registered last: it's a catch-all for /:slug and would otherwise shadow
  // the routes above (the [a-z0-9-] constraint keeps it from matching /api/* anyway,
  // but ordering it last is cheap insurance).
  app.use(redirectRoute);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
