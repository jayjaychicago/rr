# resiresi backend — build spec

You are going to build and deploy a restaurant reservation API service to Fly.io. The service runs at `backend.resiresi.com`. It is a **realistic reference backend used to test the APIblaze proxy** — meaning: ordinary Node + Postgres + nginx-shaped HTTP, nothing exotic. Match what a real B2B reservation SaaS origin would actually look like.

Work end-to-end: scaffold the repo, run migrations locally if you can, and produce all files needed to `fly deploy`. Do not ask the user to fill in code blanks; generate everything.

---

## 1. Stack (non-negotiable)

- **Runtime:** Node.js 20, ES modules (`"type": "module"`)
- **Framework:** Express 4
- **DB:** PostgreSQL 16 (Fly Postgres), driver `pg`, pool-based
- **Validation:** Zod
- **Logging:** Pino + pino-http, with `authorization`/`cookie`/`secret`/`secret_hash` redaction
- **Docs:** OpenAPI 3.1 served as YAML at `/openapi.yaml` and Swagger UI at `/docs`
- **Deploy target:** Fly.io (single `fly.toml`, single Dockerfile, Fly Postgres attached via `DATABASE_URL`)
- **Custom domain:** `backend.resiresi.com` with Fly-managed TLS

Do not introduce TypeScript, an ORM, a monorepo, or any build step beyond `docker build`. Plain `.js` files, `node src/server.js` to start.

---

## 2. Domain model

Tables (all UUIDs unless noted):

- **restaurants** — `id`, `slug` (unique, lowercase kebab), `name`, `timezone` (IANA, default `America/Detroit`), `open_hours` (jsonb array of `{day_of_week:0-6, open:"HH:MM", close:"HH:MM"}`), `address`, `phone`, `created_at`, `updated_at`
- **users** — `id`, `email` (citext, unique when non-null), `phone`, `display_name`, timestamps
- **restaurant_memberships** — `id`, `restaurant_id`, `user_id`, `role` enum `('host','manager','owner')`, unique on `(restaurant_id, user_id)`
- **dining_tables** — `id`, `restaurant_id`, `label`, `capacity` (>0), `active` bool, unique on `(restaurant_id, label)`
- **api_keys** — `id`, `restaurant_id` (nullable — null only when `role='platform'`), `name`, `prefix` (unique, plaintext, shown in UI), `secret_hash` (sha256 hex of full key string), `role` enum `('platform','owner','manager','host','diner_app')`, `created_by`, `last_used_at`, `expires_at`, `revoked_at`, `created_at`. CHECK: platform keys have null restaurant, others have non-null.
- **reservations** — `id`, `restaurant_id`, `table_id` (nullable), `diner_user_id` (nullable), denormalized `diner_name`/`diner_email`/`diner_phone`, `party_size` (1–50), `starts_at`, `ends_at` (CHECK `ends_at > starts_at`), `status` enum `('pending','confirmed','seated','completed','cancelled','no_show')` default `'confirmed'`, `notes`, `idempotency_key` (nullable), `created_by_key_id`, timestamps
- **audit_events** — bigserial id, `restaurant_id`, `actor_key_id`, `actor_user_id`, `action`, `target_type`, `target_id`, `metadata` jsonb, `created_at`

Constraints:

- Enable extensions: `pgcrypto`, `btree_gist`, `citext`
- **No double-booking** a table with overlapping times — use a GIST EXCLUDE constraint on `(table_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)` filtered to `table_id IS NOT NULL AND status IN ('pending','confirmed','seated')`. Catch pg error `23P01` and return `409 table_conflict`.
- Idempotency: unique index on `(restaurant_id, idempotency_key) WHERE idempotency_key IS NOT NULL`
- `updated_at` trigger on restaurants, users, reservations

Migrations live in `db/migrations/NNN_*.sql` and are applied by a runner (`src/db/migrate.js`) that tracks applied files in a `_migrations` table. Idempotent on re-run.

---

## 3. API key format

- Full key string: `rsrsi_<env>_<6char>.<32-byte base64url secret>` — e.g., `rsrsi_live_A7K2XQ.Zk9s...`
- Store `prefix` (everything before the dot) plaintext for lookup and display. Store `sha256(full_key_string)` in `secret_hash`.
- Character set for the 6-char tail excludes `0/O/1/I/l` for readability.
- Timing-safe hash comparison (`crypto.timingSafeEqual` over hex buffers).
- Accept the key in either `Authorization: Bearer …` or `x-api-key: …`.
- On every successful auth, fire-and-forget `UPDATE api_keys SET last_used_at = now()` (do not block the request).

---

## 4. Auth & role matrix

Two middlewares: `requireApiKey`, `requireRole(...roles)`, plus `requireRestaurantScope('restaurantId')` which enforces that the key's `restaurant_id` matches the path parameter (platform keys bypass).

| Action                                       | diner_app | host | manager | owner | platform |
|---                                           |---        |---   |---      |---    |---       |
| Create restaurant                            | —         | —    | —       | —     | ✓        |
| Read own restaurant                          | ✓         | ✓    | ✓       | ✓     | ✓        |
| Update restaurant                            | —         | —    | ✓       | ✓     | ✓        |
| Manage tables (create/update/delete)         | —         | —    | ✓       | ✓     | ✓        |
| Create reservation                           | ✓         | ✓    | ✓       | ✓     | ✓        |
| List all reservations in restaurant          | —         | ✓    | ✓       | ✓     | ✓        |
| List own reservations (diner_app)            | ✓ (own only, `?diner_email=` required) | — | — | — | — |
| Read single reservation                      | ✓ own only | ✓    | ✓       | ✓     | ✓        |
| Assign table / change status                 | diner_app can only set `cancelled` on own | ✓ | ✓ | ✓ | ✓ |
| Cancel reservation                           | ✓ own only | ✓    | ✓       | ✓     | ✓        |
| Manage API keys                              | —         | —    | —       | ✓ (restaurant-scoped) | ✓ (all) |

Platform keys bypass `requireRole` and `requireRestaurantScope` checks automatically.

---

## 5. Endpoints

Mount everything under `/v1`. JSON everywhere. No trailing slashes.

**System**
- `GET /healthz` — returns `{"status":"ok","db":"ok"}` after a `SELECT 1`. No auth.
- `GET /openapi.yaml` — serves the spec. No auth.
- `GET /docs` — Swagger UI. No auth.

**Restaurants**
- `GET    /v1/restaurants` — platform sees all, scoped keys see just theirs
- `GET    /v1/restaurants/:idOrSlug`
- `POST   /v1/restaurants` (platform)
- `PATCH  /v1/restaurants/:restaurantId` (owner/manager)

**Tables**
- `GET    /v1/restaurants/:restaurantId/tables`
- `POST   /v1/restaurants/:restaurantId/tables` (owner/manager)
- `PATCH  /v1/restaurants/:restaurantId/tables/:tableId` (owner/manager)
- `DELETE /v1/restaurants/:restaurantId/tables/:tableId` (owner/manager)

**Reservations**
- `POST   /v1/restaurants/:restaurantId/reservations` — supports `Idempotency-Key` header. Body accepts either `ends_at` or `duration_minutes` (default 90). Validates table belongs to restaurant and capacity ≥ party_size.
- `GET    /v1/restaurants/:restaurantId/reservations` — filters: `from`, `to`, `status` (repeatable), `diner_email`, `table_id`. Cursor pagination: `limit` (default 50, max 200), `cursor` (base64url of `starts_at|id`). Response: `{ data: [...], page: { next_cursor, limit } }`. Ordering: `starts_at ASC, id ASC`.
- `GET    /v1/restaurants/:restaurantId/reservations/:reservationId`
- `PATCH  /v1/restaurants/:restaurantId/reservations/:reservationId`
- `DELETE /v1/restaurants/:restaurantId/reservations/:reservationId` — soft cancel (sets `status='cancelled'`, returns 204)

**API keys**
- `GET    /v1/restaurants/:restaurantId/api-keys` (owner)
- `POST   /v1/restaurants/:restaurantId/api-keys` (owner) — returns `plaintext` **once**; never again
- `DELETE /v1/restaurants/:restaurantId/api-keys/:keyId` (owner) — sets `revoked_at`, does not hard-delete

Platform-wide key management lives at `/v1/platform/api-keys` and requires a platform key.

---

## 6. Response conventions

- Success envelopes: single resource returns the object directly; collections return `{ data: [...], page?: {...} }`.
- Error envelope — every error, including validation failures:
  ```json
  {
    "error": {
      "code": "snake_case_code",
      "message": "Human-readable message.",
      "request_id": "uuid",
      "details": { /* zod flatten() output on 400s */ }
    }
  }
  ```
- Every response carries `x-request-id` (generate if incoming is absent — use `uuid.v4`).
- Use the status codes you'd expect: 400 validation, 401 missing/bad key, 403 role/tenant mismatch, 404 not found, 409 conflicts (slug taken, table_conflict, table_label_taken), 422 semantic (e.g., table_too_small — actually use 400 with distinct `code` to keep it simple).
- Timestamps are ISO 8601 with offset.

---

## 7. Middleware stack (order matters)

1. `helmet()` with defaults
2. `cors()` open (this is a backend API; APIblaze/Swagger UI will call it)
3. `express.json({ limit: '100kb' })`
4. Request ID middleware — reads `x-request-id` or generates; sets `req.id`, response header
5. `pino-http` bound to the request ID
6. `express-rate-limit` — 600 req/min per IP, trust proxy on, standard headers on
7. Routers
8. `notFoundHandler`
9. `errorHandler` (format per §6, log 5xx with stack, 4xx at info)

`app.set('trust proxy', Number(process.env.TRUST_PROXY || 1))`.

---

## 8. Seed data

`npm run seed` creates:

- 3 restaurants: `le-bernardin` (America/New_York), `joe-pizza` (America/New_York), `zingerman-roadhouse` (America/Detroit). Realistic open_hours.
- 6–10 tables per restaurant, mixed capacities (2/2/4/4/4/6/8).
- For each restaurant: one `owner` key, one `manager` key, one `host` key, one `diner_app` key. Print all plaintext keys to stdout at the end, once. Format:
  ```
  le-bernardin (owner):     rsrsi_live_A7K2XQ.Zk9s...
  ```
- One platform key at the top.
- ~30 reservations spread across the next 14 days, mix of statuses.

Seed is idempotent: re-running upserts by slug/label/name and regenerates only missing keys.

---

## 9. OpenAPI spec

- Written by hand in `openapi.yaml` (not generated from code — we want it to be the source of truth for APIblaze import).
- `servers:` includes `https://backend.resiresi.com/v1` and `http://localhost:8080/v1`.
- `securitySchemes`: `ApiKeyAuth` (apiKey, header `x-api-key`) and `BearerAuth` (http bearer). `security` applied globally, overridden to `[]` on `/healthz`.
- Document every endpoint, every 4xx/409 case, and the `Idempotency-Key` header on reservation create.
- Swagger UI at `/docs` reads from `/openapi.yaml`.

---

## 10. Fly.io deployment

Generate all of:

**`Dockerfile`** — multi-stage, `node:20-alpine`, non-root user, only production deps installed, `CMD ["node","src/server.js"]`, healthcheck via `wget -qO- http://localhost:8080/healthz`.

**`fly.toml`** — app name `resiresi-backend`, primary region `iad` (closest useful to Michigan; change only if you have a reason). Set:
```toml
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  grace_period = "10s"
  interval = "15s"
  method = "GET"
  path = "/healthz"
  timeout = "5s"

[env]
  NODE_ENV = "production"
  PORT = "8080"
  TRUST_PROXY = "1"
  PUBLIC_BASE_URL = "https://backend.resiresi.com"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

**`fly.release_command`** — run `node src/db/migrate.js` as the release command so migrations run on every deploy.

**`DEPLOY.md`** — exact commands, in order, to go from zero to live:

```bash
# one-time
fly auth login
fly apps create resiresi-backend
fly postgres create --name resiresi-db --region iad --vm-size shared-cpu-1x --volume-size 10
fly postgres attach resiresi-db --app resiresi-backend   # sets DATABASE_URL

# deploy
fly deploy

# seed (one-time; will print plaintext keys)
fly ssh console --app resiresi-backend -C "node src/db/seed.js"

# custom domain
fly certs create backend.resiresi.com --app resiresi-backend
# Then create the DNS records Fly prints (A + AAAA, plus the _acme-challenge CNAME it requests).
fly certs show backend.resiresi.com --app resiresi-backend   # verify issued
```

Include a "testing it works" section at the bottom with 4–5 `curl` examples: health, create reservation with `Idempotency-Key`, list reservations with filters, demonstrate a 409 from double-booking, demonstrate a 403 from a host key trying to manage tables.

---

## 11. Repo layout

```
resiresi-backend/
├─ Dockerfile
├─ fly.toml
├─ DEPLOY.md
├─ README.md
├─ openapi.yaml
├─ package.json
├─ .env.example
├─ .dockerignore
├─ db/
│  └─ migrations/
│     └─ 001_init.sql
├─ src/
│  ├─ server.js              # app bootstrap, listen, graceful shutdown on SIGTERM
│  ├─ app.js                 # express app factory (pure; no listen) — used by tests
│  ├─ db/
│  │  ├─ pool.js
│  │  ├─ migrate.js
│  │  └─ seed.js
│  ├─ lib/
│  │  ├─ logger.js
│  │  ├─ errors.js
│  │  ├─ apikey.js
│  │  └─ requestId.js
│  ├─ middleware/
│  │  ├─ auth.js
│  │  └─ validate.js
│  └─ routes/
│     ├─ system.js           # healthz, openapi, docs
│     ├─ restaurants.js
│     ├─ tables.js
│     ├─ reservations.js
│     └─ apiKeys.js
└─ test/
   └─ smoke.test.js          # node:test; hits app factory with supertest-style fetch
```

---

## 12. Non-obvious requirements (don't skip these)

- **Graceful shutdown**: on `SIGTERM`, stop accepting connections, drain, then `pool.end()`. Fly will send SIGTERM on deploy.
- **Connection pool sizing**: `max: 10` is fine for a single Fly machine. Don't set it higher without a reason.
- **`trust proxy`**: required for `express-rate-limit` and correct client IPs behind Fly's edge. Already set via env.
- **Error code `23P01`** is the GIST exclusion violation — that's the double-booking path. Error code `23505` on the idempotency unique index means a parallel create with the same key landed first; refetch the existing row and return it with `Idempotent-Replay: true`.
- **Idempotency replay** for reservation create: if a row already exists for `(restaurant_id, idempotency_key)`, return it with `200` (not 201) and the header `Idempotent-Replay: true`.
- **Do not** log request bodies wholesale. Pino's redaction handles auth headers; don't accidentally log `req.body` at info level.
- **Do not** include `plaintext` in any API key response except the one-time `POST /api-keys` response.
- **OpenAPI must be hand-written** and must validate. Include a `components/schemas` section with every response shape referenced by `$ref`.

---

## 13. Definition of done

1. `docker build .` succeeds.
2. `docker compose up` (with an included `docker-compose.yml` for local dev: app + postgres) runs migrations, seeds, and serves on `localhost:8080`.
3. `curl http://localhost:8080/healthz` returns `{"status":"ok","db":"ok"}`.
4. `curl http://localhost:8080/docs` renders Swagger UI.
5. `fly deploy` succeeds from a clean Fly app and the release command runs migrations.
6. After `fly certs create backend.resiresi.com`, `https://backend.resiresi.com/healthz` returns 200.
7. Seed script prints all plaintext API keys once at the end.
8. A concrete `curl` double-booking test in `DEPLOY.md` produces a 409 `table_conflict`.

Build it. Don't ask clarifying questions unless something in this spec actually contradicts itself. You have access to the flyctl