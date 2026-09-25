import Link from "next/link";
import { Reveal } from "./Reveal";

export function CtaBand() {
  return (
    <section style={{ borderTop: "1px solid var(--border)" }}>
      <Reveal className="mx-auto flex max-w-[700px] flex-col items-center gap-6 px-5 text-center sm:px-10"
        // clamp preserved from the prototype's generous end-of-page breathing room
      >
        <div
          className="flex flex-col items-center gap-6"
          style={{ paddingTop: "clamp(60px,10vw,120px)", paddingBottom: "clamp(60px,10vw,120px)" }}
        >
          <h2
            style={{
              fontSize: "var(--fs-display-lg)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Talk to your voice, not a menu.
          </h2>
          <Link href="/signup" className="btn btn-primary">
            Start talking
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
