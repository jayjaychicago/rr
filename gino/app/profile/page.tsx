import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser, getDinerId } from "@/lib/session";
import { getProfileFromDb } from "@/lib/profile";
import { parseConfig, COOKIE_NAME } from "@/lib/apiblaze";
import { ProfileForm } from "@/components/ProfileForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

const OWN_PROXY_URL = "https://gino-api.apiblaze.com";

export default async function ProfilePage() {
  const user = getUser();
  if (!user) redirect("/auth/signin?callbackUrl=/profile");

  const dinerId = getDinerId(user);

  const cookieStore = cookies();
  const config = parseConfig(cookieStore.get(COOKIE_NAME)?.value);
  const apiBaseUrl = config.ownBackend === "proxy" ? OWN_PROXY_URL : "";

  let profile = null;
  try {
    profile = await getProfileFromDb(dinerId);
  } catch {
    // DATABASE_URL not configured — render empty form
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-serif text-4xl font-bold mb-2">My Profile</h1>
      <p className="text-stone-500 mb-10">{user.email}</p>
      <ProfileForm initialData={profile} apiBaseUrl={apiBaseUrl} />
    </div>
  );
}
