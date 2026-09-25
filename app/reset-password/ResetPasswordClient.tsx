"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Wordmark } from "@/components/auth/AuthShell";
import { FormError } from "@/components/auth/FormError";

/**
 * §10 step 6 — the page the emailed link lands on. Better Auth's own
 * /reset-password/:token route validates the token then redirects here with
 * it on the query string.
 */
export function ResetPasswordClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const linkError = params.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token || linkError) {
    return (
      <div className="w-full" style={{ maxWidth: 380 }}>
        <Wordmark />
        <h1 style={{ fontSize: "var(--fs-display-lg)", fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          That link has expired
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "0 0 28px" }}>
          Reset links are single-use and time-limited. Ask for a fresh one and it&rsquo;ll be with you in a moment.
        </p>
        <Link href="/forgot-password" className="btn btn-primary justify-center" style={{ width: "100%" }}>
          Send a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full text-center" style={{ maxWidth: 420 }}>
        <div className="ack-pop mb-4 justify-center">
          <span className="ack-pop__ring" style={{ width: 24, height: 24 }} />
        </div>
        <h1 style={{ fontSize: "var(--fs-display-lg)", fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
          Password changed
        </h1>
        <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "0 0 30px" }}>
          You can sign in with it now.
        </p>
        <Link href="/login" className="btn btn-primary justify-center">
          Go to sign in
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    if (error) {
      setError(error.message ?? "We couldn't set that password. The link may have expired.");
      setBusy(false);
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <div className="w-full" style={{ maxWidth: 380 }}>
      <Wordmark />
      <h1 style={{ fontSize: "var(--fs-display-lg)", fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
        Choose a new password
      </h1>
      <p style={{ fontSize: "1rem", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: "0 0 28px" }}>
        Make it at least eight characters. You&rsquo;ll be signed in with it straight after.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="mono-label" htmlFor="new-password" style={{ color: "var(--text-tertiary)" }}>
          New password
        </label>
        <input
          id="new-password"
          className="field"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="mono-label mt-1.5" htmlFor="confirm-password" style={{ color: "var(--text-tertiary)" }}>
          Confirm password
        </label>
        <input
          id="confirm-password"
          className="field"
          type="password"
          placeholder="Type it once more"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <FormError message={error} />
        <button type="submit" className="btn btn-primary mt-3.5 justify-center" disabled={busy} style={busy ? { opacity: 0.55 } : undefined}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
