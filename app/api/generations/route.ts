import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth/session";
import { db, newId } from "@/lib/db";

export const maxDuration = 45;

const SPACE = process.env.OPENVOICE_SPACE ?? "https://myshell-ai-openvoice.hf.space";
const FN = process.env.OPENVOICE_FN ?? "/predict";

export async function GET() {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await db().query(
    `select g."id", g."text", g."source", g."createdAt", g."voiceId",
            v."name" as "voiceName",
            (g."audioData" is not null) as "downloadable"
       from "generation" g
       left join "voice" v on v."id" = g."voiceId"
      where g."userId" = $1
      order by g."createdAt" desc
      limit 50`,
    [session.user.id],
  );
  return Response.json({ generations: rows });
}

/**
 * Renders a line in a chosen voice. A cloned voice goes to OpenVoice; if
 * that fails the row is still recorded with source 'preview' and no audio,
 * so the client knows to fall back to the browser voice AND the user can
 * see in the history that it was not actually their clone.
 */
export async function POST(req: Request) {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { text, voiceId } = (await req.json()) as { text?: string; voiceId?: string | null };
  if (!text?.trim()) return Response.json({ error: "Nothing to say." }, { status: 400 });
  if (text.length > 1000) {
    return Response.json({ error: "Keep it under 1000 characters." }, { status: 413 });
  }

  const id = newId("gen");

  // No cloned voice chosen: record the intent, let the client speak it.
  if (!voiceId) {
    await db().query(
      `insert into "generation" ("id","userId","voiceId","text","source") values ($1,$2,null,$3,'preview')`,
      [id, session.user.id, text],
    );
    return Response.json({ id, source: "preview", downloadable: false });
  }

  const { rows } = await db().query(
    `select "sampleMime","sampleAudio" from "voice"
      where "id" = $1 and ("userId" = $2 or "userId" is null)`,
    [voiceId, session.user.id],
  );
  const voice = rows[0];
  if (!voice) return Response.json({ error: "That voice no longer exists." }, { status: 404 });

  let audio: Buffer | null = null;
  let mime: string | null = null;
  let notice: string | null = null;

  try {
    const sampleB64 = Buffer.from(voice.sampleAudio).toString("base64");
    const queued = await fetch(`${SPACE}/gradio_api/call${FN}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        data: [
          text,
          "English",
          { url: `data:${voice.sampleMime ?? "audio/webm"};base64,${sampleB64}`, meta: { _type: "gradio.FileData" } },
          false,
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!queued.ok) throw new Error(`Space returned ${queued.status}`);

    const { event_id: eventId } = (await queued.json()) as { event_id?: string };
    if (!eventId) throw new Error("Space returned no event id");

    const streamed = await fetch(`${SPACE}/gradio_api/call${FN}/${eventId}`, {
      headers: process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {},
      signal: AbortSignal.timeout(30_000),
    });
    const body = await streamed.text();
    const line = body.split("\n").reverse().find((l) => l.startsWith("data: "));
    if (!line) throw new Error("Space returned no audio");

    const parsed = JSON.parse(line.slice(6)) as unknown[];
    const out = parsed.find(
      (v): v is { url?: string; path?: string } =>
        typeof v === "object" && v !== null && ("url" in v || "path" in v),
    );
    const url = out?.url ?? (out?.path ? `${SPACE}/gradio_api/file=${out.path}` : null);
    if (!url) throw new Error("Space returned no audio url");

    const fetched = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!fetched.ok) throw new Error(`Could not download the rendered audio (${fetched.status})`);
    audio = Buffer.from(await fetched.arrayBuffer());
    mime = fetched.headers.get("content-type") ?? "audio/wav";
  } catch (err) {
    notice = err instanceof Error ? err.message : String(err);
  }

  const source = audio ? "cloned" : "preview";
  await db().query(
    `insert into "generation" ("id","userId","voiceId","text","audioMime","audioData","source")
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [id, session.user.id, voiceId, text, mime, audio, source],
  );

  return Response.json({
    id,
    source,
    downloadable: Boolean(audio),
    // Surfaced in the UI, never swallowed: the user must know when the
    // clone did not actually run.
    notice: audio ? null : `Cloned voice unavailable (${notice}). Using the preview voice.`,
  });
}
