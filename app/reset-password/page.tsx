import { Suspense } from "react";
import { ResetPasswordClient } from "./ResetPasswordClient";

export const metadata = { title: "Choose a new password — Mimico Concierge" };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-10">
      <Suspense fallback={null}>
        <ResetPasswordClient />
      </Suspense>
    </main>
  );
}
