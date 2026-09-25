"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Turn } from "@/lib/store/assistantStore";

const WHO = { user: "YOU", concierge: "CONCIERGE" } as const;

/**
 * §5 — the user's own words arrive as real interim recognition results, so
 * they need no fake reveal. The concierge's reply arrives as one string from
 * the API, so it keeps the prototype's word-by-word stagger.
 */
function Words({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const words = text.split(" ").filter(Boolean);

  if (reduce) return <>{text}</>;

  return (
    <>
      {words.map((w, i) => (
        <motion.span
          key={`${i}-${w}`}
          className="inline-block"
          style={{ marginRight: "0.28em" }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: i * 0.068, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
        </motion.span>
      ))}
    </>
  );
}

export function Transcript({
  turns,
  liveText,
  speakingText,
}: {
  turns: Turn[];
  liveText: string;
  speakingText?: string | null;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [turns, liveText, speakingText]);

  return (
    <div
      ref={boxRef}
      className="flex flex-1 flex-col overflow-y-auto px-5 pb-5 pt-9 sm:px-[6vw]"
    >
      <div className="transcript mx-auto mb-0 mt-auto w-full" style={{ maxWidth: 680 }}>
        {turns.map((t, i) => (
          <div key={i} className={`transcript__turn ${t.who === "user" ? "is-user" : "is-concierge"}`}>
            <div className="transcript__who">{WHO[t.who]}</div>
            <div className="transcript__text">{t.text}</div>
            {t.ack && (
              <div className="ack-pop fade-pop" style={{ marginTop: 6 }}>
                <span className="ack-pop__ring" />
                <span className="mono-label" style={{ color: "var(--accent-strong)" }}>
                  {t.ack}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* live interim speech — real, not simulated */}
        {liveText && (
          <div className="transcript__turn is-user">
            <div className="transcript__who">{WHO.user}</div>
            <div className="transcript__text" style={{ opacity: 0.72 }}>
              {liveText}
            </div>
          </div>
        )}

        {speakingText && (
          <div className="transcript__turn is-concierge">
            <div className="transcript__who">{WHO.concierge}</div>
            <div className="transcript__text">
              <Words text={speakingText} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
