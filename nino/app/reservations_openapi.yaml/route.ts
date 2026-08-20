import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /reservations_openapi.yaml — the reservation API's own OpenAPI document,
 * served from the storefront's origin.
 *
 * Proxied on each request rather than copied into this repo: the spec is the
 * thing a proxy is built FROM (`apiblaze create --openapi …`), so a stale copy
 * would quietly hand out the wrong upstream or a route list that no longer
 * matches. Whatever the backend publishes is what this returns.
 *
 * It follows RESIRESI_API_URL, so it always describes the same backend this
 * storefront is actually calling — pointing the app at a different one moves
 * this with it.
 */
const ORIGIN = (process.env.RESIRESI_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

const YAML = "application/yaml; charset=utf-8";

export async function GET() {
  const upstream = `${ORIGIN}/openapi.yaml`;

  let res: Response;
  try {
    res = await fetch(upstream, {
      cache: "no-store",
      headers: { accept: "application/yaml, text/yaml, application/json, */*" },
    });
  } catch {
    // A comment is valid YAML, so the failure is still parseable by whatever
    // asked for a spec — and it names the address that did not answer.
    return new NextResponse(`# The reservation API at ${ORIGIN} did not answer.\n`, {
      status: 502,
      headers: { "Content-Type": YAML, "Cache-Control": "no-store" },
    });
  }

  if (!res.ok) {
    return new NextResponse(
      `# The reservation API at ${ORIGIN} answered ${res.status} for /openapi.yaml.\n`,
      { status: 502, headers: { "Content-Type": YAML, "Cache-Control": "no-store" } },
    );
  }

  return new NextResponse(await res.text(), {
    status: 200,
    headers: { "Content-Type": YAML, "Cache-Control": "no-store" },
  });
}
