-- =============================================================================
-- Voucher UJI PRODUKSI MIDTRANS — Opsi A
-- =============================================================================
-- Tujuan: memungkinkan verifikasi end-to-end flow produksi Midtrans (Snap →
-- pembayaran → webhook → email → PDF) tanpa membayar Rp129.000 penuh.
--
-- Jalankan SEKALI di Supabase SQL Editor sebelum uji produksi. Setelah verifikasi
-- selesai, jalankan bagian "Deactivate" di bawah untuk menonaktifkan.
--
-- Penting:
--   - Midtrans menolak gross_amount = 0, jadi voucher tidak boleh diskon 100%.
--   - max_uses = 3 supaya tidak terbuka untuk publik.
--   - valid_until 14 hari — auto-expired bila lupa dinonaktifkan.
--   - on conflict do nothing → aman dijalankan ulang (tidak reaktivasi).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Insert voucher uji
-- -----------------------------------------------------------------------------
insert into vouchers (code, label, discount_type, discount_value, max_uses, active, valid_until)
values
  ('TEST_PROD_QRIS', 'TEST PRODUKSI QRIS (hemat Rp 127.000)', 'amount', 127000, 3, true, now() + interval '14 days'),
  ('TEST_PROD_VA',   'TEST PRODUKSI VA (hemat Rp 119.000)',   'amount', 119000, 3, true, now() + interval '14 days')
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 2) Verifikasi — jalankan untuk konfirmasi
-- -----------------------------------------------------------------------------
-- select code, label, discount_type, discount_value, max_uses, used_count, active, valid_until
-- from vouchers
-- where code like 'TEST_PROD%'
-- order by code;

-- -----------------------------------------------------------------------------
-- 3) Deactivate — jalankan SETELAH verifikasi produksi selesai
-- -----------------------------------------------------------------------------
-- update vouchers set active = false where code like 'TEST_PROD%';
