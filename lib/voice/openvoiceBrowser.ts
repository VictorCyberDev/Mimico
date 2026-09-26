"use client";

/**
 * OpenVoice from the browser, over the Gradio 3 queue.
 *
 * Read off the live Space: Gradio 3.48.0, enable_queue true, one unnamed
 * endpoint at fn_index 1 whose own queue flag is null (so it inherits the
 * global queue). A queued endpoint ignores POST /run/predict and hangs,
 * which is exactly what a server-side call did until it timed out.
 *
 * This runs client-side on purpose. The queue is a websocket, and a free
 * CPU Space can take well over a minute; a Vercel Hobby function caps at
 * 60s and cannot hold a socket open anyway. The browser has neither limit.
 */
const SPACE = process.env.NEXT_PUBLIC_OPENVOICE_SPACE ?? "https://myshell-ai-openvoicev2.hf.space";
const FN_INDEX = 1;

/**
 * Styles are language-scoped. The Space rejects a bare "default" for
 * English and names the set it accepts, so these are its own values.
 */
export const EN_STYLES = ["en_default", "en_us", "en_br", "en_au", "en_in"] as const;
export type EnStyle = (typeof EN_STYLES)[number];

export const STYLE_LABELS: Record<EnStyle, string> = {
  en_default: "Default",
  en_us: "American",
  en_br: "British",
  en_au: "Australian",
  en_in: "Indian",
};

/**
 * OpenVoice refuses very short prompts with "Please give a longer prompt
 * text". Checked before joining the queue so a doomed request never costs
 * a queue slot or a minute of the user's time.
 */
export const MIN_PROMPT_CHARS = 30;

export type BrowserCloneResult =
  | { ok: true; blob: Blob }
  | { ok: false; reason: string };

function sessionHash(): string {
  return Math.random().toString(36).slice(2, 13);
}

async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Could not read the voice sample."));
    fr.readAsDataURL(blob);
  });
}

export async function synthesiseInBrowser({
  text,
  voiceId,
  style = "en_default",
  onProgress,
  timeoutMs = 180_000,
}: {
  text: string;
  voiceId: string;
  style?: EnStyle;
  onProgress?: (stage: string) => void;
  timeoutMs?: number;
}): Promise<BrowserCloneResult> {
  if (text.trim().length < MIN_PROMPT_CHARS) {
    return {
      ok: false,
      reason: `The voice model needs at least ${MIN_PROMPT_CHARS} characters to clone from. Try a longer sentence.`,
    };
  }

  const held: { ws: WebSocket | null } = { ws: null };
  try {
    onProgress?.("Fetching your voice sample…");
    const sampleRes = await fetch(`/api/voices/${voiceId}`);
    if (!sampleRes.ok) return { ok: false, reason: "Could not load that voice sample." };
    const dataUri = await blobToDataUri(await sampleRes.blob());

    const hash = sessionHash();
    const wsUrl = `${SPACE.replace(/^http/, "ws")}/queue/join`;

    onProgress?.("Waiting for the voice model…");

    const outputPath = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("The voice model did not answer in time.")),
        timeoutMs,
      );
      const done = (fn: () => void) => {
        clearTimeout(timer);
        fn();
      };

      const socket = new WebSocket(wsUrl);
      held.ws = socket;

      socket.onerror = () => done(() => reject(new Error("Could not reach the voice model.")));
      socket.onclose = (e) => {
        if (e.code !== 1000) done(() => reject(new Error(`Voice model closed the connection (${e.code}).`)));
      };

      socket.onmessage = (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }

        switch (msg.msg) {
          case "send_hash":
            socket.send(JSON.stringify({ fn_index: FN_INDEX, session_hash: hash }));
            break;

          case "estimation": {
            const rank = typeof msg.rank === "number" ? msg.rank : null;
            onProgress?.(rank && rank > 0 ? `Queued behind ${rank}…` : "Queued…");
            break;
          }

          case "send_data":
            onProgress?.("Sending your sample…");
            socket.send(
              JSON.stringify({
                fn_index: FN_INDEX,
                session_hash: hash,
                data: [
                  text,
                  style,
                  { name: "reference.webm", data: dataUri, is_file: false },
                  // The Space's own terms checkbox; it refuses to run without it.
                  true,
                ],
              }),
            );
            break;

          case "process_starts":
            onProgress?.("Cloning your voice…");
            break;

          case "process_completed": {
            const out = msg.output as { data?: unknown[]; error?: string } | undefined;
            if (msg.success === false || out?.error) {
              done(() => reject(new Error(out?.error ?? "The voice model refused that request.")));
              return;
            }
            const data = out?.data ?? [];
            // data[0] is the Space's Info string, where it explains refusals.
            const info = typeof data[0] === "string" ? data[0] : "";
            const audio = data[1] as { name?: string } | string | null;
            const path = typeof audio === "string" ? audio : audio?.name;
            // Info carries [ERROR] even when a path comes back, so trust it
            // over the presence of a file.
            const failed = /\[ERROR\]/i.test(info);
            if (!path || failed) {
              const detail = info.replace(/\s+/g, " ").trim();
              done(() =>
                reject(new Error(detail ? `Voice model declined: ${detail}` : "No audio came back.")),
              );
              return;
            }
            done(() => resolve(path));
            break;
          }
        }
      };
    });

    held.ws?.close();

    onProgress?.("Downloading the result…");
    const fileUrl = /^https?:/.test(outputPath) ? outputPath : `${SPACE}/file=${outputPath}`;
    const file = await fetch(fileUrl);
    if (!file.ok) return { ok: false, reason: `Could not download the rendered audio (${file.status}).` };

    const blob = await file.blob();
    if (blob.size < 1000) return { ok: false, reason: "The rendered audio came back empty." };

    return { ok: true, blob };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  } finally {
    try {
      held.ws?.close();
    } catch {
      /* already closed */
    }
  }
}
