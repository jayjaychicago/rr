# ResiResi — reservation platform demo

A tiny, self-contained restaurant-reservation platform used to try out
[APIblaze](https://www.apiblaze.com). Three apps you can run on your laptop:

| App                 | What it is                                   | Local URL              |
|---------------------|----------------------------------------------|------------------------|
| `resiresi-frontend` | ResiResi itself — the platform dashboard     | http://localhost:3003  |
| `nino`              | Nino's Pizza storefront (a ResiResi tenant)  | http://localhost:3001  |
| `gino`              | Gino's Pizza storefront (a ResiResi tenant)  | http://localhost:3002  |

All three talk to the **reservation API you run locally** — `resiresi-backend`
ships in this repo and runs in Docker on `http://localhost:8080`, seeding itself
with restaurants and reservations. It's an open API (no keys of its own) on
purpose: access control is the gateway's job.

## Requirements

- **Node.js 20+** (`node -v`)
- **Docker** (`docker -v`) — for the backend's Postgres + API

## Fastest path — the guided lab

Prefer a script that explains each step, pauses, runs it, and shows the result?

```bash
./lab.sh        # macOS / Linux
.\lab.ps1       # Windows (PowerShell)
```

It drives the whole exercise end to end. See **[LAB.md](LAB.md)**. Or set it up
by hand below.

## Run it

```bash
git clone https://github.com/jayjaychicago/rr
```

The reservation API (start this first — migrations and seed run automatically):

```bash
cd rr/resiresi-backend && docker compose up -d
```

ResiResi platform (the main app):

```bash
cd rr/resiresi-frontend && npm install && npm run dev
```

Nino's storefront, in a second terminal:

```bash
cd rr/nino && npm install && npm run dev
```

Gino's storefront, in a third terminal:

```bash
cd rr/gino && npm install && npm run dev
```

That's it — no environment file needed. Each app defaults to the local backend
at `http://localhost:8080`. To point one at your APIblaze proxy instead, copy
its `.env.example` to `.env.local` and set `RESIRESI_API_URL` (and, in proxy
mode, `RESIRESI_API_KEY`).

## Signing in

The storefronts and the platform use a password-less demo login: enter any name
and email. Your email is your identity — a diner sees only their own
reservations, and it's the `X-End-User-Id` sent on every API call.

## The exercise

Open the ResiResi platform → **Developers**. It walks you through wiring APIblaze
into ResiResi so your tenants (Nino's and Gino's) can mint API keys and organise
staff into groups — then proves it end to end with an access rule.
