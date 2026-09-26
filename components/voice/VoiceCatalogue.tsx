"use client";

import { useCallback, useMemo, useState } from "react";
import { getKokoro, listVoices, speakKokoro, type KokoroVoice, type LoadProgress } from "@/lib/voice/kokoro";
import { useAssistant } from "@/lib/store/assistantStore";
import { InfoIcon } from "@/components/ui/icons";

const SAMPLE_LINE =
  "Hey, all done. Your clip is ready whenever you are, so take your time and let me know.";

/** Kokoro selections are namespaced so the system voices can coexist. */
export const KOKORO_PREFIX = "kokoro::";

export function VoiceCatalogue() {
  const [voices, setVoices] = useState<KokoroVoice[]>([]);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [accent, setAccent] = useState("all");
  const [gender, setGender] = useState("all");
  const [query, setQuery] = useState("");

  const selected = useAssistant((s) => s.previewVoiceId);
  const setSelected = useAssistant((s) => s.setPreviewVoiceId);

  const load = useCallback(async () => {
    setError(null);
    try {
      const tts = await getKokoro(setProgress);
      setVoices(listVoices(tts));
      setProgress({ stage: "Ready", pct: 100 });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Couldn't load the voice model: ${err.message}`
          : "Couldn't load the voice model.",
      );
      setProgress(null);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return voices.filter(
      (v) =>
        (accent === "all" || v.accent === accent) &&
        (gender === "all" || v.gender === gender) &&
        (!q || v.name.toLowerCase().includes(q)),
    );
  }, [voices, accent, gender, query]);

  async function preview(v: KokoroVoice) {
    setPlaying(v.id);
    setError(null);
    try {
      const blob = await speakKokoro(SAMPLE_LINE, v.id, 1, setProgress);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlaying(null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPlaying(null);
      };
      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That voice didn't render.");
      setPlaying(null);
    }
  }

  const loaded = voices.length > 0;

  return (
    <div className="panel" style={{ padding: "26px 28px" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="mono-label" style={{ color: "var(--text-tertiary)" }}>
          Preview voices
        </div>
        {loaded && (
          <span className="mono-label" style={{ color: "var(--text-tertiary)" }}>
            {filtered.length} of {voices.length}
          </span>
        )}
      </div>

      <p style={{ color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "12px 0 18px" }}>
        Neural voices that run entirely on your device. Distinct speakers, not one voice
        pitch-shifted.
      </p>

      {!loaded ? (
        <>
          <div className="preview-voice-note mb-4" style={{ color: "var(--text-tertiary)" }}>
            <InfoIcon />
            <span>
              First use downloads the voice model once, about 86MB, then it&rsquo;s cached and works
              offline.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={load}
            disabled={Boolean(progress)}
            style={progress ? { opacity: 0.55 } : undefined}
          >
            {progress
              ? `${progress.stage}${progress.pct !== null ? ` ${progress.pct}%` : "…"}`
              : "Load the voices"}
          </button>
          {progress?.pct !== null && progress?.pct !== undefined && (
            <div
              className="mt-4"
              style={{ height: 6, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress.pct}%`,
                  background: "var(--accent)",
                  transition: "width 200ms linear",
                }}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              className="field flex-1"
              style={{ minWidth: 160 }}
              placeholder="Search by name&hellip;"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search voices"
            />
            <select className="field" value={accent} onChange={(e) => setAccent(e.target.value)} aria-label="Accent">
              <option value="all">All accents</option>
              <option value="American">American</option>
              <option value="British">British</option>
            </select>
            <select className="field" value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Voice">
              <option value="all">All</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </div>

          <div className="flex flex-col" style={{ maxHeight: 420, overflowY: "auto" }}>
            {filtered.map((v, i) => {
              const id = `${KOKORO_PREFIX}${v.id}`;
              const isSelected = selected === id;
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 py-3"
                  style={i ? { borderTop: "1px solid var(--border)" } : undefined}
                >
                  <div className="min-w-0">
                    <div style={{ fontWeight: 550 }}>{v.name}</div>
                    <div className="mono-label" style={{ color: "var(--text-tertiary)", marginTop: 2 }}>
                      {v.accent} · {v.gender}
                      {v.grade ? ` · ${v.grade}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: "var(--fs-small)" }}
                      onClick={() => void preview(v)}
                      disabled={playing !== null}
                    >
                      {playing === v.id ? "Playing…" : "Hear it"}
                    </button>
                    <button
                      type="button"
                      className={isSelected ? "btn btn-primary" : "btn btn-secondary"}
                      style={{ fontSize: "var(--fs-small)", padding: "9px 18px" }}
                      onClick={() => setSelected(isSelected ? null : id)}
                    >
                      {isSelected ? "Selected" : "Use"}
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p style={{ color: "var(--text-secondary)", margin: "8px 0 0" }}>
                Nothing matches that. Try clearing the filters.
              </p>
            )}
          </div>
        </>
      )}

      {error && (
        <p
          role="alert"
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--caution-tint)",
            color: "var(--caution)",
            fontSize: "var(--fs-small)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
