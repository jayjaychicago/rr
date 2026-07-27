import type { AppUser } from "apiblaze/server";
import { getTenantSlug } from "./tenant";
import { getUser } from "./user";

// APIblaze tenant = restaurant slug + this lab run's unique suffix (tenant
// names are globally unique across APIblaze, and a bare "nino" would pin to
// whatever tenant an EARLIER run mapped it to). nino -> ninosu94.
const TENANT_SUFFIX = "su94";

export function getApiblazeUser(): AppUser | null {
  const slug = getTenantSlug();
  const user = getUser();
  if (!slug || !user) return null;
  return { tenant: slug + TENANT_SUFFIX, userId: user.email, email: user.email };
}
