import { Suspense } from "react";
import { VerifyEmailClient } from "./VerifyEmailClient";

export const metadata = { title: "Check your inbox — Mimico Concierge" };

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-10">
      <Suspense fallback={null}>
        <VerifyEmailClient />
      </Suspense>
    </main>
  );
}
