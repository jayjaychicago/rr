#!/usr/bin/env node
/**
 * ResiResi backend — lightweight edition.
 *
 * The SAME reservation API as ../resiresi-backend, but with ZERO dependencies
 * and ZERO setup: plain Node `http`, data held in memory (seeded on boot). No
 * Docker, no Postgres, no `npm install` — just `node server.js`. Perfect for the
 * guided lab; the Docker version is the production-shaped reference.
 *
 * Same open origin (no auth of its own) and same routes/response shapes, so the
 * apps, the APIblaze proxy, and apichat all work against it unchanged.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);

// ── in-memory store ──────────────────────────────────────────────────────────
const db = { restaurants: [], tables: [], reservations: [] };

function seed() {
  const now = new Date();
  const iso = (dayOffset, hour) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const defs = [
    { slug: "nino", name: "Nino's Pizza", tz: "America/New_York", tables: ["N1:2", "N2:2", "N3:4", "N4:4", "N5:6"] },
    { slug: "gino", name: "Gino's Pizza", tz: "America/New_York", tables: ["G1:2", "G2:4", "G3:4", "G4:6", "G5:8"] },
    { slug: "le-bernardin", name: "Le Bernardin", tz: "America/New_York", tables: ["A1:2", "B1:4", "C1:6", "C2:8"] },
    { slug: "joe-pizza", name: "Joe's Pizza", tz: "America/New_York", tables: ["T1:2", "T2:4", "T3:6"] },
    { slug: "zingerman-roadhouse", name: "Zingerman's Roadhouse", tz: "America/Detroit", tables: ["Z1:2", "Z2:4", "Z3:8"] },
  ];

  // Diners for the access-control demo: some belong to John, some to Maria,
  // the rest to other people — so an X-End-User-Id rule visibly changes results.
  const ninoDiners = [
    { ext: "john@nino.com",  name: "John Diner",   email: "john@nino.com" },
    { ext: "john@nino.com",  name: "John Diner",   email: "john@nino.com" },
    { ext: "john@nino.com",  name: "John Diner",   email: "john@nino.com" },
    { ext: "maria@nino.com", name: "Maria Staff",  email: "maria@nino.com" },
    { ext: "alice@example.com", name: "Alice Martin", email: "alice@example.com" },
    { ext: "bob@example.com",   name: "Bob Chen",     email: "bob@example.com" },
    { ext: "carol@example.com", name: "Carol Lee",    email: "carol@example.com" },
    { ext: "david@example.com", name: "David Kim",    email: "david@example.com" },
  ];
  const otherDiners = [
    { ext: null, name: "Alice Martin", email: "alice@example.com" },
    { ext: null, name: "Bob Chen", email: "bob@example.com" },
    { ext: null, name: "Carol Lee", email: "carol@example.com" },
    { ext: null, name: "David Kim", email: "david@example.com" },
    { ext: null, name: "Emma Davis", email: "emma@example.com" },
  ];
  const statuses = ["confirmed", "confirmed", "confirmed", "pending", "completed", "seated", "cancelled", "no_show"];

  for (const def of defs) {
    const rid = randomUUID();
    db.restaurants.push({
      id: rid, slug: def.slug, name: def.name, timezone: def.tz,
      open_hours: [], address: null, phone: null,
      created_at: now.toISOString(), updated_at: now.toISOString(),
    });
    const tables = def.tables.map(([, ...__] = [], i) => i); // placeholder, replaced below
    const tableRows = def.tables.map((t) => {
      const [label, cap] = t.split(":");
      const row = { id: randomUUID(), restaurant_id: rid, label, capacity: Number(cap), active: true };
      db.tables.push(row);
      return row;
    });

    const diners = def.slug === "nino" ? ninoDiners : otherDiners;
    for (let i = 0; i < diners.length; i++) {
      const diner = diners[i];
      const startsAt = iso(Math.floor(i * 1.4), 18 + (i % 3));
      const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000);
      const table = tableRows[i % tableRows.length];
      db.reservations.push({
        id: randomUUID(), restaurant_id: rid, table_id: table.id, diner_user_id: null,
        diner_external_id: diner.ext, diner_name: diner.name, diner_email: diner.email, diner_phone: null,
        party_size: Math.min(table.capacity, 2 + (i % 3)),
        starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
        status: statuses[i % statuses.length], notes: null, idempotency_key: null,
        created_at: now.toISOString(), updated_at: now.toISOString(),
      });
    }
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
const findRestaurant = (ref) =>
  db.restaurants.find((r) => r.id === ref || r.slug === ref) || null;

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": typeof body === "string" ? "text/plain" : "application/json", ...headers });
  res.end(payload);
}
const ok = (res, body, headers) => send(res, 200, body, headers);
const created = (res, body) => send(res, 201, body);
const err = (res, status, code, message) => send(res, status, { error: { code, message, request_id: randomUUID() } });
const notFound = (res, what) => err(res, 404, "not_found", `${what} not found.`);

function readBody(req) {
  return new Promise((resolve) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => { try { resolve(s ? JSON.parse(s) : {}); } catch { resolve({}); } });
  });
}

// ── request handling ─────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const q = url.searchParams;
  const m = req.method;

  // system
  // Opening the bare port is the first thing anyone does when checking whether
  // this is alive — and it used to answer with a flat "Route not found.", which
  // reads like a fault rather than "you are at the API, but that is not a route
  // it has". Point at what is actually here instead.
  if (path === "/") {
    return ok(res, {
      service: "resiresi reservations API",
      status: "ok",
      note: "This is the API the guided lab puts a gateway in front of — not the lab itself, which serves on port 3333.",
      routes: {
        health: "/healthz",
        spec: "/openapi.yaml",
        docs: "/docs",
        restaurants: "/v1/restaurants",
        reservations: "/v1/restaurants/{restaurant}/reservations",
        reservation: "/v1/restaurants/{restaurant}/reservations/{id}",
      },
    });
  }
  if (path === "/healthz") return ok(res, { status: "ok", db: "ok" });
  if (path === "/openapi.yaml") {
    try { return ok(res, readFileSync(join(HERE, "openapi.yaml"), "utf8"), { "Content-Type": "application/yaml" }); }
    catch { return err(res, 404, "not_found", "spec not found"); }
  }
  if (path === "/docs") {
    return ok(res, `<!doctype html><meta charset=utf8><title>ResiResi API</title>
<link rel=stylesheet href=https://unpkg.com/swagger-ui-dist@5/swagger-ui.css>
<div id=ui></div><script src=https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js></script>
<script>SwaggerUIBundle({url:'/openapi.yaml',dom_id:'#ui'})</script>`, { "Content-Type": "text/html" });
  }

  // /v1/restaurants...
  const parts = path.split("/").filter(Boolean); // ["v1","restaurants",...]
  if (parts[0] !== "v1" || parts[1] !== "restaurants") return notFound(res, "Route");

  // GET /v1/restaurants
  if (parts.length === 2) {
    if (m !== "GET") return err(res, 405, "method_not_allowed", "Method not allowed.");
    return ok(res, { data: db.restaurants });
  }

  const restaurant = findRestaurant(parts[2]);
  // GET /v1/restaurants/:idOrSlug
  if (parts.length === 3) {
    if (!restaurant) return notFound(res, "Restaurant");
    if (m !== "GET") return err(res, 405, "method_not_allowed", "Method not allowed.");
    return ok(res, restaurant);
  }
  if (!restaurant) return notFound(res, "Restaurant");
  const rid = restaurant.id;
  const sub = parts[3];

  // ── tables ──
  if (sub === "tables") {
    if (parts.length === 4) {
      if (m === "GET") return ok(res, { data: db.tables.filter((t) => t.restaurant_id === rid) });
      if (m === "POST") {
        const b = await readBody(req);
        if (!b.label || !(b.capacity > 0)) return err(res, 400, "invalid", "label and capacity>0 required.");
        const row = { id: randomUUID(), restaurant_id: rid, label: b.label, capacity: b.capacity, active: b.active ?? true };
        db.tables.push(row); return created(res, row);
      }
    }
    const table = db.tables.find((t) => t.id === parts[4] && t.restaurant_id === rid);
    if (!table) return notFound(res, "Table");
    if (m === "PATCH") { Object.assign(table, await readBody(req)); return ok(res, table); }
    if (m === "DELETE") { db.tables = db.tables.filter((t) => t !== table); res.writeHead(204).end(); return; }
    return err(res, 405, "method_not_allowed", "Method not allowed.");
  }

  // ── reservations ──
  if (sub === "reservations") {
    // GET list
    if (parts.length === 4 && m === "GET") {
      let rows = db.reservations.filter((r) => r.restaurant_id === rid);
      if (q.get("from")) rows = rows.filter((r) => r.starts_at >= q.get("from"));
      if (q.get("to")) rows = rows.filter((r) => r.starts_at <= q.get("to"));
      if (q.get("diner_external_id")) rows = rows.filter((r) => r.diner_external_id === q.get("diner_external_id"));
      if (q.get("diner_email")) rows = rows.filter((r) => r.diner_email === q.get("diner_email"));
      if (q.get("table_id")) rows = rows.filter((r) => r.table_id === q.get("table_id"));
      const st = q.getAll("status");
      if (st.length) rows = rows.filter((r) => st.includes(r.status));
      rows.sort((a, b) => (a.starts_at < b.starts_at ? -1 : a.starts_at > b.starts_at ? 1 : a.id < b.id ? -1 : 1));
      const limit = Math.min(Math.max(Number(q.get("limit")) || 50, 1), 200);
      if (q.get("cursor")) {
        const [cs, ci] = Buffer.from(q.get("cursor"), "base64url").toString("utf8").split("|");
        rows = rows.filter((r) => r.starts_at > cs || (r.starts_at === cs && r.id > ci));
      }
      let next = null;
      if (rows.length > limit) {
        rows = rows.slice(0, limit);
        const last = rows[rows.length - 1];
        next = Buffer.from(`${last.starts_at}|${last.id}`).toString("base64url");
      }
      return ok(res, { data: rows, page: { next_cursor: next, limit } });
    }
    // POST create
    if (parts.length === 4 && m === "POST") {
      const b = await readBody(req);
      const idem = req.headers["idempotency-key"] || null;
      if (idem) {
        const existing = db.reservations.find((r) => r.restaurant_id === rid && r.idempotency_key === idem);
        if (existing) return ok(res, existing, { "Idempotent-Replay": "true" });
      }
      if (!b.diner_name || !(b.party_size >= 1) || !b.starts_at)
        return err(res, 400, "invalid", "diner_name, party_size and starts_at are required.");
      const startsAt = new Date(b.starts_at);
      const endsAt = b.ends_at ? new Date(b.ends_at)
        : new Date(startsAt.getTime() + (b.duration_minutes || 90) * 60 * 1000);
      if (endsAt <= startsAt) return err(res, 400, "invalid_times", "ends_at must be after starts_at.");
      if (b.table_id) {
        const t = db.tables.find((x) => x.id === b.table_id && x.restaurant_id === rid);
        if (!t) return err(res, 400, "table_not_found", "Table does not belong to this restaurant.");
        if (t.capacity < b.party_size) return err(res, 400, "table_too_small", `Table capacity ${t.capacity} < party size ${b.party_size}.`);
      }
      const now = new Date().toISOString();
      const row = {
        id: randomUUID(), restaurant_id: rid, table_id: b.table_id || null, diner_user_id: b.diner_user_id || null,
        diner_external_id: b.diner_external_id || null, diner_name: b.diner_name,
        diner_email: b.diner_email || null, diner_phone: b.diner_phone || null,
        party_size: b.party_size, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
        status: b.status || "confirmed", notes: b.notes || null, idempotency_key: idem,
        created_at: now, updated_at: now,
      };
      db.reservations.push(row);
      return created(res, row);
    }
    // single
    const r = db.reservations.find((x) => x.id === parts[4] && x.restaurant_id === rid);
    if (!r) return notFound(res, "Reservation");
    if (m === "GET") return ok(res, r);
    if (m === "PATCH") { Object.assign(r, await readBody(req), { updated_at: new Date().toISOString() }); return ok(res, r); }
    if (m === "DELETE") { r.status = "cancelled"; res.writeHead(204).end(); return; }
  }

  return notFound(res, "Route");
});

seed();
server.listen(PORT, () => {
  console.log(`ResiResi (lightweight, in-memory) listening on http://localhost:${PORT}`);
  console.log(`  ${db.restaurants.length} restaurants · ${db.reservations.length} reservations · open origin, no key required`);
});
