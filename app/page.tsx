// TEMPORARY — a token proof sheet for verifying §4 only.
// This file is replaced by the real Landing screen in the next section.
export default function TokenProof() {
  return (
    <main className="min-h-screen p-10 flex flex-col gap-8 max-w-3xl mx-auto">
      <div className="mono-label" style={{ color: "var(--text-tertiary)" }}>
        Design token proof sheet
      </div>

      <h1
        style={{
          fontSize: "var(--fs-display-xl)",
          fontWeight: 300,
          letterSpacing: "-0.03em",
          lineHeight: "var(--lh-tight)",
          margin: 0,
        }}
      >
        Say it.<br />
        <b style={{ fontWeight: 650 }}>
          Concierge <span style={{ color: "var(--accent)" }}>handles</span> the rest.
        </b>
      </h1>

      <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
        IBM Plex Mono — 0123456789 the quick brown fox
      </p>

      {/* raw-token buttons */}
      <div className="flex gap-3 flex-wrap items-center">
        <button className="btn btn-primary">Start talking</button>
        <button className="btn btn-secondary">Secondary</button>
        <button className="btn btn-ghost">Ghost</button>
        <button className="btn btn-caution">End</button>
        <span className="status-dot is-live" />
      </div>

      {/* tailwind-bridge equivalents: these must match the row above */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="rounded-pill bg-accent text-text-on-accent px-7 py-3.5 font-display font-semibold">
          bg-accent via @theme
        </div>
        <div className="rounded-lg border border-border-strong bg-surface-sunken text-text-secondary px-5 py-3 font-mono text-micro tracking-wider uppercase">
          surface-sunken
        </div>
        <div className="rounded-md bg-caution-tint text-caution px-5 py-3 text-small">caution-tint</div>
      </div>

      <div className="panel p-7">
        <div className="mono-label" style={{ color: "var(--text-tertiary)", marginBottom: 12 }}>
          Panel + transcript type
        </div>
        <div className="transcript__text">
          &ldquo;Hey &mdash; all done. Your clip&rsquo;s ready whenever you are.&rdquo;
        </div>
      </div>

      <div className="glass p-6 rounded-lg">
        <span className="mono-label" style={{ color: "var(--text-tertiary)" }}>
          Glass material
        </span>
      </div>

      {/* motion: the 4 mic states side by side */}
      <div className="flex gap-6 flex-wrap">
        {(["idle", "listening", "thinking", "speaking"] as const).map((s) => (
          <div key={s} className={`mic-visual state-${s} flex flex-col items-center gap-2`}>
            <div className="mic-wrap">
              <button className="mic" style={{ width: 96, height: 96 }} aria-label={s}>
                <span className="mic__ripple" />
                <span className="mic__ripple mic__ripple--2" />
                <span className="mic__glyph">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                </span>
                <span className="mic__bars">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <span key={i} className="bar" />
                  ))}
                </span>
                <span className="mic__arc">
                  <svg viewBox="0 0 100 100">
                    <circle className="arc-o" cx="50" cy="50" r="40" fill="none" stroke="var(--accent-soft)" strokeWidth="3" strokeLinecap="round" strokeDasharray="64 188" opacity="0.9" />
                    <circle className="arc-i" cx="50" cy="50" r="27" fill="none" stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" strokeDasharray="28 142" opacity="0.6" />
                  </svg>
                </span>
              </button>
            </div>
            <span className="mono-label" style={{ color: "var(--text-tertiary)" }}>{s}</span>
          </div>
        ))}
      </div>

      <div className="ack-pop">
        <span className="ack-pop__ring" />
        <span className="mono-label" style={{ color: "var(--accent-strong)" }}>Tone saved</span>
      </div>
    </main>
  );
}
