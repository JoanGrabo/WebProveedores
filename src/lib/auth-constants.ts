/** Nombre de la cookie httpOnly con el JWT de sesión. */
export const SESSION_COOKIE = "wp_session";

/** Duración del token (segundos). */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 días

/**
 * Flag `Secure` de la cookie de sesión. En producción con `secure: true`, los navegadores
 * no guardan la cookie si entras por HTTP (p. ej. IP:3000 sin TLS).
 * Por defecto: solo `true` si `NEXT_PUBLIC_APP_URL` empieza por `https://`.
 * Fuerza con `SESSION_COOKIE_SECURE=true|false`.
 */
export function sessionCookieSecure(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const raw = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  if (raw === "true" || raw === "1") return true;
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  return base.startsWith("https://");
}
