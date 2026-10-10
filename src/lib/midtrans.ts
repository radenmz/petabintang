/**
 * Midtrans Snap integration helpers (Track A3).
 *
 * - createSnapTransaction(): request a Snap token from the backend so the
 *   frontend can open the Snap popup via `window.snap.pay(token)`.
 * - verifyNotificationSignature(): validate the webhook `signature_key`
 *   (SHA512(order_id + status_code + gross_amount + ServerKey)) so only
 *   genuine Midtrans notifications can mark an order as paid.
 *
 * No external SDK dependency — uses the Midtrans REST API directly via the
 * Node global `fetch` (Node 18+) and the built-in `crypto` module.
 */

import crypto from 'crypto';

// Read env lazily so this module is correct regardless of import order (it must
// not capture values before `src/lib/env.ts` has loaded `.env`).
function serverKey(): string {
  return process.env.MIDTRANS_SERVER_KEY || '';
}

// Midtrans environment is DECOUPLED from the app NODE_ENV so you can, e.g.,
// run a production app build while still pointing at Midtrans sandbox for
// testing, or vice-versa. Per Midtrans docs, sandbox & production keys are
// NOT distinguishable by prefix anymore (both look like Mid-server-…/
// Mid-client-…) — only the dashboard environment you copied from + the
// endpoint domain tell them apart. So make the env explicit here.
//   MIDTRANS_ENV=sandbox|production
// Defaults: explicit MIDTRANS_ENV wins; otherwise infer from NODE_ENV.
export function midtransEnvironment(): string {
  return (
    process.env.MIDTRANS_ENV ||
    (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox')
  ).toLowerCase();
}

function isProdMidtrans(): boolean {
  return midtransEnvironment() === 'production';
}

/** Snap REST endpoint for the active Midtrans environment. */
function snapApiUrl(): string {
  return isProdMidtrans()
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
}

export function isMidtransConfigured(): boolean {
  return serverKey().length > 0;
}

/** Basic auth header: base64("<SERVER_KEY>:") per Midtrans convention. */
function authHeader(): string {
  return 'Basic ' + Buffer.from(`${serverKey()}:`).toString('base64');
}

export interface SnapCustomer {
  name?: string;
  email?: string;
  phone?: string;
}

export interface SnapItemDetail {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CreateSnapArgs {
  orderId: string;
  grossAmount: number;
  customer?: SnapCustomer;
  itemDetails?: SnapItemDetail[];
}

interface SnapTransactionResponse {
  token?: string;
  error_messages?: string[];
  message?: string;
}

/**
 * Create a Snap transaction and return the `token` the frontend passes to
 * `window.snap.pay(token, ...)`.
 */
export async function createSnapTransaction(args: CreateSnapArgs): Promise<string> {
  if (!isMidtransConfigured()) {
    throw new Error('MIDTRANS_SERVER_KEY is not configured on the server.');
  }

  const body: Record<string, unknown> = {
    transaction_details: {
      order_id: args.orderId,
      gross_amount: args.grossAmount
    }
  };

  if (args.customer) {
    body.customer_details = {
      first_name: args.customer.name,
      email: args.customer.email,
      phone: args.customer.phone
    };
  }

  if (args.itemDetails && args.itemDetails.length > 0) {
    body.item_details = args.itemDetails;
  }

  let res: Response;
  try {
    const notificationUrl = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '')
      + '/api/webhook/midtrans';
    res = await fetch(snapApiUrl(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authHeader(),
        ...(process.env.PUBLIC_BASE_URL ? { 'X-Override-Notification': notificationUrl } : {})
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error(`Midtrans Snap request failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  let data: SnapTransactionResponse;
  try {
    data = (await res.json()) as SnapTransactionResponse;
  } catch {
    throw new Error(`Midtrans Snap returned non-JSON response (HTTP ${res.status})`);
  }

  if (!res.ok || !data.token) {
    const msg = data.error_messages?.join('; ') || data.message || `HTTP ${res.status}`;
    throw new Error(`Midtrans Snap create failed: ${msg}`);
  }

  return data.token;
}

/**
 * Verify a Midtrans payment notification signature.
 *
 * Formula (per Midtrans docs):
 *   signature_key = SHA512(order_id + status_code + gross_amount + ServerKey)
 *
 * `gross_amount` arrives as a string like "129000.00" — concatenate verbatim.
 */
export function verifyNotificationSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const key = serverKey();
  if (!key || !signatureKey) return false;
  const expected = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${key}`)
    .digest('hex');
  // Constant-time compare to avoid timing side-channels.
  if (expected.length !== signatureKey.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureKey));
}

/**
 * Map Midtrans transaction_status to "is this a paid/settled state".
 *
 * - settlement = bank transfer / VA settled → paid.
 * - capture    = card authorized & captured. For cards, Midtrans also sends
 *   `fraud_status`; only `accept` means the funds are safe to unlock.
 *   `challenge` / `deny` must NOT unlock (H-03).
 */
export function isPaidStatus(transactionStatus: string, fraudStatus?: string): boolean {
  const s = (transactionStatus || '').toLowerCase();
  if (s === 'settlement') return true;
  if (s === 'capture') {
    const f = (fraudStatus || '').toLowerCase();
    return f === 'accept';
  }
  return false;
}
