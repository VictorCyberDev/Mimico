"use client";

import { synthesiseInBrowser } from "./openvoiceBrowser";
import { TONE_PRESETS } from "./presets";
import { useAssistant } from "@/lib/store/assistantStore";

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

/**
 * Waits for the voice list. getVoices() is populated asynchronously, and
 * speak() called before it fills silently does nothing in Chrome, which
 * looks exactly like the assistant replying in text only.
 */
async function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const have = synth.getVoices();
  if (have.length) return have;

  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", done, { once: true });
    // Some browsers never fire the event; do not hang on it.
    setTimeout(done, 1000);
  });
}

/** §8 — the honest preview voice the design copy already promises. */
class BrowserVoice implements TtsProvider {
  async speak(text: string, onEnd: () => void): Promise<VoiceResult> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd();
      return { source: "preview", notice: "This browser can't speak replies out loud." };
    }

    const synth = window.speechSynthesis;
    const voices = await voicesReady();

    // A queued utterance from an earlier turn blocks this one.
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);

    // Honour a voice picked from the catalogue; otherwise fall back to a
    // sensible English default so replies always have a voice.
    const chosen = useAssistant.getState().previewVoiceId;
    const [chosenUri, chosenTone] = chosen?.split("::") ?? [];
    const fromCatalogue = chosenUri ? voices.find((v) => v.voiceURI === chosenUri) : undefined;

    if (fromCatalogue) {
      utter.voice = fromCatalogue;
      const tone = TONE_PRESETS.find((t) => t.id === chosenTone);
      if (tone) {
        utter.rate = tone.rate;
        utter.pitch = tone.pitch;
      }
    } else {
      const preferred =
        voices.find((v) => v.lang?.startsWith("en") && v.localService) ??
        voices.find((v) => v.lang?.startsWith("en")) ??
        voices[0];
      if (preferred) utter.voice = preferred;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearInterval(keepAlive);
      onEnd();
    };
    utter.onend = finish;
    utter.onerror = finish;

    // Chrome stops speaking after ~15s unless the queue is nudged.
    const keepAlive = setInterval(() => {
      if (!synth.speaking) {
        finish();
        return;
      }
      synth.pause();
      synth.resume();
    }, 10_000);

    synth.speak(utter);
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
    //
    // Conversation cannot wait minutes for a reply, so the clone gets a
    // short window and the preview voice takes over if it misses it. The
    // studio keeps the long timeout, where waiting is a reasonable trade.
    const out = await synthesiseInBrowser({
      text,
      voiceId: this.voiceId,
      style: "en_default",
      timeoutMs: 25_000,
    });

    if (!out.ok) {
      const r = await this.fallback.speak(text, onEnd);
      return { ...r, notice: `Cloned voice unavailable (${out.reason}) Answering in the preview voice.` };
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
