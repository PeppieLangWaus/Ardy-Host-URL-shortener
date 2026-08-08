import express from 'express';
import helmet from 'helmet';
import healthRoute from './routes/health';
import linksRoute from './routes/links';
import redirectRoute from './routes/redirect';

export function createApp(): express.Express {
  const app = express();

  // Coolify's Traefik sits in front of this container — trust its X-Forwarded-* headers
  // so express-rate-limit keys on the real client IP instead of the proxy's.
  app.set('trust proxy', 1);

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
