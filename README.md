# ResiResi — reservation platform demo

A tiny, self-contained restaurant-reservation platform used to try out
[APIblaze](https://www.apiblaze.com). You put APIblaze in front of an open
reservation API, drop two ready-made widgets into ResiResi's app, write one
plain-English access rule — and watch John lose the ability to open Maria's
reservation while his own still works.

## Fastest path — the guided lab (in your browser)

```bash
git clone https://github.com/jayjaychicago/rr
cd rr
./launch.sh        # Windows: .\launch.cmd
```

Your browser opens one screen with three panes: the **steps** on the left (each
one explains itself, shows the exact command, and waits for you to click Run),
with **ResiResi's Developers page** and **Nino's Pizza storefront** live on the
right — so you watch the widgets appear and a diner get blocked in a real UI as
each step lands. About 15 minutes; stop and resume anytime. Details in
**[LAB.md](LAB.md)**.

Prefer no browser chrome? `./launch_terminal_only.sh` (Windows:
`.\launch_terminal_only.cmd`) drives the same steps in your terminal.

**Requirements:** Node.js 20+ and a free APIblaze account (one browser login).

## What's in the repo

| App                 | What it is                                   | Local URL              |
|---------------------|----------------------------------------------|------------------------|
| `resiresi-frontend` | ResiResi itself — the platform dashboard     | http://localhost:3003  |
| `nino`              | Nino's Pizza storefront (a ResiResi tenant)  | http://localhost:3001  |
| `gino`              | Gino's Pizza storefront (a ResiResi tenant)  | http://localhost:3002  |

All three talk to the **reservation API you run locally** — `resiresi-backend-lightweight`
ships in this repo: a zero-dependency Node server that holds its data in memory
and runs on `http://localhost:8080` with just `node server.js` (no Docker, no
database). It's an open API (no keys of its own) on purpose: access control is
the gateway's job. (`resiresi-backend` is the production-shaped Postgres/Docker
version, for reference.)

## Running the apps by hand

The lab does all of this for you — but each app also runs standalone.

The reservation API, start it first:

```bash
cd rr/resiresi-backend-lightweight && node server.js
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

No environment file needed — each app defaults to the local backend at
`http://localhost:8080`. To point one at your APIblaze proxy instead, copy its
`.env.example` to `.env.local` and set `RESIRESI_API_URL` (and, in proxy mode,
`RESIRESI_API_KEY`).

## Signing in

The storefronts and the platform use a password-less demo login: enter any name
and email. Your email is your identity — a diner sees only their own
reservations, and it's the `X-End-User-Id` sent on every API call.
