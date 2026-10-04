import { describe, it, expect } from 'vitest';
import { isValidPersonName } from '../validation.ts';

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
