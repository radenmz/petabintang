/**
 * Input validation helpers (C-03 hardening).
 *
 * Names are interpolated into the generated ebook markdown and later rendered
 * as HTML. A strict allowlist (letters, marks, numbers, and a few punctuation
 * characters) prevents HTML/script injection at the source. Anything with
 * angle brackets, quotes, or ampersands is rejected.
 */

const PERSON_NAME_RE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}' .,-]{0,59}$/u;

export function isValidPersonName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 60 && PERSON_NAME_RE.test(trimmed);
}

// WhatsApp helpers live in a shared, dependency-free module so the browser and
// server validate identically. Re-exported here so server-only imports keep
// working through this module.
export { normalizeWhatsapp, isValidWhatsapp } from '../lib/whatsapp';
