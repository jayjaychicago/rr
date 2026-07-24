import { EC2, PROXY_NAME } from "@/lib/study-config";

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
  const sshKey = `~/.ssh/${EC2.keyFile}`;
  const sshTarget = `${EC2.user}@${EC2.host}`;

  return (
    <div className="space-y-8">
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
          reservation API and gives you the one key the widgets need. You&apos;ll need
          Node.js installed (<span className="font-mono text-xs">node -v</span>).
        </p>

        <Step n="A1" title="Log in to APIblaze">
          Opens a browser to sign in (or create an account). Log in first so the proxy
          and key you make next belong to your account (skip it and you&apos;d get an
          anonymous proxy to claim later — and step A3 needs an account anyway).
          <Code label="your laptop — terminal">{`npx apiblaze login`}</Code>
        </Step>

        <Step n="A2" title="Create the proxy for the reservation API">
          Points a new proxy at the ResiResi backend.{" "}
          <span className="font-mono text-xs">--auth api_key</span> makes the keys the
          widget issues usable as an <span className="font-mono text-xs">X-API-Key</span>{" "}
          header. <span className="font-mono text-xs">--identified</span> means every
          call must also say which person it&apos;s for (the storefronts send{" "}
          <span className="font-mono text-xs">X-End-User-Id</span>);{" "}
          <span className="font-mono text-xs">--iam</span> makes your users &amp;
          groups actually apply to those calls. It prints your proxy URL and a dev
          portal link.
          <Code label="your laptop — terminal">{`npx apiblaze create --name ${PROXY_NAME} --target https://backend.resiresi.com --auth api_key --identified --iam`}</Code>
        </Step>

        <Step n="A3" title="Try it — chat with your API">
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

        <Step n="A4" title="Mint the key the widgets will use">
          This mints a scoped <strong>widget</strong> key — a manager credential with
          exactly {`{call, configure, issue-keys}`}, enough to provision users and issue
          keys but <em>not</em> a full owner/admin key. That&apos;s the right key to
          hand a website. It&apos;s shown <strong>once</strong> — copy the{" "}
          <span className="font-mono text-xs">key:</span> value; it&apos;s your{" "}
          <span className="font-mono text-xs">APIBLAZE_CP_KEY</span> for Part B.
          <Code label="your laptop — terminal">{`npx apiblaze apikeys mint --desc "resiresi widget key"`}</Code>
        </Step>
      </section>

      {/* ---------- PART B ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">Part B · Add the code on the server</h3>
        <p className="mt-1 text-sm text-slate-600">
          You were given one file — an SSH key called{" "}
          <span className="font-mono text-xs">{EC2.keyFile}</span>. Everything below
          uses it.
        </p>

        <Step n="B1" title="Save the key and connect">
          Lock the key down first — SSH refuses a key that others could read. (The
          login user is <span className="font-mono text-xs">ubuntu</span> on Ubuntu
          servers, <span className="font-mono text-xs">ec2-user</span> on Amazon Linux.)
          <Code label="your laptop — terminal">{`mv ~/Downloads/${EC2.keyFile} ~/.ssh/
chmod 400 ${sshKey}

ssh -i ${sshKey} ${sshTarget}`}</Code>
        </Step>

        <Step n="B2" title="Open the project">
          You&apos;re now on the server. Go to the app and confirm a clean checkout.
          <Code label={`${sshTarget} — terminal`}>{`cd ${EC2.dir}
git status`}</Code>
        </Step>

        <Step n="B3" title="Install the APIblaze SDK">
          <Code label={`${sshTarget} — terminal`}>{`npm install apiblaze`}</Code>
        </Step>

        <Step n="B4" title="Add your key">
          Paste the key from step A4. It stays on the server and is never sent to the
          browser.
          <Code label=".env.local">{`RESIRESI_API_URL=https://backend.resiresi.com
APIBLAZE_CP_KEY=paste-the-key-from-step-A4-here`}</Code>
        </Step>

        <Step n="B5" title="Tell APIblaze who is logged in">
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

        <Step n="B6" title="Add the two backend routes">
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

        <Step n="B7" title="Drop the widgets onto this page">
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
        <h3 className="text-base font-semibold">Part C · See it, then ship it</h3>

        <Step n="C1" title="Run it and watch your changes">
          On the server, start the app. Then, from your laptop, forward the port and
          open it in your browser.
          <Code label={`${sshTarget} — terminal`}>{`./scripts/preview.sh`}</Code>
          <Code label="your laptop — a second terminal">{`ssh -i ${sshKey} -L 3003:localhost:3003 ${sshTarget}
# then open http://localhost:3003/developers`}</Code>
          The two placeholders are now the real API-key and staff widgets.
        </Step>

        <Step n="C2" title="Publish it live">
          When it looks right, ship it.
          <Code label={`${sshTarget} — terminal`}>{`./scripts/deploy.sh`}</Code>
        </Step>

        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
          First time managing staff, the Users &amp; Groups widget may say{" "}
          <em>admin access pending</em> — add your own email as an admin from inside the
          widget (you hold the control-plane key, so you can), then reload.
        </p>
      </section>

      {/* ---------- PART D ---------- */}
      <section className="card p-6">
        <h3 className="text-base font-semibold">
          Part D · Give Nino&apos;s storefront a real key
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Nino&apos;s Pizza (www.ninopizzas.com) currently calls the open backend
          directly. Move it behind your proxy with a key <em>you</em> issued.
        </p>

        <Step n="D1" title="Mint a data-plane key with the widget you just shipped">
          Sign in to www.resiresi.com as Nino&apos;s (restaurant{" "}
          <span className="font-mono text-xs">nino</span>, any email you like, e.g.{" "}
          <span className="font-mono text-xs">owner@nino.com</span>), open{" "}
          <span className="font-medium">Developers → API access</span>, and click{" "}
          <span className="font-medium">+ Create key</span>. Copy the key — this is a{" "}
          <em>data-plane</em> key: it lets an app <em>call</em> the API as Nino&apos;s,
          nothing more.
        </Step>

        <Step n="D2" title="Wire it into ninopizzas.com">
          Point the storefront at your proxy and hand it the key. Same server, one
          folder over:
          <Code label={`${sshTarget} — terminal`}>{`cd /home/ubuntu/code/rr/nino

npx vercel env rm RESIRESI_API_URL production --yes
printf 'https://${PROXY_NAME}.abz.run/1.0.0/prod' | npx vercel env add RESIRESI_API_URL production
printf '<the key from D1>' | npx vercel env add RESIRESI_API_KEY production

npx vercel deploy --prod --yes`}</Code>
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
          Book a table on www.ninopizzas.com signed in as{" "}
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

curl "https://${PROXY_NAME}.abz.run/1.0.0/prod/restaurants/nino/reservations" \\
  -H "X-API-Key: $NINO_KEY" \\
  -H "X-End-User-Id: john@nino.com"
# → every diner's reservations. John shouldn't see these.`}</Code>
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
          <Code label="your laptop — terminal">{`# John (a diner): now only his own bookings
curl "https://${PROXY_NAME}.abz.run/1.0.0/prod/restaurants/nino/reservations" \\
  -H "X-API-Key: $NINO_KEY" \\
  -H "X-End-User-Id: john@nino.com"

# Maria (in the reservationists group): still sees all of them
curl "https://${PROXY_NAME}.abz.run/1.0.0/prod/restaurants/nino/reservations" \\
  -H "X-API-Key: $NINO_KEY" \\
  -H "X-End-User-Id: maria@nino.com"`}</Code>
          Same key, same endpoint — the <em>person</em> and their <em>group</em> now
          decide what comes back. That&apos;s the whole exercise.
        </Step>
      </section>

      {/* ---------- MODERATOR FOOTER ---------- */}
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-400">
        Study moderator only — reset between testers: on the study EC2 run{" "}
        <span className="font-mono">cd /home/ubuntu/code/rr &amp;&amp; ./study-reset.sh</span>{" "}
        before handing over and again after the session (reverts the code to the{" "}
        <span className="font-mono">study-baseline</span> tag and redeploys resiresi,
        nino and gino). The baseline itself was captured once with{" "}
        <span className="font-mono">./study-snapshot.sh</span>. The tester&apos;s own
        APIblaze account, proxy and keys live in <em>their</em> workspace and need no
        cleanup.
      </p>
    </div>
  );
}
