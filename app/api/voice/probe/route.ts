/**
 * TEMPORARY diagnostic. This sandbox cannot reach huggingface.co, but Vercel
 * can, so this asks the deployment which OpenVoice Spaces are actually alive
 * and what API signature each exposes. Gated by a shared secret rather than
 * a session so it can be called without a browser.
 *
 * Delete once the working Space is pinned in OPENVOICE_SPACE / OPENVOICE_FN.
 */
export const maxDuration = 60;

import { db } from "@/lib/db";
import { synthesise } from "@/lib/voice/openvoice";

const CANDIDATES = [
  "https://myshell-ai-openvoice.hf.space",
  "https://myshell-ai-openvoicev2.hf.space",
];

async function probe(base: string) {
  const out: Record<string, unknown> = { base };
  try {
    const root = await fetch(base, { method: "GET", signal: AbortSignal.timeout(12_000) });
    out.root = root.status;
  } catch (e) {
    out.root = e instanceof Error ? e.name : "failed";
  }

  for (const path of ["/info", "/config"]) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(12_000) });
      out[path] = res.status;
      if (res.ok) {
        const body = await res.text();
        try {
          const json = JSON.parse(body) as Record<string, unknown>;
          if (path === "/info") {
            const named = (json.named_endpoints ?? {}) as Record<string, unknown>;
            const unnamed = (json.unnamed_endpoints ?? {}) as Record<string, unknown>;
            out.namedEndpoints = Object.keys(named);
            out.unnamedEndpoints = Object.keys(unnamed);
            const pick = (Object.values(named)[0] ?? Object.values(unnamed)[0]) as
              | { parameters?: { label?: string; type?: string; python_type?: { type?: string } }[];
                  returns?: { label?: string; type?: string }[] }
              | undefined;
            out.signature = pick?.parameters?.map(
              (x) => `${x.label}:${x.type ?? x.python_type?.type}`,
            );
            out.returns = pick?.returns?.map((x) => `${x.label}:${x.type}`);
          } else {
            out.gradioVersion = json.version;
            const deps = (json.dependencies ?? []) as { api_name?: string | null }[];
            out.apiNames = deps.map((d) => d.api_name ?? null);
          }
        } catch {
          out[`${path}_snippet`] = body.slice(0, 200);
        }
      }
    } catch (e) {
      out[path] = e instanceof Error ? e.name : "failed";
    }
  }
  return out;
}

export async function GET(req: Request) {
  const secret = process.env.PROBE_SECRET;
  const given = new URL(req.url).searchParams.get("k");
  if (!secret || given !== secret) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);

  // ?live=1 runs a real synthesis against a stored voice sample, which is
  // the only way to prove the call body is right end to end.
  if (url.searchParams.get("live") === "1") {
    const { rows } = await db().query(
      `select "id","name","sampleMime","sampleAudio" from "voice"
        where "sampleAudio" is not null order by "createdAt" desc limit 1`,
    );
    const voice = rows[0];
    if (!voice) return Response.json({ live: "no stored voice to test with" });

    const started = Date.now();
    const out = await synthesise({
      text: "This is a test of the cloned voice.",
      sample: Buffer.from(voice.sampleAudio),
      sampleMime: voice.sampleMime ?? "audio/webm",
    });
    return Response.json(
      {
        live: {
          voice: voice.name,
          sampleBytes: voice.sampleAudio.length,
          sampleMime: voice.sampleMime,
          ms: Date.now() - started,
          ...(out.ok ? { ok: true, audioBytes: out.audio.byteLength, mime: out.mime } : { ok: false, reason: out.reason }),
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const results = await Promise.all(CANDIDATES.map(probe));
  return Response.json({ results }, { headers: { "cache-control": "no-store" } });
}
