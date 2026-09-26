"use client";

import { useEffect, useRef, useState } from "react";
import { MicIcon, StopIcon } from "@/components/ui/icons";
import { FormError } from "@/components/auth/FormError";

/** OpenVoice clones from a short reference clip; a few seconds is plenty. */
const TARGET_SECONDS = 15;
const MIN_SECONDS = 4;

const SCRIPT =
  "The quick brown fox jumps over the lazy dog. I'm recording this so Concierge can learn how I sound, in my own voice, at my own pace.";

export function VoiceRecorder({ onSaved }: { onSaved: () => void }) {
  const [state, setState] = useState<"idle" | "recording" | "review" | "saving">("idle");
  const [seconds, setSeconds] = useState(0);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Release the object URL and any live recorder if this unmounts mid-take.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [previewUrl],
  );

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];

      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const out = new Blob(chunks.current, { type: mime || "audio/webm" });
        blob.current = out;
        setPreviewUrl(URL.createObjectURL(out));
        setState("review");
      };

      rec.start();
      recorder.current = rec;
      setSeconds(0);
      setState("recording");

      timer.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= TARGET_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Couldn't reach your microphone. Check the site's permission and try again.");
    }
  }

  function stopRecording() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function save() {
    if (!blob.current) return;
    if (!name.trim()) {
      setError("Give this voice a name so you can find it later.");
      return;
    }
    setState("saving");
    setError(null);

    const form = new FormData();
    form.set("name", name.trim());
    form.set("description", `Recorded ${seconds}s sample`);
    form.set("sample", blob.current, "sample.webm");

    const res = await fetch("/api/voices", { method: "POST", body: form });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Couldn't save that voice.");
      setState("review");
      return;
    }

    blob.current = null;
    setName("");
    setSeconds(0);
    setPreviewUrl(null);
    setState("idle");
    onSaved();
  }

  return (
    <div className="panel" style={{ padding: "26px 28px" }}>
      <div className="mono-label" style={{ color: "var(--text-tertiary)", marginBottom: 12 }}>
        Clone your voice
      </div>

      {state === "idle" && (
        <>
          <p style={{ color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "0 0 18px" }}>
            Read the line below out loud. About {TARGET_SECONDS} seconds in a quiet room is all it takes.
          </p>
          <blockquote
            style={{
              margin: "0 0 22px",
              padding: "16px 18px",
              borderLeft: "2px solid var(--accent)",
              background: "var(--surface-sunken)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              lineHeight: "var(--lh-snug)",
            }}
          >
            {SCRIPT}
          </blockquote>
          <button type="button" className="btn btn-primary" onClick={startRecording}>
            <MicIcon size={16} />
            Start recording
          </button>
        </>
      )}

      {state === "recording" && (
        <>
          <div className="mb-5 flex items-center gap-3">
            <span className="status-dot is-live" />
            <span className="mono-label" style={{ color: "var(--accent-strong)" }}>
              Recording — {seconds}s of {TARGET_SECONDS}s
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: "var(--surface-sunken)",
              overflow: "hidden",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (seconds / TARGET_SECONDS) * 100)}%`,
                background: "var(--accent)",
                transition: "width 1s linear",
              }}
            />
          </div>
          <blockquote
            style={{
              margin: "0 0 22px",
              padding: "16px 18px",
              borderLeft: "2px solid var(--accent)",
              background: "var(--surface-sunken)",
              borderRadius: "var(--radius-sm)",
              lineHeight: "var(--lh-snug)",
            }}
          >
            {SCRIPT}
          </blockquote>
          <button type="button" className="btn btn-caution" onClick={stopRecording}>
            <StopIcon size={14} />
            Stop
          </button>
        </>
      )}

      {(state === "review" || state === "saving") && (
        <>
          <p style={{ color: "var(--text-secondary)", margin: "0 0 16px" }}>
            {seconds}s recorded. Have a listen, then name it.
          </p>
          {previewUrl && (
            <audio controls src={previewUrl} className="mb-4 w-full" style={{ borderRadius: "var(--radius-pill)" }} />
          )}
          {seconds < MIN_SECONDS && (
            <p style={{ color: "var(--caution)", fontSize: "var(--fs-small)", margin: "0 0 12px" }}>
              That&rsquo;s quite short. Under {MIN_SECONDS}s rarely clones well.
            </p>
          )}
          <label className="mono-label" htmlFor="voice-name" style={{ color: "var(--text-tertiary)", display: "block", marginBottom: 8 }}>
            Voice name
          </label>
          <input
            id="voice-name"
            className="field mb-3 w-full"
            placeholder="My voice"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <FormError message={error} />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={state === "saving"}
              style={state === "saving" ? { opacity: 0.55 } : undefined}
            >
              {state === "saving" ? "Saving…" : "Save voice"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setState("idle"); setPreviewUrl(null); }}>
              Record again
            </button>
          </div>
        </>
      )}

      {state === "idle" && <FormError message={error} />}
    </div>
  );
}
