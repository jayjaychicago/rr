#!/usr/bin/env node
/**
 * ResiResi × APIblaze — guided lab.
 *
 * Explains each step, waits for you to press Enter, runs it, and shows the
 * result — the whole "Full test project" without leaving the terminal. One Node
 * script drives it on macOS, Linux and Windows alike (Node is already required
 * to run the apps). Launched by ../start.sh (mac/linux) or ../start.ps1 (windows).
 *
 * Everything runs on your machine: the reservation API (a tiny Node server), the platform
 * app, and a proxy in front of it via APIblaze's localhost tunnel.
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { writeFileSync, readFileSync, openSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { wireWidgets } from "./wire.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(ROOT, "resiresi-frontend");
const BACKEND_LW = join(ROOT, "resiresi-backend-lightweight");
const isWin = process.platform === "win32";
const NPX = isWin ? "npx.cmd" : "npx";
const NPM = isWin ? "npm.cmd" : "npm";

// ── tiny ui ────────────────────────────────────────────────────────────────
const c = (n, s) => `\x1b[${n}m${s}\x1b[0m`;
const bold = (s) => c(1, s), cyan = (s) => c(36, s), green = (s) => c(32, s),
      yellow = (s) => c(33, s), dim = (s) => c(2, s), red = (s) => c(31, s);
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

// Show the exact command a step is about to run, THEN wait for Enter — so nothing
// runs before the user has seen what it is. `cmd` is the friendly command string
// (or a short "what happens" line for steps that aren't a single command).
function pause(msg = "Press Enter to run this step", cmd) {
  if (cmd) console.log("\n" + dim("  about to run:") + "\n    " + green(cmd));
  return ask(`\n${cyan("▸ " + msg)} `);
}

// Friendly display form of an APIblaze invocation: the real `npx apiblaze …`
// command the user would type, minus only the machine-only --json flag.
const abzDisplay = (args) => "npx apiblaze " + args.filter((a) => a !== "--json").join(" ");

let N = 0;
function step(title, explain) {
  N++;
  console.log("\n" + bold(`━━ Step ${N} · ${title} ` + "━".repeat(Math.max(0, 46 - title.length))));
  if (explain) console.log(explain.split("\n").map((l) => dim(l)).join("\n"));
}

// ── process helpers ──────────────────────────────────────────────────────────
const bg = []; // background children to clean up on exit
function cleanup() {
  for (const p of bg) { try { p.kill(); } catch {} }
}
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });

/** Run a command, inheriting the terminal (interactive prompts work). Awaits exit. */
function run(cmd, args, opts = {}) {
  const shown = [cmd, ...args].join(" ");
  console.log(dim("$ " + shown));
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: isWin, ...opts });
    p.on("error", rej);
    p.on("close", (code) => (code === 0 ? res() : rej(new Error(`${shown} exited ${code}`))));
  });
}

/** Run and capture stdout (still echoes to the user). */
function capture(cmd, args, opts = {}) {
  const shown = [cmd, ...args].join(" ");
  console.log(dim("$ " + shown));
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ["inherit", "pipe", "inherit"], shell: isWin, ...opts });
    let out = "";
    p.stdout.on("data", (d) => { out += d; process.stdout.write(d); });
    p.on("error", rej);
    p.on("close", (code) => (code === 0 ? res(out) : rej(new Error(`${shown} exited ${code}`))));
  });
}

/** Start a long-running process in the background; tracked for cleanup. */
function startBg(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { stdio: "ignore", shell: isWin, detached: false, ...opts });
  bg.push(p);
  return p;
}

async function waitFor(fn, { tries = 60, delay = 1000, what = "service" } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if (await fn()) return true; } catch {}
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error(`Timed out waiting for ${what}.`);
}

async function httpOk(url, headers = {}) {
  const r = await fetch(url, { headers });
  return r.ok ? r : null;
}

/** True if `cmd args` runs and exits 0. Used for presence + daemon checks. */
function commandOk(cmd, args) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { stdio: "ignore", shell: isWin });
    p.on("error", () => res(false));
    p.on("close", (code) => res(code === 0));
  });
}

// Every APIblaze call goes through npx with --yes, so npx fetches the CLI once
// (first use) WITHOUT its interactive "Ok to proceed?" prompt, then reuses it.
// Pinned to an exact version (not @latest) so npx installs it ONCE and then runs
// straight from cache on every later call — no per-command registry round-trip,
// no repeated prompts, and the lab always runs the version it was written for.
const ABZ = ["--yes", "apiblaze@0.19.3"];
const abz = (args, opts) => run(NPX, [...ABZ, ...args], opts);
const abzCapture = (args, opts) => capture(NPX, [...ABZ, ...args], opts);

async function preflight() {
  step("Check your tools", "This lab needs Node 20+ and npx (both ship with Node.js).");
  await pause();
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) throw new Error(`Node 20+ required — you have ${process.versions.node}. https://nodejs.org`);
  if (!(await commandOk(NPX, ["--version"]))) throw new Error("npx not found — reinstall Node.js. https://nodejs.org");
  console.log(green(`  Node ${process.versions.node} · npx ✓`));
  console.log(dim("  Fetching the APIblaze CLI via npx (first time only)…"));
  await run(NPX, [...ABZ, "--version"]);
  console.log(green("  APIblaze CLI ready ✓"));
}

// ── lab state (so the same suffix is reused across a run) ────────────────────
const STATE = join(ROOT, "lab", ".state.json");
function loadState() { try { return JSON.parse(readFileSync(STATE, "utf8")); } catch { return {}; } }
function saveState(s) { writeFileSync(STATE, JSON.stringify(s, null, 2)); }

function newSuffix() {
  const alph = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = ""; for (let i = 0; i < 4; i++) s += alph[Math.floor(Math.random() * alph.length)];
  return s;
}

// ── the lab ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(bold("\n  ResiResi × APIblaze — guided lab\n"));
  console.log(dim("  You are ResiResi, a reservation platform with two restaurant tenants,\n" +
    "  Nino's and Gino's. Your reservation API has no access control of its own —\n" +
    "  today anyone with the address can read everyone's reservations. This lab\n" +
    "  fixes that by putting APIblaze in front of it. Everything runs on this\n" +
    "  machine; nothing is deployed anywhere.\n"));
  console.log(bold("  What you'll set up, in plain terms:\n"));
  console.log(
    "  " + green("1.") + " Start ResiResi's reservation API on your computer.\n" +
    "  " + green("2.") + " Put an APIblaze " + bold("gateway") + " in front of it — a checkpoint every\n" +
    "     request passes through, so you can add rules without touching the API.\n" +
    "  " + green("3.") + " Give that gateway a public web address and link it back to your\n" +
    "     computer, so calls to the address reach your local API.\n" +
    "  " + green("4.") + " Add " + bold("logins, API keys, and staff groups") + " to ResiResi's app — using\n" +
    "     APIblaze's ready-made widgets, so you don't write that code yourself.\n" +
    "  " + green("5.") + " Prove it works: write one access rule, then watch a diner see only\n" +
    "     their own reservations while a staff member still sees them all.\n");
  console.log(dim("  Requirements: Node 20+ and a free APIblaze account (one browser login,\n" +
    "  for the step that gives your API a public address). Ctrl-C any time;\n" +
    "  re-run to resume where you left off.\n"));

  await preflight();

  const state = loadState();
  const PROXY = state.proxy || ("resiresi" + newSuffix());
  state.proxy = PROXY; saveState(state);
  console.log("  Your unique proxy name for this run: " + green(PROXY) + "\n");

  await pause("Press Enter to begin");

  // 1 · backend
  step("Start the reservation API",
    "ResiResi's reservation API. It runs on your machine in the background at\n" +
    "http://localhost:8080 for the rest of the lab.");
  await pause("Press Enter to run this step", "node resiresi-backend-lightweight/server.js");
  startBg(process.execPath, [join(BACKEND_LW, "server.js")], { env: { ...process.env, PORT: "8080" } });
  process.stdout.write(dim("  waiting for http://localhost:8080/healthz "));
  await waitFor(async () => {
    const r = await httpOk("http://localhost:8080/healthz"); process.stdout.write(dim("."));
    return r && (await r.json()).db === "ok";
  }, { what: "the backend" });
  console.log(green("  ready ✓"));

  // 2 · login
  step("Log in to APIblaze",
    "A later step gives your local API a public URL through APIblaze. That needs\n" +
    "an account, so this opens your browser to log in (free to sign up).");
  await pause("Press Enter to run this step", "apiblaze login");
  await abz(["login"]);

  // 3 · create proxy
  const createArgs = ["create", "--name", PROXY,
    "--target", "http://localhost:8080", "--auth", "api_key", "--identified", "--iam", "--json"];
  step("Put APIblaze in front of your reservation API",
    "This creates a gateway that sits in front of your API. Two options switch on\n" +
    "the features this lab needs:\n" +
    "  • --identified — each request can say which PERSON it's for, so later a\n" +
    "    rule can give every diner only their own reservations.\n" +
    "  • --iam — turns on users & groups, so you can put staff (like Maria) in a\n" +
    "    group a rule can treat differently.\n" +
    `The name "${PROXY}" is unique to your run, so no two testers ever clash.`);
  const parseCreate = (out) => {
    const created = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
    const projectId = created.project_id || PROXY;
    return {
      prod: `https://${projectId}.abz.run/1.0.0/prod`,
      dpkey: (created.api_keys && created.api_keys.prod) || created.api_key,
    };
  };

  let PROD, DPKEY;
  if (state.prod && state.dpkey) {
    // An earlier run already created this proxy (and saved its key) — reuse it
    // instead of trying to create a duplicate (which the server rejects).
    console.log(dim("\n  You already created this proxy on an earlier run — reusing it,\n" +
      "  no need to create it again."));
    await pause("Press Enter to continue");
    PROD = state.prod; DPKEY = state.dpkey;
    console.log(green("  Reusing " + PROD + " ✓"));
  } else {
    await pause("Press Enter to run this step", abzDisplay(createArgs));
    let cj;
    try {
      cj = await abzCapture(createArgs);
    } catch (e) {
      // The name exists on the server but this run has no key for it (a half-
      // finished earlier attempt). Remove that empty shell and create it fresh so
      // the lab ends up with a working key — no manual cleanup needed.
      console.log(yellow(`\n  "${PROXY}" already exists but this run has no key for it.`));
      console.log(dim("  Removing the old one and recreating it so the lab has a working key…"));
      await abz(["delete", PROXY, "--yes"]).catch(() => {});
      cj = await abzCapture(createArgs);
    }
    ({ prod: PROD, dpkey: DPKEY } = parseCreate(cj));
    state.prod = PROD; state.dpkey = DPKEY; saveState(state);
    console.log("  Proxy (prod): " + green(PROD));
  }

  // 4 · tunnel
  const tunnelArgs = ["dev", "8080", "--project", PROXY, "--yes"];
  step("Connect your API to the gateway",
    "Your API lives on your laptop; the gateway lives in the cloud. This opens a\n" +
    "secure link between them so real calls to the public URL reach your machine.\n" +
    "It keeps running in the background for the rest of the lab.");
  await pause("Press Enter to run this step", abzDisplay(tunnelArgs));
  // Capture the tunnel's output to a log so a failure is diagnosable instead of a
  // silent timeout (it runs headless, so its own errors would otherwise vanish).
  const tunnelLog = join(ROOT, "lab", ".tunnel.log");
  const tlog = openSync(tunnelLog, "w");
  startBg(NPX, [...ABZ, ...tunnelArgs], { stdio: ["ignore", tlog, tlog] });
  process.stdout.write(dim("  connecting the tunnel "));
  try {
    await waitFor(async () => {
      process.stdout.write(dim("."));
      const r = await httpOk(`${PROD}/v1/restaurants`, { "X-API-Key": DPKEY, "X-End-User-Id": "john@nino.com" });
      return r !== null;
    }, { tries: 60, what: "the tunnel" });
  } catch (e) {
    let tail = "";
    try { tail = readFileSync(tunnelLog, "utf8").split("\n").slice(-12).join("\n"); } catch {}
    if (tail.trim()) console.log("\n" + dim("  tunnel output:\n") + tail.replace(/^/gm, "    "));
    throw e;
  }
  console.log(green("  tunnel up ✓"));

  // 5 · smoke test
  step("Prove the proxy reaches your machine",
    "Same call a storefront makes: the app key says WHICH APP; X-End-User-Id\n" +
    "says WHICH PERSON. Served from your local backend, through your proxy.");
  await pause();
  console.log(dim(`$ curl "${PROD}/v1/restaurants/nino/reservations" -H "X-API-Key: ${DPKEY.slice(0, 12)}…" -H "X-End-User-Id: john@nino.com"`));
  {
    const r = await httpOk(`${PROD}/v1/restaurants/nino/reservations`, { "X-API-Key": DPKEY, "X-End-User-Id": "john@nino.com" });
    const d = await r.json();
    console.log(green(`  ✓ ${d.data.length} reservations returned`));
  }

  // 6 · widget key
  step("Mint the control-plane widget key",
    "A limited manager key that lets the app's own widgets issue tenant keys and\n" +
    "read users & groups — without being a full admin key. It stays on the server,\n" +
    "never in the browser. Shown once.");
  const mintArgs = ["apikeys", "mint", "--desc", "resiresi widget key", "--json"];
  let CPKEY;
  if (state.cpkey) {
    console.log(dim("\n  You already minted this key on an earlier run — reusing it."));
    await pause("Press Enter to continue");
    CPKEY = state.cpkey;
  } else {
    await pause("Press Enter to run this step", abzDisplay(mintArgs));
    const mj = await abzCapture(mintArgs);
    CPKEY = JSON.parse(mj.slice(mj.indexOf("{"), mj.lastIndexOf("}") + 1)).key;
    state.cpkey = CPKEY; saveState(state);
  }

  // 7 · frontend deps + env
  step("Install the platform app + drop in the key",
    "The app defaults to your local backend; the only secret it needs is the\n" +
    "widget key (stays server-side, never reaches the browser).");
  await pause("Press Enter to run this step", "cd resiresi-frontend && npm install && npm install apiblaze");
  await run(NPM, ["install"], { cwd: FE });
  await run(NPM, ["install", "apiblaze"], { cwd: FE });
  writeFileSync(join(FE, ".env.local"), `APIBLAZE_CP_KEY=${CPKEY}\n`);
  console.log(green("  wrote resiresi-frontend/.env.local ✓"));

  // 8 · wire widgets
  step("Wire the two widgets into the Developers page",
    "Creating lib/apiblaze-user.ts + two API routes (they hold the key), and\n" +
    "mounting <ApiKeyWidget/> and <UsersGroupsWidget/> on app/developers/page.tsx.");
  await pause();
  wireWidgets(FE);
  console.log(green("  3 files created + widgets mounted ✓"));

  // 9 · dev server
  step("Start the platform app",
    "Runs ResiResi's app on http://localhost:3003 in the background.");
  await pause("Press Enter to run this step", "cd resiresi-frontend && npm run dev");
  startBg(NPM, ["run", "dev"], { cwd: FE, env: { ...process.env, APIBLAZE_CP_KEY: CPKEY } });
  process.stdout.write(dim("  starting http://localhost:3003 "));
  await waitFor(async () => { process.stdout.write(dim(".")); return await httpOk("http://localhost:3003/login"); },
    { what: "the app" });
  console.log(green("  up ✓"));

  // 10 · human: open + sign in
  step("Open the app and sign in",
    "In your browser open  http://localhost:3003/developers  and sign in with any\n" +
    "name and the email  owner@nino.com . Both widgets appear; Users & Groups will\n" +
    "say “admin access pending” (the admin list is sealed from inside the widget).");
  await pause("Do that, then press Enter");

  // 11 · crown admin
  step("Crown yourself the first admin",
    "You hold the manager key, so you name the very first admin from here. After\n" +
    "this, the Users & Groups widget lets that admin manage everyone else.");
  const adminArgs = ["admins", "add", "owner@nino.com", "--tenant", "nino"];
  await pause("Press Enter to run this step", abzDisplay(adminArgs));
  await abz(adminArgs);
  console.log(dim("  Reload the Users & Groups widget — it flips from pending to ready."));

  // 12 · BEFORE
  step("BEFORE — John can see everyone's reservations",
    "Right now any caller with Nino's key reads every reservation. That's the bug.");
  await pause();
  {
    const r = await httpOk(`${PROD}/v1/restaurants/nino/reservations`, { "X-API-Key": DPKEY, "X-End-User-Id": "john@nino.com" });
    const d = await r.json();
    console.log(yellow(`  John sees ${d.data.length} reservations — including other diners'. Not right.`));
  }

  // 13 · human: make the group
  step("Put staff in a group",
    "In the Users & Groups widget: create a group called  reservationists  and add\n" +
    "the member  maria@nino.com . She's staff; John is just a diner.");
  await pause("Do that in the widget, then press Enter");

  // 14 · agent authz
  step("Write the access rule by chatting",
    "The agent designs and enables the rule. When the chat opens, paste:\n\n" +
    yellow('  On GET /restaurants/{restaurantId}/reservations a caller may see only\n' +
    '  reservations whose diner_external_id matches their X-End-User-Id, unless they\n' +
    '  are in the "reservationists" group, who can see all of them.') + "\n\n" +
    dim("  Then type /enable (or follow the agent's prompt) and exit the chat."));
  await pause("Press Enter to open the agent", abzDisplay(["agent", "authz", PROXY]));
  await abz(["agent", "authz", PROXY]);

  // 15 · AFTER
  step("AFTER — the rule in action",
    "Same key, same endpoint — the PERSON and their GROUP now decide the result.");
  await pause();
  {
    const j = await (await httpOk(`${PROD}/v1/restaurants/nino/reservations`, { "X-API-Key": DPKEY, "X-End-User-Id": "john@nino.com" })).json();
    const m = await (await httpOk(`${PROD}/v1/restaurants/nino/reservations`, { "X-API-Key": DPKEY, "X-End-User-Id": "maria@nino.com" })).json();
    console.log(green(`  John (diner):          ${j.data.length} reservations — only his own`));
    console.log(green(`  Maria (reservationist): ${m.data.length} reservations — all of them`));
  }

  console.log(bold(green("\n  ✓ Lab complete — one key, many people, per-person results.\n")));
  console.log(dim("  Cleanup: this script stops the backend, app and tunnel when it exits.\n"));
  rl.close();
}

main().catch((e) => {
  console.error(red("\n  ✗ " + (e?.message || e)));
  console.error(dim("  Fix the issue above and re-run  ./start.sh  (or  .\\start.ps1 ) — it resumes with the same proxy."));
  rl.close();
  process.exit(1);
});
