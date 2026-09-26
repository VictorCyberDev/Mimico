"use client";

import { useCallback, useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";
import { VoiceCatalogue } from "./VoiceCatalogue";
import { FormError } from "@/components/auth/FormError";
import { CloseIcon, InfoIcon } from "@/components/ui/icons";
import {
  synthesiseInBrowser,
  EN_STYLES,
  STYLE_LABELS,
  MIN_PROMPT_CHARS,
  type EnStyle,
} from "@/lib/voice/openvoiceBrowser";

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
  const [last, setLast] = useState<{ id: string; text: string; downloadable: boolean } | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [style, setStyle] = useState<EnStyle>("en_default");

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
    setStage(null);

    try {
      if (voiceId) {
        // Cloned voice: render in the browser, then keep the file.
        const out = await synthesiseInBrowser({ text: line, voiceId, style, onProgress: setStage });
        if (out.ok) {
          const form = new FormData();
          form.set("text", line);
          form.set("voiceId", voiceId);
          form.set("audio", out.blob, "render.wav");
          const saved = await fetch("/api/generations", { method: "POST", body: form });
          const body = await saved.json();
          if (!saved.ok) throw new Error(body.error ?? "Rendered, but couldn't save it.");

          const url = URL.createObjectURL(out.blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          void audio.play().catch(() => {});

          setLast({ id: body.id, text: line, downloadable: true });
          setText("");
          void refresh();
          return;
        }
        // Fell back: say so plainly rather than passing the browser voice off.
        setNotice(`Cloned voice unavailable (${out.reason}) Using the preview voice, so there's no file to save.`);
      }

      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: line }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "That didn't render.");

      if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(line));
      if (!voiceId) setNotice("Spoken in the preview voice, so there's no file to save.");
      setLast({ id: body.id, text: line, downloadable: false });
      setText("");
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't render.");
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  const cloned = voices.filter((v) => v.kind === "cloned");
  // A cloned render needs a minimum prompt length; the preview voice does not.
  const tooShort = Boolean(voiceId) && text.trim().length > 0 && text.trim().length < MIN_PROMPT_CHARS;

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
          {voiceId && (
            <select
              className="field"
              style={{ paddingRight: 36 }}
              value={style}
              onChange={(e) => setStyle(e.target.value as EnStyle)}
              aria-label="Accent"
            >
              {EN_STYLES.map((st) => (
                <option key={st} value={st}>
                  {STYLE_LABELS[st]}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={convert}
            disabled={busy || !text.trim() || tooShort}
            style={busy || !text.trim() || tooShort ? { opacity: 0.55 } : undefined}
          >
            {busy ? (stage ?? "Rendering…") : "Speak it"}
          </button>
        </div>
        {tooShort && (
          <p className="mono-label mt-3" style={{ color: "var(--caution)" }}>
            {MIN_PROMPT_CHARS - text.trim().length} more characters needed to clone this
          </p>
        )}

        {last && (
          <div
            className="fade-pop mt-4 flex flex-wrap items-center justify-between gap-3"
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-sunken)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="min-w-0">
              <div className="mono-label" style={{ color: "var(--text-tertiary)", marginBottom: 4 }}>
                Last render
              </div>
              <div style={{ lineHeight: "var(--lh-snug)" }}>{last.text}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {last.downloadable ? (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: "var(--fs-small)" }}
                    onClick={() => void new Audio(`/api/generations/${last.id}/audio`).play().catch(() => {})}
                  >
                    Play again
                  </button>
                  <a
                    className="btn btn-secondary"
                    style={{ fontSize: "var(--fs-small)", padding: "9px 18px" }}
                    href={`/api/generations/${last.id}/audio`}
                  >
                    Save audio
                  </a>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: "var(--fs-small)" }}
                  onClick={() => {
                    if ("speechSynthesis" in window)
                      window.speechSynthesis.speak(new SpeechSynthesisUtterance(last.text));
                  }}
                >
                  Play again
                </button>
              )}
            </div>
          </div>
        )}

        {notice && (
          <div className="preview-voice-note fade-pop mt-4" style={{ color: "var(--caution)" }}>
            <InfoIcon />
            <span>{notice}</span>
          </div>
        )}
        <FormError message={error} />
      </div>

      {/* ---- preview voice catalogue ---- */}
      <div className="mb-6">
        <VoiceCatalogue />
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
