# ResiResi Backend — Deployment Guide

> **Out of date as written.** The Fly.io app this describes was deleted on
> 2026-08-20, and `backend.resiresi.com` now serves the per-IP, weekly-wiped
> sandbox in the private `resiresionline` repo (Cloudflare Workers + Durable
> Objects), not this Postgres backend.
>
> These steps still work for standing this backend up **on a hostname of your
> own** — just do not point them at `backend.resiresi.com`, which is taken.
> For a local copy with no deployment at all, use
> `rr/resiresi-backend-lightweight` (`node server.js`, no Docker, no Postgres).

## One-time Fly.io setup

```bash
# Authenticate
fly auth login

# Create the app
fly apps create resiresi-backend

# Create Postgres (shared-cpu-1x, 10 GB)
fly postgres create \
  --name resiresi-db \
  --region iad \
  --vm-size shared-cpu-1x \
  --volume-size 10

# Attach the DB — this sets DATABASE_URL as a Fly secret
fly postgres attach resiresi-db --app resiresi-backend
```

## Deploy

```bash
fly deploy
```

Migrations run automatically via the `release_command` in `fly.toml` before traffic switches over.

## Seed (one-time)

```bash
# Seeds restaurants, tables and reservations
fly ssh console --app resiresi-backend -C "node src/db/seed.js"
```

## Custom domain

```bash
# Request a TLS certificate and get DNS records
fly certs create backend.resiresi.com --app resiresi-backend

# Fly will print A, AAAA, and _acme-challenge CNAME records.
# Add them to your DNS provider, then verify:
fly certs show backend.resiresi.com --app resiresi-backend
```

---

## Testing it works

### 1. Health check

```bash
curl https://backend.resiresi.com/healthz
# → {"status":"ok","db":"ok"}
```

### 2. Swagger UI

```bash
open https://backend.resiresi.com/docs
```

### 3. Create a reservation with Idempotency-Key

```bash
RESTAURANT_ID="nino"   # slug or UUID — both work

curl -X POST "https://backend.resiresi.com/v1/restaurants/${RESTAURANT_ID}/reservations" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-idem-$(date +%s)" \
  -d '{
    "diner_name": "Jane Smith",
    "diner_email": "jane@example.com",
    "party_size": 2,
    "starts_at": "2026-05-01T19:00:00-05:00",
    "duration_minutes": 90
  }'
# → 201 with reservation JSON

# Retry with the same Idempotency-Key — gets 200 + Idempotent-Replay: true
```

### 4. List reservations with filters

```bash
curl "https://backend.resiresi.com/v1/restaurants/${RESTAURANT_ID}/reservations?status=confirmed&limit=10"
# → {"data":[...],"page":{"next_cursor":null,"limit":10}}
```

### 5. Demonstrate 409 double-booking (table_conflict)

```bash
TABLE_ID="<uuid of any table>"
STARTS="2026-05-02T20:00:00-05:00"

# First booking
curl -X POST "https://backend.resiresi.com/v1/restaurants/${RESTAURANT_ID}/reservations" \
  -H "Content-Type: application/json" \
  -d "{
    \"diner_name\": \"Alice\",
    \"party_size\": 2,
    \"table_id\": \"${TABLE_ID}\",
    \"starts_at\": \"${STARTS}\",
    \"duration_minutes\": 90
  }"
# → 201

# Second booking on the same table overlapping
curl -X POST "https://backend.resiresi.com/v1/restaurants/${RESTAURANT_ID}/reservations" \
  -H "Content-Type: application/json" \
  -d "{
    \"diner_name\": \"Bob\",
    \"party_size\": 2,
    \"table_id\": \"${TABLE_ID}\",
    \"starts_at\": \"${STARTS}\",
    \"duration_minutes\": 90
  }"
# → 409 {"error":{"code":"table_conflict","message":"Table is already booked for this time.",...}}
```

### 6. Confirm the origin needs no credential

```bash
# No key, no header — the API is open.
curl "https://backend.resiresi.com/v1/restaurants"
# → {"data":[...]}
```
