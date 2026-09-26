import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth/session";
import { db, newId } from "@/lib/db";

export const maxDuration = 30;

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

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
 * Records a rendered line.
 *
 * The Space's endpoint is queued, so synthesis happens in the browser (see
 * lib/voice/openvoiceBrowser.ts) and the finished audio is posted here as
 * multipart. A JSON body means the preview voice was used and there is no
 * file to keep. The server deliberately does not call the Space itself: a
 * queued Gradio endpoint needs a websocket and can outrun the function's
 * 60s ceiling.
 */
export async function POST(req: Request) {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const id = newId("gen");
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const text = String(form.get("text") ?? "").trim();
    const voiceId = String(form.get("voiceId") ?? "") || null;
    const audio = form.get("audio");

    if (!text) return Response.json({ error: "Nothing to say." }, { status: 400 });
    if (!(audio instanceof File)) return Response.json({ error: "No audio supplied." }, { status: 400 });
    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json({ error: "That render is too large to keep." }, { status: 413 });
    }

    // Only accept a voice the caller actually owns.
    if (voiceId) {
      const { rowCount } = await db().query(
        `select 1 from "voice" where "id" = $1 and ("userId" = $2 or "userId" is null)`,
        [voiceId, session.user.id],
      );
      if (!rowCount) return Response.json({ error: "That voice no longer exists." }, { status: 404 });
    }

    await db().query(
      `insert into "generation" ("id","userId","voiceId","text","audioMime","audioData","source")
       values ($1,$2,$3,$4,$5,$6,'cloned')`,
      [id, session.user.id, voiceId, text, audio.type || "audio/wav", Buffer.from(await audio.arrayBuffer())],
    );
    return Response.json({ id, source: "cloned", downloadable: true }, { status: 201 });
  }

  const { text } = (await req.json()) as { text?: string };
  if (!text?.trim()) return Response.json({ error: "Nothing to say." }, { status: 400 });
  if (text.length > 1000) return Response.json({ error: "Keep it under 1000 characters." }, { status: 413 });

  await db().query(
    `insert into "generation" ("id","userId","voiceId","text","source") values ($1,$2,null,$3,'preview')`,
    [id, session.user.id, text],
  );
  return Response.json({ id, source: "preview", downloadable: false }, { status: 201 });
}
