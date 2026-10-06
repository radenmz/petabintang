import { describe, it, expect } from 'vitest';
import { isValidPersonName, normalizeWhatsapp, isValidWhatsapp } from './validation';

describe('isValidPersonName', () => {
  it('accepts normal names with letters, marks, spaces and punctuation', () => {
    expect(isValidPersonName('Budi Kurniawan')).toBe(true);
    expect(isValidPersonName("Aisyah Putri")).toBe(true);
    expect(isValidPersonName("O'Brien")).toBe(true);
    expect(isValidPersonName('Reyhan Pratama, S.')).toBe(true);
    expect(isValidPersonName('José')).toBe(true);
  });

  it('rejects HTML/script injection attempts', () => {
    expect(isValidPersonName('<img src=x onerror=alert(1)>')).toBe(false);
    expect(isValidPersonName('"><script>alert(1)</script>')).toBe(false);
    expect(isValidPersonName('a & b')).toBe(false);
    expect(isValidPersonName('a"b')).toBe(false);
  });

  it('rejects empty, whitespace-only, over-length and non-string input', () => {
    expect(isValidPersonName('')).toBe(false);
    expect(isValidPersonName('   ')).toBe(false);
    expect(isValidPersonName('a'.repeat(61))).toBe(false);
    expect(isValidPersonName(null)).toBe(false);
    expect(isValidPersonName(undefined)).toBe(false);
    expect(isValidPersonName(123)).toBe(false);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidPersonName('  Budi  ')).toBe(true);
  });
});

describe('normalizeWhatsapp', () => {
  it('normalizes Indonesian mobile formats to 628xxxxxxxxxx', () => {
    expect(normalizeWhatsapp('081234567890')).toBe('6281234567890');
    expect(normalizeWhatsapp('6281234567890')).toBe('6281234567890');
    expect(normalizeWhatsapp('+62 812-3456-7890')).toBe('6281234567890');
    expect(normalizeWhatsapp('81234567890')).toBe('6281234567890');
    expect(normalizeWhatsapp('0812 3456 7890')).toBe('6281234567890');
  });

  it('rejects invalid, non-mobile and non-string inputs', () => {
    expect(normalizeWhatsapp('12345')).toBeNull();
    expect(normalizeWhatsapp('0212345678')).toBeNull();
    expect(normalizeWhatsapp('')).toBeNull();
    expect(normalizeWhatsapp(null)).toBeNull();
    expect(normalizeWhatsapp(undefined)).toBeNull();
    expect(normalizeWhatsapp(6281234567890)).toBeNull();
  });

  it('exposes an isValidWhatsapp predicate', () => {
    expect(isValidWhatsapp('081234567890')).toBe(true);
    expect(isValidWhatsapp('abc')).toBe(false);
  });
});
