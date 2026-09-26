"use client";

import { useCallback, useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";
import { FormError } from "@/components/auth/FormError";
import { CloseIcon, InfoIcon } from "@/components/ui/icons";

export type VoiceRow = {
  id: string;
  name: string;
  description: string | null;
  kind: "preset" | "cloned";
  hasSample: boolean;
};

export type GenerationRow = {
  id: string;
  text: string;
  source: "cloned" | "preview";
  createdAt: string;
  voiceName: string | null;
  downloadable: boolean;
};

export function VoiceStudio({
  initialVoices,
  initialGenerations,
}: {
  initialVoices: VoiceRow[];
  initialGenerations: GenerationRow[];
}) {
  // Seeded by the server, so the studio renders populated on first paint and
  // never fetches from an effect.
  const [voices, setVoices] = useState<VoiceRow[]>(initialVoices);
  const [gens, setGens] = useState<GenerationRow[]>(initialGenerations);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [v, g] = await Promise.all([fetch("/api/voices"), fetch("/api/generations")]);
      if (!v.ok || !g.ok) throw new Error("Couldn't load your voices.");
      setVoices((await v.json()).voices);
      setGens((await g.json()).generations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your voices.");
    }
  }, []);

  async function remove(id: string) {
    const res = await fetch(`/api/voices/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (voiceId === id) setVoiceId("");
      void refresh();
    }
  }

  async function convert() {
    const line = text.trim();
    if (!line) return;
    setBusy(true);
    setNotice(null);
    setError(null);

    try {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: line, voiceId: voiceId || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "That didn't render.");

      if (body.downloadable) {
        // Real cloned audio came back: play it from the server.
        const audio = new Audio(`/api/generations/${body.id}/audio`);
        void audio.play().catch(() => {});
      } else {
        // No clone available, so speak it with the browser voice and say so.
        if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(line));
        setNotice(body.notice ?? "Spoken in the preview voice — no cloned voice was used.");
      }
      setText("");
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't render.");
    } finally {
      setBusy(false);
    }
  }

  const cloned = voices.filter((v) => v.kind === "cloned");

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 py-10">
      {/* ---- convert ---- */}
      <div className="panel mb-6" style={{ padding: "26px 28px" }}>
        <div className="mono-label" style={{ color: "var(--text-tertiary)", marginBottom: 12 }}>
          Say something in a voice
        </div>
        <textarea
          className="field mb-3 w-full"
          style={{ minHeight: 96, resize: "vertical" }}
          placeholder="Type what you want it to say&hellip;"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Text to speak"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="field"
            style={{ paddingRight: 36 }}
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            aria-label="Voice"
          >
            <option value="">Preview voice (browser)</option>
            {cloned.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={convert}
            disabled={busy || !text.trim()}
            style={busy || !text.trim() ? { opacity: 0.55 } : undefined}
          >
            {busy ? "Rendering…" : "Speak it"}
          </button>
        </div>
        {notice && (
          <div className="preview-voice-note fade-pop mt-4" style={{ color: "var(--caution)" }}>
            <InfoIcon />
            <span>{notice}</span>
          </div>
        )}
        <FormError message={error} />
      </div>

      {/* ---- record ---- */}
      <div className="mb-6">
        <VoiceRecorder onSaved={refresh} />
      </div>

      {/* ---- library ---- */}
      <div className="panel mb-6" style={{ padding: "26px 28px" }}>
        <div className="mono-label" style={{ color: "var(--text-tertiary)", marginBottom: 14 }}>
          Your voices
        </div>
        {cloned.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: 0 }}>
            No cloned voices yet. Record a sample above and it&rsquo;ll appear here, ready to speak with.
          </p>
        ) : (
          <div className="flex flex-col">
            {cloned.map((v, i) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-4 py-3.5"
                style={i ? { borderTop: "1px solid var(--border)" } : undefined}
              >
                <div className="min-w-0">
                  <div style={{ fontWeight: 550 }}>{v.name}</div>
                  {v.description && (
                    <div style={{ fontSize: "var(--fs-small)", color: "var(--text-tertiary)" }}>{v.description}</div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a className="btn btn-ghost" style={{ fontSize: "var(--fs-small)" }} href={`/api/voices/${v.id}`} download={`${v.name}.webm`}>
                    Download sample
                  </a>
                  <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => remove(v.id)} aria-label={`Delete ${v.name}`}>
                    <CloseIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- history / downloads ---- */}
      <div className="panel" style={{ padding: "26px 28px" }}>
        <div className="mono-label" style={{ color: "var(--text-tertiary)", marginBottom: 14 }}>
          Rendered lines
        </div>
        {gens.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: 0 }}>
            Nothing rendered yet. Anything you speak or convert shows up here to replay or download.
          </p>
        ) : (
          <div className="flex flex-col">
            {gens.map((g, i) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-4 py-3.5"
                style={i ? { borderTop: "1px solid var(--border)" } : undefined}
              >
                <div className="min-w-0">
                  <div style={{ lineHeight: "var(--lh-snug)" }}>{g.text}</div>
                  <div className="mono-label mt-1" style={{ color: g.source === "cloned" ? "var(--accent-strong)" : "var(--text-tertiary)" }}>
                    {g.source === "cloned" ? `${g.voiceName ?? "Cloned"} — cloned voice` : "Preview voice"}
                  </div>
                </div>
                {g.downloadable ? (
                  <a className="btn btn-secondary shrink-0" style={{ fontSize: "var(--fs-small)", padding: "9px 18px" }} href={`/api/generations/${g.id}/audio`}>
                    Download
                  </a>
                ) : (
                  <span className="mono-label shrink-0" style={{ color: "var(--text-tertiary)" }} title="The browser's speech engine gives no audio stream to capture.">
                    No file
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
