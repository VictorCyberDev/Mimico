import { db } from "@/lib/db";
import type { GenerationRow, VoiceRow } from "@/components/voice/VoiceStudio";

/**
 * Server-side reads for the studio's first paint. Loading this on the server
 * means the page arrives populated instead of flashing an empty dashboard
 * while a client effect fetches.
 */
export async function listVoices(userId: string): Promise<VoiceRow[]> {
  const { rows } = await db().query(
    `select "id", "name", "description", "kind", ("sampleAudio" is not null) as "hasSample"
       from "voice"
      where "userId" = $1 or "userId" is null
      order by ("userId" is null) asc, "createdAt" desc`,
    [userId],
  );
  return rows as VoiceRow[];
}

export async function listGenerations(userId: string): Promise<GenerationRow[]> {
  const { rows } = await db().query(
    `select g."id", g."text", g."source", g."createdAt", v."name" as "voiceName",
            (g."audioData" is not null) as "downloadable"
       from "generation" g
       left join "voice" v on v."id" = g."voiceId"
      where g."userId" = $1
      order by g."createdAt" desc
      limit 50`,
    [userId],
  );
  return rows.map((r) => ({ ...r, createdAt: String(r.createdAt) })) as GenerationRow[];
}
