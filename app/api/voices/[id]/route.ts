import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: RouteContext<"/api/voices/[id]">) {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  // Scoped to the owner, so one user can never delete another's voice and
  // preset rows (userId null) are not deletable at all.
  const { rowCount } = await db().query(
    `delete from "voice" where "id" = $1 and "userId" = $2`,
    [id, session.user.id],
  );
  if (!rowCount) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ ok: true });
}

export async function GET(_req: Request, { params }: RouteContext<"/api/voices/[id]">) {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { rows } = await db().query(
    `select "sampleMime","sampleAudio" from "voice"
      where "id" = $1 and ("userId" = $2 or "userId" is null)`,
    [id, session.user.id],
  );
  const row = rows[0];
  if (!row?.sampleAudio) return Response.json({ error: "not found" }, { status: 404 });

  return new Response(new Uint8Array(row.sampleAudio), {
    headers: {
      "content-type": row.sampleMime ?? "audio/webm",
      "cache-control": "private, max-age=3600",
    },
  });
}
