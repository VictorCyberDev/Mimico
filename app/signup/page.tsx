import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create your account — Mimico Concierge" };

export default function SignupPage() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <AuthShell>
      <AuthForm mode="signup" googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
