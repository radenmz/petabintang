/**
 * Resend transactional email (Track A5).
 *
 * Sends the ebook access link to the parent's optional email once a payment is
 * confirmed by the Midtrans webhook. No SDK dependency — calls the Resend
 * REST API directly via the Node global `fetch` (Node 18+), matching the
 * no-dependency style of `lib/midtrans.ts`.
 */

// Read env lazily so this module is correct regardless of import order (it must
// not capture values before `src/lib/env.ts` has loaded `.env`).
function resendApiKey(): string {
  return process.env.RESEND_API_KEY || '';
}
function emailFrom(): string {
  return process.env.EMAIL_FROM || 'Peta Bintang Anakku <no-reply@petabintang.com>';
}
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function isEmailConfigured(): boolean {
  return resendApiKey().length > 0;
}

/** Permissive but practical email sanity check (server-side). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

export interface AccessEmailArgs {
  to: string;
  childName: string;
  accessUrl: string;
}

/**
 * Send the post-purchase access email. Best-effort: if Resend is not
 * configured, it logs and returns without throwing so a missing key never
 * blocks the payment webhook from completing.
 */
export async function sendEbookAccessEmail(args: AccessEmailArgs): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('[Email] RESEND_API_KEY not configured — skipping access email');
    return;
  }
  if (!isValidEmail(args.to)) {
    console.warn(`[Email] Skipping — invalid recipient address: ${args.to}`);
    return;
  }

  const subject = `E-Book Peta Bintang untuk ${args.childName} sudah siap`;
  const html = buildAccessEmailHtml(args.childName, args.accessUrl);

  let res: Response;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey()}`
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: [args.to],
        subject,
        html
      })
    });
  } catch (err) {
    throw new Error(
      `Resend request failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend send failed (HTTP ${res.status}): ${text}`);
  }
}

function buildAccessEmailHtml(childName: string, accessUrl: string): string {
  return [
    `<div style="font-family:'Nunito',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a2540;">`,
    `<h2 style="color:#3F72AF;margin-bottom:8px;">Terima kasih! E-Book ${escapeHtml(childName)} sudah siap.</h2>`,
    `<p style="line-height:1.6;color:#3a4768;">Pembayaran Anda telah kami terima. Klik tautan di bawah untuk membuka e-book personalisasi lengkap untuk <strong>${escapeHtml(childName)}</strong>:</p>`,
    `<p style="margin:24px 0;">`,
    `<a href="${escapeAttr(accessUrl)}" style="display:inline-block;background:#3F72AF;color:#fff;font-weight:700;padding:12px 24px;border-radius:14px;text-decoration:none;">Buka E-Book</a>`,
    `</p>`,
    `<p style="line-height:1.6;color:#3a4768;">Simpan tautan ini agar e-book bisa dibuka kembali kapan saja. Jangan bagikan tautan ini karena bersifat pribadi untuk ${escapeHtml(childName)}.</p>`,
    `<hr style="border:none;border-top:1px solid #e3e8f0;margin:24px 0;" />`,
    `<p style="font-size:12px;color:#8a94a6;">Email ini dikirim otomatis oleh Peta Bintang Anakku. Balas email ini atau hubungi WhatsApp kami jika butuh bantuan.</p>`,
    `</div>`
  ].join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
