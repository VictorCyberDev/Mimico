import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: RouteContext<"/api/generations/[id]/audio">) {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { rows } = await db().query(
    `select "audioMime","audioData","text" from "generation" where "id" = $1 and "userId" = $2`,
    [id, session.user.id],
  );
  const row = rows[0];
  if (!row?.audioData) {
    return Response.json({ error: "No downloadable audio for that line." }, { status: 404 });
  }

  const slug = String(row.text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "mimico";
  const ext = (row.audioMime ?? "audio/wav").includes("mpeg") ? "mp3" : "wav";

  return new Response(new Uint8Array(row.audioData), {
    headers: {
      "content-type": row.audioMime ?? "audio/wav",
      "content-disposition": `attachment; filename="${slug}.${ext}"`,
      "cache-control": "private, max-age=3600",
    },
  });
}
