"use client";

import { CloseIcon } from "@/components/ui/icons";
import { useAssistant } from "@/lib/store/assistantStore";

const WHO = { user: "YOU", concierge: "CONCIERGE" } as const;

export function HistoryDrawer() {
  const open = useAssistant((s) => s.historyOpen);
  const toggle = useAssistant((s) => s.toggleHistory);
  const turns = useAssistant((s) => s.turns);

  return (
    <>
      {open && (
        <div
          className="absolute inset-0 z-40"
          style={{ background: "var(--scrim)" }}
          onClick={() => toggle(false)}
        />
      )}
      <div
        className="absolute bottom-0 right-0 top-0 z-[41] flex flex-col"
        style={{
          width: 320,
          maxWidth: "88%",
          background: "var(--glass-bg)",
          backdropFilter: "saturate(180%) blur(24px)",
          WebkitBackdropFilter: "saturate(180%) blur(24px)",
          borderLeft: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-lift)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform var(--dur-large) var(--ease-spring-lg)",
        }}
        aria-hidden={!open}
      >
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="mono-label" style={{ color: "var(--text-tertiary)" }}>
            This session
          </div>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 32, height: 32 }}
            onClick={() => toggle(false)}
            aria-label="Close history"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-5 py-4">
          {turns.length === 0 ? (
            <p style={{ fontSize: "var(--fs-small)", color: "var(--text-tertiary)", lineHeight: "var(--lh-normal)", margin: 0 }}>
              Nothing yet. What you say and what Concierge says back will collect here for this session.
            </p>
          ) : (
            [...turns].reverse().map((t, i) => (
              <div key={i}>
                <div className="transcript__who" style={{ marginBottom: 4 }}>
                  {WHO[t.who]}
                </div>
                <div style={{ fontSize: "var(--fs-small)", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)" }}>
                  {t.text}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
