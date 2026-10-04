/**
 * server.ts
 *
 * Express + Puppeteer server for the "Peta Bintang" app.
 *
 * - Development: mounts Vite as middleware (SPA + HMR).
 * - Production:  serves the built static `dist/` folder with an SPA fallback.
 * - API:         POST /api/generate-pdf  — builds the ebook HTML via the shared
 *                `renderEbookToHtml()` (same code used by `generate-html-preview.ts`)
 *                and renders it to a PDF with a headless Chromium.
 *                GET  /api/health        — simple health check.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Page } from 'puppeteer';
import { nanoid } from 'nanoid';
// Load .env FIRST (before modules that read process.env at import time).
import { PORT, IS_PRODUCTION, maskToken } from './src/lib/env';
import { supabase, SUPABASE_TABLE } from './src/lib/supabaseServer';
import type { CompleteEbook, ChildProfile } from './src/types';
import { SAMPLE_PROFILES } from './src/data/questions';
import { renderEbookToHtml, generateEbook } from './generate-html-preview';
import {
  createSnapTransaction,
  verifyNotificationSignature,
  isPaidStatus,
  isMidtransConfigured
} from './src/lib/midtrans';
import { sendEbookAccessEmail, isValidEmail } from './src/lib/email';
import { PRODUCT_BASE_PRICE } from './src/lib/config';
import { getBrowser, closeBrowser, isBrowserLaunched, isBrowserConnected } from './src/server/puppeteerPool';
import { isValidPersonName } from './src/server/validation';
import { applyPreviewMask } from './src/server/ebookPreview';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// M-04: behind Nginx, trust the first proxy so req.protocol / rate-limit IP are
// derived from X-Forwarded-* rather than the internal socket.
app.set('trust proxy', 1);

// M-08: security headers. CSP is only enforced in production because Vite's dev
// server injects inline scripts / HMR websockets that a strict policy blocks.
app.use(
  helmet({
    contentSecurityPolicy:
      IS_PRODUCTION
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                'https://app.sandbox.midtrans.com',
                'https://app.midtrans.com',
                'https://snap-assets.sandbox.midtrans.com',
                'https://snap-assets.midtrans.com'
              ],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: ["'self'", 'data:', 'blob:'],
              connectSrc: [
                "'self'",
                'https://app.sandbox.midtrans.com',
                'https://app.midtrans.com',
                'https://api.sandbox.midtrans.com',
                'https://api.midtrans.com'
              ],
              frameSrc: [
                "'self'",
                'https://app.sandbox.midtrans.com',
                'https://app.midtrans.com'
              ],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              frameAncestors: ["'none'"]
            }
          }
        : false,
    // The ebook PDF (server-side Puppeteer) and email clients don't need COEP.
    crossOriginEmbedderPolicy: false
  })
);

// M-01: rate limits for expensive / abuse-prone endpoints.
const pdfLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan PDF. Coba lagi sebentar lagi.' }
});
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' }
});

// The ebook payload includes interpolated markdown + base64 mascot data URIs,
// so it can be fairly large. Allow up to 50mb.
app.use(express.json({ limit: '50mb' }));

// Serve mascot images statically so Puppeteer can fetch them via URL,
// avoiding massive base64 payloads that cause OOM crashes.
app.use('/mascots', express.static(path.join(__dirname, 'src', 'assets', 'mascots')));

// ---------------------------------------------------------------------------
// Voucher resolution (Track A4)
// ---------------------------------------------------------------------------
// Product base price (IDR) — shared constant (see src/lib/config.ts).
// Voucher "AnakHebat" (amount 50.000, max 100) menurunkan ke Rp79.000.

interface VoucherRow {
  code: string;
  label: string;
  discount_type: 'percent' | 'amount';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

interface ResolvedVoucher {
  valid: boolean;
  message?: string;
  code?: string;
  label?: string;
  discountType?: 'percent' | 'amount';
  discountAmount?: number; // IDR, applied to PRODUCT_BASE_PRICE
  finalAmount?: number;    // IDR charged to the customer
}

/**
 * Look up + validate a voucher code and compute the discount against the
 * product base price. Used by both /api/voucher/validate (client preview) and
 * /api/payment/create-order (authoritative re-validation before charging).
 */
async function resolveVoucher(rawCode: string): Promise<ResolvedVoucher> {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) return { valid: false, message: 'Kode voucher kosong.' };

  const { data, error } = await supabase
    .from('vouchers')
    .select('code, label, discount_type, discount_value, max_uses, used_count, active, valid_from, valid_until')
    .eq('code', code)
    .single();

  if (error || !data) {
    return { valid: false, message: 'Kode voucher tidak ditemukan.' };
  }

  const v = data as VoucherRow;
  if (!v.active) return { valid: false, message: 'Voucher sudah tidak aktif.' };

  const now = new Date();
  if (v.valid_from && now < new Date(v.valid_from)) {
    return { valid: false, message: 'Voucher belum berlaku.' };
  }
  if (v.valid_until && now > new Date(v.valid_until)) {
    return { valid: false, message: 'Voucher sudah kedaluwarsa.' };
  }
  if (v.max_uses != null && v.used_count >= v.max_uses) {
    return { valid: false, message: 'Kuota voucher sudah habis.' };
  }

  let discountAmount = 0;
  if (v.discount_type === 'percent') {
    discountAmount = Math.round(PRODUCT_BASE_PRICE * (v.discount_value / 100));
  } else {
    discountAmount = Math.min(v.discount_value, PRODUCT_BASE_PRICE);
  }
  const finalAmount = Math.max(0, PRODUCT_BASE_PRICE - discountAmount);

  return {
    valid: true,
    code: v.code,
    label: v.label,
    discountType: v.discount_type,
    discountAmount,
    finalAmount
  };
}

// ---------------------------------------------------------------------------
// PDF Generation Endpoint
// ---------------------------------------------------------------------------

app.post('/api/generate-pdf', pdfLimiter, async (req, res) => {
  let page: Page | null = null;

  try {
    // C-01: PDF generation is gated behind a paid order. The client sends only
    // the access token; the ebook content is loaded server-side so a crafted
    // request cannot obtain the paid PDF (or reach Puppeteer with arbitrary HTML).
    const { token } = req.body as { token?: string };
    if (!token || token.length < 10) {
      return res.status(400).json({ error: 'Token required' });
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('ebook_json, payment_status')
      .eq('token', token)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (data.payment_status !== 'paid') {
      return res.status(403).json({ error: 'Payment required' });
    }

    const ebook = data.ebook_json as CompleteEbook;

    if (!ebook || !ebook.childProfile) {
      console.error('[PDF] Stored ebook data invalid for token');
      return res.status(500).json({ error: 'Stored ebook data invalid' });
    }

    console.log(`[PDF] Starting for: ${ebook.childProfile.name}, modules: ${ebook.modules?.length || 0}`);

    // 1. Build HTML
    console.log('[PDF] Step 1: Building HTML...');
    const htmlContent = renderEbookToHtml(ebook);
    console.log(`[PDF] Step 1 done: HTML length = ${htmlContent.length}`);

    // 2. Get browser
    console.log('[PDF] Step 2: Getting browser...');
    const browser = await getBrowser();
    console.log('[PDF] Step 2 done: browser ready');

    // 3. New page
    page = await browser.newPage();

    // Catch page crashes early
    page.on('error', (err) => {
      console.error('[PDF] Page crashed:', err);
    });
    page.on('pageerror', (err) => {
      console.error('[PDF] Page error:', err);
    });
    console.log('[PDF] Step 3 done: page opened');

    // 4. Set content
    // page.setContent() serves the document from about:blank (no host), so
    // path-relative URLs like /mascots/... would NOT reach the Express server
    // and all mascot images would be missing from the PDF. Inject a <base>
    // tag so those URLs resolve against the running server. The existing
    // img.complete evaluate wait (Step 5) then loads them over the network.
    const htmlWithBase = htmlContent.replace('<head>', `<head><base href="http://localhost:${PORT}/">`);
    // setContent mendukung 'load'/'domcontentloaded' saja; file font woff2
    // dimuat via document.fonts.load() eksplisit di Step 5b (lebih andal).
    await page.setContent(htmlWithBase, { waitUntil: 'load' });
    console.log('[PDF] Step 4 done: content set');

    // 5. Wait for images
    await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return Promise.all(imgs.map((img: any) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 3000);
          img.onload = () => { clearTimeout(timer); resolve(); };
          img.onerror = () => { clearTimeout(timer); resolve(); };
        });
      }));
    });
    console.log('[PDF] Step 5 done: images loaded');

    // 5b. Wait for webfonts (Nunito + Plus Jakarta Sans) so the PDF does not
    // snapshot with fallback fonts. Explicitly trigger each weight used, then
    // await fonts.ready — robust against the CSS-parse vs font-fetch race.
    try {
      await page.evaluate(async () => {
        const specs = [
          "700 16px 'Nunito'", "800 16px 'Nunito'", "900 16px 'Nunito'",
          "400 16px 'Plus Jakarta Sans'", "500 16px 'Plus Jakarta Sans'",
          "600 16px 'Plus Jakarta Sans'", "700 16px 'Plus Jakarta Sans'"
        ];
        await Promise.all(specs.map((s) => (document as any).fonts.load(s).catch(() => {})));
        await (document as any).fonts.ready;
      });
      console.log('[PDF] Step 5b done: fonts ready');
    } catch (err) {
      console.warn('[PDF] fonts.ready wait skipped:', err instanceof Error ? err.message : err);
    }

    // 6. Generate PDF with timeout
    const pdfBuffer = await Promise.race([
      page.pdf({
        format: 'A4',
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        printBackground: true,
        preferCSSPageSize: true
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timeout after 60s')), 60000)
      )
    ]);
    console.log(`[PDF] Step 6 done: PDF size = ${pdfBuffer.length}`);

    // 7. Send
    const safeName = ebook.childProfile.name.replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Peta_Bintang_${safeName}.pdf"`);
    res.send(pdfBuffer);
    console.log('[PDF] Step 7 done: sent successfully');

  } catch (error) {
    console.error('[PDF] FAILED:', error);
    console.error('[PDF] Stack:', error instanceof Error ? error.stack : 'no stack');
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Gagal membuat PDF. Silakan coba lagi.' });
  } finally {
    if (page) {
      try { await page.close(); } catch { }
    }
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    browser: {
      launched: isBrowserLaunched(),
      connected: isBrowserConnected()
    },
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------------
// Dev-only sample ebook (preview tooling)
// ---------------------------------------------------------------------------
// C-02: the browser no longer bundles the paid templates. The dev preview
// screens (?preview=...) fetch a generated sample here instead. Disabled in
// production.
app.get('/api/dev/sample-ebook', (req, res) => {
  if (IS_PRODUCTION) {
    return res.status(404).json({ error: 'Not found' });
  }
  const index = parseInt(String(req.query.index ?? '0'), 10);
  const profile = SAMPLE_PROFILES[Number.isFinite(index) ? index : 0] || SAMPLE_PROFILES[0];
  try {
    res.json({ ebook: generateEbook(profile) });
  } catch (error) {
    console.error('[API] /api/dev/sample-ebook failed:', error);
    res.status(500).json({ error: 'Failed to generate sample ebook' });
  }
});

// ---------------------------------------------------------------------------
// Quiz Submission — save profile + ebook to DB, return access token
// ---------------------------------------------------------------------------

app.post('/api/quiz/submit', apiLimiter, async (req, res) => {
  try {
    const { childProfile } = req.body as { childProfile: ChildProfile };

    if (!childProfile) {
      return res.status(400).json({ error: 'Invalid payload: childProfile required' });
    }
    if (!isValidPersonName(childProfile.name)) {
      return res.status(400).json({ error: 'Nama anak tidak valid.' });
    }
    if (childProfile.parentName && !isValidPersonName(childProfile.parentName)) {
      return res.status(400).json({ error: 'Nama orang tua tidak valid.' });
    }

    // C-02: the ebook is generated SERVER-SIDE from the (validated) profile.
    // The client no longer ships the paid templates, so any ebook body it
    // sends is ignored — the server is the single source of truth.
    const ebook = generateEbook(childProfile);

    // Generate URL-safe token (21 chars, unguessable)
    const token = nanoid(21);

    const { error } = await supabase.from(SUPABASE_TABLE).insert({
      token,
      child_name: childProfile.name,
      child_profile: childProfile,
      ebook_json: ebook,
      archetype_id: childProfile.archetypeId,
      payment_status: 'pending',
      payment_amount: PRODUCT_BASE_PRICE,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('[DB] Insert failed:', error.message);
      return res.status(500).json({ error: 'Gagal menyimpan data kuis.' });
    }

    console.log(`[DB] Saved quiz for "${childProfile.name}" → token: ${maskToken(token)}`);
    res.json({ token });
  } catch (error) {
    console.error('[API] /api/quiz/submit failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Gagal mengirim kuis.' });
  }
});

// ---------------------------------------------------------------------------
// Load Ebook — fetch by token, return ebook + payment status
// ---------------------------------------------------------------------------

app.get('/api/ebook/:token', apiLimiter, async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 10) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('ebook_json, payment_status, child_name, created_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      console.error('[DB] Fetch failed:', error?.message || 'No data');
      return res.status(404).json({ error: 'Ebook not found or token invalid' });
    }

    const isPaid = data.payment_status === 'paid';
    // A2: never send the full paid content to an unpaid client. Mask non-free
    // modules to a short excerpt; metadata (title/code/chapter) stays intact so
    // the sales-page TOC + teasers still render.
    const ebook = isPaid ? (data.ebook_json as CompleteEbook) : applyPreviewMask(data.ebook_json as CompleteEbook);

    console.log(`[DB] Loaded ebook for "${data.child_name}" (payment: ${data.payment_status}, masked: ${!isPaid})`);
    res.json({
      ebook,
      paymentStatus: data.payment_status,
      isPreview: !isPaid,
      childName: data.child_name,
      createdAt: data.created_at
    });
  } catch (error) {
    console.error('[API] /api/ebook/:token failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Gagal memuat e-book.' });
  }
});

// ---------------------------------------------------------------------------
// Voucher validation (Track A4)
// ---------------------------------------------------------------------------

app.post('/api/voucher/validate', apiLimiter, async (req, res) => {
  try {
    const { code } = req.body as { code?: string };
    const result = await resolveVoucher(code || '');
    res.json(result);
  } catch (error) {
    console.error('[API] /api/voucher/validate failed:', error);
    res.status(500).json({ valid: false, message: 'Gagal memeriksa voucher.' });
  }
});

// ---------------------------------------------------------------------------
// Payment — create Midtrans Snap order (Track A3)
// ---------------------------------------------------------------------------

app.post('/api/payment/create-order', apiLimiter, async (req, res) => {
  try {
    const { token, voucherCode, email } = req.body as {
      token: string;
      voucherCode?: string;
      email?: string;
    };

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Email is REQUIRED for all payment methods — akses & pengiriman e-book
    // dilakukan via email (webhook paid → sendEbookAccessEmail). Defense-in-
    // depth: the client gates the pay button on a valid email too, but never
    // trust the client alone.
    const normalizedEmail = (email || '').trim();
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email wajib untuk pengiriman akses e-book.' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Format email tidak valid.' });
    }

    // Load the stored order to resolve the amount + customer name.
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('child_name, payment_status, payment_amount, midtrans_order_id')
      .eq('token', token)
      .single();

    if (error || !data) {
      console.error('[DB] create-order lookup failed:', error?.message || 'No data');
      return res.status(404).json({ error: 'Order not found' });
    }

    if (data.payment_status === 'paid') {
      return res.status(409).json({ error: 'Order already paid' });
    }

    // Resolve final amount. Base price comes from the stored payment_amount
    // (set to 129000 at quiz-submit). If a voucher code is supplied, re-validate
    // it server-side (the client's /api/voucher/validate result is only a
    // preview) and charge the discounted amount. The client never supplies a
    // raw amount — only a code.
    let grossAmount = data.payment_amount;
    let voucherCodeResolved: string | null = null;
    if (voucherCode && voucherCode.trim()) {
      const v = await resolveVoucher(voucherCode);
      if (!v.valid) {
        return res.status(400).json({ error: v.message || 'Voucher tidak valid' });
      }
      grossAmount = v.finalAmount!;
      voucherCodeResolved = v.code!;
      // Persist the discounted amount + voucher code so the webhook reflects
      // the actual charge and we can reconcile reporting.
      await supabase
        .from(SUPABASE_TABLE)
        .update({ payment_amount: grossAmount, voucher_code: voucherCodeResolved })
        .eq('token', token);
    }

    if (!isMidtransConfigured()) {
      return res.status(503).json({ error: 'Payment gateway not configured (MIDTRANS_SERVER_KEY missing)' });
    }

    // order_id must be unique per payment attempt (Midtrans rejects duplicate
    // order ids). Use a standalone PB-<nanoid> id so the access token is never
    // leaked to Midtrans (dashboard/receipts). The child table midtrans_orders
    // maps order_id → token, so retries never orphan an earlier pending order.
    const midtransOrderId = `PB-${nanoid(16)}`;

    const snapToken = await createSnapTransaction({
      orderId: midtransOrderId,
      grossAmount,
      customer: { name: data.child_name, email: normalizedEmail || undefined },
      itemDetails: [
        {
          id: 'ebook-peta-bintang',
          name: `Ebook Peta Bintang — ${data.child_name}`,
          price: grossAmount,
          quantity: 1
        }
      ]
    });

    // Record this payment attempt in the child table (reconciliation source).
    const { error: childErr } = await supabase
      .from('midtrans_orders')
      .insert({
        order_id: midtransOrderId,
        token,
        gross_amount: grossAmount,
        status: 'pending'
      });
    if (childErr) {
      console.error('[DB] midtrans_orders insert failed:', childErr.message);
      // Non-fatal for the Snap popup (already created), but webhook
      // reconciliation for THIS order will fail. Surface as a 500 so the
      // client can retry create-order cleanly rather than proceed untracked.
      return res.status(500).json({ error: 'Gagal mencatat percobaan pembayaran.' });
    }

    // Persist the latest midtrans_order_id + optional email on the order row
    // (latest-attempt reference for logs; reconciliation uses the child table).
    const updateFields: Record<string, unknown> = { midtrans_order_id: midtransOrderId };
    if (normalizedEmail) updateFields.email = normalizedEmail;
    const { error: updErr } = await supabase
      .from(SUPABASE_TABLE)
      .update(updateFields)
      .eq('token', token);

    if (updErr) {
      console.error('[DB] Failed to persist latest midtrans_order_id/email:', updErr.message);
      // Non-fatal: child-table reconciliation still works.
    }

    console.log(`[Payment] Snap order created: token=${maskToken(token)} midtrans=${midtransOrderId} amount=${grossAmount}`);
    res.json({ snapToken, midtransOrderId });
  } catch (error) {
    console.error('[API] /api/payment/create-order failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Gagal membuat transaksi pembayaran.' });
  }
});

// ---------------------------------------------------------------------------
// Midtrans Payment Notification Webhook (Track A3)
// ---------------------------------------------------------------------------

app.post('/api/webhook/midtrans', async (req, res) => {
  try {
    const body = req.body as {
      order_id?: string;
      status_code?: string;
      gross_amount?: string;
      signature_key?: string;
      transaction_status?: string;
      transaction_id?: string;
      payment_type?: string;
      fraud_status?: string;
    };

    const orderId = body.order_id || '';
    const statusCode = body.status_code || '';
    const grossAmount = body.gross_amount || '';
    const signatureKey = body.signature_key || '';
    const transactionStatus = body.transaction_status || '';

    // Verify the notification actually came from Midtrans.
    if (!verifyNotificationSignature(orderId, statusCode, grossAmount, signatureKey)) {
      console.warn('[Webhook] Invalid signature for order_id:', orderId);
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // Reconcile via the child table (midtrans_orders): look up by order_id →
    // token, then load the parent ebook_orders row. This is the async-payment
    // fix — a retried create-order inserts a NEW child row each time, so paying
    // an earlier pending QR/VA still resolves to the right token (no orphan).
    const { data: child, error: childLookupErr } = await supabase
      .from('midtrans_orders')
      .select('token, status, gross_amount')
      .eq('order_id', orderId)
      .single();

    if (childLookupErr || !child) {
      console.warn('[Webhook] No midtrans_orders row for order_id:', orderId);
      // 200 so Midtrans stops retrying notifications for orders we don't track
      // (e.g. another merchant / stale sandbox).
      return res.status(200).json({ ok: true, ignored: 'unknown_order' });
    }

    // Always mirror Midtrans's latest status on the child row (pending →
    // settlement/expire/cancel/...). Idempotent: only update when changed.
    const normalizedStatus = transactionStatus.toLowerCase();
    // H-03: for card `capture`, only fraud_status=accept counts as paid.
    // Also reconcile the notified gross_amount against the recorded amount so a
    // tampered/mismatched notification can never unlock the ebook.
    const notifiedAmount = Math.round(parseFloat(grossAmount));
    const amountMatches = Number.isFinite(notifiedAmount) && notifiedAmount === child.gross_amount;
    const isPaid = isPaidStatus(transactionStatus, body.fraud_status) && amountMatches;
    if (isPaidStatus(transactionStatus, body.fraud_status) && !amountMatches) {
      console.warn(
        `[Webhook] Amount mismatch for order_id ${orderId}: ` +
        `notified=${grossAmount} recorded=${child.gross_amount} — not unlocking`
      );
    }
    if (normalizedStatus && child.status !== normalizedStatus) {
      await supabase
        .from('midtrans_orders')
        .update({
          status: normalizedStatus,
          paid_at: isPaid ? new Date().toISOString() : null
        })
        .eq('order_id', orderId);
    }

    // Load the parent order for email + payment_status + voucher.
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('token, child_name, email, voucher_code, payment_status')
      .eq('token', child.token)
      .single();

    if (error || !data) {
      console.warn('[Webhook] Parent ebook_orders missing for token:', maskToken(child.token));
      return res.status(200).json({ ok: true, ignored: 'orphan_order' });
    }

    if (isPaid) {
      if (data.payment_status !== 'paid') {
        const { error: updErr } = await supabase
          .from(SUPABASE_TABLE)
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('token', data.token);
        if (updErr) {
          console.error('[Webhook] Failed to mark paid:', updErr.message);
          // 500 so Midtrans retries the notification.
          return res.status(500).json({ error: 'Failed to update payment' });
        }

        // A4: bump the applied voucher's used_count (if any). Best-effort soft
        // limit — a small read-then-write race is acceptable for a pre-launch
        // MVP; the authoritative check is the resolveVoucher() validation gate.
        if (data.voucher_code) {
          const { data: vc } = await supabase
            .from('vouchers')
            .select('used_count, max_uses')
            .eq('code', data.voucher_code)
            .maybeSingle();
          if (vc) {
            const next = (vc.used_count ?? 0) + 1;
            const underCap = vc.max_uses == null || vc.used_count < vc.max_uses;
            if (underCap) {
              await supabase
                .from('vouchers')
                .update({ used_count: next })
                .eq('code', data.voucher_code);
            }
          }
        }

        console.log(`[Webhook] Marked paid: token=${maskToken(data.token)} midtrans=${orderId} status=${transactionStatus}`);

        // A5: best-effort access email. Failure here MUST NOT fail the
        // webhook (Midtrans would retry, but the order is already paid). Log
        // and move on so we always return 200.
        if (data.email) {
          const accessUrl = `${req.protocol}://${req.get('host')}/?token=${data.token}`;
          sendEbookAccessEmail({
            to: data.email,
            childName: data.child_name,
            accessUrl
          }).catch(err => {
            console.error(`[Webhook] Access email to ${data.email} failed:`, err instanceof Error ? err.message : err);
          });
        }
      } else {
        console.log(`[Webhook] Already paid, idempotent skip: token=${maskToken(data.token)}`);
      }
    } else {
      // expire / cancel / deny / pending — no ebook unlock. The child-row
      // status update above already recorded it; the user can retry via a new
      // create-order (which inserts another child row) without losing this one.
      console.log(`[Webhook] Non-paid status '${transactionStatus}' for token=${maskToken(data.token)} — no unlock`);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[API] /api/webhook/midtrans failed:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ---------------------------------------------------------------------------
// Payment Success (DEV-ONLY stub — Track A3 hardening)
// ---------------------------------------------------------------------------
// This endpoint marks an order paid WITHOUT a real Midtrans transaction. It is
// the backend half of the "Simulasikan" dev button (A1). In production it is
// disabled (403): real payment status only changes via the verified Midtrans
// webhook above. This closes the original §8 hole "POST /api/payment/success
// tak verifikasi".

app.post('/api/payment/success', async (req, res) => {
  if (IS_PRODUCTION) {
    return res.status(403).json({ error: 'Dev-only endpoint disabled in production' });
  }

  try {
    const { token } = req.body as { token: string };

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('token', token);

    if (error) {
      console.error('[DB] Update failed:', error.message);
      return res.status(500).json({ error: 'Gagal memperbarui status pembayaran.' });
    }

    console.log(`[DB][DEV] Payment marked as paid for token: ${maskToken(token)}`);
    res.json({ success: true, message: 'Payment status updated to paid' });
  } catch (error) {
    console.error('[API] /api/payment/success failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Gagal memproses pembayaran.' });
  }
});

// ---------------------------------------------------------------------------
// Server bootstrap (Vite dev middleware OR static production build)
// ---------------------------------------------------------------------------

async function startServer() {
  if (!IS_PRODUCTION) {
    // Development: use Vite middleware (SPA + HMR). API routes registered above
    // take precedence over Vite's middleware.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve the static build.
    // The server bundle is emitted to `dist/server.mjs` (see the `build`
    // script), i.e. INSIDE the same `dist/` folder that `vite build` writes
    // the client to. So the static root is the server's own directory — NOT
    // `path.join(__dirname, 'dist')`, which would resolve to `dist/dist`.
    const distPath = __dirname;
    // H-04: the server bundle (dist/server.mjs) and its sourcemap live in the
    // same folder as the client build, so a plain static handler would expose
    // /server.mjs and /server.mjs.map to the public. Deny those extensions
    // before falling through to static. Only the entry bundle + maps are
    // blocked; client assets (.js/.css/webp in dist/assets) are unaffected.
    app.use((req, res, next) => {
      if (/\.(mjs|map)$/i.test(req.path)) {
        return res.status(404).end();
      }
      next();
    });
    app.use(express.static(distPath));

    // SPA fallback: serve index.html for any unmatched GET request.
    // (Express 5 / path-to-regexp v8 no longer accepts the bare '*' wildcard,
    // so a terminal middleware is used instead of `app.get('*', ...)`.)
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

// ---------------------------------------------------------------------------
// Graceful shutdown: close browser + exit on SIGINT/SIGTERM
// ---------------------------------------------------------------------------

async function gracefulShutdown(signal: string) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  await closeBrowser();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
