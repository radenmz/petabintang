/**
 * Shared product / pricing constants.
 *
 * Single source of truth for the product price so the client (sales page,
 * checkout) and the server (voucher resolution, order creation) can never
 * drift out of sync. Imported by both server and browser code, so it must stay
 * dependency-free and free of Node-only APIs.
 */

/** Normal product price in IDR (before any voucher). */
export const PRODUCT_BASE_PRICE = 129000;

/** Marketing coupon shown on the sales page (amount off the base price). */
export const PROMO_VOUCHER_CODE = 'ANAKHEBAT';
export const PROMO_DISCOUNT_AMOUNT = 50000;

/** Price after applying the promo coupon: 129.000 − 50.000 = 79.000. */
export const PROMO_PRICE = PRODUCT_BASE_PRICE - PROMO_DISCOUNT_AMOUNT;
