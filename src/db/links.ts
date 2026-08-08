import { db } from './index';
import { LinkRow } from '../types';

const upsertStmt = db.prepare(`
  INSERT INTO links (slug, username, target_url, expires_at, created_at, updated_at)
  VALUES (@slug, @username, @target_url, @expires_at, @created_at, @updated_at)
  ON CONFLICT(slug) DO UPDATE SET
    username = excluded.username,
    target_url = excluded.target_url,
    expires_at = excluded.expires_at,
    updated_at = excluded.updated_at
`);

const getStmt = db.prepare(`
  SELECT * FROM links WHERE slug = @slug
`);

const sweepStmt = db.prepare(`
  DELETE FROM links WHERE expires_at < @now
`);

/**
 * Creates or overwrites the mapping for a slug. Last-write-wins: a user's short
 * link always points at their most recently issued setup token.
 */
export function upsertLink(params: {
  slug: string;
  username: string;
  targetUrl: string;
  expiresAt: number;
}): void {
  const now = Math.floor(Date.now() / 1000);
  upsertStmt.run({
    slug: params.slug,
    username: params.username,
    target_url: params.targetUrl,
    expires_at: params.expiresAt,
    created_at: now,
    updated_at: now,
  });
}

export function getLink(slug: string): LinkRow | undefined {
  return getStmt.get({ slug }) as LinkRow | undefined;
}

/** Deletes rows whose token has already expired. Purely housekeeping. */
export function sweepExpired(): number {
  const now = Math.floor(Date.now() / 1000);
  const result = sweepStmt.run({ now });
  return Number(result.changes);
}
