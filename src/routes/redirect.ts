import { Router } from 'express';
import { getLink } from '../db/links';
import { redirectLimiter } from '../middleware/rateLimit';

const router = Router();

// Constrained to slug-shaped paths so this can never shadow /api/* or /healthz-style routes.
router.get('/:slug([a-z0-9-]+)', redirectLimiter, (req, res) => {
  const row = getLink(req.params.slug);
  const now = Math.floor(Date.now() / 1000);

  // Missing and expired slugs return the exact same response — don't leak which case it was.
  if (!row || row.expires_at < now) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // 302 (not 301) + no-store: the mapping for a slug can be overwritten by a newer
  // setup link at any time, so neither the browser nor an intermediate proxy may cache this.
  res.set('Cache-Control', 'no-store');
  res.redirect(302, row.target_url);
});

export default router;
