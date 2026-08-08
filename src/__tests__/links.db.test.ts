process.env.SETUP_URL_PREFIX = 'https://splasher.help/setup';
process.env.SETUP_LINK_SECRET = 'test-secret';
process.env.API_KEY = 'test-api-key';
process.env.DATABASE_PATH = ':memory:';

import { upsertLink, getLink, sweepExpired } from '../db/links';

describe('links storage', () => {
  it('creates a new mapping', () => {
    upsertLink({ slug: 'ardy-hosts', username: 'Ardy Hosts', targetUrl: 'https://splasher.help/setup?token=abc', expiresAt: 9999999999 });
    const row = getLink('ardy-hosts');
    expect(row?.target_url).toBe('https://splasher.help/setup?token=abc');
  });

  it('overwrites an existing mapping for the same slug (last-write-wins)', () => {
    upsertLink({ slug: 'ardy-hosts', username: 'Ardy Hosts', targetUrl: 'https://splasher.help/setup?token=old', expiresAt: 1000 });
    upsertLink({ slug: 'ardy-hosts', username: 'Ardy Hosts', targetUrl: 'https://splasher.help/setup?token=new', expiresAt: 2000 });
    const row = getLink('ardy-hosts');
    expect(row?.target_url).toBe('https://splasher.help/setup?token=new');
    expect(row?.expires_at).toBe(2000);
  });

  it('returns undefined for an unknown slug', () => {
    expect(getLink('does-not-exist')).toBeUndefined();
  });

  it('sweeps expired rows', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    upsertLink({ slug: 'expired-user', username: 'Expired User', targetUrl: 'https://splasher.help/setup?token=x', expiresAt: past });
    const removed = sweepExpired();
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(getLink('expired-user')).toBeUndefined();
  });
});
