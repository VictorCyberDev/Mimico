/**
 * TEMPORARY diagnostic. This sandbox cannot reach huggingface.co, but Vercel
 * can, so this asks the deployment which OpenVoice Spaces are actually alive
 * and what API signature each exposes. Gated by a shared secret rather than
 * a session so it can be called without a browser.
 *
 * Delete once the working Space is pinned in OPENVOICE_SPACE / OPENVOICE_FN.
 */
export const maxDuration = 60;

const CANDIDATES = [
  "https://myshell-ai-openvoice.hf.space",
  "https://myshell-ai-openvoicev2.hf.space",
  "https://kevinwang676-openvoice.hf.space",
  "https://awacke1-cloneanyvoice.hf.space",
];

async function probe(base: string) {
  const out: Record<string, unknown> = { base };
  try {
    const root = await fetch(base, { method: "GET", signal: AbortSignal.timeout(12_000) });
    out.root = root.status;
  } catch (e) {
    out.root = e instanceof Error ? e.name : "failed";
  }

  for (const path of ["/gradio_api/info", "/info", "/config"]) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(12_000) });
      out[path] = res.status;
      if (res.ok) {
        const body = await res.text();
        try {
          const json = JSON.parse(body) as Record<string, unknown>;
          const named = (json.named_endpoints ?? {}) as Record<string, unknown>;
          const names = Object.keys(named);
          if (names.length) {
            out.endpoints = names;
            // Record the parameter shape of the first endpoint so the call
            // body can be built from fact rather than guessed.
            const first = named[names[0]] as { parameters?: { label?: string; type?: string }[] };
            out.firstSignature = first?.parameters?.map((p) => `${p.label}:${p.type}`);
          } else if (json.dependencies) {
            out.depCount = (json.dependencies as unknown[]).length;
          }
        } catch {
          out[`${path}_snippet`] = body.slice(0, 160);
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
  const results = await Promise.all(CANDIDATES.map(probe));
  return Response.json({ results }, { headers: { "cache-control": "no-store" } });
}
