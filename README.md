# Peta Bintang Anakku

Aplikasi web asesmen pengasuhan yang menghasilkan e-book personalisasi: orang tua mengisi kuis 75 pertanyaan (OCEAN + Multiple Intelligences) untuk anak, lalu aplikasi menghasilkan laporan/e-book berisi grafik, profil arketipe, dan panduan praktis. E-book lengkap dapat diunduh sebagai PDF setelah pembayaran.

## Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite 6, Motion, Lucide
- **Server**: Express 5 (SPA + REST API), `tsx` (dev), `esbuild` (bundle server)
- **E-book/PDF**: template markdown + `generate-html-preview.ts` (renderer HTML/CSS), Puppeteer (PDF A4)
- **Layanan**: Supabase (Postgres + RLS), Midtrans Snap (pembayaran), Resend (email akses)

## Menjalankan secara lokal

Prasyarat: Node.js 18+.

1. Install dependensi: `npm install`
2. Salin `.env.example` menjadi `.env` dan isi variabelnya (Supabase, Midtrans, Resend).
3. Jalankan: `npm run dev` → http://localhost:3000

## Skrip

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Jalankan server dev (Express + Vite middleware, HMR) |
| `npm run build` | Build client (`vite build`) + bundle server ke `dist/server.mjs` |
| `npm run start` | Jalankan server produksi dari `dist/server.mjs` |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run gen-preview` | Generate file HTML e-book contoh ke `dist-preview/` (tooling lokal) |

## Struktur

- `server.ts` — server Express: API, webhook pembayaran, render PDF.
- `generate-html-preview.ts` — generator e-book server-side + renderer HTML/CSS (dipakai jalur PDF).
- `src/` — aplikasi React, data asesmen, template e-book (`src/templates/`), aset mascot (`src/assets/mascots/`).
- `supabase/schema.sql` — skema database (idempoten).
- `docs/AI_CONTEXT.md` — konteks arsitektur untuk agen/kontributor.
- `_archive/` — artefak non-deploy (log, sesi, dokumen perencanaan, hasil preview). Diabaikan git.

## Catatan deploy

- `src/templates/` **harus** ikut ter-deploy (e-book di-generate di server).
- Hanya `.env.example` yang di-commit; `.env` asli tidak pernah masuk repo.
