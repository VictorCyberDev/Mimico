"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAssistant } from "@/lib/store/assistantStore";
import { useTheme } from "@/lib/store/useTheme";
import { useConcierge } from "@/lib/speech/useConcierge";
import { MicButton } from "@/components/voice/MicButton";
import { Transcript } from "@/components/voice/Transcript";
import { ToneSwitcher } from "@/components/voice/ToneSwitcher";
import { HistoryDrawer } from "@/components/voice/HistoryDrawer";
import { ConnectionBanner } from "@/components/voice/ConnectionBanner";
import { PermissionGate } from "@/components/voice/PermissionGate";
import { TextComposer } from "@/components/voice/TextComposer";
import { HistoryIcon, InfoIcon, KeyboardIcon, PowerIcon, ToneIcon } from "@/components/ui/icons";
import { authClient } from "@/lib/auth/auth-client";

const STATUS_WORD = {
  idle: "Tap to talk",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking — tap to interrupt",
} as const;

export function ConciergeClient() {
  useTheme();
  const router = useRouter();
  const status = useAssistant((s) => s.status);
  const turns = useAssistant((s) => s.turns);
  const liveText = useAssistant((s) => s.liveText);
  const micPermission = useAssistant((s) => s.micPermission);
  const textMode = useAssistant((s) => s.textMode);
  const setTextMode = useAssistant((s) => s.setTextMode);
  const toggleHistory = useAssistant((s) => s.toggleHistory);
  const historyOpen = useAssistant((s) => s.historyOpen);
  const voiceNotice = useAssistant((s) => s.voiceNotice);
  const setMicPermission = useAssistant((s) => s.setMicPermission);

  const { speakingText, tapMic, sendText } = useConcierge();
  const [endOpen, setEndOpen] = useState(false);
  const [started, setStarted] = useState(false);

  // Mic permission is asked for inside the app, once there is an account (§2).
  if (micPermission !== "granted" && !textMode) {
    return (
      <div className="relative flex min-h-[100dvh] flex-1 items-center justify-center px-6 py-10">
        <PermissionGate onGranted={() => setMicPermission("granted")} />
      </div>
    );
  }

  const busy = status === "thinking" || status === "speaking";

  // ---- text mode ----------------------------------------------------------
  if (textMode) {
    return (
      <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3.5">
            <div style={{ fontWeight: 650 }}>
              Mimico <span style={{ color: "var(--accent)" }}>Concierge</span>
            </div>
            <div className="mono-label" style={{ color: "var(--text-tertiary)", paddingLeft: 14, borderLeft: "1px solid var(--border)" }}>
              Text mode
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setTextMode(false)}>
            Switch to voice
          </button>
        </div>
        <p className="mx-auto mt-4 px-6" style={{ maxWidth: 640, fontSize: "var(--fs-small)", color: "var(--text-tertiary)" }}>
          For noisy rooms, quiet spaces, or whenever you&rsquo;d rather not talk out loud &mdash; type anything you&rsquo;d otherwise say.
        </p>
        <Transcript turns={turns} liveText="" speakingText={speakingText} />
        <TextComposer onSend={sendText} busy={busy} />
        <ConnectionBanner />
      </div>
    );
  }

  // ---- first run ----------------------------------------------------------
  if (!started && turns.length === 0) {
    return (
      <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div className="flex items-center justify-between px-7 py-[22px]">
          <div style={{ fontWeight: 650 }}>
            Mimico <span style={{ color: "var(--accent)" }}>Concierge</span>
          </div>
          <div className="flex gap-2">
            <button type="button" className="icon-btn" aria-label="Tone settings" onClick={() => setStarted(true)}>
              <ToneIcon />
            </button>
            <button type="button" className="icon-btn" aria-label="Type instead" onClick={() => setTextMode(true)}>
              <KeyboardIcon />
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
          <MicButton
            status="idle"
            label="Start talking"
            onTap={() => {
              setStarted(true);
              void tapMic();
            }}
          />
          <div className="text-center">
            <h1 style={{ fontSize: "var(--fs-display-lg)", fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
              Tap the mic to begin
            </h1>
            <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", margin: 0, maxWidth: 420 }}>
              Ask for anything Mimico can do &mdash; Concierge is listening the moment you start.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="status-dot" />
            <span className="mono-label" style={{ color: "var(--text-tertiary)" }}>
              Mic off &mdash; nothing is heard until you start
            </span>
          </div>
        </div>
        <ConnectionBanner />
      </div>
    );
  }

  // ---- core: talk ---------------------------------------------------------
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div className="core-header glass">
        <div style={{ fontWeight: 650 }}>
          Mimico <span style={{ color: "var(--accent)" }}>Concierge</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="core-badge">
            <span className={`status-dot${status === "listening" ? " is-live" : ""}`} />
            <span className="mono-label" style={{ color: "var(--text-tertiary)" }}>
              {status === "listening" ? "Live" : "Off"}
            </span>
          </div>

          <ToneSwitcher />

          <button
            type="button"
            className={`icon-btn${historyOpen ? " is-active" : ""}`}
            aria-label="Session history"
            onClick={() => toggleHistory()}
          >
            <HistoryIcon />
          </button>

          <div className="relative">
            <button type="button" className="icon-btn" aria-label="End session" onClick={() => setEndOpen((v) => !v)}>
              <PowerIcon />
            </button>
            {endOpen && (
              <div className="panel glass fade-pop absolute right-0 z-30 p-4" style={{ top: 50, width: 230 }}>
                <p style={{ margin: "0 0 12px", fontSize: "var(--fs-small)", color: "var(--text-secondary)" }}>
                  End this session? The transcript will close.
                </p>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost flex-1 justify-center" style={{ padding: 8 }} onClick={() => setEndOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-caution flex-1 justify-center"
                    style={{ padding: 8 }}
                    onClick={async () => {
                      useAssistant.getState().reset();
                      setEndOpen(false);
                      setStarted(false);
                      await authClient.signOut();
                      router.push("/login");
                    }}
                  >
                    End
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Transcript turns={turns} liveText={liveText} speakingText={speakingText} />

      <div className="core-dock-wrap">
        <div className="core-dock panel glass">
          <div className="core-hero">{STATUS_WORD[status]}</div>
          <MicButton status={status} onTap={() => void tapMic()} />

          {status === "speaking" && (
            <div className="preview-voice-note fade-pop">
              <InfoIcon />
              <span>Preview voice &mdash; your cloned voice arrives after setup</span>
            </div>
          )}

          {/* The clone falling back is surfaced here, never only in the console. */}
          {voiceNotice && (
            <div className="preview-voice-note fade-pop" style={{ color: "var(--caution)" }}>
              <InfoIcon />
              <span>{voiceNotice}</span>
            </div>
          )}

          <button type="button" className="btn btn-ghost" style={{ fontSize: "var(--fs-small)" }} onClick={() => setTextMode(true)}>
            Type instead
          </button>
        </div>
      </div>

      <HistoryDrawer />
      <ConnectionBanner />
    </div>
  );
}
