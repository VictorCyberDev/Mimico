"use client";

import { useCallback, useRef, useState } from "react";
import { useAssistant } from "@/lib/store/assistantStore";
import { useAssemblyStreaming } from "./useAssemblyStreaming";
import { makeTts } from "@/lib/voice/tts";

/**
 * The real loop: listen (AssemblyAI) -> think (Groq, via /api/concierge)
 * -> speak (OpenVoice, falling back to the browser voice).
 */
export function useConcierge() {
  const s = useAssistant();
  const { start, stop } = useAssemblyStreaming();
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const referenceClip = useRef<string | null>(null);
  const tts = useRef(makeTts(null));

  const setReferenceClip = useCallback((url: string | null) => {
    referenceClip.current = url;
    tts.current = makeTts(url);
    useAssistant.getState().setCloneReady(Boolean(url));
  }, []);

  const respond = useCallback(
    async (userText: string) => {
      const store = useAssistant.getState();
      store.pushTurn({ who: "user", text: userText });
      store.setStatus("thinking");

      let data: { reply?: string; ack?: string; tone?: string } = {};
      try {
        const res = await fetch("/api/concierge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: userText,
            tone: store.tone,
            customTone: store.customTone,
            history: store.turns.slice(-6),
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        data = await res.json();
        store.setConnection("online");
      } catch {
        // §9 — a failed call to our own route is the connection state, not a
        // misheard command.
        store.setConnection(navigator.onLine ? "error" : "reconnecting");
        store.setStatus("idle");
        return;
      }

      const reply = data.reply ?? "Sorry, something went wrong on my end.";
      if (data.tone) store.setTone(data.tone as typeof store.tone);

      store.setStatus("speaking");
      setSpeakingText(reply);

      const result = await tts.current.speak(reply, () => {
        setSpeakingText(null);
        useAssistant.getState().pushTurn({ who: "concierge", text: reply, ack: data.ack });
        useAssistant.getState().setStatus("idle");
      });
      useAssistant.getState().setVoiceSource(result.source, result.notice);
    },
    [],
  );

  const tapMic = useCallback(async () => {
    const store = useAssistant.getState();

    if (store.status === "speaking") {
      // §8 — interrupting cancels playback and immediately starts listening.
      tts.current.cancel();
      setSpeakingText(null);
      store.setStatus("idle");
    }

    if (store.status === "listening") {
      stop();
      store.setStatus("idle");
      return;
    }

    if (store.status === "thinking") {
      store.setStatus("idle");
      return;
    }

    store.setStatus("listening");
    await start({
      onPartial: (t) => useAssistant.getState().setLiveText(t),
      onFinal: (t) => {
        stop();
        useAssistant.getState().setLiveText("");
        void respond(t);
      },
      onError: (message) => {
        stop();
        const st = useAssistant.getState();
        st.setStatus("idle");
        st.setVoiceSource(st.voiceSource, message);
      },
    });
  }, [start, stop, respond]);

  const sendText = useCallback((text: string) => void respond(text), [respond]);

  return { speakingText, tapMic, sendText, setReferenceClip, status: s.status };
}
