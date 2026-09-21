import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted at build time (§1). The prototype pulled these from a
// Google Fonts <link>; next/font/google inlines them instead, which is
// faster and leaks nothing to Google at request time.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mimico Concierge",
  description:
    "Say it. Concierge handles the rest. Clone a voice, set a tone, check on a job, send it on — spoken plainly, the way you'd ask a person.",
};

// Runs before first paint so the theme class is correct on the very
// first frame — without it the server's `theme-light` would flash for
// dark-mode visitors. Deliberately reads only prefers-color-scheme:
// the manual override is session-only, held in the Zustand store (§4).
const THEME_BOOTSTRAP = `try{var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;e.classList.remove(d?'theme-light':'theme-dark');e.classList.add(d?'theme-dark':'theme-light')}catch(_){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${plexMono.variable} theme-light h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
