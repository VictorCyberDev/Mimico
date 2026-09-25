import type { ReactNode } from "react";

/** The centred single-column frame every auth screen in the prototype uses. */
export function AuthShell({ children, width = 380 }: { children: ReactNode; width?: number }) {
  return (
    <main className="flex min-h-[100dvh] flex-1 items-center justify-center px-6 py-10">
      <div className="w-full" style={{ maxWidth: width }}>
        {children}
      </div>
    </main>
  );
}

export function Wordmark() {
  return (
    <div className="mono-label" style={{ color: "var(--text-tertiary)", marginBottom: 10 }}>
      Mimico <span style={{ color: "var(--accent)" }}>Concierge</span>
    </div>
  );
}
