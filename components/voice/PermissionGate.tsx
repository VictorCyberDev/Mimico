"use client";

import { useState } from "react";
import { MicIcon, MicOffIcon } from "@/components/ui/icons";
import { useAssistant } from "@/lib/store/assistantStore";

/**
 * §6 — the prototype's Allow/Deny buttons were simulated. This asks the
 * browser for real.
 *
 * Note on §6's feature-detection warning: that guidance assumed the Web
 * Speech API, which Firefox and desktop Safari don't implement. We transcribe
 * through AssemblyAI over a WebSocket instead, so the only capability that
 * actually matters is getUserMedia, which every current browser has. Text
 * mode stays a first-class choice, but it is no longer a browser-compat
 * fallback.
 */
export function PermissionGate({ onGranted }: { onGranted: () => void }) {
  const micPermission = useAssistant((s) => s.micPermission);
  const setMicPermission = useAssistant((s) => s.setMicPermission);
  const setTextMode = useAssistant((s) => s.setTextMode);
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true);
    try {
      // Must run inside the click handler: browsers block the prompt otherwise.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We only needed the prompt and the confirmation; capture happens
      // separately when a turn actually starts.
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      onGranted();
    } catch {
      setMicPermission("denied");
    } finally {
      setBusy(false);
    }
  }

  if (micPermission === "denied") {
    return (
      <div className="w-full text-center" style={{ maxWidth: 460 }}>
        <div
          className="mx-auto mb-7 flex items-center justify-center"
          style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--caution-tint)", color: "var(--caution)" }}
        >
          <MicOffIcon />
        </div>
        <h1 style={{ fontSize: "var(--fs-display-lg)", fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
          Microphone access is off
        </h1>
        <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "0 0 36px" }}>
          No problem &mdash; you can type to Concierge instead, or turn the mic back on and try again.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Browsers won't re-prompt once denied, so this genuinely re-attempts
              rather than promising: it succeeds only if the site permission was
              changed in browser chrome in the meantime. */}
          <button type="button" className="btn btn-secondary" onClick={request} disabled={busy}>
            Try again
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setTextMode(true)}>
            Continue with text instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-center" style={{ maxWidth: 460 }}>
      <div
        className="mx-auto mb-7 flex items-center justify-center"
        style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--accent-tint)", color: "var(--accent-strong)" }}
      >
        <MicIcon size={32} />
      </div>
      <h1 style={{ fontSize: "var(--fs-display-lg)", fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        Concierge needs your microphone
      </h1>
      <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "0 0 12px" }}>
        It&rsquo;s how you talk to it &mdash; to clone a voice, check a job, or send something on, without typing a word.
      </p>
      <p style={{ fontSize: "var(--fs-body)", color: "var(--text-tertiary)", lineHeight: "var(--lh-normal)", margin: "0 0 36px" }}>
        Audio streams only while you&rsquo;re speaking to it. You&rsquo;ll always see a clear, visible cue whenever the mic is live.
      </p>
      <div className="flex flex-col items-center gap-3.5">
        <button type="button" className="btn btn-primary" style={{ minWidth: 260 }} onClick={request} disabled={busy}>
          {busy ? "Waiting for your browser…" : "Allow microphone access"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setTextMode(true)}>
          Not now
        </button>
      </div>
    </div>
  );
}
