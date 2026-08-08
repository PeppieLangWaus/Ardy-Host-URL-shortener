import 'dotenv/config';

/**
 * Reads a required environment variable and fails fast at boot if it's missing,
 * rather than silently falling back to an insecure default. Mirrors the pattern
 * used in splash-helper-backend/src/config/env.ts.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  baseDomain: process.env.BASE_DOMAIN ?? 'link.ardy.host',
  setupUrlPrefix: requireEnv('SETUP_URL_PREFIX'),
  setupLinkSecret: requireEnv('SETUP_LINK_SECRET'),
  apiKey: requireEnv('API_KEY'),
  databasePath: process.env.DATABASE_PATH ?? '/data/links.db',
};
