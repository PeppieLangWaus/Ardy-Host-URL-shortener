import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { SetupLinkJwtPayload } from '../types';

export type ValidationResult =
  | { ok: true; payload: SetupLinkJwtPayload; token: string }
  | { ok: false; reason: string };

/**
 * The core anti-abuse gate: this service must refuse to shorten anything that
 * isn't a genuine, backend-issued Splash Helper account-setup link. Two independent
 * checks both have to pass — the URL shape (host+path allow-list) AND the JWT
 * signature (proves it was actually signed by splash-helper-backend with the
 * shared SETUP_LINK_SECRET, not just crafted to look right).
 */
export function validateSetupUrl(rawUrl: unknown): ValidationResult {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { ok: false, reason: 'url is required' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'url is not a valid URL' };
  }

  let prefix: URL;
  try {
    prefix = new URL(config.setupUrlPrefix);
  } catch {
    // Misconfiguration on our side, not the caller's.
    throw new Error('SETUP_URL_PREFIX is not a valid URL');
  }

  if (parsed.origin !== prefix.origin || parsed.pathname !== prefix.pathname) {
    return { ok: false, reason: 'url is not an allowed Splash Helper setup link' };
  }

  const token = parsed.searchParams.get('token');
  if (!token) {
    return { ok: false, reason: 'url is missing a token' };
  }

  let payload: SetupLinkJwtPayload;
  try {
    payload = jwt.verify(token, config.setupLinkSecret) as SetupLinkJwtPayload;
  } catch {
    return { ok: false, reason: 'token is invalid or has expired' };
  }

  if (payload.purpose !== 'account-setup') {
    return { ok: false, reason: 'token has the wrong purpose' };
  }

  if (typeof payload.username !== 'string' || !payload.username.trim()) {
    return { ok: false, reason: 'token is missing a username' };
  }

  if (typeof payload.exp !== 'number') {
    return { ok: false, reason: 'token is missing an expiry' };
  }

  return { ok: true, payload, token };
}
