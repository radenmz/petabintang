import { describe, it, expect } from 'vitest';
import { PRODUCT_BASE_PRICE, PROMO_DISCOUNT_AMOUNT, PROMO_PRICE } from './config';

describe('pricing config', () => {
  it('exposes the base price', () => {
    expect(PRODUCT_BASE_PRICE).toBe(129000);
  });

  it('derives the promo price from base minus discount', () => {
    expect(PROMO_PRICE).toBe(PRODUCT_BASE_PRICE - PROMO_DISCOUNT_AMOUNT);
    expect(PROMO_PRICE).toBe(79000);
  });
});
