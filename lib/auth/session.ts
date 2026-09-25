import { auth } from "./auth";

/**
 * Session lookup that fails closed rather than exploding.
 *
 * auth.api.getSession throws if Postgres is unreachable, which would turn a
 * database blip into a 500 on every gated page. Treating that as "no
 * session" keeps the gate shut (the user is sent to sign in) instead of
 * leaking a stack trace, and never opens it by accident.
 */
export async function getSessionSafe(headers: Headers) {
  try {
    return await auth.api.getSession({ headers });
  } catch (err) {
    console.error("[auth] session lookup failed, treating as signed out:", err);
    return null;
  }
}
