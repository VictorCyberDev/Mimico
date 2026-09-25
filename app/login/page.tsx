import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Welcome back — Mimico Concierge" };

export default function LoginPage() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <AuthShell>
      <AuthForm mode="login" googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
