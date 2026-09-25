import { ForgotPasswordClient } from "./ForgotPasswordClient";

export const metadata = { title: "Reset your password — Mimico Concierge" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-10">
      <ForgotPasswordClient />
    </main>
  );
}
