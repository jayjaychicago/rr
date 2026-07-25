# ResiResi — reservation platform demo

A tiny, self-contained restaurant-reservation platform used to try out
[APIblaze](https://www.apiblaze.com). Three apps you can run on your laptop:

| App                 | What it is                                   | Local URL              |
|---------------------|----------------------------------------------|------------------------|
| `resiresi-frontend` | ResiResi itself — the platform dashboard     | http://localhost:3003  |
| `nino`              | Nino's Pizza storefront (a ResiResi tenant)  | http://localhost:3001  |
| `gino`              | Gino's Pizza storefront (a ResiResi tenant)  | http://localhost:3002  |

All three talk to the **live reservation API** at `https://backend.resiresi.com`
— it's open (no key required), so there's no backend to run. (`resiresi-backend`
and `restaurant-backend` are that API's source, included for reference only; you
don't need them to run the apps.)

## Requirements

- **Node.js 20+** (`node -v`)

## Run it

```bash
git clone https://github.com/jayjaychicago/rr
cd rr

# ResiResi platform (the main app)
cd resiresi-frontend && npm install && npm run dev     # → http://localhost:3003

# Nino's storefront — in a second terminal
cd nino && npm install && npm run dev                  # → http://localhost:3001

# Gino's storefront — in a third terminal
cd gino && npm install && npm run dev                  # → http://localhost:3002
```

That's it — no environment file needed. Each app defaults to the live open
backend. To point one at your own APIblaze proxy instead, copy its
`.env.example` to `.env.local` and set `RESIRESI_API_URL` (and, in proxy mode,
`RESIRESI_API_KEY`).

## Signing in

The storefronts and the platform use a password-less demo login: enter any name
and email. Your email is your identity — a diner sees only their own
reservations, and it's the `X-End-User-Id` sent on every API call.

## The exercise

Open the ResiResi platform → **Developers**. It walks you through wiring APIblaze
into ResiResi so your tenants (Nino's and Gino's) can mint API keys and organise
staff into groups — then proves it end to end with an access rule.
