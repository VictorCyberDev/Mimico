import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/auth/session";

/**
 * The gated shell. proxy.ts already turned anonymous traffic away; this is
 * the redundant server-side check §2 asks for, so a session is proven again
 * at render time rather than assumed from the fact that the request arrived.
 */
export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const session = await getSessionSafe(await headers());
  if (!session) redirect("/login");

  return <div className="flex min-h-[100dvh] flex-col">{children}</div>;
}
