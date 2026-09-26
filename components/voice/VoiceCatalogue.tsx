"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCatalogue,
  loadSystemVoices,
  speakWithPreset,
  TONE_PRESETS,
  type CatalogueVoice,
} from "@/lib/voice/presets";
import { useAssistant } from "@/lib/store/assistantStore";

const SAMPLE_LINE = "Hey — all done. Your clip's ready whenever you are.";

export function VoiceCatalogue() {
  const [system, setSystem] = useState<SpeechSynthesisVoice[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [tone, setTone] = useState("all");
  const [playing, setPlaying] = useState<string | null>(null);

  const previewVoice = useAssistant((s) => s.previewVoiceId);
  const setPreviewVoice = useAssistant((s) => s.setPreviewVoiceId);

  useEffect(() => {
    let live = true;
    void loadSystemVoices().then((v) => {
      if (!live) return;
      setSystem(v);
      setReady(true);
    });
    return () => {
      live = false;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const catalogue = useMemo(() => buildCatalogue(system), [system]);

  const regions = useMemo(
    () => [...new Set(catalogue.map((v) => v.region))].sort((a, b) => a.localeCompare(b)),
    [catalogue],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogue.filter(
      (v) =>
        (region === "all" || v.region === region) &&
        (tone === "all" || v.tone.id === tone) &&
        (!q || v.name.toLowerCase().includes(q) || v.region.toLowerCase().includes(q)),
    );
  }, [catalogue, query, region, tone]);

  function preview(entry: CatalogueVoice) {
    setPlaying(entry.id);
    speakWithPreset(SAMPLE_LINE, entry, system, () => setPlaying(null));
  }

  return (
    <div className="panel" style={{ padding: "26px 28px" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="mono-label" style={{ color: "var(--text-tertiary)" }}>
          Preview voices
        </div>
        <span className="mono-label" style={{ color: "var(--text-tertiary)" }}>
          {ready ? `${filtered.length} of ${catalogue.length}` : "loading…"}
        </span>
      </div>

      <p style={{ color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "12px 0 18px" }}>
        Every voice your device can speak with, across {regions.length || "…"} accents, each in{" "}
        {TONE_PRESETS.length} tones. Pick one and Concierge answers in it.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="field flex-1"
          style={{ minWidth: 180 }}
          placeholder="Search by name or accent&hellip;"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search voices"
        />
        <select className="field" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Accent">
          <option value="all">All accents</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select className="field" value={tone} onChange={(e) => setTone(e.target.value)} aria-label="Tone">
          <option value="all">All tones</option>
          {TONE_PRESETS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {!ready ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 48, borderRadius: "var(--radius-md)", background: "var(--surface-sunken)" }} />
          ))}
        </div>
      ) : catalogue.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: "var(--lh-normal)" }}>
          This browser reports no speech voices. Chrome on desktop usually has the widest set.
        </p>
      ) : (
        <div
          className="flex flex-col"
          style={{ maxHeight: 420, overflowY: "auto" }}
        >
          {filtered.slice(0, 300).map((v, i) => {
            const selected = previewVoice === v.id;
            return (
              <div
                key={v.id}
                className="flex items-center justify-between gap-3 py-3"
                style={i ? { borderTop: "1px solid var(--border)" } : undefined}
              >
                <div className="min-w-0">
                  <div style={{ fontWeight: 550, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {v.name}
                  </div>
                  <div className="mono-label" style={{ color: "var(--text-tertiary)", marginTop: 2 }}>
                    {v.region} · {v.tone.label}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: "var(--fs-small)" }}
                    onClick={() => preview(v)}
                  >
                    {playing === v.id ? "Playing…" : "Hear it"}
                  </button>
                  <button
                    type="button"
                    className={selected ? "btn btn-primary" : "btn btn-secondary"}
                    style={{ fontSize: "var(--fs-small)", padding: "9px 18px" }}
                    onClick={() => setPreviewVoice(selected ? null : v.id)}
                  >
                    {selected ? "Selected" : "Use"}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length > 300 && (
            <p className="mono-label pt-3" style={{ color: "var(--text-tertiary)" }}>
              Showing the first 300. Narrow by accent or tone to see the rest.
            </p>
          )}
          {filtered.length === 0 && (
            <p style={{ color: "var(--text-secondary)", margin: "8px 0 0" }}>
              Nothing matches that. Try clearing the filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
