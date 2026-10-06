/**
 * generate-pdf-preview.ts
 *
 * Dummy PDF generator for local visual QA. Mirrors the production pipeline in
 * `server.ts` (POST /api/generate-pdf) but runs offline against the three
 * SAMPLE_PROFILES and writes straight to `dist-preview/`:
 *
 *   dist-preview/ebook-<slug>.pdf        — full PDF (same options as prod)
 *   dist-preview/ebook-<slug>-cover.png  — cover screenshot (colour check)
 *   dist-preview/ebook-<slug>-divider.png— chapter divider screenshot
 *   dist-preview/ebook-<slug>-content.png— module + chart screenshot
 *
 * Usage:
 *   npx tsx generate-pdf-preview.ts
 *
 * No DB, no payment, no server needed — it renders the same HTML the paid PDF
 * uses, so you can eyeball colours immediately.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer, { type Browser } from 'puppeteer';
import { generateEbook, renderEbookToHtml } from './generate-html-preview';
import { SAMPLE_PROFILES } from './src/data/questions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.join(__dirname, 'dist-preview');

async function waitForAssets(page: import('puppeteer').Page): Promise<void> {
  await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return Promise.all(
      imgs.map((img: HTMLImageElement) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 3000);
          img.onload = () => { clearTimeout(timer); resolve(); };
          img.onerror = () => { clearTimeout(timer); resolve(); };
        });
      })
    );
  });

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
  } catch {
    // fonts.ready unsupported — non-fatal
  }
}

async function screenshotEl(
  page: import('puppeteer').Page,
  selector: string,
  outFile: string
): Promise<boolean> {
  const el = await page.$(selector);
  if (!el) return false;
  await el.screenshot({ path: outFile as `${string}.png` });
  return true;
}

async function main(): Promise<void> {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    console.log('Membuat PDF dummy...\n');

    for (const profile of SAMPLE_PROFILES) {
      const ebook = generateEbook(profile);
      const html = renderEbookToHtml(ebook);
      const slug = profile.name.split(' ')[0].toLowerCase();

      const page = await browser.newPage();
      await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: 'load' });
      await waitForAssets(page);

      // Full PDF — identical options to the production endpoint.
      const pdfPath = path.join(OUT_DIR, `ebook-${slug}.pdf`);
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        printBackground: true,
        preferCSSPageSize: true
      });
      fs.writeFileSync(pdfPath, pdf);

      // Screenshots for quick colour inspection (screen media, not print).
      await screenshotEl(page, '.cover', path.join(OUT_DIR, `ebook-${slug}-cover.png`));
      await screenshotEl(page, '.toc', path.join(OUT_DIR, `ebook-${slug}-toc.png`));
      await screenshotEl(page, '.chapter-divider', path.join(OUT_DIR, `ebook-${slug}-divider.png`));
      const firstModule = await page.$('.module');
      if (firstModule) {
        await firstModule.screenshot({ path: path.join(OUT_DIR, `ebook-${slug}-content.png`) as `${string}.png` });
      }

      const sizeKb = (pdf.length / 1024).toFixed(1);
      console.log(`  ✓ ebook-${slug}.pdf (${sizeKb} KB)  · ${profile.name} · ${ebook.archetype.title}`);
      console.log(`    + cover / toc / divider / content PNG`);

      await page.close();
    }

    console.log(`\nSelesai! File tersimpan di dist-preview/`);
    console.log('Buka PDF atau PNG untuk memeriksa warna brand.');
  } finally {
    if (browser) await browser.close();
  }
}

// Only run when executed directly (not when imported), matching
// generate-html-preview.ts. On Windows process.argv[1] is a backslash path, so
// compare against __filename rather than a file:// URL.
if (process.argv[1] === __filename) {
  main().catch((err) => {
    console.error('Gagal membuat PDF dummy:', err);
    process.exit(1);
  });
}
