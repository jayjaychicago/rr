// The widget wiring the lab performs — the exact code the manual guide shows.
// Kept standalone so it's easy to test and reuse. wireWidgets(feDir) creates the
// three files and mounts the widgets on the Developers page. Idempotent.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const route = (factory) => `import { NextResponse } from "next/server";
import { ${factory} } from "apiblaze/server";
import { getApiblazeUser } from "@/lib/apiblaze-user";

let h: ReturnType<typeof ${factory}> | null = null;

function handler(req: Request) {
  const cpKey = process.env.APIBLAZE_CP_KEY;
  if (!cpKey) return NextResponse.json({ error: "APIBLAZE_CP_KEY not set" }, { status: 503 });
  h ??= ${factory}({ cpKey, getUser: () => getApiblazeUser() });
  return h.handler(req);
}

export const GET = handler;
export const POST = handler;
`;

export function wireWidgets(FE, suffix = "") {
  writeFileSync(
    join(FE, "lib/apiblaze-user.ts"),
    `import type { AppUser } from "apiblaze/server";
import { getTenantSlug } from "./tenant";
import { getUser } from "./user";

// APIblaze tenant = restaurant slug + this lab run's unique suffix (tenant
// names are globally unique across APIblaze, and a bare "nino" would pin to
// whatever tenant an EARLIER run mapped it to). nino -> nino${suffix}.
const TENANT_SUFFIX = "${suffix}";

export function getApiblazeUser(): AppUser | null {
  const slug = getTenantSlug();
  const user = getUser();
  if (!slug || !user) return null;
  return { tenant: slug + TENANT_SUFFIX, userId: user.email, email: user.email };
}
`,
  );

  mkdirSync(join(FE, "app/api/apiblaze/keys"), { recursive: true });
  mkdirSync(join(FE, "app/api/apiblaze/groups"), { recursive: true });
  writeFileSync(join(FE, "app/api/apiblaze/keys/route.ts"), route("createApiblazeKeys"));
  writeFileSync(join(FE, "app/api/apiblaze/groups/route.ts"), route("createApiblazeGroups"));

  const pagePath = join(FE, "app/developers/page.tsx");
  let page = readFileSync(pagePath, "utf8");
  if (!page.includes("apiblaze/react")) {
    page = `import { ApiKeyWidget, UsersGroupsWidget } from "apiblaze/react";\n` + page;
  }
  page = page.replace(
    /<Placeholder>\s*The API-key widget goes here[^<]*<\/Placeholder>/,
    `<ApiKeyWidget title="API keys" theme={{ accent: "#4f46e5" }} />`,
  );
  page = page.replace(
    /<Placeholder>\s*The users &amp; groups widget goes here[^<]*<\/Placeholder>/,
    `<UsersGroupsWidget theme={{ accent: "#4f46e5" }} defaultOpenGroup="reservationists" />`,
  );
  writeFileSync(pagePath, page);
}
