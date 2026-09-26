import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth/session";
import { db, newId } from "@/lib/db";

export const maxDuration = 30;

/** Reference clips are short by design; this stops a huge upload landing in a row. */
const MAX_SAMPLE_BYTES = 4 * 1024 * 1024;

export async function GET() {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { rows } = await db().query(
    `select "id", "name", "description", "kind", "createdAt",
            ("sampleAudio" is not null) as "hasSample"
       from "voice"
      where "userId" = $1 or "userId" is null
      order by ("userId" is null) asc, "createdAt" desc`,
    [session.user.id],
  );
  return Response.json({ voices: rows });
}

export async function POST(req: Request) {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;
  const sample = form.get("sample");

  if (!name) return Response.json({ error: "Give the voice a name." }, { status: 400 });
  if (!(sample instanceof File)) {
    return Response.json({ error: "No voice sample was recorded." }, { status: 400 });
  }
  if (sample.size > MAX_SAMPLE_BYTES) {
    return Response.json({ error: "That sample is too long. Aim for 10 to 20 seconds." }, { status: 413 });
  }
  if (sample.size < 4_000) {
    return Response.json(
      { error: "That sample is too short to clone from. Speak for at least a few seconds." },
      { status: 400 },
    );
  }

  const id = newId("voice");
  const bytes = Buffer.from(await sample.arrayBuffer());

  await db().query(
    `insert into "voice" ("id","userId","name","description","kind","sampleMime","sampleAudio")
     values ($1,$2,$3,$4,'cloned',$5,$6)`,
    [id, session.user.id, name, description, sample.type || "audio/webm", bytes],
  );

  return Response.json({ id, name, description, kind: "cloned", hasSample: true }, { status: 201 });
}
