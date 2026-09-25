"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "@/components/ui/icons";
import { useAssistant, type Tone } from "@/lib/store/assistantStore";

const TONES: Tone[] = ["Casual", "Professional", "Custom"];

export function ToneSwitcher() {
  const tone = useAssistant((s) => s.tone);
  const setTone = useAssistant((s) => s.setTone);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const index = Math.max(0, TONES.indexOf(tone));

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        className="icon-btn gap-2"
        style={{ width: "auto", padding: "0 14px" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="mono-label" style={{ color: "inherit" }}>
          {tone}
        </span>
        <ChevronDown />
      </button>

      {open && (
        <div
          className="panel glass fade-pop absolute right-0 z-30 p-3.5"
          style={{ top: 50, width: 250 }}
        >
          <div className="chip-row relative w-full">
            <div
              className="chip-thumb"
              style={{ transform: `translateX(${index * 100}%)` }}
            />
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip flex-1 ${t === tone ? "is-selected" : ""}`}
                onClick={() => {
                  setTone(t);
                  setOpen(false);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
