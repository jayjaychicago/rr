# resiresi-backend

Restaurant reservation API — Node.js 20 + Express 4 + PostgreSQL 16, deployed on Fly.io.

Used as the reference backend origin for the APIblaze proxy.

## Quick start (local)

```bash
cp .env.example .env
docker compose up
# App + Postgres start. Migrations and seed run automatically.
# → http://localhost:8080/healthz
# → http://localhost:8080/docs
```

## Stack

- **Runtime**: Node.js 20, ES modules
- **Framework**: Express 4
- **DB**: PostgreSQL 16 (`pg`, connection pool)
- **Validation**: Zod
- **Logging**: Pino + pino-http
- **Docs**: OpenAPI 3.1 at `/openapi.yaml`, Swagger UI at `/docs`
- **Deploy**: Fly.io

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start server |
| `npm run migrate` | Apply pending migrations |
| `npm run seed` | Seed restaurants, tables, reservations |
| `npm test` | Run smoke tests |

## Authentication

None. This is an **open origin**: it has no keys and no roles of its own, and
every endpoint is callable without a credential.

Access control belongs to the gateway in front of it — that is what issues keys
to consumers and decides who may call what. Keeping it out of the origin is
deliberate; don't add auth back here.

See [DEPLOY.md](DEPLOY.md) for production deployment instructions.
