"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { GoogleGlyph } from "@/components/ui/icons";

/**
 * §10 step 6 — optional social sign-in. The button only appears when Google
 * is actually configured on the server, so it can never present a path that
 * dead-ends in a provider error.
 */
export function GoogleButton({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  if (!enabled) return null;

  return (
    <>
      <div className="my-[22px] flex items-center gap-[14px]">
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span className="mono-label" style={{ color: "var(--text-tertiary)" }}>
          or
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <button
        type="button"
        className="btn btn-secondary w-full justify-center gap-[10px]"
        disabled={busy}
        style={busy ? { opacity: 0.55 } : undefined}
        onClick={async () => {
          setBusy(true);
          await authClient.signIn.social({ provider: "google", callbackURL: "/app" });
        }}
      >
        <GoogleGlyph />
        Continue with Google
      </button>
    </>
  );
}
