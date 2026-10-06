import { describe, it, expect } from 'vitest';
import { isValidEmail } from './contact';

describe('isValidEmail', () => {
  it('accepts plausible addresses', () => {
    expect(isValidEmail('budi@example.com')).toBe(true);
    expect(isValidEmail('  budi@example.com  ')).toBe(true);
    expect(isValidEmail('a.b+c@sub.domain.id')).toBe(true);
  });

  it('rejects malformed and non-string input', () => {
    expect(isValidEmail('budi')).toBe(false);
    expect(isValidEmail('budi@')).toBe(false);
    expect(isValidEmail('budi@example')).toBe(false);
    expect(isValidEmail('a b@example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
  });
});
