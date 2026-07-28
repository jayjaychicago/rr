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
import { dirname, join } from "node:path";
import { runLab, isWin } from "../steps.mjs";

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
  const shown = [cmd, ...args].join(" ");
  emit({ type: "log", text: s.dim("$ " + shown) + "\n" });
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"], shell: isWin,
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
    signedIn: "Signed in? Then continue",
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
  run: (cmd, args, opts) => streamRun(cmd, args, opts),
  capture: (cmd, args, opts) => streamRun(cmd, args, opts, { wantOutput: true }),
  startBg(cmd, args, opts = {}) {
    const p = spawn(cmd, args, { stdio: "ignore", shell: isWin, detached: false, ...opts });
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

  runLab(io, { panes: true })
    .then(() => emit({ type: "done" }))
    .catch((e) => {
      emit({ type: "fatal", message: e?.message || String(e) });
      console.error("  ✗ " + (e?.message || e));
    });
});
