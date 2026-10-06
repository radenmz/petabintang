-- =============================================================================
-- PETA BINTANG ANAKKU — Database Schema (idempotent / migration-safe)
-- =============================================================================
-- CARA PAKAI (Supabase Dashboard):
--   1. Buka project → SQL Editor → "+ New query" (atau query kosong).
--   2. Tempel SELURUH isi file ini → klik "Run" (Ctrl+Enter).
--   3. Aman dijalankan berulang (idempoten): create-if-not-exists,
--      alter-add-column-if-not-exists, drop-policy-if-exists + create-policy.
--
-- AMAN UNTUK DB EXISTING:
--   - Tabel `ebook_orders` yang sudah ada (pra-A4/A5, tanpa kolom email/voucher_code)
--     akan ditambahkan kolomnya via ALTER ... ADD COLUMN IF NOT EXISTS.
--   - Default payment_amount lama (49000) diperbaiki ke 79000 via ALTER COLUMN.
--   - Tabel baru (vouchers, midtrans_orders) dibuat jika belum ada.
--   - Tidak menghapus data yang sudah ada.
--
-- Catatan keamanan:
--   - Service role key (dipakai server-side) bypass RLS → semua baca/tulis
--     server tetap jalan. Policy di sini hanya mengatur akses anon (klien).
--   - Token akses (nanoid 21-char) adalah satu-satunya kunci baca publik.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) ebook_orders — order utama (1 baris per kuis/asesmen)
-- -----------------------------------------------------------------------------
create table if not exists ebook_orders (
  token              text primary key,
  child_name         text not null,
  child_profile      jsonb not null,
  ebook_json         jsonb not null,
  archetype_id       text not null,
  email              text,                       -- A5: optional parent email (transactional)
  whatsapp_number    text,                       -- WA follow-up: normalized 628xxxx (lead capture)
  payment_status     text not null default 'pending',
  payment_amount     int not null default 129000, -- harga normal IDR; voucher menurunkan (AnakHebat → 79000)
  midtrans_order_id  text,                        -- "latest attempt" reference (logs only)
  voucher_code       text,                        -- A4: applied voucher code (if any)
  wa_reminder_sent_at timestamptz,                -- admin-marked WA follow-up timestamp (1x24h)
  wa_reminder_status  text not null default 'none', -- none|sent|skipped
  created_at         timestamptz not null default now(),
  paid_at            timestamptz
);

-- Migration path: tambah kolom baru ke tabel existing tanpa hapus data.
alter table ebook_orders
  add column if not exists email text;
alter table ebook_orders
  add column if not exists voucher_code text;
alter table ebook_orders
  add column if not exists midtrans_order_id text;
alter table ebook_orders
  add column if not exists whatsapp_number text;
alter table ebook_orders
  add column if not exists wa_reminder_sent_at timestamptz;
alter table ebook_orders
  add column if not exists wa_reminder_status text not null default 'none';

-- Perbaiki default lama (49000/79000) ke harga normal 129000 di DB yang sudah ada.
alter table ebook_orders
  alter column payment_amount set default 129000;

create index if not exists idx_ebook_orders_payment_status
  on ebook_orders (payment_status);

create index if not exists idx_ebook_orders_midtrans
  on ebook_orders (midtrans_order_id);

create index if not exists idx_ebook_orders_voucher_code
  on ebook_orders (voucher_code);

-- WA follow-up: fast lookup of pending orders that still need an admin nudge.
create index if not exists idx_ebook_orders_wa_reminder
  on ebook_orders (payment_status, wa_reminder_sent_at, created_at);

alter table ebook_orders enable row level security;

-- A2/§8: anon TIDAK boleh baca langsung via REST anon key. Semua baca klien
-- lewat Express API (service role, bypass RLS) yang menerapkan masking + gating
-- token. Mencegah enumerasi seluruh order oleh pemegang anon key.
-- Catatan: PostgreSQL hanya menerapkan USING untuk policy SELECT; WITH CHECK
-- hanya untuk INSERT/UPDATE/ALL (di sini select-only).
drop policy if exists "Public read with token" on ebook_orders;
drop policy if exists "Deny anon direct access" on ebook_orders;
create policy "Deny anon direct access"
  on ebook_orders for select
  using (false);

comment on table ebook_orders is
  'Order ebook: profile anak, ebook JSON (masked bila unpaid), status pembayaran, voucher, token akses.';

-- -----------------------------------------------------------------------------
-- 2) vouchers — katalog voucher (server-side only)
-- -----------------------------------------------------------------------------
create table if not exists vouchers (
  code            text primary key,
  label           text not null,
  discount_type   text not null check (discount_type in ('percent','amount')),
  discount_value  int not null,                  -- percent: 0-100; amount: IDR
  max_uses        int,                            -- null = unlimited
  used_count      int not null default 0,
  active          boolean not null default true,
  valid_from      timestamptz,
  valid_until     timestamptz,
  created_at      timestamptz not null default now()
);

alter table vouchers enable row level security;

-- Voucher hanya diakses service role (server). Tidak ada akses publik.
drop policy if exists "No public voucher access" on vouchers;
create policy "No public voucher access"
  on vouchers for all
  using (false)
  with check (false);

comment on table vouchers is
  'Katalog voucher diskon. Diverifikasi server-side via /api/voucher/validate; used_count naik saat webhook paid.';

-- Seed voucher "AnakHebat": potongan Rp50.000 dari 129.000 → 79.000, 100 pemakaian pertama.
insert into vouchers (code, label, discount_type, discount_value, max_uses, active, valid_until)
values ('ANAKHEBAT', 'Kupon Anak Hebat (Hemat Rp 50.000)', 'amount', 50000, 100, true, now() + interval '90 days')
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 3) midtrans_orders — rekonsiliasi pembayaran asinkron (QRIS/VA hardening)
-- Satu baris per percobaan Midtrans. Webhook mencari via order_id → token.
-- -----------------------------------------------------------------------------
create table if not exists midtrans_orders (
  order_id      text primary key,                  -- Midtrans order_id (PB-<nanoid>, no token leak)
  token         text not null,                     -- references ebook_orders.token
  gross_amount  int not null,
  status        text not null default 'pending',   -- pending|settlement|capture|expire|cancel|deny|failure
  payment_type  text,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);

create index if not exists idx_midtrans_orders_token on midtrans_orders (token);
create index if not exists idx_midtrans_orders_status on midtrans_orders (status);

alter table midtrans_orders enable row level security;

-- Server-side only. Tidak ada akses publik.
drop policy if exists "No public midtrans_orders access" on midtrans_orders;
create policy "No public midtrans_orders access"
  on midtrans_orders for all
  using (false)
  with check (false);

comment on table midtrans_orders is
  'Satu baris per percobaan pembayaran Midtrans. Webhook merekonsiliasi via order_id → token (async fix).';
