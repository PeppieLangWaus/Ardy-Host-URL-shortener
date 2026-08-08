import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

// Uses Node's built-in SQLite (node:sqlite, stable-ish since Node 22.5) instead of a
// native npm module like better-sqlite3 on purpose: it ships inside Node itself, so
// there's nothing to compile — no node-gyp, no Python/build-tools requirement on the
// host or in the Docker image, and no risk of a missing prebuilt binary for a given
// platform/arch/Node-version combination. It logs one "experimental" warning at boot;
// that's expected and harmless.
const dir = path.dirname(config.databasePath);
if (config.databasePath !== ':memory:' && !fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new DatabaseSync(config.databasePath);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    slug TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    target_url TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);
`);
