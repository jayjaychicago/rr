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
| `npm run seed` | Seed restaurants, tables, API keys |
| `npm test` | Run smoke tests |

## API keys

Keys are formatted `rsrsi_<env>_<6char>.<32-byte-base64url-secret>`.  
Accept via `Authorization: Bearer …` or `x-api-key: …`.

Roles: `platform` → `owner` → `manager` → `host` → `diner_app`.

See [DEPLOY.md](DEPLOY.md) for production deployment instructions.
