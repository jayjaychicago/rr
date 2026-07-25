import { REPO_URL } from "@/lib/study-config";
import { Code, ProxyName } from "./personal";


function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-slate-200 py-6 first:border-t-0 first:pt-0">
      <h4 className="flex items-baseline gap-2 text-sm font-semibold text-slate-900">
        <span className="font-mono text-brand-600">{n}</span>
        <span>{title}</span>
      </h4>
      <div className="mt-2 text-sm text-slate-600">{children}</div>
    </div>
  );
}

const PROMPT = `Set up and verify a demo that puts APIblaze in front of a locally-run
restaurant reservation API (ResiResi) and adds per-user access control. Run
everything on this machine and tell me the result of each step and anything
that fails. Requirements: Node 20+, Docker, and an APIblaze account (the
localhost tunnel needs login — I will complete the browser login when prompted).

1. Clone and start the backend (Postgres + API on http://localhost:8080):
     git clone ${REPO_URL}
     cd rr/resiresi-backend
     docker compose up -d
   Verify: curl http://localhost:8080/healthz returns {"status":"ok","db":"ok"}.

2. Log in to APIblaze (opens a browser; I'll complete it), then create the proxy
   pointing at the local backend:
     npx apiblaze login
     npx apiblaze create --name resiresi0000 --target http://localhost:8080 --auth api_key --identified --iam
   Note from the output: PROD = the Proxy URL ending in /prod (on *.abz.run) and
   DPKEY = the API key. If the name is taken, add a few digits and retry.

3. Start the tunnel so the proxy can reach localhost:8080, and LEAVE IT RUNNING
   in its own terminal for the rest of the exercise:
     npx apiblaze dev 8080

4. Smoke-test through the proxy (the real API path is /v1/...):
     curl "$PROD/v1/restaurants/nino/reservations" -H "X-API-Key: $DPKEY" -H "X-End-User-Id: john@nino.com"
   Expect HTTP 200 and reservations served from the LOCAL backend.

5. Mint the widget control-plane key; save it as CPKEY:
     npx apiblaze apikeys mint --desc "resiresi widget key"

6. Run the platform app (defaults to the local backend, no other env needed):
     cd ../resiresi-frontend && npm install && npm install apiblaze
   Create rr/resiresi-frontend/.env.local containing exactly:
     APIBLAZE_CP_KEY=<CPKEY from step 5>

7. Wire the two widgets (create three files, then mount the widgets):
   FILE lib/apiblaze-user.ts:
     import type { AppUser } from "apiblaze/server";
     import { getTenantSlug } from "./tenant";
     import { getUser } from "./user";
     export function getApiblazeUser(): AppUser | null {
       const tenant = getTenantSlug();
       const user = getUser();
       if (!tenant || !user) return null;
       return { tenant, userId: user.email, email: user.email };
     }
   FILE app/api/apiblaze/keys/route.ts:
     import { NextResponse } from "next/server";
     import { createApiblazeKeys } from "apiblaze/server";
     import { getApiblazeUser } from "@/lib/apiblaze-user";
     let h: ReturnType<typeof createApiblazeKeys> | null = null;
     function handler(req: Request) {
       const cpKey = process.env.APIBLAZE_CP_KEY;
       if (!cpKey) return NextResponse.json({ error: "APIBLAZE_CP_KEY not set" }, { status: 503 });
       h ??= createApiblazeKeys({ cpKey, getUser: () => getApiblazeUser() });
       return h.handler(req);
     }
     export const GET = handler; export const POST = handler;
   FILE app/api/apiblaze/groups/route.ts: same as keys/route.ts but import
   createApiblazeGroups and use it instead of createApiblazeKeys.
   EDIT app/developers/page.tsx: add at top
     import { ApiKeyWidget, UsersGroupsWidget } from "apiblaze/react";
   and replace the two <Placeholder>…</Placeholder> blocks with
     <ApiKeyWidget title="API keys" theme={{ accent: "#4f46e5" }} />
     <UsersGroupsWidget title="Your staff" theme={{ accent: "#4f46e5" }} />

8. Start it: npm run dev  (serves http://localhost:3003). Open
   http://localhost:3003/developers, sign in with any name + email (e.g.
   owner@nino.com), and confirm both widgets load. Users & Groups will say
   "admin access pending" — the admin list is sealed from inside the widget.
   Crown the first admin from the terminal, then reload the widget:
     npx apiblaze admins add owner@nino.com --tenant nino

9. Prove per-user access control:
   BEFORE — the step-4 curl as john@nino.com returns ALL reservations.
   In the Users & Groups widget, create a group "reservationists" and add
   maria@nino.com. Then set the rule:
     npx apiblaze agent authz resiresi0000
   and tell it: "On GET /restaurants/{restaurantId}/reservations a caller sees only
   reservations whose diner_external_id equals their X-End-User-Id, unless they are
   in the reservationists group, who see all."
   AFTER — the same curl as john@nino.com returns only John's; as maria@nino.com
   returns all.

Report each step's outcome.`;

export function ImplementationGuide() {
  return (
    <div className="space-y-8">
      {/* ---------- PROMPT (automated path) ---------- */}
      <section className="card border-slate-300 p-6">
        <h3 className="text-base font-semibold">Prefer to watch it run? Paste this into Claude Code</h3>
        <p className="mt-1 text-sm text-slate-600">
          On a machine with Node 20+, Docker and{" "}
          <a href="https://claude.com/claude-code" className="text-brand-600 underline" target="_blank" rel="noreferrer">Claude Code</a>,
          paste the whole block below. It runs the entire exercise — backend, proxy,
          tunnel, widgets, access rule — and reports anything that fails. You&apos;ll
          be asked to complete one browser login.
        </p>
        <Code label="paste into Claude Code">{PROMPT}</Code>
        <p className="mt-3 text-xs text-slate-400">
          Or do it by hand — the same steps, explained, are below.
        </p>
      </section>

      {/* ---------- THE EXERCISE ---------- */}
      <section className="card border-brand-200 bg-brand-50/40 p-6">
        <h3 className="text-base font-semibold">The exercise</h3>
        <p className="mt-2 text-sm text-slate-700">
          You are <span className="font-semibold">resiresi.com</span>: you offer a
          restaurant reservation system to your tenants, and you have two —{" "}
          <span className="font-semibold">Nino&apos;s Pizza</span> and{" "}
          <span className="font-semibold">Gino&apos;s Pizza</span> (each runs its own
          storefront on top of your API). Everything runs on your laptop: the
          reservation API, the apps — and your job is to wire{" "}
          <span className="font-semibold">APIblaze</span> in so that:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
          <li><span className="font-mono text-brand-600">a)</span> your tenants can mint their own API keys (the &quot;API access&quot; box above), and</li>
          <li><span className="font-mono text-brand-600">b)</span> they can organise their staff into groups (the &quot;Users &amp; Groups&quot; box above) —</li>
        </ul>
        <p className="mt-3 text-sm text-slate-700">
          then prove it works end to end: an access rule makes a diner see only their
          own reservations while reservation staff see everything.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          You&apos;ll need: Node 20+ (<span className="font-mono">node -v</span>),
          Docker (<span className="font-mono">docker -v</span>), and a free APIblaze
          account (the localhost tunnel in Part B requires login).
        </p>
      </section>

      {/* ---------- PART A ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">Part A · Run ResiResi on your laptop</h3>

        <Step n="A1" title="Clone the project and start the reservation API">
          The backend (Node + Postgres) runs in Docker and seeds itself with
          restaurants and reservations on{" "}
          <span className="font-mono text-xs">http://localhost:8080</span>.
          <Code label="your laptop — terminal">{`git clone ${REPO_URL}
cd rr/resiresi-backend
docker compose up -d`}</Code>
          Check it&apos;s alive:
          <Code label="your laptop — terminal">{`curl http://localhost:8080/healthz`}</Code>
        </Step>

        <Step n="A2" title="Start the ResiResi platform app">
          A second terminal. It defaults to the local backend — no config needed.
          <Code label="your laptop — terminal">{`cd rr/resiresi-frontend
npm install
npm run dev`}</Code>
          Open <span className="font-mono text-xs">http://localhost:3003</span> —
          this very walkthrough, running from your machine.
        </Step>
      </section>

      {/* ---------- PART B ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">Part B · Put APIblaze in front of it</h3>

        <Step n="B1" title="Log in and create the proxy">
          Login is needed because the next step tunnels your localhost — a public
          URL onto your machine is an authenticated feature.{" "}
          <span className="font-mono text-xs">--identified</span> means every call
          must say which person it&apos;s for (the apps send{" "}
          <span className="font-mono text-xs">X-End-User-Id</span>);{" "}
          <span className="font-mono text-xs">--iam</span> makes users &amp; groups
          apply to those calls.
          <Code label="your laptop — terminal">{`npx apiblaze login
npx apiblaze create --name resiresi0000 --target http://localhost:8080 --auth api_key --identified --iam`}</Code>
          <p className="mt-2 text-xs text-slate-400">
            Note the printed <span className="font-mono">Proxy URL</span> (ends in{" "}
            <span className="font-mono">/prod</span>, on{" "}
            <span className="font-mono">*.abz.run</span>) and the API key. If the
            name <ProxyName /> is taken, add a few
            digits and use your actual URL below.
          </p>
        </Step>

        <Step n="B2" title="Tunnel — connect the proxy to your machine">
          A third terminal. <strong>Leave it running</strong> for the rest of the
          exercise; it&apos;s the bridge between your proxy in the cloud and the
          backend on your laptop.
          <Code label="your laptop — terminal (keep open)">{`npx apiblaze dev 8080`}</Code>
        </Step>

        <Step n="B3" title="Prove the proxy reaches your local backend">
          The real API path is <span className="font-mono text-xs">/v1/…</span>, and
          every call names the person it acts for:
          <Code label="your laptop — terminal">{`curl "https://resiresi0000.abz.run/1.0.0/prod/v1/restaurants/nino/reservations" \\
  -H "X-API-Key: <the API key from B1>" \\
  -H "X-End-User-Id: john@nino.com"`}</Code>
          Reservations, served from <em>your</em> machine, through your proxy.
        </Step>

        <Step n="B4" title="Try it — chat with your API (optional)">
          <Code label="your laptop — terminal">{`npx apiblaze apichat --target http://localhost:8080`}</Code>
          <Code label="in the chat">{`List the reservations for nino
Add a reservation for 2 people at nino tomorrow at 7pm for "Alex Rivera"
List the reservations for nino again`}</Code>
        </Step>

        <Step n="B5" title="Mint the key the widgets will use">
          A scoped <strong>widget</strong> key — a manager credential with exactly{" "}
          {`{call, configure, issue-keys}`}, enough to provision users and issue keys
          but <em>not</em> a full owner/admin key. Shown <strong>once</strong> — copy
          the <span className="font-mono text-xs">key:</span> value.
          <Code label="your laptop — terminal">{`npx apiblaze apikeys mint --desc "resiresi widget key"`}</Code>
          Give it to the app, then restart{" "}
          <span className="font-mono text-xs">npm run dev</span>:
          <Code label="rr/resiresi-frontend/.env.local  (new file)">{`APIBLAZE_CP_KEY=paste-the-key-here`}</Code>
        </Step>
      </section>

      {/* ---------- PART C ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">Part C · Add the widgets</h3>
        <p className="mt-1 text-sm text-slate-600">
          Two React components + two backend routes that hold the key server-side.
          The browser talks only to your own routes; your routes talk to APIblaze —
          the key never reaches the browser.
        </p>

        <Step n="C1" title="Install the APIblaze SDK">
          <Code label="your laptop — terminal, in rr/resiresi-frontend">{`npm install apiblaze`}</Code>
        </Step>

        <Step n="C2" title="Create file 1 of 3 — who is logged in">
          Maps the signed-in restaurant + email to the identity APIblaze authorizes on.
          <Code label="rr/resiresi-frontend/lib/apiblaze-user.ts  (new file)">{`import type { AppUser } from "apiblaze/server";
import { getTenantSlug } from "./tenant";
import { getUser } from "./user";

export function getApiblazeUser(): AppUser | null {
  const tenant = getTenantSlug(); // "nino" / "gino" -> the APIblaze tenant
  const user = getUser();         // the signed-in email
  if (!tenant || !user) return null;
  return { tenant, userId: user.email, email: user.email };
}`}</Code>
        </Step>

        <Step n="C3" title="Create file 2 of 3 — the API-key route">
          First <span className="font-mono text-xs">mkdir -p app/api/apiblaze/keys</span>{" "}
          (from inside <span className="font-mono text-xs">rr/resiresi-frontend</span>).
          <Code label="rr/resiresi-frontend/app/api/apiblaze/keys/route.ts  (new file)">{`import { NextResponse } from "next/server";
import { createApiblazeKeys } from "apiblaze/server";
import { getApiblazeUser } from "@/lib/apiblaze-user";

let h: ReturnType<typeof createApiblazeKeys> | null = null;

function handler(req: Request) {
  const cpKey = process.env.APIBLAZE_CP_KEY;
  if (!cpKey) return NextResponse.json({ error: "APIBLAZE_CP_KEY not set" }, { status: 503 });
  h ??= createApiblazeKeys({ cpKey, getUser: () => getApiblazeUser() });
  return h.handler(req);
}

export const GET = handler;
export const POST = handler;`}</Code>
        </Step>

        <Step n="C4" title="Create file 3 of 3 — the users & groups route">
          <span className="font-mono text-xs">mkdir -p app/api/apiblaze/groups</span>,
          then the same shape with the groups factory:
          <Code label="rr/resiresi-frontend/app/api/apiblaze/groups/route.ts  (new file)">{`import { NextResponse } from "next/server";
import { createApiblazeGroups } from "apiblaze/server";
import { getApiblazeUser } from "@/lib/apiblaze-user";

let h: ReturnType<typeof createApiblazeGroups> | null = null;

function handler(req: Request) {
  const cpKey = process.env.APIBLAZE_CP_KEY;
  if (!cpKey) return NextResponse.json({ error: "APIBLAZE_CP_KEY not set" }, { status: 503 });
  h ??= createApiblazeGroups({ cpKey, getUser: () => getApiblazeUser() });
  return h.handler(req);
}

export const GET = handler;
export const POST = handler;`}</Code>
        </Step>

        <Step n="C5" title="Mount the widgets on this page">
          Open <span className="font-mono text-xs">rr/resiresi-frontend/app/developers/page.tsx</span>.
          Add the import at the top:
          <Code label="rr/resiresi-frontend/app/developers/page.tsx — add at the top">{`import { ApiKeyWidget, UsersGroupsWidget } from "apiblaze/react";`}</Code>
          Then replace each of the two dotted{" "}
          <span className="font-mono text-xs">&lt;Placeholder&gt;…&lt;/Placeholder&gt;</span>{" "}
          blocks with its widget:
          <Code label={'replace the "API access" placeholder with'}>{`<ApiKeyWidget title="API keys" theme={{ accent: "#4f46e5" }} />`}</Code>
          <Code label={'replace the "Users & Groups" placeholder with'}>{`<UsersGroupsWidget title="Your staff" theme={{ accent: "#4f46e5" }} />`}</Code>
        </Step>

        <Step n="C6" title="See it — and crown the first admin">
          Restart <span className="font-mono text-xs">npm run dev</span>, open{" "}
          <span className="font-mono text-xs">http://localhost:3003/developers</span>,
          sign in with any name + email (e.g.{" "}
          <span className="font-mono text-xs">owner@nino.com</span>) — both widgets
          render. Users &amp; Groups will say <em>admin access pending</em>: the admin
          list is sealed from inside the widget on purpose. Crown the first admin
          from your terminal, then reload the widget:
          <Code label="your laptop — terminal">{`npx apiblaze admins add owner@nino.com --tenant nino`}</Code>
        </Step>
      </section>

      {/* ---------- PART D ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">
          Part D · Give Nino&apos;s storefront a real key
        </h3>

        <Step n="D1" title="Mint a data-plane key with the widget you just shipped">
          On <span className="font-mono text-xs">http://localhost:3003</span>, signed
          in as Nino&apos;s (restaurant <span className="font-mono text-xs">nino</span>),
          open <span className="font-medium">Developers → API access</span> and click{" "}
          <span className="font-medium">+ Create key</span>. Copy the key — a{" "}
          <em>data-plane</em> key: it lets an app <em>call</em> the API as
          Nino&apos;s, nothing more.
        </Step>

        <Step n="D2" title="Run Nino's storefront through your proxy">
          A fourth terminal:
          <Code label="your laptop — terminal">{`cd rr/nino

cat > .env.local <<EOF
RESIRESI_API_URL=https://resiresi0000.abz.run/1.0.0/prod
RESIRESI_API_KEY=<the key from D1>
RESIRESI_RESTAURANT_ID=nino
EOF

npm install
npm run dev`}</Code>
          Nino&apos;s is at <span className="font-mono text-xs">http://localhost:3001</span>.
        </Step>

        <Step n="D3" title="Who is calling? The storefront already tells you">
          Nino&apos;s has a simple email login, and its API client sends the signed-in
          email on <strong>every</strong> call — one shared app key, but the proxy
          knows which <em>person</em> each request acts for:
          <Code label="rr/nino/lib/api.ts — already in place, nothing to write">{`// The key says which APP is calling; X-End-User-Id says which PERSON.
headers: {
  "x-api-key": process.env.RESIRESI_API_KEY,   // the key from D1
  "X-End-User-Id": user.email,                 // "john@nino.com" or "maria@nino.com"
}`}</Code>
          Book a table on <span className="font-mono text-xs">http://localhost:3001</span>{" "}
          signed in as <span className="font-mono text-xs">john@nino.com</span>, then
          again as <span className="font-mono text-xs">maria@nino.com</span> — two
          people, one key, both attributed.
        </Step>
      </section>

      {/* ---------- PART E ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">
          Part E · Prove it: only John sees John&apos;s reservations
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Right now any caller with Nino&apos;s key can read <em>every</em>{" "}
          reservation. Fix that with an access rule, and verify the before/after.
        </p>

        <Step n="E1" title="BEFORE — John can see everyone's reservations">
          <Code label="your laptop — terminal">{`NINO_KEY="<the key from D1>"

curl "https://resiresi0000.abz.run/1.0.0/prod/v1/restaurants/nino/reservations" \\
  -H "X-API-Key: $NINO_KEY" \\
  -H "X-End-User-Id: john@nino.com"`}</Code>
          The response is every diner&apos;s reservations — John shouldn&apos;t see
          those.
        </Step>

        <Step n="E2" title="Put your reservation staff in a group">
          In <span className="font-medium">Users &amp; Groups</span> above, create a
          group called <span className="font-mono text-xs">reservationists</span> and
          add <span className="font-mono text-xs">maria@nino.com</span> to it.
          She&apos;s staff; John is just a diner.
        </Step>

        <Step n="E3" title="Chat the rule into place">
          Describe the policy in plain English and let the agent design and enable it:
          <Code label="your laptop — terminal">{`npx apiblaze agent authz resiresi0000`}</Code>
          <Code label="in the chat">{`On GET /restaurants/{restaurantId}/reservations: a caller may only see
reservations whose diner_external_id matches their X-End-User-Id —
unless they are in the "reservationists" group, who can see all of them.`}</Code>
        </Step>

        <Step n="E4" title="AFTER — John sees only John; Maria sees everything">
          <Code label="John — a diner: now only his own bookings">{`curl "https://resiresi0000.abz.run/1.0.0/prod/v1/restaurants/nino/reservations" \\
  -H "X-API-Key: $NINO_KEY" \\
  -H "X-End-User-Id: john@nino.com"`}</Code>
          <Code label="Maria — in the reservationists group: still sees all of them">{`curl "https://resiresi0000.abz.run/1.0.0/prod/v1/restaurants/nino/reservations" \\
  -H "X-API-Key: $NINO_KEY" \\
  -H "X-End-User-Id: maria@nino.com"`}</Code>
          Same key, same endpoint — the <em>person</em> and their <em>group</em> now
          decide what comes back. That&apos;s the whole exercise.
        </Step>
      </section>
    </div>
  );
}
