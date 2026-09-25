import { Resend } from "resend";

/**
 * Real Resend delivery (§10). Sends from notify.thebuzzscene.com, which is
 * verified in Resend with sending enabled — no sandbox/test sender, no stub.
 *
 * The client is created lazily so that importing this module (which
 * lib/auth/auth.ts does, which proxy.ts does) never throws at build time on
 * a machine without the key. A send without a key is a loud error, not a
 * silent no-op — a verification email that vanishes is worse than one that
 * fails visibly.
 */
const FROM = process.env.RESEND_FROM ?? "Mimico Concierge <verify@notify.thebuzzscene.com>";

let client: Resend | null = null;
function resend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set — cannot send mail. Set it in .env.local locally, " +
        "or in the Vercel project's Environment Variables for a deployment.",
    );
  }
  client ??= new Resend(key);
  return client;
}

export type SendMailArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail({ to, subject, text, html }: SendMailArgs): Promise<string> {
  const { data, error } = await resend().emails.send({
    from: FROM,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });

  // The Resend SDK reports failures in `error` rather than by throwing, so a
  // send that silently failed would otherwise look like a success.
  if (error) {
    throw new Error(`Resend refused the message (${error.name}): ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Resend returned no message id — treating the send as failed.");
  }
  return data.id;
}

/**
 * One plain, quiet template for both auth emails. Inline styles only —
 * mail clients strip <style> blocks and have no CSS variables — but the
 * colours and type are lifted from the same design tokens as the app so
 * the email reads as the same product.
 */
export function authEmailHtml({
  heading,
  body,
  ctaLabel,
  ctaUrl,
  footnote,
}: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote: string;
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#F7F5F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F0;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#FFFFFF;border:1px solid #E2DCCC;border-radius:28px;padding:40px 36px;">
        <tr><td style="font-family:'Avenir Next','Segoe UI',sans-serif;">
          <div style="font-family:'SF Mono',Menlo,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#A39C88;margin-bottom:22px;">
            Mimico <span style="color:#4F8280;">Concierge</span>
          </div>
          <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;color:#1C1811;margin:0 0 14px;">${esc(heading)}</h1>
          <p style="font-size:16px;line-height:1.55;color:#6E6858;margin:0 0 28px;">${esc(body)}</p>
          <a href="${esc(ctaUrl)}" style="display:inline-block;background:#1C1811;color:#F7F5F0;font-size:16px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:999px;">${esc(ctaLabel)}</a>
          <p style="font-size:14px;line-height:1.55;color:#A39C88;margin:28px 0 0;">${esc(footnote)}</p>
          <p style="font-size:12px;line-height:1.55;color:#A39C88;margin:20px 0 0;word-break:break-all;">
            If the button doesn't work, paste this into your browser:<br>${esc(ctaUrl)}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
