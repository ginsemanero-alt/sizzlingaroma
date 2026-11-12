import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homePathFor } from "@/lib/permissions";

export default async function Home() {
  const session = await getSession();
  if (!session || !session.profile.active) redirect("/login");
  redirect(homePathFor(session.profile.role));
}
