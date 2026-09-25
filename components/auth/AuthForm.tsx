"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/auth-client";
import { FormError } from "./FormError";
import { GoogleButton } from "./GoogleButton";
import { Wordmark } from "./AuthShell";

type Mode = "signup" | "login";

/**
 * Shared email/password form for signup and login (§3), wired to the real
 * Better Auth client (§10). The markup and copy are the prototype's; the
 * pending and error states are new, because a real backend needs them.
 */
export function AuthForm({ mode, googleEnabled }: { mode: Mode; googleEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (isSignup) {
        // The designed form has no name field, and Better Auth's user.name is
        // NOT NULL — so the email's local part seeds it. The user can change
        // it later; inventing an extra input would change the design.
        const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || email;
        const { error } = await authClient.signUp.email({ name, email, password });
        if (error) throw new Error(error.message ?? "We couldn't create that account.");
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) {
          // Better Auth refuses sign-in until the emailed link is clicked.
          if (error.code === "EMAIL_NOT_VERIFIED") {
            router.push(`/verify-email?email=${encodeURIComponent(email)}`);
            return;
          }
          throw new Error(error.message ?? "That email and password didn't match.");
        }
        router.push("/app");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <Wordmark />
      <h1
        style={{
          fontSize: "var(--fs-display-lg)",
          fontWeight: 300,
          letterSpacing: "-0.02em",
          margin: "0 0 10px",
        }}
      >
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p
        style={{
          fontSize: "1rem",
          color: "var(--text-secondary)",
          lineHeight: "var(--lh-normal)",
          margin: "0 0 28px",
        }}
      >
        {isSignup
          ? "One account for your voice, your tone, and your Concierge sessions."
          : "Sign in to pick up where you left off."}
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="mono-label" htmlFor="email" style={{ color: "var(--text-tertiary)" }}>
          Email
        </label>
        <input
          id="email"
          className="field"
          type="email"
          placeholder="you@work.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="mt-1.5 flex items-center justify-between">
          <label className="mono-label" htmlFor="password" style={{ color: "var(--text-tertiary)" }}>
            Password
          </label>
          {!isSignup && (
            <Link
              href="/forgot-password"
              style={{
                fontSize: "var(--fs-small)",
                color: "var(--text-tertiary)",
                textDecoration: "underline",
              }}
            >
              Forgot?
            </Link>
          )}
        </div>
        <input
          id="password"
          className="field"
          type="password"
          placeholder={isSignup ? "At least 8 characters" : "Your password"}
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <FormError message={error} />

        <button
          type="submit"
          className="btn btn-primary mt-3.5 justify-center"
          disabled={busy}
          style={busy ? { opacity: 0.55 } : undefined}
        >
          {busy
            ? isSignup
              ? "Creating your account…"
              : "Signing you in…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <GoogleButton enabled={googleEnabled} />

      {isSignup ? (
        <>
          <p
            style={{
              fontSize: "var(--fs-small)",
              color: "var(--text-tertiary)",
              textAlign: "center",
              margin: "22px 0 0",
              lineHeight: "var(--lh-normal)",
            }}
          >
            By continuing you agree to Mimico&rsquo;s{" "}
            <a href="#" style={{ textDecoration: "underline" }}>
              Terms
            </a>{" "}
            and{" "}
            <a href="#" style={{ textDecoration: "underline" }}>
              Privacy Policy
            </a>
            .
          </p>
          <p style={{ fontSize: "var(--fs-small)", color: "var(--text-secondary)", textAlign: "center", margin: "26px 0 0" }}>
            Already have an account?{" "}
            <Link href="/login" className="link-accent">
              Sign in
            </Link>
          </p>
        </>
      ) : (
        <p style={{ fontSize: "var(--fs-small)", color: "var(--text-secondary)", textAlign: "center", margin: "26px 0 0" }}>
          New to Mimico?{" "}
          <Link href="/signup" className="link-accent">
            Create an account
          </Link>
        </p>
      )}
    </>
  );
}
