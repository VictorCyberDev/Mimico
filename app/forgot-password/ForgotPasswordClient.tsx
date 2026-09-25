"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/auth-client";
import { MailIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/auth/AuthShell";
import { FormError } from "@/components/auth/FormError";

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    // Deliberately NOT surfacing a "no such account" result: the confirmation
    // copy below never confirms whether an address is registered, which is
    // correct practice, not an oversight (§10). Only transport failures show.
    if (error && error.status !== 400) {
      setError(error.message ?? "We couldn't send that just now. Try again.");
      setBusy(false);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full text-center" style={{ maxWidth: 420 }}>
        <div
          className="mx-auto mb-[26px] flex items-center justify-center"
          style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--accent-tint)", color: "var(--accent-strong)" }}
        >
          <MailIcon />
        </div>
        <h1 style={{ fontSize: "var(--fs-display-lg)", fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
          Check your inbox
        </h1>
        <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "0 0 8px" }}>
          If an account exists for
        </p>
        <p style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 8px" }}>{email}</p>
        <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "0 0 30px" }}>
          a reset link is on its way.
        </p>
        <p style={{ fontSize: "var(--fs-small)", color: "var(--text-tertiary)", margin: 0 }}>
          <Link href="/login" className="link-accent">
            &larr; Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ maxWidth: 380 }}>
      <Wordmark />
      <h1 style={{ fontSize: "var(--fs-display-lg)", fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
        Reset your password
      </h1>
      <p style={{ fontSize: "1rem", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "0 0 28px" }}>
        Tell us the email on your account and we&rsquo;ll send a link to reset it.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="mono-label" htmlFor="fp-email" style={{ color: "var(--text-tertiary)" }}>
          Email
        </label>
        <input
          id="fp-email"
          className="field"
          type="email"
          placeholder="you@work.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormError message={error} />
        <button type="submit" className="btn btn-primary mt-3.5 justify-center" disabled={busy} style={busy ? { opacity: 0.55 } : undefined}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p style={{ fontSize: "var(--fs-small)", color: "var(--text-secondary)", textAlign: "center", margin: "26px 0 0" }}>
        <Link href="/login" className="link-accent">
          &larr; Back to sign in
        </Link>
      </p>
    </div>
  );
}
