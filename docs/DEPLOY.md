# Panduan Deploy — Peta Bintang

Panduan ini menjelaskan cara men-deploy aplikasi ke VPS + domain, langkah demi
langkah, dari nol. Ikuti **berurutan**. Estimasi waktu: 1–2 jam (di luar propagasi DNS).

> **Ganti semua** `domain-anda.com` dan `IP_VPS` dengan milik Anda.
> Perintah diawali `sudo` dijalankan sebagai user dengan hak sudo.

## Gambaran arsitektur (kenapa begini)

- Aplikasi adalah **satu proses Node** (`dist/server.mjs`) yang:
  - menyajikan halaman web (hasil build Vite) di `dist/`,
  - menangani API (`/api/...`),
  - menghasilkan PDF e-book memakai **Chromium headless (Puppeteer)**,
  - menerima webhook pembayaran Midtrans.
- **`src/templates/**` harus ada di server** — e-book di-generate saat runtime
  (server membaca file markdown di disk, bukan dari bundle).
- Karena itu kita butuh Node, Chromium, Nginx (reverse proxy + HTTPS), dan
  proses yang selalu hidup (systemd).

---

## FASE 0 — Persiapan di komputer Anda

### 0.1. Siapkan repo Git (lihat Fase Git di bawah bila belum ada)

Repo ini belum punya remote GitHub. Langkah membuatnya ada di
**Lampiran A — Membuat repo GitHub** di akhir dokumen ini.

### 0.2. Siapkan isi `.env` produksi

Buat file teks bernama `.env` (di komputer Anda, jangan commit). Isi:

```env
NODE_ENV=production
PORT=3000

# URL publik absolut (tanpa trailing slash) — dipakai untuk link akses di email
PUBLIC_BASE_URL=https://domain-anda.com

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...service_role...
SUPABASE_ANON_KEY=eyJ...anon...

# Midtrans (mulai dari sandbox; ganti ke production setelah akun diverifikasi)
MIDTRANS_ENV=sandbox
VITE_MIDTRANS_ENV=sandbox
MIDTRANS_SERVER_KEY=Mid-server-xxxx
MIDTRANS_CLIENT_KEY=Mid-client-xxxx
VITE_MIDTRANS_CLIENT_KEY=Mid-client-xxxx

# Resend (email akses)
RESEND_API_KEY=re_xxxx
EMAIL_FROM=Peta Bintang Anakku <hello@domain-anda.com>

# Chromium sistem (diisi di Fase 4/8)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_SKIP_DOWNLOAD=true

# Dashboard follow-up WhatsApp operator (/admin/wa-followup).
# String acak kuat (mis. `openssl rand -hex 32`). Bila kosong, seluruh
# endpoint /api/admin/* nonaktif (fail-closed). Nilai ini juga diketik
# operator di halaman dashboard untuk otorisasi.
ADMIN_SECRET=
```

> **Catatan penting env:**
> - `VITE_MIDTRANS_ENV` dan `VITE_MIDTRANS_CLIENT_KEY` **di-inline saat `npm run build`**.
>   Jika nilainya berubah → **wajib build ulang**.
> - `MIDTRANS_SERVER_KEY`, `MIDTRANS_ENV`, `SUPABASE_*`, `RESEND_*`, `EMAIL_FROM`,
>   `PUBLIC_BASE_URL`, `ADMIN_SECRET`, `PUPPETEER_*` dibaca saat runtime → **cukup restart**.

---

## FASE 1 — Masuk ke VPS

```bash
ssh root@IP_VPS
```

## FASE 2 — Update sistem & buat user deploy

```bash
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
```

Lanjutkan sebagai user `deploy`:

```bash
su - deploy
```

## FASE 3 — Pasang Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # harus v22.x
npm --version
```

## FASE 4 — Pasang Chromium + dependensi sistem (WAJIB untuk PDF)

```bash
sudo apt install -y chromium

sudo apt install -y \
  ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0 \
  libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 \
  libfontconfig1 libgbm1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 \
  libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 libxdamage1 \
  libxext6 libxfixes3 libxkbcommon0 libxrandr2 libxshmfence1 \
  libu2f-udev libvulkan1 wget xdg-utils
```

Catat path Chromium:

```bash
which chromium         # biasanya /usr/bin/chromium
```

> Ubuntu 22.04: pakai `libasound2` (bukan `libasound2t64`). Jika ada paket
> "not found", sesuaikan namanya. Path dari `which chromium` dipakai di `.env`
> (`PUPPETEER_EXECUTABLE_PATH`).

## FASE 5 — Pasang Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Buka `http://IP_VPS` → muncul halaman default Nginx = berhasil.

## FASE 6 — Ambil kode dari Git

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/USERNAME/NAMA_REPO.git petabintang
cd petabintang
```

## FASE 7 — Install dependency

```bash
npm ci
```

> `PUPPETEER_SKIP_DOWNLOAD=true` (dari `.env`) mencegah unduhan Chromium saat
> install. Pastikan `.env` sudah ada sebelum langkah ini agar tidak mengunduh
> Chromium (lihat Fase 8 dulu jika perlu).

## FASE 8 — Buat `.env` produksi di server

```bash
nano .env
```

Tempel isi dari Fase 0.2. Pastikan `PUPPETEER_EXECUTABLE_PATH` sesuai hasil
Fase 4, dan isi `ADMIN_SECRET` dengan string acak kuat (`openssl rand -hex 32`)
— nilai ini diketik operator di `/admin/wa-followup`. Simpan (Ctrl+O, Enter,
Ctrl+X).

Amankan izin file:

```bash
chmod 600 .env
```

## FASE 9 — Build untuk produksi

```bash
npm run build
```

> `.env` harus sudah ada **sebelum** langkah ini (karena `VITE_*` di-inline saat build).

## FASE 10 — Uji jalankan manual

```bash
NODE_ENV=production PORT=3000 node dist/server.mjs
```

Di terminal lain (atau dari komputer Anda):

```bash
curl http://localhost:3000/api/health
```

Harus keluar `{"status":"ok",...}`. Hentikan dengan `Ctrl+C`.

## FASE 11 — Jalankan permanen (systemd)

Salin unit yang disediakan di repo dan sesuaikan user/path:

```bash
sudo cp deploy/petabintang.service /etc/systemd/system/petabintang.service
sudo nano /etc/systemd/system/petabintang.service
```

Sesuaikan `User`, `WorkingDirectory`, `EnvironmentFile`, `ExecStart`
(path `node` dari `which node`). Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable petabintang
sudo systemctl start petabintang
sudo systemctl status petabintang      # harus "active (running)"
```

Lihat log bila ada masalah:

```bash
journalctl -u petabintang -f
```

## FASE 12 — Konfigurasi Nginx reverse proxy

```bash
sudo cp deploy/nginx-petabintang.conf /etc/nginx/sites-available/petabintang
sudo nano /etc/nginx/sites-available/petabintang   # ganti domain-anda.com
sudo ln -s /etc/nginx/sites-available/petabintang /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Cek dari komputer Anda: `http://domain-anda.com` (bila DNS sudah diarahkan).

## FASE 13 — DNS

Di panel domain, buat:

- `A` record `@`   → `IP_VPS`
- `A` record `www` → `IP_VPS`

Tunggu propagasi (beberapa menit s/d beberapa jam). Cek:

```bash
dig +short domain-anda.com
```

## FASE 14 — HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com
```

Pilih opsi redirect HTTP → HTTPS. Renewal otomatis sudah terpasang.

## FASE 15 — Konfigurasi layanan pihak ketiga

1. **Midtrans** → dashboard → **Payment Notification URL**:
   `https://domain-anda.com/api/webhook/midtrans`
2. **Resend** → verifikasi domain pengirim agar `EMAIL_FROM` valid
   (bukan `onboarding@resend.dev`).
3. **Supabase** → pastikan `supabase/schema.sql` sudah dijalankan
   (tabel `ebook_orders`, `midtrans_orders`, `vouchers`).

## FASE 16 — Verifikasi akhir

- [ ] `https://domain-anda.com` → landing tampil.
- [ ] `https://domain-anda.com/api/health` → `{"status":"ok"}`.
- [ ] Kuis berjalan sampai hasil (token tersimpan di Supabase).
- [ ] Pembayaran **sandbox** → order jadi `paid` (cek Supabase `ebook_orders`).
- [ ] Tombol **Unduh PDF** menghasilkan PDF (memastikan Chromium/Puppeteer OK).
- [ ] Email akses masuk (cek log Resend).
- [ ] `https://domain-anda.com/server.mjs` → **404** (sudah diblokir di kode).
- [ ] `/admin/wa-followup` → masukkan `ADMIN_SECRET` → "Muat daftar" menampilkan daftar (404 bila secret salah/kosong).

---

## Memperbarui aplikasi (setelah ada perubahan kode)

```bash
cd ~/apps/petabintang
git pull
npm ci
npm run build
sudo systemctl restart petabintang
```

> Jika Anda mengubah `VITE_*` (mis. ganti Midtrans ke production), langkah
> `npm run build` wajib; restart saja tidak cukup.

---

## Mengganti Midtrans dari sandbox → production (nanti)

1. Edit `.env` di server: ubah
   `MIDTRANS_ENV=production`, `VITE_MIDTRANS_ENV=production`,
   `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `VITE_MIDTRANS_CLIENT_KEY`.
2. Karena ada `VITE_*` yang berubah → **build ulang**: `npm run build`.
3. `sudo systemctl restart petabintang`.
4. Set Notification URL production di dashboard Midtrans.

---

## Pemecahan masalah umum

| Gejala | Kemungkinan penyebab | Solusi |
|---|---|---|
| `502 Bad Gateway` | proses Node mati | `systemctl status petabintang`, cek `journalctl -u petabintang -f` |
| PDF gagal / error Chromium | libs Chromium kurang atau `PUPPETEER_EXECUTABLE_PATH` salah | ulangi Fase 4; cek `which chromium`; pastikan `.env` benar |
| Link email salah (http/localhost) | header `X-Forwarded-*` tidak diteruskan | pastikan config Nginx dari Fase 12 dipakai |
| Webhook Midtrans tak mempan | Notification URL salah / signature | set URL `https://domain-anda.com/api/webhook/midtrans`; cek `MIDTRANS_SERVER_KEY` |
| Perubahan warna/key tidak muncul | `VITE_*` berubah tapi belum build ulang | `npm run build` lalu `systemctl restart petabintang` |

---

## Lampiran A — Membuat repo GitHub (bila belum ada)

**Opsi 1 — via GitHub CLI (`gh`)** di komputer Anda:

```bash
cd D:\Project\PetaBintangV1
git init
git add -A
git commit -m "Initial commit"
gh repo create petabintang --private --source=. --remote=origin --push
```

**Opsi 2 — via web GitHub:**

1. Buat repo baru (privat disarankan), tanpa README.
2. Di komputer Anda:

```bash
cd D:\Project\PetaBintangV1
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA_REPO.git
git push -u origin main
```

> `.gitignore` repo sudah mengecualikan `.env`, `_archive/`, `node_modules/`,
> `dist/`, `dist-preview/`, `*.log`. Jadi rahasia tidak akan ter-commit.

---

## Lampiran B — File yang disediakan repo

| File | Kegunaan |
|---|---|
| `deploy/petabintang.service` | systemd unit (Fase 11) |
| `deploy/nginx-petabintang.conf` | reverse proxy Nginx (Fase 12) |
| `.env.example` | contoh variabel environment |

> `.env` asli **tidak** disimpan di repo. Buat manual di server (Fase 8).
