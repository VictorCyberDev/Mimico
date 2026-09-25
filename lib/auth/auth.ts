import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { sendMail, authEmailHtml } from "@/lib/email/sendMail";

/**
 * Better Auth server config (§10). Password hashing, email-verification
 * tokens and password-reset tokens are all Better Auth's; the only thing
 * supplied here is how the mail actually leaves the building.
 */

// Supabase's transaction pooler (port 6543) is the right target for
// serverless functions, but it does not support prepared statements — hence
// a small pool and no statement caching.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    // The prototype routes straight to /verify-email after signup, so the
    // account must not be usable until the emailed link is clicked.
    requireEmailVerification: true,
    minPasswordLength: 8, // matches the "At least 8 characters" placeholder
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Reset your Mimico password",
        text: `Reset your password here: ${url}\n\nIf you didn't ask for this, you can ignore this email — nothing changes until you open the link.`,
        html: authEmailHtml({
          heading: "Reset your password",
          body: "Open the link below to choose a new password for your Mimico Concierge account.",
          ctaLabel: "Choose a new password",
          ctaUrl: url,
          footnote:
            "If you didn't ask for this, you can ignore this email — nothing changes until you open the link.",
        }),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Verify your Mimico account",
        text: `Confirm your email here: ${url}`,
        html: authEmailHtml({
          heading: "Confirm your email",
          body: "One tap and your Concierge is ready — this confirms the address on your Mimico account.",
          ctaLabel: "Confirm my email",
          ctaUrl: url,
          footnote: "This link expires in an hour. If it wasn't you, you can ignore this email.",
        }),
      });
    },
  },

  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
});
