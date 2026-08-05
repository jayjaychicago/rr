# The ResiResi lab — guided

Instead of following the walkthrough by hand, run one script that **explains each
step, pauses, runs it, and shows the result** — the whole "put APIblaze in front
of your API and add per-user access control" exercise.

Two ways to run the same lab:

- **`./launch.sh` — in your browser (recommended).** One screen, three panes:
  the steps on the left, ResiResi's Developers page and Nino's Pizza storefront
  live on the right — so you *watch* the widgets appear and a diner get blocked
  in a real UI as each step lands.
- **`./launch_terminal_only.sh` — in your terminal.** Same steps, same commands, no browser
  chrome.

Inside the browser lab there is a second choice, top-left: **who runs the
commands.**

- **Web** (the default) — the lab runs each command for you and streams the
  output into the step.
- **Terminal** — the lab runs nothing. Each step shows its command; you copy it,
  run it in your own terminal, and click to move on. The long-running ones (the
  backend, the tunnel, the two apps) each need their own terminal window, left
  open. Two commands print something the lab needs back — creating the proxy and
  minting the key — so those steps ask you to paste what they printed.

Switch at any point; it applies from the next command on. Either way the panes
on the right behave the same, and the lab still makes its own check calls so it
can show you the results.

## The scenario

You are **ResiResi**, a restaurant-reservation platform with two tenants,
**Nino's Pizza** and **Gino's Pizza**. Your backend is open (no keys of
its own) — access control is the gateway's job. Your task: wire in **APIblaze**
so tenants can mint their own API keys and organise staff into groups, then prove
an access rule works — a diner sees only their own reservations while reservation
staff see all of them.

Everything runs on your machine: the API (a tiny Node server), the platform app, and a
proxy in front of it via APIblaze's localhost tunnel.

## Requirements

- **Node.js 20+** — <https://nodejs.org>
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
./launch.sh       # browser version (three panes)
./launch_terminal_only.sh        # terminal version
```

**Windows:**

```
.\launch.cmd      # browser version (three panes)
.\launch_terminal_only.cmd       # terminal version
```


## What it does

The lab pauses before every step so you can read what's about to happen, then
runs it:

1. Starts the local backend — a zero-dependency Node server, seeded in memory — and waits for it.
2. Logs you in to APIblaze (browser) and creates a proxy — **with a unique name
   generated for your run**, so two people doing the lab never collide — pointed
   at your local API, with identity + IAM turned on.
3. Opens the localhost tunnel and proves the proxy reaches your machine.
4. Mints the control-plane widget key.
5. Installs the platform app and starts it — its Developers page is live with
   two **empty placeholder spots** — then **wires the two widgets** into the
   running app, so you watch them appear where the placeholders were.
6. Crowns you the first tenant admin and has you sign in.
7. Walks the before/after: John (a diner) can open Maria's reservation → you put
   staff in a group and turn one plain-English sentence into enforced rules
   (`npx apiblaze rule "…" --enforce`) → John's own booking still opens, Maria's
   is refused, and Maria (a reservationist) still sees everything. In the
   browser version this plays out live on Nino's storefront too.

A few steps need you (they're the point): completing the browser login, signing
into the app, and optionally creating the group in the widget. The lab tells
you exactly what to do and waits.

**Cleanup:** the lab stops the backend, app and tunnel when it exits.

More about the lab (what's on screen, the story, tips) lives at
<https://www.apiblaze.com/docs/full-test-project>.
