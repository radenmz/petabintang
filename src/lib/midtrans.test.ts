import { describe, it, expect } from 'vitest';
import { isPaidStatus } from '../midtrans.ts';

describe('isPaidStatus (H-03 hardening)', () => {
  it('treats settlement as paid regardless of fraud_status', () => {
    expect(isPaidStatus('settlement')).toBe(true);
    expect(isPaidStatus('SETTLEMENT')).toBe(true);
    expect(isPaidStatus('settlement', 'challenge')).toBe(true);
  });

  it('only treats capture as paid when fraud_status is accept', () => {
    expect(isPaidStatus('capture', 'accept')).toBe(true);
    expect(isPaidStatus('CAPTURE', 'ACCEPT')).toBe(true);
    expect(isPaidStatus('capture', 'challenge')).toBe(false);
    expect(isPaidStatus('capture', 'deny')).toBe(false);
    expect(isPaidStatus('capture')).toBe(false);
    expect(isPaidStatus('capture', undefined)).toBe(false);
  });

  it('does not count non-paid statuses', () => {
    for (const s of ['pending', 'expire', 'cancel', 'deny', 'failure', '']) {
      expect(isPaidStatus(s)).toBe(false);
    }
  });
});
