"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { MailIcon } from "@/components/ui/icons";
import { FormError } from "@/components/auth/FormError";

/** The prototype's 45-second resend cooldown, kept exactly. */
const COOLDOWN_SECONDS = 45;

export function VerifyEmailClient() {
  const email = useSearchParams().get("email") ?? "";
  const [left, setLeft] = useState(COOLDOWN_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => setLeft((s) => (s <= 0 ? 0 : s - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function resend() {
    if (left > 0 || !email) return;
    setError(null);
    setSent(false);
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/app" });
    if (error) {
      setError(error.message ?? "We couldn't resend that just now.");
      return;
    }
    setSent(true);
    setLeft(COOLDOWN_SECONDS);
  }

  return (
    <div className="w-full text-center" style={{ maxWidth: 420 }}>
      <div
        className="mx-auto mb-[26px] flex items-center justify-center"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "var(--accent-tint)",
          color: "var(--accent-strong)",
        }}
      >
        <MailIcon />
      </div>

      <h1 style={{ fontSize: "var(--fs-display-lg)", fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
        Check your inbox
      </h1>
      <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "0 0 8px" }}>
        We sent a confirmation link to
      </p>
      <p style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 30px" }}>{email || "your inbox"}</p>

      <button
        className="btn btn-ghost mx-auto"
        onClick={resend}
        disabled={left > 0 || !email}
        style={left > 0 || !email ? { opacity: 0.55 } : undefined}
      >
        {left > 0 ? `Resend email — available in ${left}s` : "Resend email"}
      </button>

      {sent && (
        <p className="mono-label" style={{ color: "var(--accent-strong)", marginTop: 16 }}>
          Sent again just now
        </p>
      )}
      <div className="mt-4 text-left">
        <FormError message={error} />
      </div>

      <p style={{ fontSize: "var(--fs-small)", color: "var(--text-tertiary)", margin: "30px 0 0" }}>
        Wrong address?{" "}
        <Link href="/signup" className="link-accent">
          Use a different email
        </Link>
      </p>
    </div>
  );
}
