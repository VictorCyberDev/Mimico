import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth/session";

/**
 * Proxies a text + reference-clip pair to a public OpenVoice Space and
 * returns cloned audio.
 *
 * OpenVoice (myshell-ai) is MIT licensed, so it is clean for commercial use
 * in a way XTTS-v2's Coqui licence is not. It is called on a hosted Space
 * rather than self-hosted because there is no GPU on Vercel.
 *
 * The Space is configurable on purpose: public Spaces sleep, move and get
 * renamed. OPENVOICE_SPACE holds the base origin, OPENVOICE_FN the Gradio
 * endpoint name. Any failure here returns a non-2xx, and the client falls
 * back to the browser voice and says so on screen.
 */
export const maxDuration = 30;

const SPACE = process.env.OPENVOICE_SPACE ?? "https://myshell-ai-openvoice.hf.space";
const FN = process.env.OPENVOICE_FN ?? "/predict";

type Body = { text?: string; referenceAudio?: string; language?: string };

export async function POST(req: Request) {
  const session = await getSessionSafe(await headers());
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { text, referenceAudio, language = "English" } = (await req.json()) as Body;
  if (!text?.trim()) return Response.json({ error: "no text" }, { status: 400 });
  if (!referenceAudio) return Response.json({ error: "no reference clip" }, { status: 400 });

  const hfToken = process.env.HF_TOKEN;
  const authHeaders: Record<string, string> = hfToken ? { authorization: `Bearer ${hfToken}` } : {};

  try {
    // Gradio's HTTP API is two-step: POST queues the call and returns an
    // event id, GET streams the result back as SSE.
    const queued = await fetch(`${SPACE}/gradio_api/call${FN}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders },
      body: JSON.stringify({
        data: [text, language, { path: referenceAudio, meta: { _type: "gradio.FileData" } }, false],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!queued.ok) {
      const detail = await queued.text().catch(() => "");
      return Response.json(
        { error: `OpenVoice Space refused the request (${queued.status})`, detail: detail.slice(0, 300) },
        { status: 502 },
      );
    }

    const { event_id: eventId } = (await queued.json()) as { event_id?: string };
    if (!eventId) return Response.json({ error: "Space returned no event id" }, { status: 502 });

    const stream = await fetch(`${SPACE}/gradio_api/call${FN}/${eventId}`, {
      headers: authHeaders,
      signal: AbortSignal.timeout(25_000),
    });
    const body = await stream.text();

    // The SSE payload carries a `data: [...]` line holding the output audio.
    const line = body.split("\n").reverse().find((l) => l.startsWith("data: "));
    if (!line) return Response.json({ error: "Space returned no audio" }, { status: 502 });

    const parsed = JSON.parse(line.slice(6)) as unknown[];
    const audio = parsed.find(
      (v): v is { url?: string; path?: string } =>
        typeof v === "object" && v !== null && ("url" in v || "path" in v),
    );
    const url = audio?.url ?? (audio?.path ? `${SPACE}/gradio_api/file=${audio.path}` : null);
    if (!url) return Response.json({ error: "Space returned no audio url" }, { status: 502 });

    return Response.json({ url });
  } catch (err) {
    return Response.json(
      {
        error: "Could not reach the OpenVoice Space",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
