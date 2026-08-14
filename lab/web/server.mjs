#!/usr/bin/env node
/**
 * ResiResi × APIblaze — guided lab, BROWSER driver (./launch.sh).
 *
 * Same step engine as ./launch_terminal_only.sh (lab/steps.mjs) — this file only adapts it to
 * a browser: a tiny HTTP server on :3333 that
 *   - serves lab/web/ui.html (the three-pane page),
 *   - streams every lab event over Server-Sent Events (GET /events),
 *   - receives button clicks / inputs (POST /action) to resolve pauses.
 *
 * Styling trick: io.s uses the SAME ANSI color codes as the terminal driver;
 * the UI converts ANSI → styled <span>s. steps.mjs stays 100% driver-agnostic.
 *
 * Zero dependencies — plain node:http + one static HTML file.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { spawn, exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { runLab, isWin, spawnTarget, displayCommand, ROOT, APP_BASE } from "../steps.mjs";

const PORT = 3333;
const HERE = dirname(fileURLToPath(import.meta.url));

// ── ANSI styles (identical to the terminal driver) ───────────────────────────
const c = (n, str) => `\x1b[${n}m${str}\x1b[0m`;
const s = {
  bold: (t) => c(1, t), cyan: (t) => c(36, t), green: (t) => c(32, t),
  yellow: (t) => c(33, t), dim: (t) => c(2, t), red: (t) => c(31, t),
};

// ── SSE plumbing ─────────────────────────────────────────────────────────────
// Every event is kept in `history` so a page refresh replays the whole run so
// far — the browser can reload at any point without losing the rail.
const history = [];
const clients = new Set();
let eventSeq = 0;
function emit(evt) {
  const e = { seq: ++eventSeq, ...evt };
  history.push(e);
  const line = `data: ${JSON.stringify(e)}\n\n`;
  for (const res of clients) res.write(line);
  return e;
}

// ── run mode ─────────────────────────────────────────────────────────────────
// 'web'      — the lab runs every command for you (the original behaviour).
// 'terminal' — the lab never runs them: it shows each command, you paste it into
//              your own terminal, and click to move on. A guided doc, not a
//              robot. The engine (steps.mjs) is untouched by this: the switch
//              lives entirely in the three io methods that touch a shell, so
//              there is no second copy of the sequence to keep in step.
// The lab's own verification calls (the smoke test, the four BEFORE/AFTER beats)
// still run in both modes — they are how the lab SHOWS you the result, and their
// curl equivalents are printed anyway.
let mode = "web";
const manual = () => mode === "terminal";

// The command block a step's pause most recently put on screen. In terminal mode
// it decides whether a command still needs its own prompt: most steps pause with
// the command first ("I ran it →"), so re-asking would double-prompt. But some
// run commands with NO preceding pause — the group step runs two CLI calls
// straight after a Widget/Terminal choice — and those must be asked for, or the
// lab would claim "you ran this yourself" for something never shown, then report
// the group as created when it does not exist. A pause with no command clears
// it, so a later unrelated command can't be waved through by a stale match.
let lastShown = null;
const alreadyShown = (cmdLine) => !!lastShown && lastShown.includes(cmdLine);

/** Where a command has to be run from, for the paste prompts. */
function cwdHint(opts) {
  const cwd = opts && opts.cwd;
  if (!cwd || cwd === ROOT) return "Run it from the rr folder — the one holding launch.sh.";
  return `Run it from ${relative(ROOT, cwd) || "the rr folder"}/ inside the rr folder.`;
}

// Pending user interaction: at most ONE at a time (the lab is sequential).
let pending = null; // { id, resolve }
function waitAction(promptEvt) {
  return new Promise((resolve) => {
    const id = "p" + promptEvt.seq;
    pending = { id, resolve };
    emit({ type: "await", id }); // tells the UI which prompt is live
  });
}

// ── child processes ──────────────────────────────────────────────────────────
const bg = [];
function cleanup() { for (const p of bg) { try { p.kill(); } catch {} } }
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });

/** Spawn with piped output, streaming chunks to the rail. Non-interactive by
 *  design — every command the lab runs works without a TTY (login included:
 *  it prints the URL+code and polls; the UI renders the URL as a link). */
function streamRun(cmd, args, opts = {}, { wantOutput = false } = {}) {
  const shown = displayCommand(cmd, args);
  emit({ type: "log", text: s.dim("$ " + shown) + "\n" });
  return new Promise((res, rej) => {
    const t = spawnTarget(cmd, args);
    const p = spawn(t.cmd, t.args, {
      stdio: ["ignore", "pipe", "pipe"], shell: t.shell,
      env: { ...process.env, FORCE_COLOR: "1", ...(opts.env || {}) },
      ...opts,
    });
    let out = "";
    p.stdout.on("data", (d) => { const t = d.toString(); if (wantOutput) out += t; emit({ type: "log", text: t }); });
    p.stderr.on("data", (d) => emit({ type: "log", text: d.toString() }));
    p.on("error", rej);
    p.on("close", (code) => (code === 0 ? res(wantOutput ? out : undefined)
      : rej(new Error(`${shown} exited ${code}`))));
  });
}

// ── the io adapter ───────────────────────────────────────────────────────────
let N = 0;
const io = {
  s,
  // Browser wording for the interaction prompts (steps.mjs merges these over
  // its terminal defaults). Buttons do the acting, so no key-press language.
  phrases: {
    runStep: "Ready? Run this step",
    begin: "Ready to begin?",
    cont: "Continue when ready",
    widgetDone: "Done in the widget? Then continue",
    groupHow: "Pick how to create the group",
    rerunRule: "Skip, or re-run the rule?",
    widgetLabel: "Widget",
    terminalLabel: "Terminal",
  },
  print: (text) => emit({ type: "log", text: text + "\n" }),
  step(title, explain) {
    N++;
    emit({ type: "step", n: N, title, explain: explain || "" });
  },
  async pause(msg = "Ready? Run this step", cmd) {
    lastShown = cmd || null;
    const evt = emit({ type: "prompt", kind: "pause", msg, cmd: cmd || null });
    await waitAction(evt);
  },
  async ask(prompt, def) {
    const evt = emit({ type: "prompt", kind: "input", msg: prompt, def: def || "" });
    const v = await waitAction(evt);
    return (typeof v === "string" && v.trim()) || def || "";
  },
  async choice(prompt, options, defKey) {
    const evt = emit({ type: "prompt", kind: "choice", msg: prompt, options, defKey });
    const v = await waitAction(evt);
    return (typeof v === "string" && v) || defKey;
  },
  async run(cmd, args, opts) {
    if (!manual()) return streamRun(cmd, args, opts);
    const shown = displayCommand(cmd, args);
    if (alreadyShown(shown)) {
      // The step's pause already showed it and you clicked "I ran it".
      emit({ type: "log", text: s.dim("  ↳ you ran this yourself: ") + s.green(shown) + "\n" });
      return;
    }
    const evt = emit({ type: "prompt", kind: "pause", msg: "Run this, then continue",
      cmd: shown, hint: cwdHint(opts) });
    await waitAction(evt);
  },
  async capture(cmd, args, opts) {
    if (!manual()) return streamRun(cmd, args, opts, { wantOutput: true });
    // The lab NEEDS this command's output (it carries the proxy URL / the key),
    // so terminal mode has to ask for it back. --json is kept in the shown
    // command here precisely so what you paste is parseable.
    const shown = displayCommand(cmd, args);
    const repeat = !alreadyShown(shown);
    const evt = emit({
      type: "prompt", kind: "paste",
      msg: repeat ? "Run this in your terminal, then paste everything it printed"
                  : "Paste everything that command printed",
      cmd: repeat ? shown : null,
      hint: (repeat ? cwdHint(opts) + " " : "") + "If it errored, fix it and re-run before pasting.",
      expect: args.includes("--json") ? "json" : "text",
    });
    const v = await waitAction(evt);
    return String(v ?? "");
  },
  startBg(cmd, args, opts = {}) {
    if (manual()) {
      // Long-running: it must get its OWN terminal window, or closing the one
      // you typed in kills it and the next step hangs waiting for the service.
      emit({ type: "log", text: s.yellow("  ↳ this one keeps running — give it its own terminal window and leave it open:\n") +
        s.green("    " + displayCommand(cmd, args)) + "\n" });
      return { kill() {} };
    }
    const t = spawnTarget(cmd, args);
    const p = spawn(t.cmd, t.args, { stdio: "ignore", shell: t.shell, detached: false, ...opts });
    bg.push(p);
    return p;
  },
  progress(label) {
    emit({ type: "progress", label });
    return {
      tick: () => emit({ type: "progress-tick" }),
      end: (text) => emit({ type: "progress-end", text: text ?? "" }),
    };
  },
  reservations: (rows, highlight) => emit({ type: "reservations", rows, highlight: highlight || null }),
  // evt has its own `type` (mount/refresh/banner) — keep it as `kind` so the
  // SSE envelope's type stays "pane".
  pane: (evt) => emit({ ...evt, kind: evt.type, type: "pane" }),
  stateChip: (key, value) => emit({ type: "chip", key, value }),
};

// ── HTTP server ──────────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/" || url.pathname === "/ui.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(join(HERE, "ui.html")));
    return;
  }
  if (url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive",
    });
    // Replay the run so far, then live-tail.
    for (const e of history) res.write(`data: ${JSON.stringify(e)}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (url.pathname === "/mode" && req.method === "POST") {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      const next = (() => { try { return JSON.parse(body || "{}").mode; } catch { return null; } })();
      if (next !== "web" && next !== "terminal") { res.writeHead(400).end('{"error":"mode must be web|terminal"}'); return; }
      mode = next;
      emit({ type: "mode", mode });
      res.writeHead(200).end("{}");
    });
    return;
  }
  if (url.pathname === "/action" && req.method === "POST") {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      try {
        const { id, value } = JSON.parse(body || "{}");
        if (pending && pending.id === id) {
          const { resolve } = pending;
          pending = null;
          emit({ type: "answered", id, value: value ?? null });
          resolve(value);
          res.writeHead(200).end("{}");
        } else {
          res.writeHead(409).end(JSON.stringify({ error: "no such pending prompt" }));
        }
      } catch (e) {
        res.writeHead(400).end(JSON.stringify({ error: String(e) }));
      }
    });
    return;
  }
  res.writeHead(404).end("not found");
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  ResiResi × APIblaze lab → ${url}\n  (keep this terminal open; Ctrl-C stops everything)\n`);
  const open = process.platform === "darwin" ? `open "${url}"`
    : isWin ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(open, () => { /* headless is fine — the URL is printed */ });

  emit({ type: "mode", mode });
  // Tell the page where the two apps live FOR A BROWSER. If it turns out the
  // page is not being viewed on this machine and this is still the localhost
  // default, the panes would silently point at the viewer's own computer — so
  // the page says so rather than showing two dead frames.
  emit({ type: "config", appBase: APP_BASE });
  runLab(io, { panes: true })
    .then(() => emit({ type: "done" }))
    .catch((e) => {
      emit({ type: "fatal", message: e?.message || String(e) });
      console.error("  ✗ " + (e?.message || e));
    });
});
