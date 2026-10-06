/**
 * Central environment loader.
 *
 * MUST be imported before any module that reads `process.env` at module
 * top-level (midtrans.ts, supabaseServer.ts, email.ts), because ESM evaluates
 * imported modules in order. Importing this file first guarantees `.env` is
 * loaded before those modules capture their values.
 *
 *   import './src/lib/env';   // first line of server.ts
 */
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

export const PORT = Number(process.env.PORT) || 3000;

/**
 * Absolute public base URL of the app (no trailing slash), e.g.
 * "https://petabintang.com". Used to build links that must be correct outside
 * the request context (post-purchase access email, resume links). When unset we
 * fall back to `${req.protocol}://${req.get('host')}`, which is correct ONLY if
 * the reverse proxy forwards X-Forwarded-* headers (see docs/DEPLOY.md). Setting
 * this makes the links immune to proxy misconfiguration.
 */
export const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');

/**
 * Absolute path to a system Chromium/Chrome binary. When set, Puppeteer uses
 * the OS-provided browser instead of its bundled download (see docs/DEPLOY.md).
 * When empty, Puppeteer falls back to its managed Chromium (local dev).
 */
export const PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '';

/**
 * Shared secret for the admin follow-up dashboard endpoints (pending WA
 * reminders / mark-sent). Sent by the operator in the `x-admin-secret` header.
 * When unset, those endpoints are disabled (fail-closed).
 */
export const ADMIN_SECRET = (process.env.ADMIN_SECRET || '').trim();

/**
 * Resolve the browser path, logging clearly if the configured path is missing
 * so a misconfigured deploy is obvious in the logs instead of failing obscurely
 * inside Puppeteer. Returns undefined when no override is configured.
 */
export function resolvePuppeteerExecutablePath(): string | undefined {
  const p = PUPPETEER_EXECUTABLE_PATH.trim();
  if (!p) return undefined;

  if (!fs.existsSync(p)) {
    console.warn(
      `[env] PUPPETEER_EXECUTABLE_PATH is set to "${p}" but no file exists there. ` +
        `Falling back to Puppeteer's managed Chromium. Check docs/DEPLOY.md (Fase 4).`
    );
    // Puppeteer ALSO reads this env var itself when executablePath is
    // undefined, so a stale/invalid value would still be picked up and crash
    // the launch. Clear it so the fallback actually takes effect.
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
    return undefined;
  }
  return p;
}

/**
 * Mask a secret access token for logs. Keeps a short, non-reversible prefix so
 * related log lines can still be correlated without writing the full capability
 * token (which is the sole key to an order) into log files (M-03).
 */
export function maskToken(token: string | null | undefined): string {
  if (!token) return '(none)';
  const head = token.slice(0, 4);
  return `${head}…(${token.length} chars)`;
}
