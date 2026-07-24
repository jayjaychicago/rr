import { redirect } from "next/navigation";
import { getTenantSlug } from "@/lib/tenant";
import { getUser } from "@/lib/user";

export default function Home() {
  if (!getTenantSlug()) redirect("/login");
  if (!getUser()) redirect("/signin");
  redirect("/developers");
}
