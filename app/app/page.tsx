import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/auth/session";
import { listVoices, listGenerations } from "@/lib/voice/queries";
import { ConciergeClient } from "./ConciergeClient";

export const metadata = { title: "Concierge — Mimico" };

export default async function AppPage() {
  const session = await getSessionSafe(await headers());
  if (!session) redirect("/login");

  // Read both in parallel; a database hiccup degrades to an empty studio
  // rather than a 500 on the whole app.
  const [voices, generations] = await Promise.all([
    listVoices(session.user.id).catch(() => []),
    listGenerations(session.user.id).catch(() => []),
  ]);

  return <ConciergeClient initialVoices={voices} initialGenerations={generations} />;
}
