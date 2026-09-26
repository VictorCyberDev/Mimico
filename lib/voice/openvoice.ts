/**
 * OpenVoice on a hosted Hugging Face Space.
 *
 * The contract below was read off the live Space's own /info and /config
 * rather than assumed:
 *   Gradio 3.48.0, no named endpoints, one unnamed endpoint at fn_index 1,
 *   inputs  [Text Prompt, Style, Reference Audio, Agree]
 *   outputs [Info, Synthesised Audio, Reference Audio Used]
 *
 * Gradio 3.x serves this at POST /run/predict. The /gradio_api/* prefix is
 * Gradio 5 only, which is why the earlier calls 404'd.
 */
const SPACE = process.env.OPENVOICE_SPACE ?? "https://myshell-ai-openvoicev2.hf.space";
const FN_INDEX = Number(process.env.OPENVOICE_FN_INDEX ?? 1);
const STYLE = process.env.OPENVOICE_STYLE ?? "default";

export type CloneResult =
  | { ok: true; audio: Buffer; mime: string }
  | { ok: false; reason: string };

type GradioFile = { name?: string; data?: string | null; is_file?: boolean };

function authHeaders(): Record<string, string> {
  return process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {};
}

export async function synthesise({
  text,
  sample,
  sampleMime,
}: {
  text: string;
  sample: Buffer;
  sampleMime: string;
}): Promise<CloneResult> {
  try {
    const dataUri = `data:${sampleMime};base64,${sample.toString("base64")}`;

    const res = await fetch(`${SPACE}/run/predict`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        fn_index: FN_INDEX,
        data: [
          text,
          STYLE,
          { name: "reference.webm", data: dataUri, is_file: false },
          // The Space's own terms checkbox; it refuses to run unless set.
          true,
        ],
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: `Space returned ${res.status} ${body.slice(0, 120)}`.trim() };
    }

    const json = (await res.json()) as { data?: unknown[]; error?: string };
    if (json.error) return { ok: false, reason: `Space error: ${json.error.slice(0, 160)}` };
    if (!json.data?.length) return { ok: false, reason: "Space returned no data" };

    // data[0] is a human-readable Info string. OpenVoice uses it to explain
    // refusals (unclear audio, unsupported text), so surface it verbatim
    // rather than reporting a generic failure.
    const info = typeof json.data[0] === "string" ? json.data[0] : "";
    const audioOut = json.data[1] as GradioFile | string | null;

    if (!audioOut) {
      return { ok: false, reason: info ? `Space declined: ${info.slice(0, 160)}` : "Space returned no audio" };
    }

    const path = typeof audioOut === "string" ? audioOut : audioOut.name;
    if (!path) return { ok: false, reason: "Space returned no audio path" };

    const fileUrl = /^https?:/.test(path) ? path : `${SPACE}/file=${path}`;
    const file = await fetch(fileUrl, { headers: authHeaders(), signal: AbortSignal.timeout(30_000) });
    if (!file.ok) return { ok: false, reason: `Could not download rendered audio (${file.status})` };

    const audio = Buffer.from(await file.arrayBuffer());
    if (audio.byteLength < 1000) return { ok: false, reason: "Rendered audio came back empty" };

    return { ok: true, audio, mime: file.headers.get("content-type") ?? "audio/wav" };
  } catch (err) {
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return { ok: false, reason: reason.slice(0, 180) };
  }
}
