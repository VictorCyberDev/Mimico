"use client";

import { useEffect, useRef } from "react";
import { MicIcon, StopIcon } from "@/components/ui/icons";
import type { Status } from "@/lib/store/assistantStore";

/**
 * The 128px control and all four states. The state visuals are pure CSS from
 * the design tokens (`.mic-visual.state-*`), so idle breathing, the listening
 * equaliser, the thinking arcs and the speaking ripples all come straight
 * from the prototype rather than being re-animated in JS.
 */
export function MicButton({
  status,
  onTap,
  size = 128,
  label = "Start talking",
}: {
  status: Status;
  onTap?: () => void;
  size?: number;
  label?: string;
}) {
  const micRef = useRef<HTMLButtonElement>(null);
  const prev = useRef<Status>(status);

  // Re-trigger the one-shot state-change flash whenever the state actually
  // changes, the same way the prototype reflows the class to restart it.
  useEffect(() => {
    if (prev.current === status) return;
    prev.current = status;
    const el = micRef.current;
    if (!el) return;
    el.classList.remove("state-flash");
    void el.offsetWidth;
    el.classList.add("state-flash");
  }, [status]);

  return (
    <div className={`mic-visual state-${status}`}>
      <div className="mic-wrap">
        <button
          ref={micRef}
          type="button"
          className="mic"
          style={size !== 128 ? { width: size, height: size } : undefined}
          onClick={onTap}
          aria-label={label}
        >
          <span className="mic__ripple" />
          <span className="mic__ripple mic__ripple--2" />
          <span className="mic__glyph">
            <MicIcon size={Math.round(size * 0.203)} />
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
          <span className="mic__stop">
            <StopIcon />
          </span>
        </button>
      </div>
    </div>
  );
}
