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
import fs from 'fs';
import crypto from 'crypto';import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Page } from 'puppeteer';
import { nanoid } from 'nanoid';
// Load .env FIRST (before modules that read process.env at import time).
import { PORT, IS_PRODUCTION, maskToken, PUBLIC_BASE_URL, ADMIN_SECRET } from './src/lib/env';
import { supabase, SUPABASE_TABLE } from './src/lib/supabaseServer';
import type { CompleteEbook, ChildProfile } from './src/types';
import { SAMPLE_PROFILES } from './src/data/questions';
import { getArchetypeById } from './src/data/archetypes';
import { renderEbookToHtml, generateEbook } from './generate-html-preview';
import {
  createSnapTransaction,
  verifyNotificationSignature,
  isPaidStatus,
  isMidtransConfigured
} from './src/lib/midtrans';
import { sendEbookAccessEmail, isValidEmail, isEmailConfigured } from './src/lib/email';
import { PRODUCT_BASE_PRICE } from './src/lib/config';
import { getBrowser, closeBrowser, isBrowserLaunched, isBrowserConnected } from './src/server/puppeteerPool';
import { isValidPersonName, isValidWhatsapp, normalizeWhatsapp } from './src/server/validation';
import { applyPreviewMask } from './src/server/ebookPreview';
import { ADMIN_WA_FOLLOWUP_HTML } from './src/server/adminWaFollowup';
import { ADMIN_WA_ACCESS_HTML } from './src/server/adminWaAccess';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Build an absolute URL to the reader for a given access token. Prefers the
 * explicit PUBLIC_BASE_URL (immune to reverse-proxy header mishaps); otherwise
 * falls back to the request's own protocol/host.
 */
function buildAccessUrl(req: express.Request, token: string): string {
  const base = PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/?token=${token}`;
}

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

// SEO: prevent search engines from indexing admin pages. The header is set
// before both the Vite dev middleware and the production static handler, so
// it applies in every environment. X-Robots-Tag is respected by Google, Bing,
// and other major crawlers — equivalent to <meta name="robots" content="noindex">
// but works without modifying the SPA HTML.
app.use((req, res, next) => {
  if (req.path.startsWith('/admin/')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});

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
// Webhook limiter: Midtrans sends legitimate retry bursts, so allow more than
// apiLimiter. Still caps flooding that would cause Supabase query + SHA-512 load.
const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded.' }
});

// The ebook payload includes interpolated markdown + base64 mascot data URIs,
// so it can be fairly large. Allow up to 50mb.
app.use(express.json({ limit: '50mb' }));

// Serve mascot images statically so Puppeteer can fetch them via URL (legacy
// fallback — the ebook HTML now inlines the 4 matched poses as base64, but
// older orders / fallback paths may still reference /mascots/...).
// NOTE: `__dirname` differs by run mode — dev (tsx server.ts): project root;
// production (node dist/server.mjs): dist/. Search upward for the folder that
// actually exists instead of assuming the CWD-relative location.
function resolveMascotsDir(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'src', 'assets', 'mascots');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  console.warn(`[server] WARNING: src/assets/mascots not found searching up from ${startDir} — /mascots will 404.`);
  return path.join(startDir, 'src', 'assets', 'mascots');
}
app.use('/mascots', express.static(resolveMascotsDir(__dirname)));

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

interface WatermarkMeta {
  email: string;
  orderShort: string;
  date: string;
}

/**
 * Masking email untuk tampilan footer yang terlihat saat dicetak:
 * "b***@domain.com" — cukup mengidentifikasi, tidak membocorkan alamat penuh.
 */
function maskEmailForFooter(email: string): string {
  if (!email) return 'pembeli';
  const [local, domain] = email.split('@');
  if (!domain) return email.slice(0, 1) + '***';
  return (local ? local.slice(0, 1) : '') + '***@' + domain;
}

/**
 * Sisipkan watermark diagonal halus ke dalam HTML ebook sebelum render PDF.
 * Opacity ~5% supaya tidak merusak tampilan e-book anak (palet brand + maskot),
 * namun teks tetap bisa dibaca bila PDF diperbesar — melacak ke pembeli.
 *
 * Overlay dipasang position:fixed sehingga tampil di setiap halaman PDF.
 * Dua lapis teks (atas-bawah) menutupi halaman yang panjang.
 */
function applyPdfWatermark(html: string, meta: WatermarkMeta): string {
  const label = `${meta.email || 'pembeli'} · #${meta.orderShort}`;
  const overlay = `
<style id="pb-watermark">
@page { margin: 15mm; }
.pb-wm {
  position: fixed;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-35deg);
  font-family: 'Nunito', Arial, sans-serif;
  font-size: 38pt;
  font-weight: 900;
  color: #1C1A2E;
  opacity: 0.05;
  white-space: nowrap;
  pointer-events: none;
  z-index: 9999;
  letter-spacing: 1px;
}
.pb-wm-2 {
  position: fixed;
  top: 80%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-35deg);
  font-family: 'Nunito', Arial, sans-serif;
  font-size: 28pt;
  font-weight: 800;
  color: #2A306C;
  opacity: 0.04;
  white-space: nowrap;
  pointer-events: none;
  z-index: 9999;
}
@media print {
  .pb-wm, .pb-wm-2 { opacity: 0.05; }
}
</style>
<div class="pb-wm" aria-hidden="true">${escapeHtmlAttr(label)}</div>
<div class="pb-wm-2" aria-hidden="true">Peta Bintang · ${escapeHtmlAttr(meta.date)}</div>`;
  // Sisipkan tepat setelah <body> bila ada; bila tidak ada, tempel di akhir.
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/(<body[^>]*>)/i, `$1${overlay}`);
  }
  return html + overlay;
}

function escapeHtmlAttr(s: string): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Footer template untuk Puppeteer page.pdf({ displayHeaderFooter: true }).
 * Dirender di konteks CSS terpisah — TIDAK mewarisi CSS ebook. Semua gaya
 * HARUS di-inline. Footer muncul di setiap halaman pada area margin bawah.
 *
 * Footer menampilkan: "Diunduh oleh {email-masked} · {tanggal} · #{orderShort}"
 * plus nomor halaman. Email di-mask karena footer terlihat saat dicetak.
 */
function buildPdfFooterTemplate(meta: WatermarkMeta): string {
  const masked = maskEmailForFooter(meta.email);
  return `
<div style="width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 7pt; color: #8a94a6; padding: 0 15mm; display: flex; justify-content: space-between; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
  <span>Diunduh oleh ${escapeHtmlAttr(masked)} · ${escapeHtmlAttr(meta.date)} · #${escapeHtmlAttr(meta.orderShort)}</span>
  <span>Hal. <span class="pageNumber"></span>/<span class="totalPages"></span></span>
</div>`;
}

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
      .select('ebook_json, payment_status, email, token, created_at')
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

    // Watermark metadata: identitas pembeli untuk menekan penyebaran PDF.
    // Teks watermark diformat dari email + potongan token (8 char terakhir).
    const wmEmail = (data.email || '').trim();
    const wmOrder = token.slice(-8);
    const wmMeta = {
      email: wmEmail,
      orderShort: wmOrder,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    };

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
    // Watermark: sisipkan overlay diagonal halus ke dalam HTML sebelum render.
    // Opacity sangat rendah (~5%) supaya tidak merusak tampilan e-book anak,
    // namun tetap melacak ke pembeli bila PDF tersebar.
    const htmlWithWatermark = applyPdfWatermark(htmlWithBase, wmMeta);
    // setContent mendukung 'load'/'domcontentloaded' saja; file font woff2
    // dimuat via document.fonts.load() eksplisit di Step 5b (lebih andal).
    await page.setContent(htmlWithWatermark, { waitUntil: 'load' });
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
    // Observability: a broken <img> also reports `complete === true`, so the
    // wait above CANNOT distinguish success from failure on its own. Inspect
    // naturalWidth and log loudly — a mascot-free PDF must never ship silently
    // again (the onerror="display:none" guard hides broken images visually).
    const imgStats = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const failed = imgs
        .filter((img: any) => !img.naturalWidth || img.naturalWidth === 0)
        .map((img: any) => (img.currentSrc || img.src || '').slice(0, 120));
      return { total: imgs.length, failed };
    });
    if (imgStats.failed.length > 0) {
      console.warn(`[PDF] WARNING: ${imgStats.failed.length}/${imgStats.total} images FAILED to load:`, imgStats.failed);
    } else {
      console.log(`[PDF] Step 5 done: images OK (${imgStats.total}/${imgStats.total})`);
    }

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
    // Watermark footer: displayHeaderFooter merender footer per halaman di
    // konteks CSS terpisah — font/warna HARUS di-inline (brand tidak berlaku).
    // preferCSSPageSize aktif; bila interaksi aneh, footer tetap dirender
    // karena displayHeaderFooter bekerja pada margin area, bukan page size.
    const wmFooter = buildPdfFooterTemplate(wmMeta);
    const pdfBuffer = await Promise.race([
      page.pdf({
        format: 'A4',
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: wmFooter
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

    // Best-effort: naikkan penghitung unduhan + catat timestamp. Jangan
    // gagalkan respons bila update DB error (PDF sudah dikirim ke klien).
    void (async () => {
      try {
        const { data: row } = await supabase
          .from(SUPABASE_TABLE)
          .select('pdf_download_count')
          .eq('token', token)
          .single();
        const next = (row?.pdf_download_count ?? 0) + 1;
        const { error: cntErr } = await supabase
          .from(SUPABASE_TABLE)
          .update({
            pdf_download_count: next,
            pdf_last_download_at: new Date().toISOString()
          })
          .eq('token', token);
        if (cntErr) console.error('[DB] pdf_download_count increment failed:', cntErr.message);
      } catch (e) {
        console.error('[DB] pdf_download_count increment threw:', e instanceof Error ? e.message : e);
      }
    })();

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
// Dev-only email test (preview tooling)
// ---------------------------------------------------------------------------
// Fires the SAME sendEbookAccessEmail() used by the paid webhook so email can
// be verified without a real payment. Disabled in production.
//   GET /api/dev/test-email?to=you@example.com&name=Budi
// NOTE: with EMAIL_FROM=onboarding@resend.dev, Resend only allows sending to
// the account owner's own address (returns 403 otherwise) — the error is
// surfaced verbatim here so the cause is obvious.
app.get('/api/dev/test-email', async (req, res) => {
  if (IS_PRODUCTION) {
    return res.status(404).json({ error: 'Not found' });
  }
  const to = String(req.query.to ?? '').trim();
  const childName = String(req.query.name ?? 'Budi').trim() || 'Budi';
  if (!isValidEmail(to)) {
    return res.status(400).json({ error: 'Parameter `to` harus alamat email yang valid.' });
  }
  if (!isEmailConfigured()) {
    return res.status(503).json({ error: 'RESEND_API_KEY tidak diisi di .env' });
  }
  const accessUrl = buildAccessUrl(req, 'DEV_TEST_TOKEN_123456789');
  try {
    await sendEbookAccessEmail({ to, childName, accessUrl });
    res.json({ ok: true, sentTo: to, from: process.env.EMAIL_FROM || '(default)' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[API] /api/dev/test-email failed:', message);
    res.status(500).json({ ok: false, error: message });
  }
});

// ---------------------------------------------------------------------------
// Quiz Submission — save profile + ebook to DB, return access token
// ---------------------------------------------------------------------------

app.post('/api/quiz/submit', apiLimiter, async (req, res) => {
  try {
    const { childProfile, whatsappNumber } = req.body as {
      childProfile: ChildProfile;
      whatsappNumber?: string;
    };

    if (!childProfile) {
      return res.status(400).json({ error: 'Invalid payload: childProfile required' });
    }
    if (!isValidPersonName(childProfile.name)) {
      return res.status(400).json({ error: 'Nama anak tidak valid.' });
    }
    if (childProfile.parentName && !isValidPersonName(childProfile.parentName)) {
      return res.status(400).json({ error: 'Nama orang tua tidak valid.' });
    }

    // Runtime validation for fields not covered by isValidPersonName.
    // TypeScript types are NOT enforced at the API boundary — a crafted
    // payload could inject unexpected values into the ebook generation.
    if (typeof childProfile.age !== 'number' || childProfile.age < 3 || childProfile.age > 12) {
      return res.status(400).json({ error: 'Usia anak tidak valid (3-12 tahun).' });
    }
    if (childProfile.gender !== 'Laki-laki' && childProfile.gender !== 'Perempuan') {
      return res.status(400).json({ error: 'Jenis kelamin tidak valid.' });
    }
    const oceanKeys = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
    if (!childProfile.oceanScores || !oceanKeys.every(k =>
      typeof childProfile.oceanScores[k] === 'number' &&
      childProfile.oceanScores[k] >= 1 && childProfile.oceanScores[k] <= 10
    )) {
      return res.status(400).json({ error: 'Skor OCEAN tidak valid.' });
    }
    const miKeys = ['linguistic', 'logical', 'spatial', 'kinesthetic', 'musical', 'interpersonal', 'intrapersonal', 'naturalist'] as const;
    if (!childProfile.miScores || !miKeys.every(k =>
      typeof childProfile.miScores[k] === 'number' &&
      childProfile.miScores[k] >= 0 && childProfile.miScores[k] <= 100
    )) {
      return res.status(400).json({ error: 'Skor kecerdasan tidak valid.' });
    }

    // C-02: the ebook is generated SERVER-SIDE from the (validated) profile.
    // The client no longer ships the paid templates, so any ebook body it
    // sends is ignored — the server is the single source of truth.
    // WA lead capture is optional; validate it BEFORE the expensive generation
    // so malformed input is rejected cheaply.
    const normalizedWa = whatsappNumber ? normalizeWhatsapp(whatsappNumber) : null;
    if (whatsappNumber && !normalizedWa) {
      return res.status(400).json({ error: 'Nomor WhatsApp tidak valid.' });
    }

    const ebook = generateEbook(childProfile);

    // Generate URL-safe token (21 chars, unguessable)
    const token = nanoid(21);

    const { error } = await supabase.from(SUPABASE_TABLE).insert({
      token,
      child_name: childProfile.name,
      child_profile: childProfile,
      ebook_json: ebook,
      archetype_id: childProfile.archetypeId,
      whatsapp_number: normalizedWa,
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
// Order contact — capture email / WhatsApp for an existing (pending) order
// ---------------------------------------------------------------------------
// Called from the result/sales page so a parent who has NOT yet reached the
// payment popup still leaves a reachable contact. That is the prerequisite for
// the admin WA follow-up. Gated by the same capability token that unlocks the
// order, so only the order owner can attach a contact. Once paid, contacts are
// frozen (the paid email flow must not be redirected).

app.post('/api/order/contact', apiLimiter, async (req, res) => {
  try {
    const { token, email, whatsappNumber, source } = req.body as {
      token?: string;
      email?: string;
      whatsappNumber?: string;
      source?: string;
    };

    if (!token || token.length < 10) {
      return res.status(400).json({ error: 'Token required' });
    }

    const normalizedEmail = (email || '').trim();
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Format email tidak valid.' });
    }

    const normalizedWa = whatsappNumber ? normalizeWhatsapp(whatsappNumber) : null;
    if (whatsappNumber && !normalizedWa) {
      return res.status(400).json({ error: 'Nomor WhatsApp tidak valid.' });
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('payment_status')
      .eq('token', token)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (data.payment_status === 'paid') {
      // Contact already settled for a paid order — nothing to lead-capture.
      return res.status(409).json({ error: 'Order already paid' });
    }

    const updateFields: Record<string, unknown> = {};
    if (normalizedEmail) updateFields.email = normalizedEmail;
    if (normalizedWa) updateFields.whatsapp_number = normalizedWa;
    // Abandoned checkout: catat pertama kali kontak dikirim + dari tahap mana.
    // checkout_started_at hanya di-set bila belum ada (jangan timpa timestamp awal).
    if (source === 'result' || source === 'payment') {
      updateFields.contact_source = source;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'Tidak ada kontak yang dikirim.' });
    }

    // Set checkout_started_at hanya bila masih null. Supabase tidak punya
    // "set if null" langsung, jadi lakukan dua langkah: baca dulu, lalu update
    // kondisional. Tapi untuk hemat round-trip, pakai filter `.is()` — bila
    // baris tidak cocok (sudah ada timestamp), update no-op aman.
    if (normalizedEmail || normalizedWa) {
      await supabase
        .from(SUPABASE_TABLE)
        .update({ checkout_started_at: new Date().toISOString() })
        .eq('token', token)
        .is('checkout_started_at', null);
    }

    const { error: updErr } = await supabase
      .from(SUPABASE_TABLE)
      .update(updateFields)
      .eq('token', token);

    if (updErr) {
      console.error('[DB] order/contact update failed:', updErr.message);
      return res.status(500).json({ error: 'Gagal menyimpan kontak.' });
    }

    console.log(`[DB] Contact saved for token=${maskToken(token)} (wa: ${normalizedWa ? 'yes' : 'no'}, source: ${source || 'none'})`);
    res.json({ ok: true, whatsappNumber: normalizedWa || undefined, email: normalizedEmail || undefined });
  } catch (error) {
    console.error('[API] /api/order/contact failed:', error);
    res.status(500).json({ error: 'Gagal menyimpan kontak.' });
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

app.post('/api/webhook/midtrans', webhookLimiter, async (req, res) => {
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
          const accessUrl = buildAccessUrl(req, data.token);
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
// Resend access email (buyer-initiated recovery)
// ---------------------------------------------------------------------------
// Lets a paid buyer re-request the access link if the original post-payment
// email was lost (spam filter, typo'd inbox, provider hiccup). Gated behind the
// paid access token — the same unguessable capability that unlocks the ebook —
// so it can only ever email the address already stored on that order, never an
// arbitrary recipient.

app.post('/api/resend-access', apiLimiter, async (req, res) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token || token.length < 10) {
      return res.status(400).json({ error: 'Token required' });
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('token, child_name, email, payment_status')
      .eq('token', token)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (data.payment_status !== 'paid') {
      return res.status(403).json({ error: 'Pembayaran belum terkonfirmasi.' });
    }
    if (!data.email) {
      return res.status(409).json({
        error: 'Tidak ada email tersimpan untuk pesanan ini. Hubungi WhatsApp kami untuk bantuan.'
      });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Layanan email sedang tidak tersedia. Coba lagi nanti.' });
    }

    const accessUrl = buildAccessUrl(req, data.token);
    await sendEbookAccessEmail({
      to: data.email,
      childName: data.child_name,
      accessUrl
    });

    // Mask the address in logs (M-03 style) — the capability token is the only
    // secret we never write in full; the email still identifies a person.
    const masked = data.email.replace(/^(.).*(@.*)$/, '$1***$2');
    console.log(`[Email] Access link re-sent for token=${maskToken(data.token)} to ${masked}`);

    res.json({ ok: true, sentTo: data.email });
  } catch (error) {
    console.error('[API] /api/resend-access failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Gagal mengirim ulang tautan email.' });
  }
});

// ---------------------------------------------------------------------------
// Admin WA follow-up (semi-automatic — Opsi C)
// ---------------------------------------------------------------------------
// After 1x24h a pending buyer usually needs a nudge, but WA is only truly read
// when sent from a real device. Rather than an unofficial bot (ban risk), these
// endpoints feed an operator dashboard a list of overdue pending orders and a
// ready-to-click `wa.me` deep link with a personalized message. The operator
// sends from their own WhatsApp, then marks the row sent. Protected by a shared
// ADMIN_SECRET (fail-closed when unset) so the lead list is never public.

/** Constant-time comparison of the admin secret header (avoids timing leaks). */
function isAdminAuthorized(req: express.Request): boolean {
  if (!ADMIN_SECRET) return false;
  const provided = String(req.get('x-admin-secret') || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_SECRET);
  if (a.length !== b.length) {
    console.warn(`[Admin] Unauthorized access attempt from IP: ${req.ip}`);
    return false;
  }
  try {
    const authorized = crypto.timingSafeEqual(a, b);
    if (!authorized) {
      console.warn(`[Admin] Unauthorized access attempt from IP: ${req.ip}`);
    }
    return authorized;
  } catch {
    console.warn(`[Admin] Unauthorized access attempt from IP: ${req.ip}`);
    return false;
  }
}

/** Public resume/access URL for an order token (operator copy/reminder link). */
function buildAccessUrlForToken(token: string): string {
  return PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}/?token=${token}` : `/?token=${token}`;
}

/** Build the personalized wa.me deep link for an overdue pending order. */
function buildWaReminderLink(row: {
  child_name: string;
  archetype_id: string;
  token: string;
  whatsapp_number: string | null;
}): string {
  const archetype = getArchetypeById(row.archetype_id);
  const accessUrl = buildAccessUrlForToken(row.token);
  const message =
    `Halo Ayah/Bunda, salam dari Peta Bintang 🌟\n\n` +
    `Laporan e-book untuk ${row.child_name} (${archetype.title}) sudah selesai disiapkan. ` +
    `Apakah ada kendala saat menyelesaikan pembayaran?\n\n` +
    `Lanjutkan dan buka e-book lengkapnya di sini:\n${accessUrl}\n\n` +
    `Terima kasih 🙏`;
  return `https://wa.me/${row.whatsapp_number ?? ''}?text=${encodeURIComponent(message)}`;
}

/**
 * Build the personalized wa.me deep link for DELIVERING the e-book access link
 * to a PAID order (post-payment). Different intent from buildWaReminderLink
 * (which nudges unpaid buyers): this confirms payment is complete and sends
 * the access link. Format wajib pakai buildAccessUrlForToken supaya token valid.
 */
function buildWaAccessLink(row: {
  child_name: string;
  archetype_id: string;
  token: string;
  whatsapp_number: string | null;
}): string {
  const archetype = getArchetypeById(row.archetype_id);
  const accessUrl = buildAccessUrlForToken(row.token);
  const message =
    `Halo Ayah/Bunda, terima kasih sudah membuka laporan Peta Bintang untuk ${row.child_name} 🌟\n\n` +
    `Pembayaran Anda telah kami terima. E-book lengkap (${archetype.title}) siap dibuka:\n${accessUrl}\n\n` +
    `Simpan tautan ini agar bisa dibuka kembali kapan saja. ` +
    `Tautan bersifat pribadi untuk ${row.child_name} — mohon tidak dibagikan.\n\n` +
    `Salam hangat dari Peta Bintang 🙏`;
  return `https://wa.me/${row.whatsapp_number ?? ''}?text=${encodeURIComponent(message)}`;
}

app.get('/api/admin/pending-wa-reminders', apiLimiter, async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const minHours = Math.max(1, parseInt(String(req.query.minHours ?? '24'), 10) || 24);
    const maxDays = Math.max(1, parseInt(String(req.query.maxDays ?? '7'), 10) || 7);
    // contact=missing → surface pending orders with NO reachable contact at all
    // (no WA and no email). Those can't be followed up, but they reveal the
    // drop-off volume that would otherwise be invisible. Default = orders with
    // a WA number, which are the actionable follow-up list.
    const contactMissing = String(req.query.contact ?? '') === 'missing';
    const now = new Date();
    const olderThan = new Date(now.getTime() - minHours * 3600_000).toISOString();
    const newerThan = new Date(now.getTime() - maxDays * 86_400_000).toISOString();

    let query = supabase
      .from(SUPABASE_TABLE)
      .select('token, child_name, archetype_id, whatsapp_number, email, created_at, payment_status')
      .eq('payment_status', 'pending')
      .lte('created_at', olderThan)
      .gte('created_at', newerThan)
      .order('created_at', { ascending: true })
      .limit(200);

    if (contactMissing) {
      query = query.is('whatsapp_number', null).is('email', null).is('wa_reminder_sent_at', null);
    } else {
      query = query.not('whatsapp_number', 'is', null).is('wa_reminder_sent_at', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Admin] pending-wa-reminders query failed:', error.message);
      return res.status(500).json({ error: 'Gagal mengambil daftar pengingat.' });
    }

    const reminders = (data || []).map(row => ({
      token: row.token,
      childName: row.child_name,
      archetype: getArchetypeById(row.archetype_id).title,
      whatsappNumber: row.whatsapp_number,
      email: row.email,
      accessUrl: buildAccessUrlForToken(row.token),
      waLink: row.whatsapp_number
        ? buildWaReminderLink(row as {
            child_name: string;
            archetype_id: string;
            token: string;
            whatsapp_number: string | null;
          })
        : null,
      createdAt: row.created_at
    }));

    console.log(`[Admin] ${reminders.length} pending reminder(s) listed (contact=${contactMissing ? 'missing' : 'wa'})`);
    res.json({ count: reminders.length, mode: contactMissing ? 'missing' : 'wa', reminders });
  } catch (error) {
    console.error('[API] /api/admin/pending-wa-reminders failed:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar pengingat.' });
  }
});

app.post('/api/admin/mark-wa-sent', apiLimiter, async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { token, status } = req.body as { token?: string; status?: string };
    if (!token || token.length < 10) {
      return res.status(400).json({ error: 'Token required' });
    }
    const nextStatus = status === 'skipped' ? 'skipped' : 'sent';

    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .update({ wa_reminder_sent_at: new Date().toISOString(), wa_reminder_status: nextStatus })
      .eq('token', token);

    if (error) {
      console.error('[Admin] mark-wa-sent failed:', error.message);
      return res.status(500).json({ error: 'Gagal menandai pengingat.' });
    }

    console.log(`[Admin] WA reminder marked ${nextStatus} for token=${maskToken(token)}`);
    res.json({ ok: true, status: nextStatus });
  } catch (error) {
    console.error('[API] /api/admin/mark-wa-sent failed:', error);
    res.status(500).json({ error: 'Gagal menandai pengingat.' });
  }
});

// ---------------------------------------------------------------------------
// WA delivery for PAID orders (Scalev-parity fitur 2)
// ---------------------------------------------------------------------------
// Cadangan bila email akses gagal terkirim (spam/salah ketik domain). Operator
// melihat order berbayar yang punya WA tapi belum dikirimi tautan akses, klik
// wa.me, kirim dari WhatsApp sendiri, lalu tandai terkirim. Kolom wa_access_*
// DIPISAH dari wa_reminder_* (yang untuk order belum bayar) supaya tidak tertukar.

app.get('/api/admin/paid-wa-pending', apiLimiter, async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('token, child_name, archetype_id, email, whatsapp_number, paid_at, created_at')
      .eq('payment_status', 'paid')
      .not('whatsapp_number', 'is', null)
      .is('wa_access_sent_at', null)
      .order('paid_at', { ascending: true, nullsFirst: false })
      .limit(200);

    if (error) {
      console.error('[Admin] paid-wa-pending query failed:', error.message);
      return res.status(500).json({ error: 'Gagal mengambil daftar pengiriman WA.' });
    }

    const orders = (data || []).map(row => ({
      token: row.token,
      childName: row.child_name,
      archetype: getArchetypeById(row.archetype_id).title,
      email: row.email,
      whatsappNumber: row.whatsapp_number,
      accessUrl: buildAccessUrlForToken(row.token),
      waLink: buildWaAccessLink(row as {
        child_name: string;
        archetype_id: string;
        token: string;
        whatsapp_number: string | null;
      }),
      paidAt: row.paid_at,
      createdAt: row.created_at
    }));

    console.log(`[Admin] ${orders.length} paid order(s) awaiting WA access delivery`);
    res.json({ count: orders.length, orders });
  } catch (error) {
    console.error('[API] /api/admin/paid-wa-pending failed:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar pengiriman WA.' });
  }
});

app.post('/api/admin/mark-wa-access-sent', apiLimiter, async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { token, status } = req.body as { token?: string; status?: string };
    if (!token || token.length < 10) {
      return res.status(400).json({ error: 'Token required' });
    }
    const nextStatus = status === 'skipped' ? 'skipped' : 'sent';

    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .update({
        wa_access_sent_at: new Date().toISOString(),
        wa_access_status: nextStatus
      })
      .eq('token', token)
      .eq('payment_status', 'paid');

    if (error) {
      console.error('[Admin] mark-wa-access-sent failed:', error.message);
      return res.status(500).json({ error: 'Gagal menandai pengiriman.' });
    }

    console.log(`[Admin] WA access marked ${nextStatus} for token=${maskToken(token)}`);
    res.json({ ok: true, status: nextStatus });
  } catch (error) {
    console.error('[API] /api/admin/mark-wa-access-sent failed:', error);
    res.status(500).json({ error: 'Gagal menandai pengiriman.' });
  }
});

// ---------------------------------------------------------------------------
// Abandoned checkout capture + UU PDP contact purge (Scalev-parity fitur 1)
// ---------------------------------------------------------------------------
// Orang tua yang mengisi kontak di halaman hasil tapi tidak menyelesaikan
// pembayaran. Daftar ini untuk follow-up manual. Purge membersihkan data
// pribadi order pending yang > 30 hari (retensi UU PDP) — baris order tetap
// ada untuk statistik drop-off, hanya email/WA yang di-null-kan.

app.get('/api/admin/abandoned-orders', apiLimiter, async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const minHours = Math.max(1, parseInt(String(req.query.minHours ?? '2'), 10) || 2);
    const maxDays = Math.max(1, parseInt(String(req.query.maxDays ?? '30'), 10) || 30);
    const now = new Date();
    const olderThan = new Date(now.getTime() - minHours * 3600_000).toISOString();
    const newerThan = new Date(now.getTime() - maxDays * 86_400_000).toISOString();

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('token, child_name, archetype_id, email, whatsapp_number, checkout_started_at, created_at, payment_status')
      .eq('payment_status', 'pending')
      .lte('created_at', olderThan)
      .gte('created_at', newerThan)
      .not('email', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[Admin] abandoned-orders query failed:', error.message);
      return res.status(500).json({ error: 'Gagal mengambil daftar abandoned.' });
    }

    const orders = (data || []).map(row => {
      const archetype = getArchetypeById(row.archetype_id);
      return {
        token: row.token,
        childName: row.child_name,
        archetype: archetype.title,
        email: row.email,
        whatsappNumber: row.whatsapp_number,
        accessUrl: buildAccessUrlForToken(row.token),
        waLink: row.whatsapp_number
          ? buildWaReminderLink(row as {
              child_name: string;
              archetype_id: string;
              token: string;
              whatsapp_number: string | null;
            })
          : null,
        checkoutStartedAt: row.checkout_started_at,
        createdAt: row.created_at
      };
    });

    console.log(`[Admin] ${orders.length} abandoned order(s) listed`);
    res.json({ count: orders.length, orders });
  } catch (error) {
    console.error('[API] /api/admin/abandoned-orders failed:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar abandoned.' });
  }
});

app.post('/api/admin/purge-stale-contacts', apiLimiter, async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const olderThanDays = Math.max(1, parseInt(String((req.body as { olderThanDays?: number })?.olderThanDays ?? '30'), 10) || 30);
    const cutoff = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();

    // Null-kan data pribadi (email, WA, contact_source) untuk order pending
    // yang lebih tua dari cutoff. Baris order tetap ada untuk statistik.
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .update({
        email: null,
        whatsapp_number: null,
        contact_source: 'purged'
      })
      .eq('payment_status', 'pending')
      .lt('created_at', cutoff)
      .is('contact_source', 'result')
      .select('token');

    // Catatan: select('token') agar respons berisi jumlah baris yang diubah.
    // Filter contact_source = 'result' agar tidak menyentuh order yang belum
    // pernah mengirim kontak (tidak ada yang dibersihkan).
    void data;

    if (error) {
      console.error('[Admin] purge-stale-contacts failed:', error.message);
      return res.status(500).json({ error: 'Gagal membersihkan kontak.' });
    }

    const count = data ? data.length : 0;
    console.log(`[Admin] Purged ${count} stale pending contact(s) older than ${olderThanDays}d`);
    res.json({ ok: true, purged: count, olderThanDays });
  } catch (error) {
    console.error('[API] /api/admin/purge-stale-contacts failed:', error);
    res.status(500).json({ error: 'Gagal membersihkan kontak.' });
  }
});

// Operator dashboard for the semi-automatic WA follow-up. The HTML/JS contains
// no data; it prompts for ADMIN_SECRET and calls the protected endpoints above.
// The page exists to be bookmarked by the operator — it exposes nothing without
// the secret, so it can sit on the public domain. Explicit route (not the SPA
// fallback) so a production `express.static` never shadows it with index.html.
app.get('/admin/wa-followup', (_req, res) => {
  res.type('html').send(ADMIN_WA_FOLLOWUP_HTML);
});

// Sibling dashboard for WA access delivery to PAID orders (fitur 2). Explicit
// route so production express.static never shadows it with index.html.
app.get('/admin/wa-access', (_req, res) => {
  res.type('html').send(ADMIN_WA_ACCESS_HTML);
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

    // Read the order first so we can mirror the real webhook's behaviour: the
    // access email is triggered off the SAME fields the webhook uses (email +
    // child_name + token). Loading before the update also lets us only send the
    // email on a pending→paid transition (matching the webhook's idempotency).
    const { data: order, error: lookErr } = await supabase
      .from(SUPABASE_TABLE)
      .select('token, child_name, email, payment_status')
      .eq('token', token)
      .single();
    if (lookErr || !order) {
      return res.status(404).json({ error: 'Order not found' });
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

    // Mirror the paid webhook's best-effort access email so the dev flow matches
    // production. Rendered out from this stub by the same sendEbookAccessEmail.
    let emailSent = false;
    if (order.payment_status !== 'paid' && order.email) {
      const accessUrl = buildAccessUrl(req, order.token);
      try {
        await sendEbookAccessEmail({
          to: order.email,
          childName: order.child_name,
          accessUrl
        });
        emailSent = true;
        console.log(`[DB][DEV] Access email sent to ${order.email}`);
      } catch (err) {
        console.error(
          `[DB][DEV] Access email to ${order.email} failed:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    res.json({ success: true, message: 'Payment status updated to paid', emailSent });
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
