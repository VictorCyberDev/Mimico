"use client";

/**
 * Re-encodes recorded audio as 16-bit PCM WAV.
 *
 * MediaRecorder gives webm/opus, which is what the browser can record but
 * not what the Space can read: Gradio loads audio server-side with
 * soundfile/librosa, and neither decodes webm/opus. The browser can decode
 * it (it produced it), so the conversion happens here and the Space only
 * ever receives a format it can open.
 *
 * Mono, since a voice reference gains nothing from a second channel and it
 * halves the payload.
 */
const TARGET_RATE = 22_050;

export async function blobToWav(blob: Blob): Promise<Blob> {
  const buf = await blob.arrayBuffer();

  const Ctor: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(buf.slice(0));
  } finally {
    void ctx.close();
  }

  // Downmix to mono.
  const channels = decoded.numberOfChannels;
  const frames = decoded.length;
  const mono = new Float32Array(frames);
  for (let c = 0; c < channels; c++) {
    const data = decoded.getChannelData(c);
    for (let i = 0; i < frames; i++) mono[i] += data[i] / channels;
  }

  const resampled = resample(mono, decoded.sampleRate, TARGET_RATE);
  return encodeWav(resampled, TARGET_RATE);
}

/** Linear resample. Good enough for a voice reference clip. */
function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const str = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  str(0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format: PCM
  view.setUint16(22, 1, true); // channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  str(36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: "audio/wav" });
}
