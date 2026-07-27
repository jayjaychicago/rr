/**
 * The ResiResi × APIblaze lab — the step ENGINE, UI-agnostic.
 *
 * One sequence, two drivers:
 *   - lab/run.mjs        → terminal adapter (./start.sh) — readline + ANSI
 *   - lab/web/server.mjs → browser adapter (./launch.sh) — SSE + three panes
 *
 * The adapter passes an `io` object; every piece of user-facing copy lives HERE
 * (single source of truth) and is styled through io.s.{bold,green,yellow,dim,cyan}
 * so the terminal gets ANSI and the web gets safe HTML spans.
 *
 * io contract:
 *   s: { bold, green, yellow, dim, cyan, red }        // string -> styled string
 *   print(text)                                       // one styled block/line
 *   step(title, explain)                              // new step card/banner
 *   pause(msg, cmd?) -> Promise<void>                 // Enter / Run button
 *   ask(prompt, def?) -> Promise<string>              // free text (web: input)
 *   choice(prompt, options, defKey) -> Promise<key>   // options: [{key,label}]
 *   run(cmd, args, opts?) -> Promise<void>            // streamed, throws on !=0
 *   capture(cmd, args, opts?) -> Promise<string>      // streamed + returned
 *   startBg(cmd, args, opts?) -> child                // background process
 *   progress(label) -> { tick(), end(text?) }         // waiting dots
 *   reservations(rows, highlight?)                    // pretty table
 *   pane(evt)                                         // web choreography; terminal no-op
 *   stateChip(key, value)                             // web header chips; terminal no-op
 *
 * opts: { panes?: boolean }  — panes=true adds the Nino-storefront moments
 * (browser lab); false keeps ./start.sh byte-identical to the pre-refactor lab.
 */
import { writeFileSync, readFileSync, openSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { wireWidgets } from "./wire.mjs";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FE = join(ROOT, "resiresi-frontend");
export const NINO = join(ROOT, "nino");
export const BACKEND_LW = join(ROOT, "resiresi-backend-lightweight");
export const isWin = process.platform === "win32";
export const NPX = isWin ? "npx.cmd" : "npx";
export const NPM = isWin ? "npm.cmd" : "npm";

// Every APIblaze call goes through npx with --yes, so npx fetches the CLI once
// (first use) WITHOUT its interactive "Ok to proceed?" prompt, then reuses it.
// Pinned to an exact version (not @latest) so npx installs it ONCE and then runs
// straight from cache on every later call — no per-command registry round-trip,
// no repeated prompts, and the lab always runs the version it was written for.
export const ABZ = ["--yes", "apiblaze@0.19.15"];

// Pre-publish escape hatch: APIBLAZE_LAB_CLI=/path/to/dist/index.js runs a
// local CLI build instead of the npx-pinned release (used to verify the lab
// before the pinned version hits npm). Normal users never set this.
const LOCAL_CLI = process.env.APIBLAZE_LAB_CLI;
export const CLI = LOCAL_CLI
  ? { cmd: process.execPath, pre: [LOCAL_CLI] }
  : { cmd: NPX, pre: ABZ };

// ── lab state (so the same suffix is reused across a run) ────────────────────
const STATE = join(ROOT, "lab", ".state.json");
export function loadState() { try { return JSON.parse(readFileSync(STATE, "utf8")); } catch { return {}; } }
export function saveState(s) { writeFileSync(STATE, JSON.stringify(s, null, 2)); }

function newSuffix() {
  const alph = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = ""; for (let i = 0; i < 4; i++) s += alph[Math.floor(Math.random() * alph.length)];
  return s;
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

const fmtWhen = (iso) => {
  try {
    return new Date(iso).toLocaleString("en-US",
      { weekday: "short", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return iso || "—"; }
};

/** Normalize reservation rows for io.reservations. */
export function reservationRows(rows) {
  return (rows ?? []).map((r) => ({
    when: fmtWhen(r.starts_at),
    status: String(r.status || ""),
    party: String(r.party_size ?? "?"),
    who: r.diner_name || r.diner_external_id || "—",
    email: r.diner_external_id || r.diner_email || "",
  }));
}

// ── the lab ──────────────────────────────────────────────────────────────────
export async function runLab(io, opts = {}) {
  const { s } = io;
  const { bold, green, yellow, dim, cyan } = s;
  const panes = !!opts.panes;

  const abz = (args, o) => io.run(CLI.cmd, [...CLI.pre, ...args], o);
  const abzCapture = (args, o) => io.capture(CLI.cmd, [...CLI.pre, ...args], o);
  // Friendly display form of an APIblaze invocation: the real `npx apiblaze …`
  // command the user would type, minus only the machine-only --json flag.
  const abzDisplay = (args) => "npx apiblaze " + args.filter((a) => a !== "--json").join(" ");

  io.print(bold("\n  ResiResi × APIblaze — guided lab\n"));
  io.print(dim("  You are ResiResi, a reservation platform with two restaurant tenants,\n" +
    "  Nino's and Gino's. Your backend has no access control of its own —\n" +
    "  today anyone with the address can read everyone's reservations. This lab\n" +
    "  fixes that by putting APIblaze in front of it. Everything runs on this\n" +
    "  machine; nothing is deployed anywhere.\n"));
  io.print(bold("  What you'll set up, in plain terms:\n"));
  io.print(
    "  " + green("1.") + " Start ResiResi's local backend on your computer.\n" +
    "  " + green("2.") + " Put an APIblaze " + bold("gateway") + " in front of it — a checkpoint every\n" +
    "     request passes through, so you can add rules without touching the API.\n" +
    "  " + green("3.") + " Give that gateway a public web address and link it back to your\n" +
    "     computer, so calls to the address reach your local backend.\n" +
    "  " + green("4.") + " Add " + bold("logins, API keys, and staff groups") + " to ResiResi's app — using\n" +
    "     APIblaze's ready-made widgets, so you don't write that code yourself.\n" +
    "  " + green("5.") + " Prove it works: John could open Maria's reservation before — after the\n" +
    "     rules, he can't (but his own still works, and staff see everything).\n");
  io.print(dim("  Requirements: Node 20+ and a free APIblaze account (one browser login,\n" +
    "  for the step that gives your API a public address). Ctrl-C any time;\n" +
    "  re-run to resume where you left off.\n"));

  let state = loadState();
  // Checkpoints: every completed non-infra step is recorded, so a crash mid-lab
  // resumes where it left off (infra — backend/tunnel/app — always restarts:
  // those processes die with the lab). "Fresh" wipes local progress and mints a
  // new proxy name; the old proxy stays on your account (delete it with
  // `npx apiblaze delete <name> --yes` if you want it gone).
  const markDone = (k) => { state.done = state.done || {}; state.done[k] = true; saveState(state); };
  const isDone = (k) => !!(state.done && state.done[k]);
  const skipNote = () => io.print(green("  ✓ already completed on a previous run — skipping"));

  // The resume decision comes FIRST — before any step runs, so a returning user
  // never replays even the tool check just to reach it.
  let resuming = false;
  if (state.proxy && (state.base || (state.done && Object.keys(state.done).length))) {
    io.print(dim(`  Found progress from an earlier run (proxy ${state.proxy}).`));
    const a = await io.choice(`resume it, or start fresh?`,
      [{ key: "r", label: "Resume" }, { key: "f", label: "Fresh" }], "r");
    if (String(a).toLowerCase().startsWith("f")) { state = {}; saveState(state); io.print(dim("  Starting fresh.\n")); }
    else { resuming = true; io.print(dim("  Resuming — finished steps will be skipped.\n")); }
  }

  if (resuming && isDone("preflight")) {
    // CLI already fetched on the prior run; skip the whole tool-check step.
  } else {
    io.step("Check your tools", "This lab needs Node 20+ and npx (both ship with Node.js).");
    await io.pause();
    const major = Number(process.versions.node.split(".")[0]);
    if (major < 20) throw new Error(`Node 20+ required — you have ${process.versions.node}. https://nodejs.org`);
    io.print(green(`  Node ${process.versions.node} · npx ✓`));
    io.print(dim("  Fetching the APIblaze CLI via npx (first time only)…"));
    await io.run(CLI.cmd, [...CLI.pre, "--version"]);
    io.print(green("  APIblaze CLI ready ✓"));
    markDone("preflight");
  }

  const PROXY = state.proxy || ("resiresi" + newSuffix());
  state.proxy = PROXY; saveState(state);
  io.print("  Your unique proxy name for this run: " + green(PROXY) + "\n");
  io.stateChip("proxy", PROXY);

  await io.pause("Press Enter to begin");

  // 1 · backend
  io.step("Start ResiResi's local backend",
    "The server that stores and serves the reservations. It runs on your machine\n" +
    "in the background at http://localhost:8080 for the rest of the lab.");
  await io.pause("Press Enter to run this step", "node resiresi-backend-lightweight/server.js");
  io.startBg(process.execPath, [join(BACKEND_LW, "server.js")], { env: { ...process.env, PORT: "8080" } });
  {
    const p = io.progress("  waiting for http://localhost:8080/healthz ");
    await waitFor(async () => {
      const r = await httpOk("http://localhost:8080/healthz"); p.tick();
      return r && (await r.json()).db === "ok";
    }, { what: "the backend" });
    p.end(green("  ready ✓"));
  }

  // 2 · login
  io.step("Log in to APIblaze",
    "A later step gives your local backend a public URL through APIblaze. That needs\n" +
    "an account, so this opens your browser to log in (free to sign up).");
  if (isDone("login")) {
    skipNote();
    io.print(dim("  (if the session expired, run  npx apiblaze login  yourself and re-run)"));
  } else {
    await io.pause("Press Enter to run this step", "apiblaze login");
    await abz(["login", ...(panes ? ["--team", "default"] : [])]);
    markDone("login");
  }

  // 3 · create proxy FROM the OpenAPI spec — one step gives the gateway the
  // routes, the version, and the localhost targets (from the spec's `servers`).
  // Tenant slug: "nino" + this run's unique suffix — tenant names are GLOBALLY
  // unique across all of APIblaze, so a fixed "nino" would collide with anyone
  // (including your own earlier runs).
  const TENANT_REQ = "nino" + PROXY.slice("resiresi".length);
  const createArgs = ["create", "--name", PROXY,
    "--openapi", "resiresi-backend-lightweight/openapi.yaml",
    "--tenant", TENANT_REQ,
    "--auth", "api_key", "--identified", "--iam", "--json"];
  io.step("Create the APIblaze proxy from the resiresi OpenAPI spec",
    `This creates the APIblaze proxy  ${bold(PROXY + ".abz.run")}  — the public\n` +
    "address that will tunnel into your local backend. It's created FROM the\n" +
    "resiresi OpenAPI spec, so the gateway knows the routes from day one (the\n" +
    "AI agents use them later). Two options switch on this lab's features:\n" +
    "  • --identified — each request can say which PERSON it's for, so later a\n" +
    "    rule can give every diner only their own reservations.\n" +
    "  • --iam — turns on users & groups, so you can put staff (like Maria) in a\n" +
    "    group a rule can treat differently.\n" +
    `("${PROXY}" is unique to your run, so no two testers ever clash.)`);
  const parseCreate = (out) => {
    const created = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
    const projectId = created.project_id || PROXY;
    return {
      // The whole lab drives the DEV environment: that's where the gateway
      // captures traffic samples, so every call you see also feeds the AI agents.
      base: `https://${projectId}.abz.run/1.0.0/dev`,
      dpkey: (created.api_keys && created.api_keys.dev) || created.api_key,
      tenant: created.tenant || TENANT_REQ,
    };
  };

  let BASE, DPKEY, TENANT;
  if (state.base && state.dpkey) {
    // An earlier run already created this proxy (and saved its key) — reuse it
    // instead of trying to create a duplicate (which the server rejects).
    io.print(dim("\n  You already created this proxy on an earlier run — reusing it,\n" +
      "  no need to create it again."));
    await io.pause("Press Enter to continue");
    BASE = state.base; DPKEY = state.dpkey; TENANT = state.tenant || TENANT_REQ;
    io.print(green("  Reusing " + BASE + " ✓"));
  } else {
    await io.pause("Press Enter to run this step", abzDisplay(createArgs));
    let cj;
    try {
      cj = await abzCapture(createArgs, { cwd: ROOT });
    } catch (e) {
      // The name exists on the server but this run has no key for it (a half-
      // finished earlier attempt). Remove that empty shell and create it fresh so
      // the lab ends up with a working key — no manual cleanup needed.
      io.print(yellow(`\n  "${PROXY}" already exists but this run has no key for it.`));
      io.print(dim("  Removing the old one and recreating it so the lab has a working key…"));
      await abz(["delete", PROXY, "--yes"]).catch(() => {});
      cj = await abzCapture(createArgs, { cwd: ROOT });
    }
    const parsed = parseCreate(cj);
    BASE = parsed.base; DPKEY = parsed.dpkey; TENANT = parsed.tenant;
    state.base = BASE; state.dpkey = DPKEY; state.tenant = TENANT; saveState(state);
    io.print("  Proxy (dev): " + green(BASE) + dim("  tenant: ") + green(TENANT));
  }
  io.stateChip("proxy URL", BASE);
  io.stateChip("tenant", TENANT);

  // 4 · tunnel
  const tunnelArgs = ["dev", "8080", "--project", PROXY];
  io.step("Connect your API to the gateway",
    "Your backend lives on your laptop; the gateway lives in the cloud. This opens a\n" +
    "secure link between them so real calls to the public URL reach your machine.\n" +
    "It keeps running in the background for the rest of the lab.");
  await io.pause("Press Enter to run this step", abzDisplay(tunnelArgs));
  // Capture the tunnel's output to a log so a failure is diagnosable instead of a
  // silent timeout (it runs headless, so its own errors would otherwise vanish).
  const tunnelLog = join(ROOT, "lab", ".tunnel.log");
  // Reachability probe: /v1/restaurants is unprotected, so any JSON answer
  // means gateway→tunnel→backend is alive; 502/503 tunnel errors mean it isn't.
  const tunnelAlive = async () => {
    try {
      const r = await fetch(`${BASE}/v1/restaurants`, { headers: { "X-API-Key": DPKEY, "X-End-User-Id": "john@nino.com" } });
      return r.ok;
    } catch { return false; }
  };
  const startTunnel = async () => {
    const tlog = openSync(tunnelLog, "w");
    io.startBg(CLI.cmd, [...CLI.pre, ...tunnelArgs], { stdio: ["ignore", tlog, tlog] });
    const p = io.progress("  connecting the tunnel ");
    try {
      await waitFor(async () => { p.tick(); return await tunnelAlive(); }, { tries: 60, what: "the tunnel" });
    } catch (e) {
      let tail = "";
      try { tail = readFileSync(tunnelLog, "utf8").split("\n").slice(-12).join("\n"); } catch {}
      if (tail.trim()) io.print("\n" + dim("  tunnel output:\n") + tail.replace(/^/gm, "    "));
      throw e;
    }
    p.end(green("  tunnel up ✓"));
  };
  // Self-heal: the tunnel is a background child — if it dies mid-lab (laptop
  // sleep, crash), later steps would hit "Dev tunnel offline". Probe + restart.
  const ensureTunnel = async () => {
    if (await tunnelAlive()) return;
    io.print(yellow("  The tunnel dropped — reconnecting…"));
    await startTunnel();
  };
  await startTunnel();

  // 5 · smoke test
  const smokeCurl =
    `curl "${BASE}/v1/restaurants/nino/reservations" \\\n` +
    `  -H "X-API-Key: ${DPKEY}" \\\n` +
    `  -H "X-End-User-Id: john@nino.com"`;
  io.step("Prove the proxy reaches your machine",
    "This is the exact call a storefront makes: the API key says WHICH APP;\n" +
    "X-End-User-Id says WHICH PERSON. It hits the public proxy URL, which the\n" +
    "tunnel forwards to the backend on your machine. Copy-paste it yourself too —\n" +
    "it's a real, runnable request.");
  await io.pause("Press Enter to run this step", smokeCurl);
  {
    const r = await httpOk(`${BASE}/v1/restaurants/nino/reservations`, { "X-API-Key": DPKEY, "X-End-User-Id": "john@nino.com" });
    const d = await r.json();
    io.print(green(`  ✓ ${d.data.length} reservations returned:`));
    io.reservations(reservationRows(d.data));
  }

  // One keyless call too — a DENIED sample. The gateway captures all of this
  // dev-environment traffic, so the authorization agent later reasons from
  // real allowed AND denied requests.
  await fetch(`${BASE}/v1/restaurants/nino/reservations`).catch(() => {});
  io.print(dim("  (these dev calls double as the sample traffic the AI agents learn from)"));

  // 6 · widget key
  io.step("Mint the key that powers ResiResi's Developers page",
    "The API side is done and proven. Next up: ResiResi's WEBSITE — its\n" +
    "Developers section, where restaurant tenants like Nino's and Gino's do\n" +
    "admin things themselves: get API keys for their apps, and organize their\n" +
    "users into groups.\n\n" +
    "For the website's backend to perform those admin actions, it needs its own\n" +
    "key — a limited one that can ONLY do those admin actions (issue keys, manage\n" +
    "users & groups), not a full-control key. This mints it. It stays on the\n" +
    "server, never in the browser, and is shown once.");
  const mintArgs = ["apikeys", "mint", "--desc", "resiresi widget key", "--json"];
  let CPKEY;
  if (state.cpkey) {
    io.print(dim("\n  You already minted this key on an earlier run — reusing it."));
    await io.pause("Press Enter to continue");
    CPKEY = state.cpkey;
  } else {
    await io.pause("Press Enter to run this step", abzDisplay(mintArgs));
    const mj = await abzCapture(mintArgs);
    CPKEY = JSON.parse(mj.slice(mj.indexOf("{"), mj.lastIndexOf("}") + 1)).key;
    state.cpkey = CPKEY; saveState(state);
  }

  // 7 · frontend deps + env
  io.step("Install ResiResi's web app + drop in the key",
    "ResiResi's website (a normal Next.js app in this repo) has a Developers\n" +
    "section where Nino's and Gino's software engineers SELF-SERVE: they get the\n" +
    "API keys their own restaurant websites use to make reservations, and manage\n" +
    "their users & groups. We install the app, plus the apiblaze package for its\n" +
    "widgets, and give it the widget key (stays on the server, never in the browser).");
  if (isDone("install")) {
    skipNote();
    writeFileSync(join(FE, ".env.local"), `APIBLAZE_CP_KEY=${CPKEY}\n`);
  } else {
    await io.pause("Press Enter to run this step", "cd resiresi-frontend && npm install && npm install apiblaze");
    await io.run(NPM, ["install"], { cwd: FE });
    await io.run(NPM, ["install", "apiblaze"], { cwd: FE });
    writeFileSync(join(FE, ".env.local"), `APIBLAZE_CP_KEY=${CPKEY}\n`);
    io.print(green("  wrote resiresi-frontend/.env.local ✓"));
    markDone("install");
  }

  // 8 · wire widgets
  io.step("Add the two widgets to ResiResi's Developers page",
    "This edits only files inside rr/resiresi-frontend/ — nothing elsewhere on\n" +
    "your computer. It creates:\n" +
    "  • rr/resiresi-frontend/lib/apiblaze-user.ts\n" +
    "  • rr/resiresi-frontend/app/api/apiblaze/keys/route.ts\n" +
    "  • rr/resiresi-frontend/app/api/apiblaze/groups/route.ts\n" +
    "(the two routes keep the widget key on the server), then mounts the API-key\n" +
    "and Users & Groups widgets in rr/resiresi-frontend/app/developers/page.tsx.");
  if (isDone("wire2")) {
    skipNote();
  } else {
    await io.pause("Press Enter to run this step");
    wireWidgets(FE, PROXY.slice("resiresi".length));
    io.print(green("  3 files created + widgets mounted ✓"));
    markDone("wire2");
  }

  // 9 · dev server
  io.step("Start ResiResi's web app",
    "Runs ResiResi's website on http://localhost:3003 in the background.");
  await io.pause("Press Enter to run this step", "cd resiresi-frontend && npm run dev");
  io.startBg(NPM, ["run", "dev"], { cwd: FE, env: { ...process.env, APIBLAZE_CP_KEY: CPKEY } });
  {
    const p = io.progress("  starting http://localhost:3003 ");
    await waitFor(async () => { p.tick(); return await httpOk("http://localhost:3003/login"); },
      { what: "the app" });
    p.end(green("  up ✓"));
  }
  io.pane({ type: "mount", pane: "resiresi", url: "http://localhost:3003/developers", note: "ResiResi's Developers page — the two widgets are live here." });

  // 10 · crown the admin, then sign in as them (one step — the admin is named
  // BEFORE the first sign-in, so the widget is ready the moment they land).
  io.step("Make yourself the admin and sign in",
    "ResiResi's app needs a first admin — the person who manages users & groups.\n" +
    "You hold the manager key, so you name that admin here, then sign in as them.\n" +
    "Pick the email (the default is fine; sign in with the SAME one).");
  const defaultEmail = state.ownerEmail || "owner@nino.com";
  const answer = (await io.ask("Admin and Email you'll sign in as", defaultEmail)).trim();
  const OWNER = answer || defaultEmail;
  state.ownerEmail = OWNER; saveState(state);
  const adminArgs = ["admins", "add", OWNER, "--tenant", TENANT];
  if (isDone("admin:" + OWNER)) {
    skipNote();
  } else {
    await io.pause("Press Enter to run this step", abzDisplay(adminArgs));
    await abz(adminArgs);
    markDone("admin:" + OWNER);
  }
  io.print(dim(`\n  Done — now open  http://localhost:3003/developers  and sign in with any\n` +
    `  name and the email  ${OWNER} . Both widgets appear, ready to use.`));
  io.pane({ type: "banner", pane: "resiresi", note: `Sign in here with any name and the email ${OWNER} — both widgets appear, ready to use.`, copy: OWNER, url: "http://localhost:3003/developers" });
  await io.pause("Signed in? Press Enter");

  // 12 · BEFORE — John opens MARIA'S reservation by id. The lab first finds
  // one of Maria's seeded reservations (as Maria, so this fetch works before
  // AND after the rules land).
  const listUrl = `${BASE}/v1/restaurants/nino/reservations`;
  if (!state.mariaResi) {
    const lr = await fetch(listUrl, { headers: { "X-API-Key": DPKEY, "X-End-User-Id": "maria@nino.com" } });
    const ld = await lr.json().catch(() => null);
    const mrow = ld && Array.isArray(ld.data) ? ld.data.find((x) => x.diner_external_id === "maria@nino.com") : null;
    if (mrow) { state.mariaResi = mrow.id; saveState(state); }
  }
  const MARIA_RESI = state.mariaResi;
  const curlOne = (who, id) =>
    `curl "${BASE}/v1/restaurants/nino/reservations/${id}" \\\n` +
    `  -H "X-API-Key: ${DPKEY}" \\\n` +
    `  -H "X-End-User-Id: ${who}"`;

  // Browser lab: stand up Nino's real storefront, pointed at the PROXY — so the
  // BEFORE/AFTER beats are visible in a real UI, not just curls.
  if (panes) {
    io.step("Start Nino's Pizza — a real storefront on the proxy",
      "Nino's website is a separate app in this repo (rr/nino). It calls the\n" +
      "reservation API exactly like a customer-facing site would: through YOUR\n" +
      "proxy, with the app's key and the signed-in diner as X-End-User-Id.");
    await io.pause("Press Enter to run this step", "cd nino && npm install && npm run dev");
    writeFileSync(join(NINO, ".env.local"),
      `RESIRESI_API_URL=${BASE}\nRESIRESI_API_KEY=${DPKEY}\nRESIRESI_RESTAURANT_ID=nino\n`);
    if (!isDone("nino-install")) {
      await io.run(NPM, ["install"], { cwd: NINO });
      markDone("nino-install");
    }
    io.startBg(NPM, ["run", "dev"], { cwd: NINO, env: { ...process.env } });
    {
      const p = io.progress("  starting http://localhost:3001 ");
      await waitFor(async () => { p.tick(); return await httpOk("http://localhost:3001/"); }, { what: "Nino's site" });
      p.end(green("  up ✓"));
    }
    io.pane({ type: "mount", pane: "nino", url: "http://localhost:3001/", note: "Nino's Pizza — every reservation call here goes through your proxy." });
  }

  await ensureTunnel();
  io.step("BEFORE — John can open MARIA'S reservation",
    "Maria has a reservation at Nino's. John is a different diner — but with the\n" +
    "app's key, nothing stops him from opening HER booking by its id:");
  if (panes && MARIA_RESI) {
    io.pane({ type: "banner", pane: "nino", note: "Sign in as john@nino.com (any name), then open Maria's reservation →",
      url: `http://localhost:3001/auth/signin?email=john@nino.com`,
      link: { label: "Maria's reservation", url: `http://localhost:3001/reservations/${MARIA_RESI}` } });
  }
  await io.pause("Press Enter to run this step", curlOne("john@nino.com", MARIA_RESI ?? "<maria's id>"));
  if (MARIA_RESI) {
    const r = await fetch(`${listUrl}/${MARIA_RESI}`, { headers: { "X-API-Key": DPKEY, "X-End-User-Id": "john@nino.com" } });
    const d = await r.json().catch(() => null);
    if (r.ok && d) {
      io.print(yellow(`  HTTP 200 — John just read Maria's reservation. Not right:`));
      io.reservations(reservationRows([d]), "maria@nino.com");
    } else {
      io.print(dim(`  HTTP ${r.status} (already blocked? you may be resuming after the rule).`));
    }
  } else {
    io.print(yellow("  Couldn't locate Maria's seeded reservation — continuing anyway."));
  }

  // 13 · make the group — user's choice: click it in the widget, or let the
  // lab run the equivalent CLI commands (same result either way).
  io.step("Put staff in a group",
    "Goal: a group called  " + bold("reservationists") + "  with  " + bold("maria@nino.com") + "  in it\n" +
    "(she's staff; John stays just a diner). Two ways to do it — pick one:\n\n" +
    "  " + bold("[w]idget") + "  — in Users & Groups: + New user → maria@nino.com,\n" +
    "              + New group → reservationists, then add maria as a member.\n" +
    "  " + bold("[t]erminal") + " — the lab runs these for you:\n" +
    green(`      npx apiblaze group create reservationists --admin ${OWNER} --tenant ${TENANT}\n` +
    `      npx apiblaze group add-user maria@nino.com reservationists --tenant ${TENANT}`));
  if (isDone("group")) {
    skipNote();
  } else {
    const how = await io.choice("type w for widget, or press Enter for terminal",
      [{ key: "w", label: "Widget" }, { key: "t", label: "Terminal" }], "t");
    if (String(how).toLowerCase().startsWith("w")) {
      io.pane({ type: "banner", pane: "resiresi", note: "In Users & Groups: + New user → maria@nino.com · + New group → reservationists · add maria as a member.", copy: "maria@nino.com" });
      await io.pause("Done in the widget? Press Enter");
    } else {
      await abz(["group", "create", "reservationists", "--admin", OWNER, "--tenant", TENANT]);
      await abz(["group", "add-user", "maria@nino.com", "reservationists", "--tenant", TENANT]);
      io.print(green("  reservationists ✓ (maria@nino.com is a member)"));
      io.print(dim("  Refresh the Users & Groups widget to see it there too."));
      io.pane({ type: "refresh", pane: "resiresi", note: "reservationists is now visible in Users & Groups." });
    }
    markDone("group");
  }

  // 14 · one-shot rule (plain English → enforced authorization)
  const RULE = 'Bookings belong to whoever makes them. A reservation may be opened by its owner or by members of the existing group "reservationists". The full reservations list is for "reservationists" only. Leave every other route open.';
  const ruleArgs = ["rule", RULE, PROXY, "--enforce"];
  io.step("Write the access rules — one command, plain English",
    "One sentence becomes enforced authorization: the AI designs the model and\n" +
    "rules from your routes and traffic, saves them, and turns enforcement on —\n" +
    "bookings remember WHO made them, a reservation opens only for its owner (or\n" +
    "staff), and the full list is staff-only.");
  if (isDone("authz")) {
    io.print(green("  ✓ the rules were already enabled on a previous run"));
    const again = await io.choice("press Enter to skip, or type r to re-run the rule",
      [{ key: "s", label: "Skip" }, { key: "r", label: "Re-run" }], "s");
    if (String(again).toLowerCase().startsWith("r")) await abz(ruleArgs);
  } else {
    await io.pause("Press Enter to run this step", `npx apiblaze rule "${RULE.replace(/"/g, '\\"')}" ${PROXY} --enforce`);
    await abz(ruleArgs);
    markDone("authz");
    io.print(dim("  (want to refine it later? chat interactively: npx apiblaze agent authz " + PROXY + ")"));
  }

  // 15 · AFTER — the full story in four calls.
  await ensureTunnel();
  io.step("AFTER — John books his own; Maria's is off-limits",
    "Same app key everywhere — the PERSON now decides the result:\n" +
    "  1. John books a table (the proxy records him as the owner).\n" +
    "  2. John opens HIS new reservation — works.\n" +
    "  3. John tries MARIA'S reservation — refused.\n" +
    "  4. Maria (staff) opens John's — works.");
  await io.pause("Press Enter to run this step",
    curlOne("john@nino.com", MARIA_RESI ?? "<maria's id>"));
  {
    const H = (who) => ({ "X-API-Key": DPKEY, "X-End-User-Id": who, "Content-Type": "application/json" });
    const outcome = (n, label, ok, detail) =>
      io.print((ok ? green : yellow)(`  ${n}. ${label} — ${detail}${ok ? " ✓" : ""}`));
    // Every beat shows its exact curl — copy-paste-able, nothing hidden.
    const curlGet = (who, id) =>
      `curl "${BASE}/v1/restaurants/nino/reservations/${id}" -H "X-API-Key: ${DPKEY}" -H "X-End-User-Id: ${who}"`;
    const showCurl = (c2) => io.print(dim("     $ " + c2));

    // 1 · John books
    showCurl(`curl -X POST "${BASE}/v1/restaurants/nino/reservations" -H "X-API-Key: ${DPKEY}" -H "X-End-User-Id: john@nino.com" -H "Content-Type: application/json" -d '{"diner_name":"John Diner","diner_external_id":"john@nino.com","party_size":2,"starts_at":"…"}'`);
    const br = await fetch(listUrl, { method: "POST", headers: H("john@nino.com"),
      body: JSON.stringify({ diner_name: "John Diner", diner_external_id: "john@nino.com",
        party_size: 2, starts_at: new Date(Date.now() + 86400000).toISOString() }) });
    const bd = await br.json().catch(() => null);
    const JOHN_RESI = bd?.id ?? null;
    outcome(1, "John books a table", br.status === 201, `HTTP ${br.status}${JOHN_RESI ? " · owner recorded by the proxy" : ""}`);

    // 2 · John reads his own
    if (JOHN_RESI) {
      showCurl(curlGet("john@nino.com", JOHN_RESI));
      const r2 = await fetch(`${listUrl}/${JOHN_RESI}`, { headers: H("john@nino.com") });
      outcome(2, "John opens HIS reservation", r2.ok, `HTTP ${r2.status}`);
    } else {
      io.print(yellow("  2. (skipped — booking failed above)"));
    }

    // 3 · John tries Maria's
    if (MARIA_RESI) {
      showCurl(curlGet("john@nino.com", MARIA_RESI));
      const r3 = await fetch(`${listUrl}/${MARIA_RESI}`, { headers: H("john@nino.com") });
      outcome(3, "John tries MARIA'S reservation", !r3.ok, `HTTP ${r3.status}${!r3.ok ? " · blocked" : " — expected a denial! (is Enforce Authorization on?)"}`);
    }

    // 4 · Maria (staff) reads John's
    if (JOHN_RESI) {
      showCurl(curlGet("maria@nino.com", JOHN_RESI));
      const r4 = await fetch(`${listUrl}/${JOHN_RESI}`, { headers: H("maria@nino.com") });
      outcome(4, "Maria (staff) opens John's", r4.ok, `HTTP ${r4.status}${r4.ok ? " · reservationists see everything" : " — expected 200: is maria in the group?"}`);
    }

    if (panes) {
      io.pane({ type: "banner", pane: "nino",
        note: "See it in the UI: as john@nino.com, Maria's reservation now shows “not yours”; John's own still opens. Switch to maria@nino.com — everything opens.",
        link: MARIA_RESI ? { label: "Maria's reservation (as John → blocked)", url: `http://localhost:3001/reservations/${MARIA_RESI}` } : undefined,
        link2: JOHN_RESI ? { label: "John's booking (his own → opens)", url: `http://localhost:3001/reservations/${JOHN_RESI}` } : undefined });
    }
  }

  io.print(bold(green("\n  ✓ Lab complete — one key, many people: owners see their own, staff see all.\n")));
  io.print(dim("  Cleanup: this script stops the backend, app and tunnel when it exits.\n"));
}
