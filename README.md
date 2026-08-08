# Ardy Host URL Shortener

A small, self-hosted URL shortener with exactly one job: turn a Splash Helper
account-setup link like

```
https://splasher.help/setup?token=eyJhbGciOi...
```

into

```
https://link.ardy.host/<username>
```

so it's short enough to read and type from a RuneLite chatbox.

It is **not** a general-purpose shortener. It will refuse to shorten anything
that isn't a genuine, backend-issued Splash Helper setup link — see
[Security model](#security-model).

## Security model

`POST /api/links` is the only way to create a short link, and every request
must pass all of these checks before anything is stored:

1. **Caller identity** — the request must carry a valid `X-API-Key` header
   matching the `API_KEY` env var. Only `splash-helper-backend` is meant to
   know this value.
2. **URL allow-list** — the submitted `url`'s origin + path must exactly
   match `SETUP_URL_PREFIX` (e.g. `https://splasher.help/setup`). Nothing
   outside that exact prefix is even considered.
3. **JWT signature** — the `token` query param is verified with
   `SETUP_LINK_SECRET`, the same secret `splash-helper-backend` uses to sign
   setup tokens. This is what actually proves the link is genuine, not just
   shaped correctly.
4. **Token purpose** — the decoded payload must have
   `purpose === 'account-setup'` and a non-empty `username`.

Checks 1 and 3 are independent and both required: an API key alone would let
anyone with the key shorten arbitrary-looking URLs, and JWT verification
alone would let anyone who can reach the endpoint spray requests at it. Both
together keep this from ever becoming an open redirector.

`GET /:slug` (the redirect itself) is intentionally public and
unauthenticated — that's the whole point of the service — but is rate
limited, and returns the same generic 404 whether a slug never existed or
its token has since expired.

## API

### `POST /api/links`

Headers: `X-API-Key: <API_KEY>`, `Content-Type: application/json`

```json
{ "url": "https://splasher.help/setup?token=..." }
```

`200 OK`:
```json
{ "shortUrl": "https://link.ardy.host/ardy-hosts", "slug": "ardy-hosts", "expiresAt": 1786225966 }
```

`400` for any failed validation step, `401` for a missing/wrong API key.

### `GET /:slug`

`302` redirect to the stored setup URL with `Cache-Control: no-store`, or a
plain `404 { "error": "Not found" }` if the slug is unknown or its token has
expired.

### `GET /api/health`

`200 { "status": "ok" }` — unauthenticated, used as the Coolify health check.

## Caveats

- **Slug stability / overwrite semantics.** A user's short link is always
  `link.ardy.host/<slugified-username>`. Every new setup link *overwrites*
  the previous mapping for that slug (last-write-wins) — that's why
  redirects are **302, never 301**, and always sent with
  `Cache-Control: no-store`. A cached 301 could otherwise keep sending
  someone to a stale/expired token after the mapping moves on.
- **Slug collisions.** Two different usernames that slugify to the same
  string (differing only in case/punctuation/diacritics) would overwrite
  each other's link. Not engineered around — Splash Helper usernames are
  already unique account identifiers, so this is a theoretical edge case,
  not a practical one.
- **Single point of failure.** If this service is unreachable,
  `splash-helper-backend`'s `generateSetupLink()` falls back to returning
  the original long URL rather than failing account setup — see that
  repo's `src/routes/auth.ts`.
- **Secret rotation.** `SETUP_LINK_SECRET` must stay identical across both
  services. Rotating it invalidates in-flight setup links until *both*
  services are redeployed with the new value.
- **Reserved slugs.** `api`, `healthz`, and `favicon.ico` can never be
  issued as a slug (enforced both by the redirect route's
  `[a-z0-9-]` pattern being registered after `/api/*`, and by an explicit
  denylist check at creation time).
- **Storage uses `node:sqlite`, not a native npm module.** Node's built-in
  SQLite (stable-ish since Node 22.5) is used instead of `better-sqlite3`
  on purpose: it ships inside Node itself, so there's nothing to compile —
  no node-gyp, no Python/build-tools requirement on the host or in the
  Docker image, and no risk of a missing prebuilt binary for some
  platform/arch/Node-version combination. This is also why `package.json`
  requires `node >=22.5.0` and the Dockerfile is pinned to
  `node:22-bookworm-slim`. Expect one `ExperimentalWarning: SQLite is an
  experimental feature` line in the logs at boot — that's expected and
  harmless, not an error.

## Local development

```bash
cp .env.example .env   # fill in real values
npm install
npm run dev
```

```bash
curl http://localhost:3000/api/health
```

## Running with Docker

```bash
cp .env.example .env   # fill in real values
docker compose up -d --build
curl http://127.0.0.1:3000/api/health
```

## Deploying on Coolify

Deploy this as a **Docker Compose** resource (not a plain Dockerfile
Application) so Coolify reads `docker-compose.yml` directly:

1. New Resource → **Docker Compose**, pointing at this repo
   (`PeppieLangWaus/Ardy-Host-URL-shortener`), compose file path
   `docker-compose.yml`.
2. Coolify parses the file on import and does two things for you
   automatically, with nothing to configure by hand:
   - **Storage**: the `shortener_data` named volume (mounted at `/data`,
     where `DATABASE_PATH` points) is created and persisted across
     redeploys.
   - **Environment variables**: every `${VAR}` referenced in the
     `environment:` block — `BASE_DOMAIN`, `SETUP_URL_PREFIX`,
     `SETUP_LINK_SECRET`, `API_KEY` — is listed on the resource's
     **Environment Variables** screen with an empty value, ready for you
     to fill in. Mark `SETUP_LINK_SECRET` and `API_KEY` as secret/sensitive
     there so they're masked in logs.
3. Attach the domain `link.ardy.host` in the resource's **Domains** tab —
   Coolify's built-in Traefik provisions the Let's Encrypt certificate
   automatically. No host-level nginx is involved for this service.
4. Add a DNS **A/AAAA record** for `link.ardy.host` pointing at the Coolify
   server's IP (do this before relying on the link going live).
5. Coolify picks up the `healthcheck:` block in the compose file
   automatically as the readiness/liveness check — nothing extra to set.

## Tests

```bash
npm test
```
