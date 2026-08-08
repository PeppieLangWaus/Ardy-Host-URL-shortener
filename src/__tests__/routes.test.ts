process.env.SETUP_URL_PREFIX = 'https://splasher.help/setup';
process.env.SETUP_LINK_SECRET = 'test-secret';
process.env.API_KEY = 'test-api-key';
process.env.DATABASE_PATH = ':memory:';
process.env.BASE_DOMAIN = 'link.ardy.host';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { upsertLink } from '../db/links';

const app = createApp();

function setupUrl(overrides: Record<string, unknown> = {}, expiresIn: string | number = '1h'): string {
  const payload = { purpose: 'account-setup', username: 'Ardy Hosts', ...overrides };
  const token = jwt.sign(payload, 'test-secret', { expiresIn: expiresIn as any });
  return `https://splasher.help/setup?token=${token}`;
}

describe('GET /api/health', () => {
  it('returns ok with no auth required', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/links', () => {
  it('rejects requests without an API key', async () => {
    const res = await request(app).post('/api/links').send({ url: setupUrl() });
    expect(res.status).toBe(401);
  });

  it('rejects requests with the wrong API key', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('X-API-Key', 'wrong-key')
      .send({ url: setupUrl() });
    expect(res.status).toBe(401);
  });

  it('rejects a url outside the allowed prefix', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('X-API-Key', 'test-api-key')
      .send({ url: 'https://evil.example/setup?token=x' });
    expect(res.status).toBe(400);
  });

  it('creates a short link for a valid setup url', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('X-API-Key', 'test-api-key')
      .send({ url: setupUrl() });
    expect(res.status).toBe(200);
    expect(res.body.shortUrl).toBe('https://link.ardy.host/ardy-hosts');
    expect(res.body.slug).toBe('ardy-hosts');
  });

  it('rejects a reserved-word username slug', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('X-API-Key', 'test-api-key')
      .send({ url: setupUrl({ username: 'API' }) });
    expect(res.status).toBe(400);
  });
});

describe('GET /:slug', () => {
  it('redirects to the stored url with no-store', async () => {
    await request(app)
      .post('/api/links')
      .set('X-API-Key', 'test-api-key')
      .send({ url: setupUrl({ username: 'Redirect Tester' }) });

    const res = await request(app).get('/redirect-tester');
    expect(res.status).toBe(302);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['location']).toContain('https://splasher.help/setup?token=');
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('rejects creating a link from an already-expired token', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('X-API-Key', 'test-api-key')
      .send({ url: setupUrl({ username: 'Expired Tester' }, -10) });
    expect(res.status).toBe(400);
  });

  it('returns 404 once a stored link\'s expiry has passed', async () => {
    // Simulate the passage of time by writing a row whose expires_at is already
    // in the past, rather than relying on jwt.verify (which would reject the
    // token itself at create-time before it ever got stored).
    const past = Math.floor(Date.now() / 1000) - 60;
    upsertLink({
      slug: 'aged-out',
      username: 'Aged Out',
      targetUrl: 'https://splasher.help/setup?token=whatever',
      expiresAt: past,
    });

    const res = await request(app).get('/aged-out');
    expect(res.status).toBe(404);
  });
});
