import Link from "next/link";

/**
 * Server-rendered. The settle-in stagger is the prototype's CSS animation
 * with its original delays, so the hero paints and animates without waiting
 * on any JS — which also keeps it out of the LCP path.
 */
export function Hero() {
  return (
    <section className="mx-auto flex min-h-[80dvh] max-w-[980px] flex-col justify-center px-5 py-[clamp(40px,7vw,90px)] sm:px-10">
      <div
        className="mono-label settle-in"
        style={{ color: "var(--text-tertiary)", marginBottom: 18, animationDelay: "0.05s" }}
      >
        Voice-first for Mimico.ai
      </div>

      <h1
        className="settle-in"
        style={{
          animationDelay: "0.2s",
          fontSize: "var(--fs-display-xl)",
          fontWeight: 300,
          letterSpacing: "-0.03em",
          lineHeight: "var(--lh-tight)",
          margin: 0,
        }}
      >
        Say it.
        <br />
        <b style={{ fontWeight: 650 }}>
          Concierge <span style={{ color: "var(--accent)" }}>handles</span> the rest.
        </b>
      </h1>

      <p
        className="settle-in"
        style={{
          animationDelay: "0.45s",
          fontSize: "1.15rem",
          color: "var(--text-secondary)",
          maxWidth: 600,
          margin: "24px 0 0",
          lineHeight: "var(--lh-normal)",
        }}
      >
        Clone a voice, set a tone, check on a job, send it on &mdash; spoken plainly, the way you&rsquo;d
        ask a person. No menus to hunt through.
      </p>

      <div
        className="settle-in flex flex-wrap items-center gap-[18px]"
        style={{ animationDelay: "0.68s", marginTop: 38 }}
      >
        {/* §2: in the real product mic permission is asked for inside the app,
            once there is an account — so this points at signup, not the mic. */}
        <Link href="/signup" className="btn btn-primary">
          Start talking
        </Link>
        <span style={{ fontSize: "var(--fs-small)", color: "var(--text-tertiary)" }}>
          Works right in your browser.
        </span>
      </div>
    </section>
  );
}
