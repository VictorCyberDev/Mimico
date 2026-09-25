import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth/session";

/**
 * Mints a short-lived AssemblyAI streaming token (§ STT transport decision).
 *
 * Browsers cannot set headers on a WebSocket handshake, so AssemblyAI's own
 * documented pattern for browser clients is a temporary token passed as a
 * query param. That keeps the permanent key server-side and avoids holding a
 * WebSocket open in a Vercel function, which Hobby does not support.
 */
export const maxDuration = 15;

const EXPIRES_SECONDS = 120;

export async function GET() {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) return Response.json({ error: "ASSEMBLYAI_API_KEY is not set" }, { status: 500 });

  const res = await fetch(
    `https://streaming.assemblyai.com/v3/token?expires_in_seconds=${EXPIRES_SECONDS}`,
    { headers: { authorization: key } },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return Response.json(
      { error: `AssemblyAI refused the token request (${res.status})`, detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }

  const { token } = (await res.json()) as { token?: string };
  if (!token) return Response.json({ error: "AssemblyAI returned no token" }, { status: 502 });

  return Response.json({ token, expiresIn: EXPIRES_SECONDS });
}
