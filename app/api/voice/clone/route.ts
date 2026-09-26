import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { synthesise } from "@/lib/voice/openvoice";

/**
 * Renders one line in a saved voice for the live talk loop and streams the
 * audio straight back. Same OpenVoice path as /api/generations, so there is
 * one implementation of the Space contract rather than two that drift.
 */
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { text, voiceId } = (await req.json()) as { text?: string; voiceId?: string };
  if (!text?.trim()) return Response.json({ error: "no text" }, { status: 400 });
  if (!voiceId) return Response.json({ error: "no voice selected" }, { status: 400 });

  const { rows } = await db().query(
    `select "sampleMime","sampleAudio" from "voice"
      where "id" = $1 and ("userId" = $2 or "userId" is null)`,
    [voiceId, session.user.id],
  );
  const voice = rows[0];
  if (!voice?.sampleAudio) return Response.json({ error: "That voice has no sample." }, { status: 404 });

  const result = await synthesise({
    text,
    sample: Buffer.from(voice.sampleAudio),
    sampleMime: voice.sampleMime ?? "audio/webm",
  });

  if (!result.ok) return Response.json({ error: result.reason }, { status: 502 });

  return new Response(new Uint8Array(result.audio), {
    headers: { "content-type": result.mime, "cache-control": "no-store" },
  });
}
