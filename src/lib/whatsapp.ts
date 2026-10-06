/**
 * WhatsApp number helpers shared by the browser (inline UX validation) and the
 * server (authoritative validation before persisting a contact). Dependency-free
 * so it can live in the client bundle as well as the Node server.
 */

export const WA_NUMBER_PREFIX = '62';

/**
 * Normalize an Indonesian WhatsApp number to the international form
 * `628xxxxxxxxxx` (no `+`, no spaces/dashes). Accepts `08…`, `628…`, `+628…`,
 * `8…`, and numbers with separators. Returns null when the input is not a
 * plausible Indonesian mobile number.
 *
 * Rules: after stripping the country/leading zero, the national significant
 * number must be 8–12 digits and start with `8` (Indonesian mobile prefixes).
 */
export function normalizeWhatsapp(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/[^\d+]/g, '');
  digits = digits.replace(/^\+/, '');
  if (digits.startsWith('62')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (!/^8\d{7,11}$/.test(digits)) return null;
  return `${WA_NUMBER_PREFIX}${digits}`;
}

/** True when `input` is a valid, normalizable Indonesian mobile number. */
export function isValidWhatsapp(input: unknown): boolean {
  return normalizeWhatsapp(input) !== null;
}

/** Format a normalized `62…` number for display, e.g. `0812-3456-7890`. */
export function formatWhatsappDisplay(normalized: string): string {
  if (!normalized.startsWith('62')) return normalized;
  const local = `0${normalized.slice(2)}`;
  const groups = local.match(/.{1,4}/g);
  return groups ? groups.join('-') : local;
}
