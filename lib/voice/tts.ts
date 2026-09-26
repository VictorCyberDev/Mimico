"use client";

import { synthesiseInBrowser } from "./openvoiceBrowser";

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
  private objectUrl: string | null = null;
  private fallback = new BrowserVoice();

  constructor(private voiceId: string | null) {}

  async speak(text: string, onEnd: () => void): Promise<VoiceResult> {
    if (!this.voiceId) {
      const r = await this.fallback.speak(text, onEnd);
      return { ...r, notice: "Preview voice — pick one of your voices to reply in it." };
    }

    // Synthesis runs in the browser: the Space's endpoint is queued, which
    // needs a websocket and can outlast a serverless function.
    const out = await synthesiseInBrowser({ text, voiceId: this.voiceId });

    if (!out.ok) {
      const r = await this.fallback.speak(text, onEnd);
      return { ...r, notice: `Cloned voice unavailable (${out.reason}) Using the preview voice.` };
    }

    this.objectUrl = URL.createObjectURL(out.blob);
    this.audio = new Audio(this.objectUrl);
    const finish = () => {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
      onEnd();
    };
    this.audio.onended = finish;
    this.audio.onerror = finish;

    try {
      await this.audio.play();
    } catch {
      // Autoplay refusal is not a clone failure; report it as itself.
      finish();
      return { source: "cloned", notice: "Tap the mic again to hear the reply." };
    }
    return { source: "cloned", notice: null };
  }

  cancel() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.fallback.cancel();
  }
}

export function makeTts(voiceId: string | null): TtsProvider {
  return new OpenVoice(voiceId);
}
