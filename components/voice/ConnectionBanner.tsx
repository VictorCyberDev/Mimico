"use client";

import { useEffect } from "react";
import { WarningIcon } from "@/components/ui/icons";
import { useAssistant } from "@/lib/store/assistantStore";

/**
 * §9 — for a request/response app "connection lost" means the network went
 * away or a call to /api/concierge failed. Driven by real online/offline
 * events and real fetch failures, never a timer.
 */
export function ConnectionBanner() {
  const connection = useAssistant((s) => s.connection);
  const setConnection = useAssistant((s) => s.setConnection);

  useEffect(() => {
    const online = () => setConnection("online");
    const offline = () => setConnection("reconnecting");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    if (!navigator.onLine) setConnection("reconnecting");
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [setConnection]);

  if (connection === "online") return null;

  const reconnecting = connection === "reconnecting";

  return (
    <div className="absolute inset-0 z-50">
      <div className="absolute inset-0" style={{ background: "var(--scrim)" }} />
      <div className="relative flex h-full items-center justify-center p-6">
        <div className="panel fade-pop w-full text-center" style={{ maxWidth: 380, padding: "40px 34px" }}>
          {reconnecting ? (
            <>
              <div
                className="mx-auto mb-6 flex items-center justify-center"
                style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--surface-sunken)" }}
              >
                <svg
                  width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)"
                  strokeWidth="2" strokeLinecap="round"
                  style={{ animation: "arc-travel 1.4s linear infinite", transformOrigin: "center" }}
                >
                  <circle cx="12" cy="12" r="9" strokeDasharray="34 56" />
                </svg>
              </div>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 600, margin: "0 0 8px" }}>Reconnecting&hellip;</h1>
              <p style={{ fontSize: "var(--fs-body)", color: "var(--text-secondary)", margin: 0 }}>
                Hold on, we&rsquo;re getting Concierge back online.
              </p>
            </>
          ) : (
            <>
              <div
                className="mx-auto mb-6 flex items-center justify-center"
                style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--caution-tint)", color: "var(--caution)" }}
              >
                <WarningIcon />
              </div>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h1>
              <p style={{ fontSize: "var(--fs-body)", color: "var(--text-secondary)", margin: "0 0 24px" }}>
                We couldn&rsquo;t reconnect. Check your connection, then tap to try again.
              </p>
              <button
                type="button"
                className="btn btn-primary w-full justify-center"
                onClick={() => setConnection(navigator.onLine ? "online" : "reconnecting")}
              >
                Tap to retry
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
