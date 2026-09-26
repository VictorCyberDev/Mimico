"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cachedPreview,
  currentBackend,
  getKokoro,
  listVoices,
  previewVoice,
  type KokoroVoice,
  type LoadProgress,
} from "@/lib/voice/kokoro";
import { useAssistant } from "@/lib/store/assistantStore";
import { InfoIcon } from "@/components/ui/icons";

/**
 * Short on purpose. Generation time scales with output length, so a long
 * sample line is the difference between a preview that lands in a second
 * and one the user gives up waiting for.
 */
const SAMPLE_LINE = "Hey, all done.";

/** How many voices to render quietly up front so browsing feels instant. */
const PREFETCH_COUNT = 8;

export const KOKORO_PREFIX = "kokoro::";

export function VoiceCatalogue() {
  const [voices, setVoices] = useState<KokoroVoice[]>([]);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [warmed, setWarmed] = useState<Set<string>>(new Set());
  const [accent, setAccent] = useState("all");
  const [gender, setGender] = useState("all");
  const [query, setQuery] = useState("");

  const selected = useAssistant((s) => s.previewVoiceId);
  const setSelected = useAssistant((s) => s.setPreviewVoiceId);

  // Only the newest request may update the UI, so clicking through voices
  // never leaves a stale render in charge.
  const requestId = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // The counter is reset where the render starts, not here: setting state
  // synchronously inside an effect triggers a cascading render.
  useEffect(() => {
    if (!rendering) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [rendering]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  const play = useCallback((blob: Blob) => {
    audioRef.current?.pause();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => URL.revokeObjectURL(url);
    void audio.play().catch(() => URL.revokeObjectURL(url));
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const tts = await getKokoro(setProgress);
      const list = listVoices(tts);
      setVoices(list);
      setProgress(null);

      // Quietly render the first handful so the common case is a cache hit.
      void (async () => {
        for (const v of list.slice(0, PREFETCH_COUNT)) {
          try {
            await previewVoice(v.id, SAMPLE_LINE);
            setWarmed((prev) => new Set(prev).add(v.id));
          } catch {
            break;
          }
        }
      })();
    } catch (err) {
      setError(
        err instanceof Error ? `Couldn't load the voices: ${err.message}` : "Couldn't load the voices.",
      );
      setProgress(null);
    }
  }, []);

  const hear = useCallback(
    async (v: KokoroVoice) => {
      const id = ++requestId.current;

      const hit = cachedPreview(v.id);
      if (hit) {
        play(hit);
        return;
      }

      setElapsed(0);
      setRendering(v.id);
      setError(null);
      try {
        const blob = await previewVoice(v.id, SAMPLE_LINE);
        setWarmed((prev) => new Set(prev).add(v.id));
        // A newer click happened while this rendered; cache it, don't play it.
        if (id !== requestId.current) return;
        play(blob);
      } catch (err) {
        if (id === requestId.current) {
          setError(err instanceof Error ? err.message : "That voice didn't render.");
        }
      } finally {
        if (id === requestId.current) setRendering(null);
      }
    },
    [play],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return voices.filter(
      (v) =>
        (accent === "all" || v.accent === accent) &&
        (gender === "all" || v.gender === gender) &&
        (!q || v.name.toLowerCase().includes(q)),
    );
  }, [voices, accent, gender, query]);

  const loaded = voices.length > 0;
  const slow = loaded && currentBackend() === "wasm";

  return (
    <div className="panel" style={{ padding: "26px 28px" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="mono-label" style={{ color: "var(--text-tertiary)" }}>
          Preview voices
        </div>
        {loaded && (
          <span className="mono-label" style={{ color: "var(--text-tertiary)" }}>
            {filtered.length} of {voices.length} · {warmed.size} ready
          </span>
        )}
      </div>

      <p style={{ color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "12px 0 18px" }}>
        Neural voices that run entirely on your device. Distinct speakers, not one voice pitch-shifted.
      </p>

      {!loaded ? (
        <>
          <div className="preview-voice-note mb-4" style={{ color: "var(--text-tertiary)" }}>
            <InfoIcon />
            <span>
              First use downloads the voice model once, about 86MB, then it&rsquo;s cached and works offline.
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
          {progress?.pct != null && (
            <div
              className="mt-4"
              style={{ height: 6, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}
            >
              <div
                style={{ height: "100%", width: `${progress.pct}%`, background: "var(--accent)", transition: "width 200ms linear" }}
              />
            </div>
          )}
        </>
      ) : (
        <>
          {slow && (
            <div className="preview-voice-note mb-4" style={{ color: "var(--caution)" }}>
              <InfoIcon />
              <span>
                This browser has no WebGPU, so voices render on the CPU and the first play of each
                takes a few seconds. Once heard, it&rsquo;s instant.
              </span>
            </div>
          )}

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
              const isReady = warmed.has(v.id);
              const isRendering = rendering === v.id;
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 py-3"
                  style={i ? { borderTop: "1px solid var(--border)" } : undefined}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 550 }}>{v.name}</span>
                      {isReady && <span className="status-dot" style={{ background: "var(--accent)" }} />}
                    </div>
                    <div className="mono-label" style={{ color: "var(--text-tertiary)", marginTop: 2 }}>
                      {v.accent} · {v.gender}
                      {v.grade ? ` · ${v.grade}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Never disabled: switching voices mid-render is the
                        whole point of browsing them. */}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: "var(--fs-small)", minWidth: 96 }}
                      onClick={() => void hear(v)}
                    >
                      {isRendering ? `${elapsed}s…` : isReady ? "Play" : "Hear it"}
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
