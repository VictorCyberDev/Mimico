"use client";

import { useCallback, useRef } from "react";

/**
 * AssemblyAI Universal-Streaming (v3) straight from the browser.
 *
 * /api/voice/token mints a short-lived token; the socket opens here so no
 * long-lived connection is held in a Vercel function.
 *
 * `encoding=pcm_s16le` is required. Without it the server does not read the
 * binary frames we send as PCM16 and simply never emits a Turn, which looks
 * from the UI exactly like "nothing happened".
 */
const SAMPLE_RATE = 16_000;

const WORKLET_SOURCE = `
class PcmTap extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(new Float32Array(ch));
    return true;
  }
}
registerProcessor('pcm-tap', PcmTap);
`;

function floatToPcm16(input: Float32Array): ArrayBuffer {
  const out = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out.buffer;
}

export type StreamingHandlers = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  /** Fires once the socket is open and audio is actually flowing. */
  onOpen?: () => void;
};

export function useAssemblyStreaming() {
  const ws = useRef<WebSocket | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const workletUrl = useRef<string | null>(null);

  const stop = useCallback(() => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "Terminate" }));
      }
      ws.current?.close();
    } catch {
      /* already gone */
    }
    ws.current = null;

    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;

    ctx.current?.close().catch(() => {});
    ctx.current = null;

    if (workletUrl.current) {
      URL.revokeObjectURL(workletUrl.current);
      workletUrl.current = null;
    }
  }, []);

  const start = useCallback(
    async ({ onPartial, onFinal, onError, onOpen }: StreamingHandlers) => {
      try {
        const tokenRes = await fetch("/api/voice/token");
        if (!tokenRes.ok) {
          const body = await tokenRes.json().catch(() => ({}));
          throw new Error(body.error ?? `Could not get a streaming token (${tokenRes.status}).`);
        }
        const { token } = (await tokenRes.json()) as { token: string };

        stream.current = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });

        const audio = new AudioContext({ sampleRate: SAMPLE_RATE });
        ctx.current = audio;
        // Some browsers hand back a suspended context until it is resumed
        // inside a gesture; without this the worklet never pulls any audio.
        if (audio.state === "suspended") await audio.resume();

        const blob = new Blob([WORKLET_SOURCE], { type: "application/javascript" });
        workletUrl.current = URL.createObjectURL(blob);
        await audio.audioWorklet.addModule(workletUrl.current);

        const params = new URLSearchParams({
          encoding: "pcm_s16le",
          sample_rate: String(SAMPLE_RATE),
          format_turns: "true",
          token,
        });
        const socket = new WebSocket(`wss://streaming.assemblyai.com/v3/ws?${params}`);
        socket.binaryType = "arraybuffer";
        ws.current = socket;

        let sawAnyTurn = false;

        socket.onmessage = (event) => {
          let msg: Record<string, unknown>;
          try {
            msg = JSON.parse(event.data as string);
          } catch {
            return;
          }
          if (msg.type === "Error") {
            onError(String(msg.error ?? "Transcription refused the stream."));
            return;
          }
          if (msg.type !== "Turn") return;
          const transcript = String(msg.transcript ?? "");
          if (!transcript) return;
          sawAnyTurn = true;
          if (msg.end_of_turn) onFinal(transcript);
          else onPartial(transcript);
        };

        await new Promise<void>((resolve, reject) => {
          const openTimer = setTimeout(
            () => reject(new Error("Timed out opening the transcription socket.")),
            10_000,
          );
          socket.onopen = () => {
            clearTimeout(openTimer);
            resolve();
          };
          socket.onerror = () => {
            clearTimeout(openTimer);
            reject(new Error("The transcription connection could not be opened."));
          };
          socket.addEventListener("close", (e) => {
            clearTimeout(openTimer);
            // 1000/1005 are normal closes after a session ends.
            if (e.code !== 1000 && e.code !== 1005) {
              const why = e.reason ? `: ${e.reason}` : "";
              (sawAnyTurn ? onError : reject)(
                new Error(`Transcription closed unexpectedly (${e.code})${why}`) as never,
              );
            }
          });
        });

        // Past the handshake, socket errors are reported rather than thrown.
        socket.onerror = () => onError("The transcription connection dropped.");

        const source = audio.createMediaStreamSource(stream.current);
        const tap = new AudioWorkletNode(audio, "pcm-tap");
        tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
          if (socket.readyState === WebSocket.OPEN) socket.send(floatToPcm16(e.data));
        };

        // The worklet only gets pulled while it reaches the destination, but
        // routing the mic straight there would play the user back to
        // themselves. A muted gain node keeps the graph alive and silent.
        const mute = audio.createGain();
        mute.gain.value = 0;
        source.connect(tap);
        tap.connect(mute);
        mute.connect(audio.destination);

        onOpen?.();
      } catch (err) {
        stop();
        onError(err instanceof Error ? err.message : "Could not start listening.");
      }
    },
    [stop],
  );

  return { start, stop };
}
