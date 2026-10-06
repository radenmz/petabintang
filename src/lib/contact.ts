/**
 * Shared email validation for browser + server.
 *
 * Dependency-free so it can live in the client bundle as well as the Node
 * server (mirrors the `lib/whatsapp.ts` split). Permissive but practical:
 * one `@`, a dot in the domain, no whitespace.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when `input` looks like a plausible email address. */
export function isValidEmail(input: unknown): boolean {
  return typeof input === 'string' && EMAIL_RE.test(input.trim());
}
