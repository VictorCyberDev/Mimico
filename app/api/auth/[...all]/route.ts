import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

// This one file is Better Auth's whole backend: signup, login, session
// refresh, email verification and password reset all route through it.
export const { GET, POST } = toNextJsHandler(auth);
