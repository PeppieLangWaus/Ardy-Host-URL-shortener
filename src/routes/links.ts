import { Router } from 'express';
import { config } from '../config/env';
import { validateSetupUrl } from '../utils/validateSetupUrl';
import { slugify, isReservedSlug } from '../utils/slugify';
import { upsertLink } from '../db/links';
import { requireApiKey } from '../middleware/apiKeyAuth';
import { createLinkLimiter } from '../middleware/rateLimit';
import { CreateLinkResponse } from '../types';

const router = Router();

router.post('/api/links', createLinkLimiter, requireApiKey, (req, res) => {
  const result = validateSetupUrl(req.body?.url);
  if (!result.ok) {
    res.status(400).json({ error: result.reason });
    return;
  }

  const { payload, token } = result;
  const slug = slugify(payload.username);
  if (!slug || isReservedSlug(slug)) {
    res.status(400).json({ error: 'username could not be converted to a valid slug' });
    return;
  }

  upsertLink({
    slug,
    username: payload.username,
    targetUrl: req.body.url,
    expiresAt: payload.exp as number,
  });

  console.log(`[links] upserted slug="${slug}" token=${token.slice(0, 12)}...`);

  const response: CreateLinkResponse = {
    shortUrl: `https://${config.baseDomain}/${slug}`,
    slug,
    expiresAt: payload.exp as number,
  };
  res.status(200).json(response);
});

export default router;
