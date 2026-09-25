"use client";

import { useCallback, useRef } from "react";

/**
 * AssemblyAI Universal-Streaming (v3) straight from the browser.
 *
 * The route at /api/voice/token mints a short-lived token; the socket is
 * opened here so no long-lived connection is held in a Vercel function.
 * Audio is captured at 16 kHz, converted to PCM16 and sent as binary frames.
 */
const SAMPLE_RATE = 16_000;

// Runs on the audio thread: hands raw Float32 frames back to the main thread.
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
    async ({ onPartial, onFinal, onError }: StreamingHandlers) => {
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

        const blob = new Blob([WORKLET_SOURCE], { type: "application/javascript" });
        workletUrl.current = URL.createObjectURL(blob);
        await audio.audioWorklet.addModule(workletUrl.current);

        const socket = new WebSocket(
          `wss://streaming.assemblyai.com/v3/ws?sample_rate=${SAMPLE_RATE}&format_turns=true&token=${encodeURIComponent(token)}`,
        );
        socket.binaryType = "arraybuffer";
        ws.current = socket;

        socket.onmessage = (event) => {
          let msg: Record<string, unknown>;
          try {
            msg = JSON.parse(event.data as string);
          } catch {
            return;
          }
          if (msg.type !== "Turn") return;
          const transcript = String(msg.transcript ?? "");
          if (!transcript) return;
          if (msg.end_of_turn) onFinal(transcript);
          else onPartial(transcript);
        };

        socket.onerror = () => onError("The transcription connection dropped.");

        await new Promise<void>((resolve, reject) => {
          socket.onopen = () => resolve();
          socket.addEventListener("close", (e) => {
            if (e.code !== 1000 && e.code !== 1005) reject(new Error(`Socket closed (${e.code}).`));
          });
          setTimeout(() => reject(new Error("Timed out opening the transcription socket.")), 10_000);
        });

        const source = audio.createMediaStreamSource(stream.current);
        const tap = new AudioWorkletNode(audio, "pcm-tap");
        tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
          if (socket.readyState === WebSocket.OPEN) socket.send(floatToPcm16(e.data));
        };
        source.connect(tap);
        // Keep the graph pulling without routing mic audio back to the speakers.
        tap.connect(audio.destination);
      } catch (err) {
        stop();
        onError(err instanceof Error ? err.message : "Could not start listening.");
      }
    },
    [stop],
  );

  return { start, stop };
}
