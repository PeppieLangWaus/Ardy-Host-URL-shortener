import { createApp } from './app';
import { config } from './config/env';
import { sweepExpired } from './db/links';
import './db/index'; // ensures the table exists before we start serving

const app = createApp();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Ardy Host URL shortener listening on 0.0.0.0:${config.port}`);
});

// Housekeeping only — expired rows already 404 at read time, this just keeps the
// SQLite file from growing forever.
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
setInterval(() => {
  const removed = sweepExpired();
  if (removed > 0) {
    console.log(`[sweep] removed ${removed} expired link(s)`);
  }
}, SWEEP_INTERVAL_MS).unref();
