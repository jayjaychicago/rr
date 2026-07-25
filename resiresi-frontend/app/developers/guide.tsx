import { REPO_URL, PROXY_NAME } from "@/lib/study-config";

function Code({ label, children }: { label?: string; children: string }) {
  return (
    <div className="mt-3">
      {label && (
        <div className="rounded-t-lg border-b border-slate-700 bg-slate-800 px-4 py-1.5 font-mono text-[11px] text-slate-300">
          {label}
        </div>
      )}
      <pre
        className={`overflow-x-auto bg-slate-900 px-4 py-3 text-xs leading-relaxed text-slate-100 ${
          label ? "rounded-b-lg" : "rounded-lg"
        }`}
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}

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

export function ImplementationGuide() {
  return (
    <div className="space-y-8">
      {/* ---------- PROMPT (automated path) ---------- */}
      <section className="card border-slate-300 p-6">
        <h3 className="text-base font-semibold">Prefer to watch it run? Paste this into Claude Code</h3>
        <p className="mt-1 text-sm text-slate-600">
          On a fresh machine with Node 20+ and{" "}
          <a href="https://claude.com/claude-code" className="text-brand-600 underline" target="_blank" rel="noreferrer">Claude Code</a>{" "}
          installed, paste the whole block below. It does the entire exercise —
          creates the proxy, clones and runs the apps, wires the widgets, and proves
          the access rule — reporting anything that fails. No APIblaze account needed.
        </p>
        <Code label="paste into Claude Code">{`Set up and verify a demo that puts APIblaze in front of an open restaurant
reservation API (ResiResi) and adds per-user access control. Run everything on
this machine and tell me the result of each step and anything that fails. No
APIblaze login/account is needed. Node 20+ required.

1. Create an anonymous APIblaze proxy (no login):
     npx apiblaze create --name resiresi-demo --target https://backend.resiresi.com --auth api_key --iam
   From the printed output note: PROD = the Proxy URL (ends in /prod, on *.tryabz.run)
   and DPKEY = the API key. If the name is taken, add a few digits and retry.

2. Smoke-test the proxy. The real API path is /v1/..., and send an end-user id:
     curl "$PROD/v1/restaurants/nino/reservations" -H "X-API-Key: $DPKEY" -H "X-End-User-Id: john@nino.com"
   Expect HTTP 200 and a JSON list of reservations.

3. Mint the widget control-plane key (still no login); save it as CPKEY:
     npx apiblaze apikeys mint --desc "resiresi widget key"

4. Clone and run the platform app:
     git clone https://github.com/jayjaychicago/rr
     cd rr/resiresi-frontend && npm install && npm install apiblaze
   Create rr/resiresi-frontend/.env.local containing:
     RESIRESI_API_URL=https://backend.resiresi.com
     APIBLAZE_CP_KEY=<CPKEY from step 3>

5. Wire the two widgets (create these three files, then mount the widgets):
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
     let k: ReturnType<typeof createApiblazeKeys> | null = null;
     function handler(req: Request) {
       const cpKey = process.env.APIBLAZE_CP_KEY;
       if (!cpKey) return NextResponse.json({ error: "APIBLAZE_CP_KEY not set" }, { status: 503 });
       k ??= createApiblazeKeys({ cpKey, getUser: () => getApiblazeUser() });
       return k.handler(req);
     }
     export const GET = handler; export const POST = handler;
   FILE app/api/apiblaze/groups/route.ts: same as keys/route.ts but import
   createApiblazeGroups and use it instead of createApiblazeKeys.
   EDIT app/developers/page.tsx: add at top
     import { ApiKeyWidget, UsersGroupsWidget } from "apiblaze/react";
   and replace the two <Placeholder>…</Placeholder> blocks with
     <ApiKeyWidget title="API keys" theme={{ accent: "#4f46e5" }} />
     <UsersGroupsWidget title="Your staff" theme={{ accent: "#4f46e5" }} />

6. Start it: npm run dev  (serves http://localhost:3003). Open
   http://localhost:3003/developers, sign in with any name + email (e.g.
   owner@nino.com), and confirm both widgets load. Users & Groups will say
   "admin access pending" — the admin list is sealed from inside the widget.
   Crown the first admin from the terminal, then reload the widget:
     npx apiblaze admins add owner@nino.com --tenant nino

7. Prove per-user access control:
   BEFORE — curl as john@nino.com (step 2 command) returns ALL reservations.
   In the Users & Groups widget, create a group "reservationists" and add
   maria@nino.com. Then set the rule:
     npx apiblaze agent authz resiresi-demo
   and tell it: "On GET /restaurants/{restaurantId}/reservations a caller sees only
   reservations whose diner_external_id equals their X-End-User-Id, unless they are
   in the reservationists group, who see all."
   AFTER — curl as john@nino.com returns only John's; as maria@nino.com returns all.

Report each step's outcome.`}</Code>
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
          storefront on top of your API). Your job is to wire{" "}
          <span className="font-semibold">APIblaze</span> into resiresi so that:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
          <li><span className="font-mono text-brand-600">a)</span> your tenants can mint their own API keys (the &quot;API access&quot; box above), and</li>
          <li><span className="font-mono text-brand-600">b)</span> they can organise their staff into groups (the &quot;Users &amp; Groups&quot; box above) —</li>
        </ul>
        <p className="mt-3 text-sm text-slate-700">
          then prove it works end to end: give Nino&apos;s storefront a real key, and
          set an access rule so a diner sees only their own reservations while
          reservation staff see everything.
        </p>
      </section>

      {/* ---------- PART A ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">Part A · Create your APIblaze proxy</h3>
        <p className="mt-1 text-sm text-slate-600">
          Do this first, on your own laptop. It puts APIblaze in front of the open
          reservation API and gives you the one key the widgets need — <strong>no
          account or login required</strong>. You&apos;ll need Node.js installed
          (<span className="font-mono text-xs">node -v</span>).
        </p>

        <Step n="A1" title="Create the proxy for the reservation API">
          No login — this spins up an anonymous workspace and points a proxy at the
          ResiResi backend.{" "}
          <span className="font-mono text-xs">--auth api_key</span> makes the keys the
          widget issues usable as an <span className="font-mono text-xs">X-API-Key</span>{" "}
          header. <span className="font-mono text-xs">--identified</span> means every
          call must also say which person it&apos;s for (the storefronts send{" "}
          <span className="font-mono text-xs">X-End-User-Id</span>);{" "}
          <span className="font-mono text-xs">--iam</span> makes your users &amp;
          groups actually apply to those calls. It prints your proxy URL and a claim
          link — you can <span className="font-mono text-xs">npx apiblaze login</span>{" "}
          and claim the workspace later if you want to keep it, but you don&apos;t need
          to for this exercise.
                    <p className="mt-2 text-xs text-slate-400">
            Copy the <span className="font-mono">/prod</span> URL it prints (on{" "}
            <span className="font-mono">*.tryabz.run</span>) — if the name{" "}
            <span className="font-mono">{PROXY_NAME}</span> was taken, yours will have
            a few digits added. Use your actual URL wherever the steps below show{" "}
            <span className="font-mono">{PROXY_NAME}.tryabz.run</span>.
          </p>
          <Code label="your laptop — terminal">{`npx apiblaze create --name ${PROXY_NAME} --target https://backend.resiresi.com --auth api_key --identified --iam`}</Code>
        </Step>

        <Step n="A2" title="Try it — chat with your API">
          Before wiring anything up, prove the proxy works by talking to it in plain
          English. This drops you into a chat that can actually call the reservation
          API.
          <Code label="your laptop — terminal">{`npx apiblaze apichat --target https://backend.resiresi.com`}</Code>
          Then, in the chat, list reservations, add one, and list again to see it
          appear:
          <Code label="in the chat">{`List the reservations for ${PROXY_NAME}
Add a reservation for 2 people at ${PROXY_NAME} tomorrow at 7pm for "Alex Rivera"
List the reservations for ${PROXY_NAME} again`}</Code>
        </Step>

        <Step n="A3" title="Mint the key the widgets will use">
          Still no login — this runs against the anonymous workspace you just made. It
          mints a scoped <strong>widget</strong> key — a manager credential with exactly{" "}
          {`{call, configure, issue-keys}`}, enough to provision users and issue keys but{" "}
          <em>not</em> a full owner/admin key. That&apos;s the right key to hand a
          website. It&apos;s shown <strong>once</strong> — copy the{" "}
          <span className="font-mono text-xs">key:</span> value; it&apos;s your{" "}
          <span className="font-mono text-xs">APIBLAZE_CP_KEY</span> for Part B.
          <Code label="your laptop — terminal">{`npx apiblaze apikeys mint --desc "resiresi widget key"`}</Code>
        </Step>
      </section>

      {/* ---------- PART B ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">Part B · Add the code, on your laptop</h3>
        <p className="mt-1 text-sm text-slate-600">
          Everything runs locally — no server, no SSH. You&apos;ll need Node.js 20+
          (<span className="font-mono text-xs">node -v</span>).
        </p>

        <Step n="B1" title="Clone the project and start it">
          Grab the code and run ResiResi on your machine. It comes up at{" "}
          <span className="font-mono text-xs">http://localhost:3003</span> and talks to
          the live open backend — no config needed.
          <Code label="your laptop — terminal">{`git clone ${REPO_URL}
cd rr/resiresi-frontend
npm install
npm run dev`}</Code>
        </Step>

        <Step n="B2" title="Install the APIblaze SDK">
          In a second terminal, still in{" "}
          <span className="font-mono text-xs">rr/resiresi-frontend</span>:
          <Code label="your laptop — terminal">{`npm install apiblaze`}</Code>
        </Step>

        <Step n="B3" title="Add your key">
          Create <span className="font-mono text-xs">.env.local</span> in{" "}
          <span className="font-mono text-xs">rr/resiresi-frontend</span> and paste the
          key from step A3. It stays on your machine and is never sent to the browser.
          Restart <span className="font-mono text-xs">npm run dev</span> after saving.
          <Code label="rr/resiresi-frontend/.env.local">{`RESIRESI_API_URL=https://backend.resiresi.com
APIBLAZE_CP_KEY=paste-the-key-from-step-A3-here`}</Code>
        </Step>

        <Step n="B4" title="Tell APIblaze who is logged in">
          Create this file. It turns the signed-in restaurant + email into the identity
          APIblaze authorizes on. Create the folder if needed:{" "}
          <span className="font-mono text-xs">mkdir -p lib</span>.
          <Code label="lib/apiblaze-user.ts">{`import type { AppUser } from "apiblaze/server";
import { getTenantSlug } from "./tenant";
import { getUser } from "./user";

export function getApiblazeUser(): AppUser | null {
  const tenant = getTenantSlug(); // "nino" / "gino" -> the APIblaze tenant
  const user = getUser();         // the signed-in email
  if (!tenant || !user) return null;
  return { tenant, userId: user.email, email: user.email };
}`}</Code>
        </Step>

        <Step n="B5" title="Add the two backend routes">
          These are the only things that hold the key. The browser widgets talk to
          these routes; the routes talk to APIblaze.
          <Code label="app/api/apiblaze/keys/route.ts">{`import { NextResponse } from "next/server";
import { createApiblazeKeys } from "apiblaze/server";
import { getApiblazeUser } from "@/lib/apiblaze-user";

let keys: ReturnType<typeof createApiblazeKeys> | null = null;

function handler(req: Request) {
  const cpKey = process.env.APIBLAZE_CP_KEY;
  if (!cpKey) {
    return NextResponse.json({ error: "APIBLAZE_CP_KEY is not set." }, { status: 503 });
  }
  keys ??= createApiblazeKeys({ cpKey, getUser: () => getApiblazeUser() });
  return keys.handler(req);
}

export const GET = handler;
export const POST = handler;`}</Code>
          <Code label="app/api/apiblaze/groups/route.ts">{`import { NextResponse } from "next/server";
import { createApiblazeGroups } from "apiblaze/server";
import { getApiblazeUser } from "@/lib/apiblaze-user";

let groups: ReturnType<typeof createApiblazeGroups> | null = null;

function handler(req: Request) {
  const cpKey = process.env.APIBLAZE_CP_KEY;
  if (!cpKey) {
    return NextResponse.json({ error: "APIBLAZE_CP_KEY is not set." }, { status: 503 });
  }
  groups ??= createApiblazeGroups({ cpKey, getUser: () => getApiblazeUser() });
  return groups.handler(req);
}

export const GET = handler;
export const POST = handler;`}</Code>
        </Step>

        <Step n="B6" title="Drop the widgets onto this page">
          Open <span className="font-mono text-xs">app/developers/page.tsx</span>. Add the
          import at the top, then replace each dotted placeholder with its widget.
          <Code label="app/developers/page.tsx — add at the top">{`import { ApiKeyWidget, UsersGroupsWidget } from "apiblaze/react";`}</Code>
          <Code label="app/developers/page.tsx — replace the two placeholders">{`{/* in the "API access" section */}
<ApiKeyWidget title="API keys" theme={{ accent: "#4f46e5" }} />

{/* in the "Users & Groups" section */}
<UsersGroupsWidget title="Your staff" theme={{ accent: "#4f46e5" }} />`}</Code>
        </Step>
      </section>

      {/* ---------- PART C ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">Part C · See it</h3>

        <Step n="C1" title="Open your local Developers page">
          Your <span className="font-mono text-xs">npm run dev</span> from B1 is already
          serving. Open{" "}
          <span className="font-mono text-xs">http://localhost:3003/developers</span>{" "}
          (sign in with any name + email) — the two dotted placeholders are now the real
          API-key and staff widgets, powered by the key you added in B4.
        </Step>

        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
          First time managing staff, the Users &amp; Groups widget says{" "}
          <em>admin access pending</em> — the admin list is sealed from inside the
          widget on purpose. Crown the first admin from your terminal (you hold the
          control-plane key), then reload the widget:
        </p>
        <Code label="your laptop — terminal">{`npx apiblaze admins add owner@nino.com --tenant nino`}</Code>
      </section>

      {/* ---------- PART D ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">
          Part D · Give Nino&apos;s storefront a real key
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Nino&apos;s Pizza storefront calls the open backend directly. Move it behind
          your proxy with a key <em>you</em> issued — running it locally too.
        </p>

        <Step n="D1" title="Mint a data-plane key with the widget you just shipped">
          On your local <span className="font-mono text-xs">http://localhost:3003</span>,
          sign in as Nino&apos;s (restaurant{" "}
          <span className="font-mono text-xs">nino</span>, any email, e.g.{" "}
          <span className="font-mono text-xs">owner@nino.com</span>), open{" "}
          <span className="font-medium">Developers → API access</span>, and click{" "}
          <span className="font-medium">+ Create key</span>. Copy the key — this is a{" "}
          <em>data-plane</em> key: it lets an app <em>call</em> the API as Nino&apos;s,
          nothing more.
        </Step>

        <Step n="D2" title="Run Nino's storefront against your proxy">
          Point Nino&apos;s at your proxy and hand it the key, then start it — a third
          terminal, one folder over:
          <Code label="your laptop — terminal">{`cd ../nino

cat > .env.local <<EOF
RESIRESI_API_URL=https://${PROXY_NAME}.tryabz.run/1.0.0/prod
RESIRESI_API_KEY=<the key from D1>
RESIRESI_RESTAURANT_ID=nino
EOF

npm install
npm run dev`}</Code>
        </Step>

        <Step n="D3" title="Who is calling? The storefront already tells you">
          Nino&apos;s has a simple email login, and its API client sends the signed-in
          email on <strong>every</strong> call — so your proxy knows which{" "}
          <em>person</em> each request acts for, even though all of them share one app
          key:
          <Code label="rr/nino/lib/api.ts — already in place, nothing to write">{`// The key says which APP is calling; X-End-User-Id says which PERSON.
headers: {
  "x-api-key": process.env.RESIRESI_API_KEY,   // the key from D1
  "X-End-User-Id": user.email,                 // "john@nino.com" or "maria@nino.com"
}`}</Code>
          Book a table on <span className="font-mono text-xs">http://localhost:3001</span> signed in as{" "}
          <span className="font-mono text-xs">john@nino.com</span>, then again as{" "}
          <span className="font-mono text-xs">maria@nino.com</span> — two people, one
          key, both attributed.
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
          Call the proxy as John. Note the list includes other diners&apos; bookings —
          that&apos;s the problem.
          <Code label="your laptop — terminal">{`NINO_KEY="<the key from D1>"

curl "https://${PROXY_NAME}.tryabz.run/1.0.0/prod/v1/restaurants/nino/reservations" \\
  -H "X-API-Key: $NINO_KEY" \\
  -H "X-End-User-Id: john@nino.com"`}</Code>
          The response is every diner’s reservations — John shouldn’t see those.
        </Step>

        <Step n="E2" title="Put your reservation staff in a group">
          In <span className="font-medium">Users &amp; Groups</span> above, create a
          group called <span className="font-mono text-xs">reservationists</span> and
          add <span className="font-mono text-xs">maria@nino.com</span> to it. She&apos;s
          staff; John is just a diner.
        </Step>

        <Step n="E3" title="Chat the rule into place">
          Describe the policy in plain English and let the agent design and enable it:
          <Code label="your laptop — terminal">{`npx apiblaze agent authz ${PROXY_NAME}`}</Code>
          <Code label="in the chat">{`On GET /restaurants/{restaurantId}/reservations: a caller may only see
reservations whose diner_external_id matches their X-End-User-Id —
unless they are in the "reservationists" group, who can see all of them.`}</Code>
        </Step>

        <Step n="E4" title="AFTER — John sees only John; Maria sees everything">
          Run the same two calls again:
          <Code label="John — a diner: now only his own bookings">{`curl "https://${PROXY_NAME}.tryabz.run/1.0.0/prod/v1/restaurants/nino/reservations" \\
  -H "X-API-Key: $NINO_KEY" \\
  -H "X-End-User-Id: john@nino.com"`}</Code>
          <Code label="Maria — in the reservationists group: still sees all of them">{`curl "https://${PROXY_NAME}.tryabz.run/1.0.0/prod/v1/restaurants/nino/reservations" \\
  -H "X-API-Key: $NINO_KEY" \\
  -H "X-End-User-Id: maria@nino.com"`}</Code>
          Same key, same endpoint — the <em>person</em> and their <em>group</em> now
          decide what comes back. That&apos;s the whole exercise.
        </Step>
      </section>

    </div>
  );
}
