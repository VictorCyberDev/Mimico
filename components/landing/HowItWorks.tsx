import { Reveal } from "./Reveal";

const STEPS = [
  { label: "01 — SPEAK", title: "“Clone my voice.”", body: "No commands to memorise." },
  { label: "02 — UNDERSTOOD", title: "Shown back instantly", body: "A live transcript confirms what it heard." },
  { label: "03 — DONE", title: "Acted on, out loud", body: "It does the thing, and replies in kind." },
];

export function HowItWorks() {
  return (
    <section
      className="mx-auto max-w-[980px] px-5 sm:px-10"
      style={{
        paddingTop: "clamp(30px,5vw,56px)",
        paddingBottom: "clamp(60px,7vw,90px)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <Reveal>
        <div className="mono-label" style={{ color: "var(--text-tertiary)", marginBottom: 14 }}>
          How it works
        </div>
      </Reveal>
      <Reveal delay={0.06}>
        <h2
          style={{
            fontSize: "var(--fs-display-lg)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            margin: "0 0 40px",
          }}
        >
          Three quiet steps, every time.
        </h2>
      </Reveal>

      {/* Plain typographic columns, not cards: the hierarchy is carried by
          type and space, exactly as the prototype has it. */}
      <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08}>
            <div className="mono-label" style={{ color: "var(--accent)" }}>
              {s.label}
            </div>
            <p style={{ fontSize: "var(--fs-title)", fontWeight: 500, margin: "12px 0 8px" }}>{s.title}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--fs-body)", margin: 0 }}>{s.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
