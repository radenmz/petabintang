# TASK HANDOFF — WhatsApp Follow-up & Progress Persistence

Status: **SELESAI (kode)** — tinggal langkah deploy/operasional di bawah.
Terakhir diperbarui: 5 Oktober 2026.

> Ringkas: menangani calon pembeli yang drop-off sebelum bayar.
> (1) Progress kuis & token order disimpan di browser agar bisa dilanjutkan.
> (2) Nomor WhatsApp ditangkap sebagai lead.
> (3) Operator bisa follow-up manual via WA setelah 1x24 jam (Opsi C — semi-otomatis).

---

## A. Task yang Sudah Selesai (kode)

### Task 1 — Auto-Save Progress Kuis & Resume Token
- [x] `src/lib/quizStorage.ts` (baru): simpan draft kuis + token aktif di `localStorage`.
- [x] `src/components/Assessment/AssessmentWizard.tsx`: auto-save tiap perubahan input/jawaban + banner "Lanjutkan kuis sebelumnya?".
- [x] `src/App.tsx`: resume order otomatis dari `localStorage` bila URL tanpa `?token=`; hapus draft setelah submit sukses.

### Task 2 — Lead Capture Nomor WhatsApp
- [x] `src/lib/whatsapp.ts` (baru): normalisasi nomor Indonesia (`08…`/`+628…`/`8…` → `628…`), dipakai client & server.
- [x] `src/components/Assessment/ResultStep.tsx`: kartu input no. WA (opsional, dengan validasi) sebelum tahap pembayaran.
- [x] `server.ts`: `POST /api/order/contact` (simpan email/WA ke order pending via token).
- [x] `server.ts`: `POST /api/quiz/submit` menerima `whatsappNumber` opsional (divalidasi sebelum generate ebook).

### Task 3 — Migrasi Database
- [x] `supabase/schema.sql`: kolom baru `whatsapp_number`, `wa_reminder_sent_at`, `wa_reminder_status` + index `idx_ebook_orders_wa_reminder`.

### Task 4 — Follow-up WhatsApp 1x24 Jam (Opsi C)
- [x] `server.ts`: `GET /api/admin/pending-wa-reminders` (order pending ≥24 jam, ber-WA, belum di-follow-up + deep link `wa.me`).
- [x] `server.ts`: `POST /api/admin/mark-wa-sent` (tandai `sent`/`skipped`).
- [x] Proteksi `x-admin-secret` (constant-time compare, fail-closed bila `ADMIN_SECRET` kosong).
- [x] `src/server/adminWaFollowup.ts` (baru): dashboard operator di `/admin/wa-followup`.
- [x] `.env.example`: tambah `ADMIN_SECRET=`.

### Task 6 — Referensi Order di Pesan Inbound + Visibilitas Order Tanpa Kontak
- [x] `src/lib/contact.ts` (baru): `isValidEmail` bersama (client+server); `src/lib/email.ts` me-re-export.
- [x] `ResultStep.tsx`: pesan "Tanya via WhatsApp" memuat `Ref: <token>` + link `?token=` (operator bisa mencocokkan order).
- [x] `ResultStep.tsx`: kartu kontak kini menerima WA **atau** email (cukup salah satu); email sinkron dengan modal pembayaran.
- [x] `PaymentModal.tsx`: field email ringkas + "Ubah" (hindari input ganda), pesan WA ber-`Ref:` token.
- [x] `server.ts`: `?contact=missing` menampilkan order pending **tanpa** WA & tanpa email; respons menyertakan `email`, `accessUrl`, `mode`.
- [x] `src/server/adminWaFollowup.ts`: dropdown mode (ber-WA / tanpa kontak) + tombol "Salin link akses".

### Task 5 — Verifikasi
- [x] `npm run lint` → bersih.
- [x] `npm test` → 16 tes lulus (termasuk 3 tes normalisasi no. WA).
- [x] `npm run build` → sukses; bundle client tetap bersih dari konten berbayar.
- [x] Smoke test runtime: `/api/health` OK, `/admin/wa-followup` OK, `/server.mjs(.map)` → 404 di production.

---

## B. Task yang HARUS Dilakukan Sebelum Deploy (WAJIB)

- [x] **1. Jalankan migrasi SQL di Supabase**
  Kolom `whatsapp_number`, `wa_reminder_sent_at`, `wa_reminder_status` + index
  `idx_ebook_orders_wa_reminder` **sudah diterapkan ke DB live via MCP**
  (`add_whatsapp_followup_columns`) pada 5 Okt 2026 — 22 baris lama utuh,
  security advisors bersih. `supabase/schema.sql` tetap sumber resmi & idempoten.

- [x] **2. Isi `ADMIN_SECRET` di `.env`**
  String acak kuat (mis. `openssl rand -hex 32`). Bila kosong, seluruh endpoint `/api/admin/*` nonaktif (fail-closed).
  - [x] `.env` lokal (`D:\Project\PetaBintangV1\.env`) — sudah diisi (uji via `npm run dev`).
  - [ ] `.env` VPS (`/home/deploy/apps/petabintang/.env`) — **masih manual**: tambahkan baris `ADMIN_SECRET=<nilai sama>` lalu `sudo systemctl restart petabintang`.

- [x] **3. Build ulang & deploy** — *build lokal sudah diverifikasi; deploy ke VPS masih manual.*
  ```
  npm run build
  npm run start
  ```
  (atau restart service `petabintang` sesuai `deploy/petabintang.service`).
  - [x] `npm test` → 16 tes lulus.
  - [x] `npm run lint` → bersih.
  - [x] `npm run build` (clean) → sukses; `dist/server.mjs` 118.1kb.
  - [x] Smoke test produksi: `/api/health` 200, `/` 200, `/admin/wa-followup` 200, `/server.mjs(.map)` 404.
  - [x] Bundle client bersih dari literal `ADMIN_SECRET`.
  - [ ] Deploy ke VPS (`sudo systemctl restart petabintang` setelah `ADMIN_SECRET` diisi).

- [x] **4. Uji dashboard follow-up** — *terverifikasi di lokal terhadap DB live.*
  Uji alur penuh dengan 1 order pending berumur 30 jam + berisi nomor WA
  (baris uji sementara, sudah dihapus setelah verifikasi):
  - `GET /api/admin/pending-wa-reminders` tanpa salah secret → **404**; dengan secret benar → **200** + 1 reminder.
  - `waLink` benar: `https://wa.me/628123456789?text=...` (pesan personalisasi nama anak + arketipe + link akses).
  - `POST /api/admin/mark-wa-sent` → `{"ok":true,"status":"sent"}`; daftar berikutnya jadi kosong.
  - Sisa: buka `https://<domain-anda>/admin/wa-followup` di browser produksi (uji UI tombol).

- [ ] **5. Uji alur end-to-end (manual)**
  - [ ] Isi kuis → tutup/refresh browser di tengah kuis → pastikan banner "Lanjutkan kuis" muncul.
  - [ ] Selesaikan kuis → simpan nomor WA di halaman hasil → cek kolom `whatsapp_number` di tabel `ebook_orders` Supabase.
  - [ ] Tutup tab → buka `https://<domain-anda>/` (tanpa token) → pastikan otomatis kembali ke halaman hasil/pembayaran.

---

## C. Catatan Operasional (Semi-Otomatis Opsi C)

- Follow-up **tidak** dikirim otomatis oleh server. Server hanya menyiapkan daftar + link `wa.me` yang sudah berisi pesan personalisasi (nama anak + arketipe + link akses).
- Operator mengirim pesan dari WhatsApp pribadi/bisnis, lalu klik **"Tandai terkirim"** agar tidak muncul lagi di daftar.
- Filter bawaan: order `pending`, `whatsapp_number` terisi, `wa_reminder_sent_at` kosong, umur 24 jam–7 hari. Bisa diubah via query `?minHours=12&maxDays=7`.
- Secret disimpan di `sessionStorage` browser operator saja (hilang saat tab ditutup). Dashboard `noindex, nofollow`.

---

## D. Referensi File yang Diubah

| File | Perubahan |
| --- | --- |
| `src/lib/quizStorage.ts` | **baru** — draft kuis + token di localStorage |
| `src/lib/whatsapp.ts` | **baru** — normalisasi nomor WA (client+server) |
| `src/server/adminWaFollowup.ts` | **baru** — HTML dashboard operator |
| `src/components/Assessment/AssessmentWizard.tsx` | auto-save + banner resume |
| `src/components/Assessment/ResultStep.tsx` | kartu lead capture WA |
| `src/App.tsx` | resume token dari localStorage |
| `server.ts` | `/api/order/contact`, admin WA endpoints, validasi WA |
| `src/lib/env.ts` | `ADMIN_SECRET` |
| `src/server/validation.ts` | re-export helper WA |
| `src/server/validation.test.ts` | tes normalisasi WA |
| `supabase/schema.sql` | kolom & index WA reminder |
| `.env.example` | `ADMIN_SECRET=` |
