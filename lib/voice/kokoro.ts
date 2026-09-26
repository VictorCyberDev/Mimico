"use client";

/**
 * Kokoro TTS, running entirely in the browser.
 *
 * The system speechSynthesis voices were the wrong tool: the browser
 * exposes only rate and pitch, so "tones" were the same engine voice sped
 * up or shifted, and on a device with two installed voices the whole
 * catalogue collapsed to two robots. There is no fine-tuning available
 * there, by design.
 *
 * Kokoro is an 82M-parameter neural model with Apache-2.0 weights (so it
 * is clean commercially, unlike XTTS) and 28 genuinely distinct English
 * speakers. It runs locally via transformers.js, which also means no
 * Space, no queue, no quota and no server timeout: the failure modes that
 * have dogged the cloning path do not exist here.
 *
 * Cost to be honest about: the weights are fetched once, roughly 86MB at
 * q8, then cached by the browser for subsequent visits.
 */
import type { KokoroTTS } from "kokoro-js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

export type KokoroVoice = {
  id: string;
  name: string;
  accent: "American" | "British";
  gender: "Female" | "Male";
  grade: string;
};

/** Parsed from Kokoro's own id scheme: [a|b][f|m]_name. */
export function describeVoice(id: string, meta: { name?: string; gender?: string; overallGrade?: string }): KokoroVoice {
  return {
    id,
    name: meta.name ?? id,
    accent: id.startsWith("b") ? "British" : "American",
    gender: meta.gender === "Male" ? "Male" : "Female",
    grade: meta.overallGrade ?? "",
  };
}

let instance: KokoroTTS | null = null;
let loading: Promise<KokoroTTS> | null = null;

export type LoadProgress = { stage: string; pct: number | null };

/** Loads once and reuses; concurrent callers share the same download. */
export async function getKokoro(onProgress?: (p: LoadProgress) => void): Promise<KokoroTTS> {
  if (instance) return instance;
  if (loading) return loading;

  loading = (async () => {
    onProgress?.({ stage: "Loading the voice model", pct: null });
    const { KokoroTTS: Ctor } = await import("kokoro-js");

    // WebGPU is much faster where present; WASM is the portable fallback.
    const device: "webgpu" | "wasm" =
      typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm";

    const tts = await Ctor.from_pretrained(MODEL_ID, {
      dtype: "q8",
      device,
      progress_callback: (p: { status?: string; progress?: number; file?: string }) => {
        if (p.status === "progress" && typeof p.progress === "number") {
          onProgress?.({ stage: "Downloading voices", pct: Math.round(p.progress) });
        } else if (p.status === "ready") {
          onProgress?.({ stage: "Ready", pct: 100 });
        }
      },
    });

    instance = tts;
    return tts;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}

export function listVoices(tts: KokoroTTS): KokoroVoice[] {
  const voices = tts.voices as Record<string, { name?: string; gender?: string; overallGrade?: string }>;
  return Object.entries(voices)
    .map(([id, meta]) => describeVoice(id, meta))
    // Best-graded first, so the default pick sounds like the good ones.
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));
}

/** Renders a line and returns playable audio. */
export async function speakKokoro(
  text: string,
  voiceId: string,
  speed = 1,
  onProgress?: (p: LoadProgress) => void,
): Promise<Blob> {
  const tts = await getKokoro(onProgress);
  onProgress?.({ stage: "Speaking", pct: null });
  // kokoro-js types the voice id as a union of its own keys.
  const audio = await tts.generate(text, { voice: voiceId as never, speed });
  return audio.toBlob();
}

export function isKokoroLoaded(): boolean {
  return instance !== null;
}
