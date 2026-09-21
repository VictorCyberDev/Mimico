# Build prompt: Mimico Concierge (Next.js, deployable free on Vercel)

Paste this whole file into Claude Code inside an empty repo (or a `mimico-concierge` folder), alongside the
reference file `mimico-concierge-prototype.html` (already provided separately — put it in the repo root or a
`/reference` folder before starting). Tell Claude Code: *"Read reference/mimico-concierge-prototype.html first
for exact visuals, copy, colors, timing and interaction logic, then build the plan below."*

## 0. What already exists vs. what this prompt asks for

The HTML file is a **static, scripted demo** — the "listening/thinking/speaking" cycle is a fixed timeline with
made-up transcript lines, not real speech, and the sign-up/login/verify/forgot-password screens just flip between
each other with no real backend behind them. It is the source of truth for **look, feel, motion, copy, and
layout** across every screen, auth included. This prompt turns it into a **real, working Next.js app**: actual
microphone input, actual speech output, a real state machine, a real account system with real email delivery, and
a backend route ready to be wired to Mimico's real command handling.

## 1. Stack (Vercel Hobby / free-tier friendly)

- **Next.js 16+ (App Router) + TypeScript** — deploys to Vercel with zero config, generous free tier. Next.js 16
  renamed `middleware.ts` to `proxy.ts` (same job, clearer name) — this prompt uses the current `proxy.ts`
  convention throughout ([Next.js proxy docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy),
  fetched 2026-09-21).
- **Tailwind CSS** for utility layout, with the design tokens below wired in as CSS variables (don't fight
  Tailwind's palette — extend it to read the variables).
- **Framer Motion** for all spring/easing transitions (mic states, drawer, popovers, page transitions) — it's the
  React-idiomatic way to get the "physical, spring-like" motion the brief asks for, including
  `useReducedMotion()` for the accessibility fallback for free.
- **Zustand** for the assistant's shared client state (status, transcript, tone, connection, drawers) — much less
  boilerplate than Context+reducer for this size of app.
- **`next/font/google`** to self-host Bricolage Grotesque + IBM Plex Mono at build time (faster and more private
  than a Google Fonts `<link>`, and free).
- **Better Auth** (self-hosted, MIT-licensed, free) for authentication, backed by a free Postgres database — see
  §2 and §10 for why and how.

**Free/open-source first, per how you like tool options presented** — the things you'll need to connect for real,
cheapest-to-priciest:

| Need | Free / open-source path | Paid path (better quality / less setup) |
|---|---|---|
| User accounts + auth | **Better Auth** — fully open-source, MIT-licensed, self-hosted in your own repo; free forever, no usage caps because there's no vendor billing you ([GitHub](https://github.com/better-auth/better-auth), fetched 2026-09-21). Password hashing, email-verification tokens, and password-reset tokens are all built in — you only supply the "send this email" function. | **Clerk** — free up to 50,000 monthly retained users, with prebuilt sign-up/sign-in UI components so you write even less code; the trade-off is it's a proprietary hosted vendor with no self-host option and a fixed 7-day session length on the free tier ([pricing](https://clerk.com/pricing), fetched 2026-09-21). |
| Database (Postgres) for Better Auth to use | **Supabase's free Postgres** (500 MB) — used here purely as a database, not its Auth product — or Neon/Railway's free Postgres tiers work identically ([Supabase pricing](https://supabase.com/pricing), fetched 2026-09-21). | A managed Postgres add-on once you outgrow the free tier (Supabase Pro, Neon Scale, etc.). |
| Sending verification & password-reset emails | **Resend's free tier** (3,000 emails/month, 100/day) called directly from Better Auth's `sendVerificationEmail` / `sendResetPassword` callbacks via the `resend` SDK — see §10 ([pricing](https://resend.com/pricing), fetched 2026-09-21). | Postmark or SendGrid once you're sending real volume. |
| Speech-to-text | Browser's built-in `SpeechRecognition` (Web Speech API) — zero cost, zero setup, built into Chrome/Edge | Deepgram, AssemblyAI, OpenAI's Whisper API |
| Command understanding ("thinking") | Plain keyword/fuzzy matching against your known command list (e.g. the `fuse.js` library, MIT-licensed) — no AI call needed for a fixed command set | An LLM call (Groq's free tier hosts open-weight models fast and free up to a quota; otherwise OpenAI/Anthropic APIs) |
| Speech-out / voice | Browser's built-in `speechSynthesis` — this **is** your honest "preview voice" | ElevenLabs or Resemble.ai for the real cloned-voice output once a user's clone is ready; Coqui XTTS-v2 (open-source, self-hostable) if you want a free *cloning* path instead of a paid API |

Start with the free column end-to-end — it's a complete, real, working account system and voice loop with **no
recurring cost** at Mimico's likely early scale. Swap in the paid column later per feature, one at a time.

**A note on where Better Auth comes from**, since you'll see the older name in a lot of tutorials: Better Auth
grew out of the same "own your auth" philosophy as Auth.js (NextAuth), and in September 2025 Auth.js was formally
folded into the Better Auth project. Auth.js still receives security patches so nothing breaks if you find older
code using it, but its own maintainers now point new projects at Better Auth, specifically because Auth.js leaves
things like password hashing, email verification, and password-reset tokens for you to hand-write, while Better
Auth ships all three ([announcement](https://better-auth.com/blog/authjs-joins-better-auth), fetched 2026-09-21).
That's a direct win for this app, since it's exactly the four screens (sign up, log in, verify email, forgot
password) already designed in the reference file.

## 2. Routing & authentication architecture

Three genuinely separate zones, matching how the reference prototype's nav is now grouped:

```
/                    Public marketing landing (existing) — no auth, fast, cacheable
/signup              Public — create account
/login               Public — sign in
/verify-email        Public — shown right after signup, until the user clicks the emailed link
/forgot-password     Public — request + "check your email" states, matches the prototype's two-state screen
/app                 GATED — the whole Concierge experience (what the prototype calls "Core — talk"),
                     plus /app/permission, /app/first-run, /app/tone, /app/text, /app/connection as needed
```

Gate it with a single `proxy.ts` at the project root (Next.js 16's renamed `middleware.ts` — same job, runs before
every matched request), not per-page checks — one place to get it right:

```ts
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth'

const PUBLIC_PATHS = ['/', '/signup', '/login', '/verify-email', '/forgot-password', '/reset-password']

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  const isPublic = PUBLIC_PATHS.includes(request.nextUrl.pathname)

  if (!session && !isPublic) return NextResponse.redirect(new URL('/login', request.url))
  if (session && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/app', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] }
```

(Source for the `proxy.ts` convention and the `auth.api.getSession` pattern:
[Next.js proxy docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) and
[Better Auth + Next.js integration guide](https://www.better-auth.com/docs/integrations/next), both fetched
2026-09-21. Next.js's own guidance is to treat this as a first line of defense, not the only check — §7's API
route re-checks the session itself rather than trusting the proxy alone.)

This is also why the prototype's landing-page "Start talking" buttons now point at `/signup` rather than straight
into the mic-permission flow — in the real product, mic permission is something you ask for *inside* the app,
once someone has an account, not before.

## 3. Folder structure

```
app/
  layout.tsx                # fonts, theme class on <html>, metadata
  globals.css                # design tokens + Tailwind layers
  page.tsx                   # Landing (marketing) — reuses the prototype's landing content
  signup/page.tsx             # port from screen-signup in the reference file
  login/page.tsx               # port from screen-login
  verify-email/page.tsx         # port from screen-verify
  forgot-password/page.tsx       # port from screen-forgot
  reset-password/page.tsx         # new — reached via the link Better Auth emails, see §10
  app/
    layout.tsx                # gated shell — redundant server-side check + shared chrome
    page.tsx                   # the whole assistant experience (client component), was "/talk"
  api/
    auth/[...all]/route.ts      # Better Auth's own handler — signup/login/session/reset all live here
    concierge/route.ts          # POST { text } -> { reply, action } — stub for now, see §7
components/
  landing/*                  # Hero, HowItWorks, CtaBand — port straight from the prototype's Landing section
  auth/
    AuthForm.tsx               # shared email/password form used by signup + login
    GoogleButton.tsx            # optional social button, wired to authClient.signIn.social (see §10)
  voice/
    MicButton.tsx             # the 128px circular control + ripple/bars/arc, all 4 states
    VoiceVisualizer.tsx        # the bar-EQ / arc svg, driven by `status`
    Transcript.tsx             # calm running transcript, word-in animation via Framer Motion stagger
    ToneSwitcher.tsx            # header chip + popover, casual/professional/custom
    HistoryDrawer.tsx           # slide-in panel
    PermissionGate.tsx          # pre-prompt explainer + denied fallback (see §6)
    TextComposer.tsx            # text-input fallback mode
    ConnectionBanner.tsx        # reconnecting / error overlay
  ui/*                       # Button, IconButton, Chip, Panel — small design-system primitives
lib/
  auth/
    auth.ts                   # Better Auth server config — database pool + email callbacks, see §10
    auth-client.ts              # createAuthClient() for use from client components
  email/
    sendMail.ts                # Resend SDK client, see §10
  store/assistantStore.ts     # Zustand store — status/turns/tone/etc. (per-user data now persists to Postgres, see §10)
  speech/useSpeechRecognition.ts
  speech/useSpeechSynthesis.ts
  intent/matchCommand.ts      # fuse.js-based matcher against the known command list
proxy.ts                       # route gating, see §2 (Next.js 16's renamed middleware.ts)
```

## 4. Design tokens (drop into `app/globals.css`)

Copy the `:root`, `.theme-light`, `.theme-dark` variable blocks and every keyframe/animation rule verbatim from
`mimico-concierge-prototype.html`'s `<style>` block — they're already final, including the current slate-teal
accent. Put the theme class (`theme-light` / `theme-dark`) on `<html>` in `app/layout.tsx`, toggled from a small
`useTheme()` hook backed by `prefers-color-scheme` for the default and a manual override stored in the Zustand
store (not `localStorage` — keep it session-only for now, add persistence later if you want it to stick across
visits).

## 5. The state machine (lib/store/assistantStore.ts)

Port this shape directly — it matches the prototype's logic, minus the fake timers:

```ts
type Status = 'idle' | 'listening' | 'thinking' | 'speaking';
type Turn = { who: 'user' | 'concierge'; text: string; ack?: string };

type AssistantState = {
  status: Status;
  turns: Turn[];
  liveText: string;           // interim speech-recognition result, replaces the fake word-reveal
  tone: 'Casual' | 'Professional' | 'Custom';
  customTone: string;
  micPermission: 'unknown' | 'granted' | 'denied';
  connection: 'online' | 'reconnecting' | 'error';
  historyOpen: boolean;
  textMode: boolean;
};
```

Real interim results from `SpeechRecognition.onresult` (`event.results[i].isFinal === false`) give you the
"arriving as it's heard" effect for free — no need to fake word-by-word reveal for the user's own speech. Keep
the word-by-word Framer Motion stagger for the **concierge's replies**, since those arrive as one string from the
API and still deserve the same calm, gradual reveal the design specifies.

## 6. Real microphone permission flow (components/voice/PermissionGate.tsx)

The prototype's "Allow / Deny" buttons were simulated. For real:

1. Show the explainer screen first (already designed) with one button, "Allow microphone access."
2. On click, call `navigator.mediaDevices.getUserMedia({ audio: true })` inside that click handler (must be a
   direct user gesture — Chrome/Safari block it otherwise). Stop the returned track immediately
   (`stream.getTracks().forEach(t => t.stop())`) — you only needed it to trigger the permission prompt and confirm
   access; the actual capture for recognition happens separately via `SpeechRecognition`, which manages its own
   mic access.
3. `getUserMedia` resolving → `micPermission: 'granted'`, route to the first-run/core view.
   Rejecting (`NotAllowedError`) → `micPermission: 'denied'`, show the existing denied UI.
4. Browsers don't reliably let you re-request permission from JS once denied — "Try again" should re-attempt
   `getUserMedia` (works if the user changed the site permission in their browser chrome in the meantime) rather
   than promising it'll work; if it fails again, stay on the denied screen.
5. Feature-detect first: `const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window`.
   **Firefox and desktop Safari don't support `SpeechRecognition` at all.** If `!supported`, skip the permission
   screen entirely and drop the user straight into text mode with a one-line explanation — don't show a
   mic-permission prompt for a mic that can't be used. This is the biggest functional gap the static prototype
   couldn't show you, and it means text mode is not a nice-to-have fallback, it's load-bearing for a large slice
   of real visitors.

## 7. The command loop (lib/intent/matchCommand.ts + app/api/concierge/route.ts)

Keep it dead simple for v1 and free: a fixed list of known intents (clone voice, set tone, check clone status,
send to WhatsApp) matched with `fuse.js` against the final recognized/typed text. No network call needed for
recognition-to-intent.

```ts
// app/api/concierge/route.ts
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'

export const maxDuration = 30; // seconds — well inside Hobby's 60s cap, plenty for a real LLM call later

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { text } = await req.json();
  const match = matchCommand(text); // returns { intent, confidence }
  if (!match || match.confidence < 0.4) {
    return Response.json({ reply: "Sorry, I didn't catch a command in that — try rephrasing, or type it instead.", intent: 'unknown' });
  }
  // TODO: replace this switch with real calls into Mimico's backend
  switch (match.intent) {
    case 'set_tone': return Response.json({ reply: 'Done — new replies use that tone from now on.', intent: match.intent, tone: match.value });
    case 'clone_status': return Response.json({ reply: 'Your voice clone is ready. Video clone finishes in about four minutes.', intent: match.intent });
    // ...
  }
}
```

This route runs as a Vercel Function — well within Hobby's default 10s / max 60s duration limit for this kind of
work ([Vercel limits docs](https://vercel.com/docs/limits), fetched 2026-09-21). If you later swap in a real LLM
call for open-ended requests (not just the fixed command list), keep an eye on that same duration limit and
prefer a fast/cheap model or streaming response over a slow one.

## 8. Speech output (lib/speech/useSpeechSynthesis.ts)

```ts
const utter = new SpeechSynthesisUtterance(replyText);
utter.onend = () => setStatus('idle');
window.speechSynthesis.speak(utter);
```

This is your real, working "preview voice" — keep the exact copy from the design ("Preview voice — your cloned
voice arrives after setup") since it's now literally true: it's the browser's generic voice, not a clone.
Interrupt = `window.speechSynthesis.cancel()` on mic-tap-while-speaking, exactly as designed, then immediately
start a new recognition session.

## 9. Connection state (components/voice/ConnectionBanner.tsx)

For a client-only app with no persistent server connection, "connection lost" mostly means **network lost**, not
a dropped socket (Vercel Functions are request/response, not long-lived — don't try to hold a WebSocket open in a
Vercel Function on Hobby, it isn't supported there). Drive the banner from `window.addEventListener('online' /
'offline', …)` plus catching `fetch` failures from `/api/concierge`, not from a fake timer.

## 10. Setting up Better Auth (free) — step by step

1. Get a free Postgres database. The easiest path is a free Supabase project, used here purely as a Postgres
   host — you never touch Supabase's own Auth product. Copy its connection string into `DATABASE_URL` in
   `.env.local` (and later into Vercel's Environment Variables). Neon or Railway's free Postgres tiers work
   identically if you'd rather not use Supabase at all.
2. `npm install better-auth pg resend`. Create `lib/email/sendMail.ts` — a thin wrapper over the Resend SDK
   (free tier: 3,000 emails/month, 100/day):
   ```ts
   import { Resend } from 'resend'
   const resend = new Resend(process.env.RESEND_API_KEY!)
   export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
     await resend.emails.send({ from: 'Mimico Concierge <no-reply@yourdomain.com>', to, subject, text })
   }
   ```
   (The `from` address needs a domain verified in your Resend account before real sending works — Resend's
   dashboard walks you through the DNS records for that.)
3. Create `lib/auth/auth.ts` — this is the whole server-side auth config, and it's where password hashing, email
   verification, and password-reset tokens all actually happen (you're only filling in *how the email gets
   sent*, not writing that logic yourself):
   ```ts
   import { betterAuth } from 'better-auth'
   import { Pool } from 'pg'
   import { sendMail } from '@/lib/email/sendMail'

   export const auth = betterAuth({
     database: new Pool({ connectionString: process.env.DATABASE_URL! }),
     emailAndPassword: {
       enabled: true,
       requireEmailVerification: true,
       sendResetPassword: async ({ user, url }) => {
         await sendMail({ to: user.email, subject: 'Reset your Mimico password', text: `Reset it here: ${url}` })
       },
     },
     emailVerification: {
       sendVerificationEmail: async ({ user, url }) => {
         await sendMail({ to: user.email, subject: 'Verify your Mimico account', text: `Verify here: ${url}` })
       },
     },
   })
   ```
4. Push the tables Better Auth needs (`user`, `session`, `verification`, etc.) into that Postgres database:
   `npx auth@latest migrate`. Re-run this any time you add a plugin that needs new columns.
5. Create `app/api/auth/[...all]/route.ts` — this one file *is* Better Auth's backend (signup, login, session
   refresh, verification, and reset all route through it):
   ```ts
   import { auth } from '@/lib/auth/auth'
   import { toNextJsHandler } from 'better-auth/next-js'
   export const { GET, POST } = toNextJsHandler(auth)
   ```
   And `lib/auth/auth-client.ts` for use from client components:
   ```ts
   import { createAuthClient } from 'better-auth/react'
   export const authClient = createAuthClient()
   ```
6. Wire the reference screens to real calls:
   - `/signup` → `authClient.signUp.email({ name, email, password })`, then route to `/verify-email` exactly as
     the prototype already does.
   - `/login` → `authClient.signIn.email({ email, password })`, then let the `proxy.ts` from §2 send them to
     `/app`.
   - `/forgot-password` → `authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })`. Keep the
     prototype's "If an account exists for…" phrasing on the confirmation state — it deliberately never confirms
     whether an email is registered, which is correct security practice, not an oversight.
   - `/reset-password` (new page, opened from the emailed link) → `authClient.resetPassword({ newPassword,
     token })`, reading `token` off the URL's query string.
   - The optional "Continue with Google" button → Better Auth's `socialProviders` config plus
     `authClient.signIn.social({ provider: 'google' })` on the client, once you've registered a free Google OAuth
     client (see Better Auth's own social-provider docs for the exact config shape — it's a small addition once
     email/password is working). Skip this for v1 if you want to ship faster; email/password alone is a complete
     account system.
7. Unlike an all-in-one platform, a bare Postgres database's own inactivity/pause policy depends on whoever's
   hosting it — check whichever free host you picked (Supabase, Neon, Railway) for its specific rules before a
   demo, rather than assuming they all behave the same way.

(Sources: [Better Auth + Next.js integration](https://www.better-auth.com/docs/integrations/next), [Better Auth
email/password guide](https://www.better-auth.com/docs/authentication/email-password), [Better Auth Postgres
adapter](https://www.better-auth.com/docs/adapters/postgresql), [Better Auth CLI
docs](https://www.better-auth.com/docs/concepts/cli), and [Resend pricing](https://resend.com/pricing), all
fetched 2026-09-21.)

## 11. What to explicitly leave as TODOs (don't invent fake versions of these)

- **Actual voice cloning + WhatsApp/Messenger sending** — Mimico's real backend, not this repo.
- **A "didn't understand" / low-confidence fallback** — included above (§7) since the original design didn't
  cover it, but flagging it: real speech recognition *will* mis-hear things, and the app needs a graceful "try
  again" reply for that, distinct from the connection-lost state.
- **Multi-factor auth, passkeys, and account deletion/export flows** — Better Auth has plugins for the first two
  (`twoFactor`, `passkey`) but none of this is in the reference screens; add it only once account basics are live
  and you have a reason to.

## 12. Deploy to Vercel (free)

1. `git init`, commit, push to a GitHub repo under your account.
2. Set up your free Postgres database (§10) first, then add `DATABASE_URL` and `RESEND_API_KEY` as Environment
   Variables in Vercel — never commit them to the repo. Run `npx auth@latest migrate` against that database once
   (from your machine, pointed at the same `DATABASE_URL`) before your first real deploy.
3. On vercel.com, "Add New Project" → import that repo → it auto-detects Next.js, no config needed.
4. Every push to `main` auto-deploys; PRs get their own preview URL for free.
5. One honest caveat: Vercel's Hobby plan terms are for **personal, non-commercial** use — a live product
   generating or intended to generate revenue (which Mimico.ai is) technically calls for the Pro plan
   (~$20/mo/seat) once it's actually live for customers. Hobby is genuinely fine for building, demoing, and
   sharing a preview link while you're not yet charging anyone.
