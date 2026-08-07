/**
 * The ResiResi × APIblaze lab — the step ENGINE, UI-agnostic.
 *
 * One sequence, two drivers:
 *   - lab/run.mjs        → terminal adapter (./launch_terminal_only.sh) — readline + ANSI
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
 * (browser lab); false keeps ./launch_terminal_only.sh byte-identical to the pre-refactor lab.
 */
import { writeFileSync, readFileSync, openSync, existsSync } from "node:fs";
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

/** Resolve a spawn target that needs NO shell. On Windows, npm/npx are .cmd
 *  shims — spawning those requires shell:true (and Node 22+ warns that
 *  args-with-shell are concatenated, not escaped). npm ships inside the Node
 *  install, so we bypass the shims and run its JS entrypoints with node
 *  directly. Fallback: the shim + shell, for exotic Node layouts. */
export function spawnTarget(cmd, args) {
  if (!isWin) return { cmd, args, shell: false };
  const shim = cmd.toLowerCase();
  if (shim === "npx.cmd" || shim === "npm.cmd") {
    const cli = join(dirname(process.execPath), "node_modules", "npm", "bin",
      shim === "npx.cmd" ? "npx-cli.js" : "npm-cli.js");
    if (existsSync(cli)) return { cmd: process.execPath, args: [cli, ...args], shell: false };
  }
  // Not a shim we know (or npm isn't next to node.exe): .cmd needs a shell.
  return { cmd, args, shell: shim.endsWith(".cmd") || shim.endsWith(".bat") };
}

// Every APIblaze call goes through npx with --yes, so npx fetches the CLI once
// (first use) WITHOUT its interactive "Ok to proceed?" prompt, then reuses it.
// Pinned to an exact version (not @latest) so npx installs it ONCE and then runs
// straight from cache on every later call — no per-command registry round-trip,
// no repeated prompts, and the lab always runs the version it was written for.
export const ABZ = ["--yes", "apiblaze@0.19.16"];

// Pre-publish escape hatch: APIBLAZE_LAB_CLI=/path/to/dist/index.js runs a
// local CLI build instead of the npx-pinned release (used to verify the lab
// before the pinned version hits npm). Normal users never set this.
const LOCAL_CLI = process.env.APIBLAZE_LAB_CLI;
export const CLI = LOCAL_CLI
  ? { cmd: process.execPath, pre: [LOCAL_CLI] }
  : { cmd: NPX, pre: ABZ };

// Shell-quote ONE argv token for DISPLAY so the echoed "$ …" line is copy-pasteable.
// Without this, a free-text argument (e.g. the `rule` prompt: `rule Bookings belong
// to whoever… "reservationists"… --enforce`) is joined raw and the shell would split
// it into dozens of args and choke on the embedded quotes. Wrap anything that isn't a
// bare safe token in single quotes (escaping embedded single quotes the POSIX way).
export function shellQuote(a) {
  if (a === "") return "''";
  if (/^[A-Za-z0-9_@%+=:,.\/-]+$/.test(a)) return a; // bare token — no quotes needed
  return "'" + String(a).replace(/'/g, "'\\''") + "'";
}
/** Join an argv array into a copy-pasteable command line (each token shell-quoted). */
export function showArgv(parts) {
  return parts.map(shellQuote).join(" ");
}

// Turn the RAW spawn target (cmd + argv) into the clean command a user would paste.
// The lab SPAWNS the CLI as `npx.cmd --yes apiblaze@0.19.16 …` (Windows shim +
// auto-confirm install + pinned version) and, in dev, as `node …/dist/index.js …`.
// None of that belongs in the shown command — a user just types `npx apiblaze …`.
// So collapse both spawn shapes to `npx apiblaze <args>`, strip a `.cmd` shim off
// any other command, and shell-quote every token. What is shown is exactly what
// runs — including --json. Hiding that flag used to make the command in a step's
// pause differ from the one the lab actually ran, which in terminal mode would
// have asked you to run `create` a second time to get parseable output.
export function displayCommand(cmd, args) {
  const isNpx = /(^|[\\/])npx(\.cmd)?$/i.test(String(cmd));
  if (isNpx && args[0] === "--yes" && /^apiblaze@/.test(args[1] || "")) {
    return "npx apiblaze " + showArgv(args.slice(2));
  }
  // Dev escape hatch: `node /abs/.../index.js <rest>` → same friendly form.
  if (cmd === process.execPath && /index\.js$/i.test(args[0] || "")) {
    return "npx apiblaze " + showArgv(args.slice(1));
  }
  return showArgv([String(cmd).replace(/\.cmd$/i, ""), ...args]);
}

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

  // Interaction phrasing is the ONE place the two drivers legitimately differ:
  // the terminal says "Press Enter…", the browser has Run/Continue buttons.
  // Defaults are the terminal wording (so ./launch_terminal_only.sh output is unchanged);
  // the web adapter overrides via io.phrases. Step EXPLANATIONS stay shared.
  const P = {
    runStep: "Press Enter to run this step",
    begin: "Press Enter to begin",
    cont: "Press Enter to continue",
    widgetDone: "Done in the widget? Press Enter",
    groupHow: "type w for widget, or press Enter for terminal",
    rerunRule: "press Enter to skip, or type r to re-run the rule",
    widgetLabel: "[w]idget",
    terminalLabel: "[t]erminal",
    ...(io.phrases || {}),
  };

  // The cast. Everyone the lab acts as is fixed: there is exactly one owner, and
  // exactly two diners. Letting a tester invent an email only creates ways to
  // break the run (sign in before the admin grant exists, typo the address that
  // IS the diner's id) with nothing gained — every one of these names is already
  // written into the seeded data and the rules you'll author.
  const OWNER = "owner@nino.com";
  // NOT `NINO` — that name is already the nino/ DIRECTORY at module scope, and
  // shadowing it here broke writing the storefront's .env.local.
  const NINO_OWNER = { email: OWNER, name: "Nino" };
  // Bob is deliberately NOT made an admin. He is the second half of the
  // Developers-page lesson: any signed-in engineer can issue themselves a key,
  // but managing users and groups is the admin's alone — and the widget says so
  // itself rather than the lab having to claim it.
  const BOB = { email: "bob@nino.com", name: "Bob" };
  const JOHN = { email: "john@nino.com", name: "John" };
  const MARIA = { email: "maria@nino.com", name: "Maria" };
  // One click = signed in. Each app exposes a demo identity route that sets its
  // session cookie and lands on the page, so the panes never make you fill a
  // sign-in form (see each app's app/api/dev-identity/route.ts).
  const asPlatform = (who, next = "/developers") =>
    `http://localhost:3003/api/dev-identity?restaurant=nino&email=${encodeURIComponent(who.email)}` +
    `&name=${encodeURIComponent(who.name)}&next=${encodeURIComponent(next)}`;
  const asOwner = (next = "/developers") => asPlatform(NINO_OWNER, next);
  const asDiner = (who, next = "/reservations") =>
    `http://localhost:3001/api/dev-identity?email=${encodeURIComponent(who.email)}` +
    `&name=${encodeURIComponent(who.name)}&next=${encodeURIComponent(next)}`;
  // The platform side: the admin, and an engineer who is not one.
  const platformActors = (next = "/developers") => ([
    { key: "owner", name: "Nino", role: "Owner · admin", sub: OWNER,
      initials: "N", color: "#8b5cf6", url: asPlatform(NINO_OWNER, next) },
    { key: "bob", name: "Bob", role: "Nino SWE", sub: BOB.email,
      initials: "B", color: "#14b8a6", url: asPlatform(BOB, next) },
  ]);
  // The storefront side: a diner, a reservationist, and the owner. Nino appears
  // here too because the person who runs the restaurant is also someone who
  // looks at its bookings — and he sees them the same way Maria does, through
  // group membership, not through owning the place.
  const dinerActors = (johnNext, mariaNext, ninoNext = mariaNext) => ([
    { key: "john", name: "John", role: "Diner", sub: JOHN.email,
      initials: "J", color: "#0ea5e9", url: asDiner(JOHN, johnNext) },
    { key: "maria", name: "Maria", role: "Staff", sub: MARIA.email,
      initials: "M", color: "#f59e0b", url: asDiner(MARIA, mariaNext) },
    { key: "nino", name: "Nino", role: "Owner", sub: NINO_OWNER.email,
      initials: "N", color: "#8b5cf6", url: asDiner(NINO_OWNER, ninoNext) },
  ]);

  const abz = (args, o) => io.run(CLI.cmd, [...CLI.pre, ...args], o);
  const abzCapture = (args, o) => io.capture(CLI.cmd, [...CLI.pre, ...args], o);
  // Display form of an APIblaze invocation: exactly the `npx apiblaze …` the lab
  // runs, so a shown command and a run command can never disagree.
  const abzDisplay = (args) => "npx apiblaze " + showArgv(args);

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
    await io.pause(P.runStep, "node --version && npx apiblaze --version");
    const major = Number(process.versions.node.split(".")[0]);
    if (major < 20) throw new Error(`Node 20+ required — you have ${process.versions.node}. https://nodejs.org`);
    io.print(green(`  Node ${process.versions.node} · npx ✓`));
    io.print(dim("  Making sure the APIblaze CLI is available (npx fetches it the first time)…"));
    await io.run(CLI.cmd, [...CLI.pre, "--version"]);
    io.print(green("  APIblaze CLI ready ✓"));
    markDone("preflight");
  }

  const PROXY = state.proxy || ("resiresi" + newSuffix());
  state.proxy = PROXY; saveState(state);
  io.print("  Your unique proxy name for this run: " + green(PROXY) + "\n");
  io.stateChip("proxy", PROXY);

  await io.pause(P.begin);

  // 1 · backend
  io.step("Start ResiResi's local backend",
    "The server that stores and serves the reservations. It runs on your machine\n" +
    "in the background at http://localhost:8080 for the rest of the lab.");
  await io.pause(P.runStep, "node resiresi-backend-lightweight/server.js");
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
    const loginArgs = ["login", ...(panes ? ["--team", "default"] : [])];
    await io.pause(P.runStep, abzDisplay(loginArgs));
    await abz(loginArgs);
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
    await io.pause(P.cont);
    BASE = state.base; DPKEY = state.dpkey; TENANT = state.tenant || TENANT_REQ;
    io.print(green("  Reusing " + BASE + " ✓"));
  } else {
    await io.pause(P.runStep, abzDisplay(createArgs));
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
  await io.pause(P.runStep, abzDisplay(tunnelArgs));
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
  await io.pause(P.runStep, smokeCurl);
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
    await io.pause(P.cont);
    CPKEY = state.cpkey;
  } else {
    await io.pause(P.runStep, abzDisplay(mintArgs));
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
    await io.pause(P.runStep, "cd resiresi-frontend && npm install && npm install apiblaze");
    await io.run(NPM, ["install"], { cwd: FE });
    await io.run(NPM, ["install", "apiblaze"], { cwd: FE });
    writeFileSync(join(FE, ".env.local"), `APIBLAZE_CP_KEY=${CPKEY}\n`);
    io.print(green("  wrote resiresi-frontend/.env.local ✓"));
    markDone("install");
  }

  // 8 · crown the admin BEFORE the app is ever opened. /developers demands two
  // things (requireTenant + requireUser), so the very first thing you see is a
  // sign-in — and that sign-in has to be as the admin, or the widgets land for
  // the wrong person. Naming the admin first means one sign-in, done once.
  io.step("Make yourself the admin",
    `ResiResi's app needs a first admin — the person who manages users & groups.\n` +
    `You hold the manager key, so you grant that now, to ${OWNER} (Nino's owner,\n` +
    `who you'll be acting as in the app). Do it BEFORE the app opens and the\n` +
    `Users & Groups widget is usable the moment you land on it.`);
  const adminArgs = ["admins", "add", OWNER, "--tenant", TENANT];
  if (isDone("admin:" + OWNER)) {
    skipNote();
  } else {
    await io.pause(P.runStep, abzDisplay(adminArgs));
    await abz(adminArgs);
    markDone("admin:" + OWNER);
  }

  // 9 · dev server. The pane opens ALREADY signed in as the owner (its identity
  // strip drives the app's one-click identity route), so the Developers page is
  // visible with its two EMPTY widget spots before the next step fills them —
  // the reveal is the point: you watch the widgets appear in a running app.
  io.step("Start ResiResi's web app",
    "Runs ResiResi's website on http://localhost:3003 in the background. The pane\n" +
    "on the right opens it already signed in as Nino's owner — no forms — landing\n" +
    "on the Developers page, where the two widget spots are still empty\n" +
    "placeholders. The next step drops the real widgets into them, live.");
  await io.pause(P.runStep, "cd resiresi-frontend && npm run dev");
  io.startBg(NPM, ["run", "dev"], { cwd: FE, env: { ...process.env, APIBLAZE_CP_KEY: CPKEY } });
  {
    const p = io.progress("  starting http://localhost:3003 ");
    await waitFor(async () => { p.tick(); return await httpOk("http://localhost:3003/login"); },
      { what: "the app" });
    p.end(green("  up ✓"));
  }
  // The terminal lab has no panes, so it gets the same one-click URL to paste.
  io.print(dim(`\n  Open this and you are signed in as ${OWNER}, on the Developers page:\n`) +
    green(`    ${asOwner()}`));
  io.pane({ type: "mount", pane: "resiresi", url: asOwner() });
  io.pane({ type: "identities", pane: "resiresi", actors: platformActors(), active: "owner" });
  io.pane({ type: "banner", pane: "resiresi",
    note: "ResiResi's Developers page. The strip above shows who you are: Nino, the admin.",
    click: `Bob is here too — an engineer at Nino's who is NOT an admin. Worth a click once the widgets are in.`,
    verify: isDone("wire2")
      ? ["The API keys widget and the Users & Groups widget are both there"]
      : ["Two empty placeholder spots, one for each widget",
         "This is ResiResi's OWN app — the widgets drop into those spots next"] });
  await io.pause(P.cont);
  io.pane({ type: "clear", pane: "resiresi" });

  // 10 · wire widgets (hot-reloads into the running app, in front of you)
  io.step("Add the two widgets to ResiResi's Developers page",
    "This edits only files inside rr/resiresi-frontend/ — nothing elsewhere on\n" +
    "your computer. It creates:\n" +
    "  • rr/resiresi-frontend/lib/apiblaze-user.ts\n" +
    "  • rr/resiresi-frontend/app/api/apiblaze/keys/route.ts\n" +
    "  • rr/resiresi-frontend/app/api/apiblaze/groups/route.ts\n" +
    "(the two routes keep the widget key on the server), then mounts the API-key\n" +
    "and Users & Groups widgets in rr/resiresi-frontend/app/developers/page.tsx —\n" +
    "the running app picks them up instantly.\n" +
    "This one is a file edit the lab performs for you, so there's no command to run.");
  if (isDone("wire2")) {
    skipNote();
  } else {
    await io.pause(P.runStep);
    wireWidgets(FE, PROXY.slice("resiresi".length));
    io.print(green("  3 files created + widgets mounted ✓"));
    markDone("wire2");
    io.pane({ type: "refresh", pane: "resiresi",
      note: "The two widgets just appeared where the placeholders were — no restart, no page reload.",
      click: "Now click Bob in the strip above, then click Nino again. Same page, different powers.",
      verify: ["An API keys widget, with a button to create a key",
               "A Users & Groups widget, usable because Nino is the admin",
               "As Bob: he can still issue himself an API key…",
               "…but Users & Groups tells him he isn't an admin — you never wrote that check",
               "The app never restarted — the widgets loaded into the running page"] });
  }

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
    await io.pause(P.runStep, "cd nino && npm install && npm run dev");
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
    io.pane({ type: "mount", pane: "nino", url: asDiner(JOHN, "/") });
    io.pane({ type: "identities", pane: "nino", actors: dinerActors("/", "/"), active: "john" });
    io.pane({ type: "banner", pane: "nino",
      note: "Nino's Pizza — the storefront a diner would use. Every reservation call it makes goes through your proxy.",
      click: "Three people sit at the top of this pane — John a diner, Maria staff, Nino the owner. One click switches who you are.",
      verify: ["The page loads real reservation data",
               "That data travelled: this page → your proxy → the tunnel → your laptop"] });
  }

  await ensureTunnel();
  io.step("BEFORE — John can open MARIA'S reservation",
    "Maria has a reservation at Nino's. John is a different diner — but with the\n" +
    "app's key, nothing stops him from opening HER booking by its id:");
  if (panes && MARIA_RESI) {
    // Point BOTH diners at Maria's booking and switch to John. Now the identity
    // strip is an A/B on one page: same URL, same app key, different person.
    const mariaPage = `/reservations/${MARIA_RESI}`;
    io.pane({ type: "identities", pane: "nino",
      actors: dinerActors(mariaPage, mariaPage), active: "john", navigate: true });
    // No "switch to Maria" prompt here on purpose: nothing is enforced yet, so
    // both diners see the same thing. The contrast is the AFTER beat's payoff —
    // promising it now would spend it on a moment that cannot deliver.
    io.pane({ type: "banner", pane: "nino",
      note: "The strip above says you are John. The booking below is Maria's.",
      verify: ["Maria's booking opens for John — her name, her party size, her time",
               "Nothing stopped him: that is exactly the problem this lab fixes"] });
  }
  await io.pause(P.runStep, curlOne("john@nino.com", MARIA_RESI ?? "<maria's id>"));
  io.pane({ type: "clear", pane: "nino" });
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
    "Goal: a group called  " + bold("reservationists") + "  holding the two people who\n" +
    "work here — " + bold("maria@nino.com") + " and " + bold(OWNER) + " (Nino himself).\n" +
    "John stays just a diner. Note that Nino gets in the same way Maria does:\n" +
    "by being IN the group. Owning the restaurant is not a permission.\n\n" +
    "  " + bold(P.widgetLabel) + "  — in Users & Groups: + New group → reservationists,\n" +
    "              then add maria@nino.com and " + OWNER + " to it.\n" +
    "  " + bold(P.terminalLabel) + " — the lab runs these for you:\n" +
    green(`      npx apiblaze group create reservationists --admin ${OWNER} --tenant ${TENANT}\n` +
    `      npx apiblaze group add-user maria@nino.com reservationists --tenant ${TENANT}\n` +
    `      npx apiblaze group add-user ${OWNER} reservationists --tenant ${TENANT}`));
  if (isDone("group")) {
    skipNote();
  } else {
    const how = await io.choice(P.groupHow,
      [{ key: "w", label: "Widget" }, { key: "t", label: "Terminal" }], "t");
    if (String(how).toLowerCase().startsWith("w")) {
      io.pane({ type: "banner", pane: "resiresi",
        note: "Build the group in the Users & Groups widget. (You are Nino — the admin — so it lets you.)",
        click: `In this pane: + New group → reservationists, then add maria@nino.com and ${OWNER} to it.`,
        verify: ["A group named reservationists exists",
                 `maria@nino.com and ${OWNER} are both inside it`,
                 "John is not — he is a diner, not staff"],
        copy: "maria@nino.com" });
      await io.pause(P.widgetDone);
      io.pane({ type: "clear", pane: "resiresi" });
    } else {
      await abz(["group", "create", "reservationists", "--admin", OWNER, "--tenant", TENANT]);
      await abz(["group", "add-user", "maria@nino.com", "reservationists", "--tenant", TENANT]);
      await abz(["group", "add-user", OWNER, "reservationists", "--tenant", TENANT]);
      io.print(green(`  reservationists ✓ (maria@nino.com and ${OWNER} are members)`));
      io.print(dim("  Refresh the Users & Groups widget to see it there too."));
    }
    markDone("group");
    // Reload the Developers pane either way: the widget lands with the fresh
    // reservationists group EXPANDED (defaultOpenGroup) — maria visibly inside.
    io.pane({ type: "refresh", pane: "resiresi",
      note: "reservationists is open in Users & Groups — Maria and Nino are in it.",
      verify: ["The reservationists group is expanded",
               "maria@nino.com and " + OWNER + " are both members",
               "John is not in it — that is what will separate them next"] });
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
    const again = await io.choice(P.rerunRule,
      [{ key: "s", label: "Skip" }, { key: "r", label: "Re-run" }], "s");
    if (String(again).toLowerCase().startsWith("r")) await abz(ruleArgs);
  } else {
    await io.pause(P.runStep, abzDisplay(ruleArgs));
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
  await io.pause(P.runStep,
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

    if (panes && MARIA_RESI) {
      // The finale, and the reason the storefront pane has been parked on this
      // exact page since the BEFORE beat: it is still showing Maria's booking,
      // opened by John — the 200 he should never have had. Reload that page, as
      // that same person, now that the rule is live, and the refusal replaces
      // the booking in front of you. Nothing about the request changed; only the
      // rule now exists. Both diners point at the page so the follow-up — the
      // same URL opening for staff — is one more click.
      const mariaPage = `/reservations/${MARIA_RESI}`;
      io.print(dim("\n  Reloading John's view of Maria's booking in the storefront pane…"));
      io.pane({ type: "identities", pane: "nino",
        actors: dinerActors(mariaPage, mariaPage), active: "john", navigate: true });
      io.pane({ type: "banner", pane: "nino",
        note: "That is the page John was reading a minute ago, reloaded. He has just lost access.",
        click: "Now click Maria, then Nino, then John again — the same page, three different answers.",
        verify: ["As John: refused — the page says this booking isn't his",
                 "As Maria: it opens — she's in reservationists",
                 "As Nino: it opens too — because he's in that group, not because he owns the place",
                 "Same URL, same app key, same booking. Only the person differs.",
                 JOHN_RESI ? "John's OWN booking still opens (link below)" : null].filter(Boolean),
        link: JOHN_RESI ? { label: "John's own booking →", url: `http://localhost:3001/reservations/${JOHN_RESI}` } : undefined });
    }
  }

  io.print(bold(green("\n  ✓ Lab complete — one key, many people: owners see their own, staff see all.\n")));
  io.print(dim("  Cleanup: this script stops the backend, app and tunnel when it exits.\n"));
}
