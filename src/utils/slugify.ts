/** Paths that must never be handed out as a slug because they'd shadow real routes. */
export const RESERVED_SLUGS = new Set(['api', 'healthz', 'favicon.ico']);

/**
 * Converts a Splash Helper username into a URL-safe slug:
 * lowercase, non [a-z0-9] runs collapsed to a single '-', leading/trailing '-' trimmed.
 * Returns '' if nothing usable remains (caller must reject that).
 */
export function slugify(username: string): string {
  return username
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
