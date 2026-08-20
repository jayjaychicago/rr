import { NextResponse } from "next/server";

/**
 * The reservation API's own OpenAPI document, proxied from whatever backend this
 * storefront is configured against (RESIRESI_API_URL).
 *
 * Proxied per request rather than copied into the repo: the spec is the thing a
 * proxy gets built FROM (`apiblaze create --openapi …`), so a stale copy would
 * quietly hand out the wrong upstream or a route list the backend no longer
 * serves.
 *
 * Served at BOTH /reservations_openapi.yaml and /openapi.yaml. The second is the
 * path everyone guesses first — and guessing wrong here is expensive, because
 * the 404 is an HTML page, so a tool that asked for a spec reports the confusing
 * "did not return a valid OpenAPI document" rather than "no such URL".
 */
const ORIGIN = (process.env.RESIRESI_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

const YAML = "application/yaml; charset=utf-8";
const NO_STORE = { "Content-Type": YAML, "Cache-Control": "no-store" };

export async function serveReservationsSpec() {
  const upstream = `${ORIGIN}/openapi.yaml`;

  let res: Response;
  try {
    res = await fetch(upstream, {
      cache: "no-store",
      headers: { accept: "application/yaml, text/yaml, application/json, */*" },
    });
  } catch {
    // A comment is valid YAML, so whatever asked for a spec still gets something
    // it can parse — and it names the address that did not answer.
    return new NextResponse(`# The reservation API at ${ORIGIN} did not answer.\n`, {
      status: 502,
      headers: NO_STORE,
    });
  }

  if (!res.ok) {
    return new NextResponse(
      `# The reservation API at ${ORIGIN} answered ${res.status} for /openapi.yaml.\n`,
      { status: 502, headers: NO_STORE },
    );
  }

  return new NextResponse(await res.text(), { status: 200, headers: NO_STORE });
}
