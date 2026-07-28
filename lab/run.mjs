#!/usr/bin/env node
/**
 * ResiResi × APIblaze — guided lab, TERMINAL driver (./launch_terminal_only.sh / .\launch_terminal_only.ps1).
 *
 * The step sequence + all copy live in ./steps.mjs (shared with the browser
 * driver, lab/web/server.mjs). This file only adapts it to a terminal: ANSI
 * styling, readline pauses, and spawn with inherited stdio so interactive
 * children (the APIblaze login) own the keyboard while they run.
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { runLab, isWin } from "./steps.mjs";

// ── styling ──────────────────────────────────────────────────────────────────
const c = (n, str) => `\x1b[${n}m${str}\x1b[0m`;
const s = {
  bold: (t) => c(1, t), cyan: (t) => c(36, t), green: (t) => c(32, t),
  yellow: (t) => c(33, t), dim: (t) => c(2, t), red: (t) => c(31, t),
};

// ── readline (single instance; released to children while they run) ──────────
const rl = createInterface({ input: process.stdin, output: process.stdout });
const rlAsk = (q) => new Promise((res) => rl.question(q, res));

// ── process helpers ──────────────────────────────────────────────────────────
const bg = []; // background children to clean up on exit
function cleanup() {
  for (const p of bg) { try { p.kill(); } catch {} }
}
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });

/** Run a command, inheriting the terminal (interactive prompts work). Awaits exit.
 *  CRITICAL: the lab's own readline must let go of stdin while the child runs —
 *  otherwise both processes race for keystrokes and the child's prompts (e.g.
 *  the login flow) eat every other Enter. rl.pause() releases stdin to the
 *  child; resume when it exits so the next "Press Enter" works. */
function run(cmd, args, opts = {}) {
  const shown = [cmd, ...args].join(" ");
  console.log(s.dim("$ " + shown));
  rl.pause();
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: isWin, ...opts });
    const done = (fn) => (arg) => { rl.resume(); fn(arg); };
    p.on("error", done(rej));
    p.on("close", done((code) => (code === 0 ? res() : rej(new Error(`${shown} exited ${code}`)))));
  });
}

/** Run and capture stdout (still echoes to the user). Same stdin handoff as run(). */
function capture(cmd, args, opts = {}) {
  const shown = [cmd, ...args].join(" ");
  console.log(s.dim("$ " + shown));
  rl.pause();
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ["inherit", "pipe", "inherit"], shell: isWin, ...opts });
    let out = "";
    p.stdout.on("data", (d) => { out += d; process.stdout.write(d); });
    const done = (fn) => (arg) => { rl.resume(); fn(arg); };
    p.on("error", done(rej));
    p.on("close", done((code) => (code === 0 ? res(out) : rej(new Error(`${shown} exited ${code}`)))));
  });
}

// ── the io adapter ───────────────────────────────────────────────────────────
let N = 0;
const io = {
  s,
  print: (text) => console.log(text),
  step(title, explain) {
    N++;
    console.log("\n" + s.bold(`━━ Step ${N} · ${title} ` + "━".repeat(Math.max(0, 46 - title.length))));
    if (explain) console.log(explain.split("\n").map((l) => s.dim(l)).join("\n"));
  },
  // Show the exact command a step is about to run, THEN wait for Enter — so
  // nothing runs before the user has seen what it is.
  pause(msg = "Press Enter to run this step", cmd) {
    if (cmd) console.log("\n" + s.dim("  about to run:") + "\n    " + s.green(cmd));
    return rlAsk(`\n${s.cyan("▸ " + msg)} `);
  },
  async ask(prompt, def) {
    const suffix = def ? ` ${s.dim("[" + def + "]")}` : "";
    const a = (await rlAsk(`\n${s.cyan("▸ " + prompt)}${suffix}: `)).trim();
    return a || def || "";
  },
  async choice(prompt, options, defKey) {
    const a = (await rlAsk(`\n${s.cyan("▸ " + prompt)} ${s.dim("[" + defKey + "]")}: `)).trim().toLowerCase();
    return a || defKey;
  },
  run, capture,
  startBg(cmd, args, opts = {}) {
    const p = spawn(cmd, args, { stdio: "ignore", shell: isWin, detached: false, ...opts });
    bg.push(p);
    return p;
  },
  progress(label) {
    process.stdout.write(s.dim(label));
    return {
      tick: () => process.stdout.write(s.dim(".")),
      end: (text) => console.log(text ?? ""),
    };
  },
  // Render a reservations list as a compact, readable table instead of a bare
  // count — so the user can actually SEE whose reservations came back (the
  // whole point of the before/after). `highlight` colors one diner's rows.
  reservations(rows, highlight) {
    if (!rows || !rows.length) { console.log(s.dim("    (none)")); return; }
    for (const r of rows) {
      const line = "    " + r.when.padEnd(22) + "  " + r.status.padEnd(9) +
        "  party " + r.party.padEnd(2) + "  " + r.who + (r.email ? "  <" + r.email + ">" : "");
      console.log(highlight && r.email === highlight ? s.green(line) : s.dim(line));
    }
  },
  pane() { /* terminal: no panes */ },
  stateChip() { /* terminal: no header chips */ },
};

runLab(io, { panes: false })
  .then(() => rl.close())
  .catch((e) => {
    console.error(s.red("\n  ✗ " + (e?.message || e)));
    console.error(s.dim("  Fix the issue above and re-run  ./launch_terminal_only.sh  (or  .\\launch_terminal_only.ps1 ) — it resumes with the same proxy."));
    rl.close();
    process.exit(1);
  });
