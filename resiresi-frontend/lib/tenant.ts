import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRestaurant, type Restaurant } from "./api";

export const TENANT_COOKIE = "resiresi_tenant";

/**
 * "Login" here means: which restaurant am I working as. There are no roles and
 * no permission checks — every signed-in tenant has the same abilities, scoped
 * to their own restaurant.
 */
export function getTenantSlug(): string | null {
  return cookies().get(TENANT_COOKIE)?.value ?? null;
}

export async function requireTenant(): Promise<Restaurant> {
  const slug = getTenantSlug();
  if (!slug) redirect("/login");
  try {
    return await getRestaurant(slug);
  } catch {
    // Stale cookie (restaurant renamed or reseeded) — send them back to pick again.
    redirect("/login");
  }
}
