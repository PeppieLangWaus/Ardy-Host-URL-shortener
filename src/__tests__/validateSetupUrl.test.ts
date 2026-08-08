process.env.SETUP_URL_PREFIX = 'https://splasher.help/setup';
process.env.SETUP_LINK_SECRET = 'test-secret';
process.env.API_KEY = 'test-api-key';
process.env.DATABASE_PATH = ':memory:';

import jwt from 'jsonwebtoken';
import { validateSetupUrl } from '../utils/validateSetupUrl';

const SECRET = 'test-secret';

function signSetupToken(overrides: Record<string, unknown> = {}, expiresIn: string | number = '1h'): string {
  const payload = { purpose: 'account-setup', username: 'Ardy Hosts', ...overrides };
  return jwt.sign(payload, SECRET, { expiresIn: expiresIn as any });
}

describe('validateSetupUrl', () => {
  it('accepts a well-formed, correctly signed setup link', () => {
    const token = signSetupToken();
    const result = validateSetupUrl(`https://splasher.help/setup?token=${token}`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.username).toBe('Ardy Hosts');
      expect(result.payload.purpose).toBe('account-setup');
    }
  });

  it('rejects a url on the wrong host', () => {
    const token = signSetupToken();
    const result = validateSetupUrl(`https://evil.example/setup?token=${token}`);
    expect(result.ok).toBe(false);
  });

  it('rejects a url on the wrong path', () => {
    const token = signSetupToken();
    const result = validateSetupUrl(`https://splasher.help/not-setup?token=${token}`);
    expect(result.ok).toBe(false);
  });

  it('rejects a token signed with the wrong secret', () => {
    const token = jwt.sign({ purpose: 'account-setup', username: 'Ardy Hosts' }, 'wrong-secret', {
      expiresIn: '1h',
    });
    const result = validateSetupUrl(`https://splasher.help/setup?token=${token}`);
    expect(result.ok).toBe(false);
  });

  it('rejects an expired token', () => {
    const token = signSetupToken({}, -10); // already expired
    const result = validateSetupUrl(`https://splasher.help/setup?token=${token}`);
    expect(result.ok).toBe(false);
  });

  it('rejects a token with the wrong purpose', () => {
    const token = signSetupToken({ purpose: 'password-reset' });
    const result = validateSetupUrl(`https://splasher.help/setup?token=${token}`);
    expect(result.ok).toBe(false);
  });

  it('rejects a url missing the token param', () => {
    const result = validateSetupUrl('https://splasher.help/setup');
    expect(result.ok).toBe(false);
  });

  it('rejects a non-string/empty url', () => {
    expect(validateSetupUrl(undefined).ok).toBe(false);
    expect(validateSetupUrl('').ok).toBe(false);
    expect(validateSetupUrl('not a url').ok).toBe(false);
  });
});
