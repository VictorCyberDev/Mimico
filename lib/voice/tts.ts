"use client";

/**
 * One interface, two providers. OpenVoice is the real cloned voice; the
 * browser's speechSynthesis is the fallback. The fallback is never silent:
 * every caller gets back which provider actually spoke, so the UI can say so
 * rather than passing a generic voice off as a clone.
 */
export type VoiceResult = { source: "cloned" | "preview"; notice: string | null };

export interface TtsProvider {
  speak(text: string, onEnd: () => void): Promise<VoiceResult>;
  cancel(): void;
}

/** §8 — the honest preview voice the design copy already promises. */
class BrowserVoice implements TtsProvider {
  async speak(text: string, onEnd: () => void): Promise<VoiceResult> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd();
      return { source: "preview", notice: "This browser can't speak replies out loud." };
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.onend = onEnd;
    utter.onerror = onEnd;
    window.speechSynthesis.speak(utter);
    return { source: "preview", notice: null };
  }

  cancel() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }
}

class OpenVoice implements TtsProvider {
  private audio: HTMLAudioElement | null = null;
  private fallback = new BrowserVoice();

  constructor(private voiceId: string | null) {}

  async speak(text: string, onEnd: () => void): Promise<VoiceResult> {
    if (!this.voiceId) {
      const r = await this.fallback.speak(text, onEnd);
      return { ...r, notice: "Preview voice — record a short sample to clone your own." };
    }

    try {
      const res = await fetch("/api/voice/clone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, voiceId: this.voiceId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `clone failed (${res.status})`);
      }
      const blobUrl = URL.createObjectURL(await res.blob());

      this.audio = new Audio(blobUrl);
      this.audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        onEnd();
      };
      this.audio.onended = onEnd;
      this.audio.onerror = onEnd;
      await this.audio.play();
      return { source: "cloned", notice: null };
    } catch {
      // Degrade visibly, never silently.
      const r = await this.fallback.speak(text, onEnd);
      return {
        ...r,
        notice: "Cloned voice unavailable — using the preview voice for now.",
      };
    }
  }

  cancel() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.fallback.cancel();
  }
}

export function makeTts(voiceId: string | null): TtsProvider {
  return new OpenVoice(voiceId);
}
