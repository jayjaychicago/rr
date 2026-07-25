# The ResiResi lab — guided, in your terminal

Instead of following the walkthrough by hand, run one script that **explains each
step, pauses, runs it, and shows the result** — the whole "put APIblaze in front
of your API and add per-user access control" exercise without leaving the
terminal.

## The scenario

You are **ResiResi**, a restaurant-reservation platform with two tenants,
**Nino's Pizza** and **Gino's Pizza**. Your reservation API is open (no keys of
its own) — access control is the gateway's job. Your task: wire in **APIblaze**
so tenants can mint their own API keys and organise staff into groups, then prove
an access rule works — a diner sees only their own reservations while reservation
staff see all of them.

Everything runs on your machine: the API (in Docker), the platform app, and a
proxy in front of it via APIblaze's localhost tunnel.

## Requirements

- **Node.js 20+** — <https://nodejs.org>
- **Docker** — <https://docker.com/get-started>
- The **APIblaze CLI** — the lab fetches it for you via `npx` on first run; nothing to install.
- A **free APIblaze account** — the lab opens your browser once to log in (the
  localhost tunnel is an authenticated feature).

## Run it

```
git clone https://github.com/jayjaychicago/rr
cd rr
```

**macOS / Linux:**

```
./lab.sh
```

**Windows (PowerShell):**

```
.\lab.ps1
```

(If Windows blocks it: `powershell -ExecutionPolicy Bypass -File .\lab.ps1`.)

## What it does

The lab pauses before every step so you can read what's about to happen, then
runs it:

1. Starts the reservation API in Docker (seeds itself) and waits for it.
2. Logs you in to APIblaze (browser) and creates a proxy — **with a unique name
   generated for your run**, so two people doing the lab never collide — pointed
   at your local API, with identity + IAM turned on.
3. Opens the localhost tunnel and proves the proxy reaches your machine.
4. Mints the control-plane widget key.
5. Installs the platform app, writes its `.env.local`, and **wires the two
   widgets** for you (the exact files the manual guide has you write).
6. Starts the app, has you sign in, and crowns you the first tenant admin.
7. Walks the before/after: John (a diner) sees everyone's reservations → you add
   staff to a group and chat an access rule into place → John now sees only his,
   while Maria (a reservationist) still sees all.

A few steps need you (they're the point): completing the browser login, signing
into the app, creating a group in the widget, and typing the rule into the
authz-agent chat. The lab tells you exactly what to do and waits.

**Cleanup:** the lab stops the app and tunnel when it exits. To stop the API:
`cd resiresi-backend && docker compose down`.

Prefer to do it by hand? The same steps, explained, live at
<https://www.apiblaze.com/docs/full-test-project> and inside the app itself at
`http://localhost:3003/developers`.
