"use client";

import { useState } from "react";

export function TextComposer({ onSend, busy }: { onSend: (text: string) => void; busy: boolean }) {
  const [value, setValue] = useState("");

  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: "20px 24px 28px" }}>
      <form
        className="mx-auto flex gap-2.5"
        style={{ maxWidth: 640 }}
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim();
          if (!v || busy) return;
          setValue("");
          onSend(v);
        }}
      >
        <input
          type="text"
          className="field flex-1"
          style={{ borderRadius: "var(--radius-pill)", padding: "14px 20px" }}
          placeholder="Type what you'd say&hellip;"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Type what you'd say"
        />
        <button type="submit" className="btn btn-primary" disabled={busy} style={busy ? { opacity: 0.55 } : undefined}>
          Send
        </button>
      </form>
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="status-dot" />
        <span className="mono-label" style={{ color: "var(--text-tertiary)" }}>
          Mic off in text mode
        </span>
      </div>
    </div>
  );
}
