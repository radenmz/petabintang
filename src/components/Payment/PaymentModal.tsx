import React, { useState, useEffect, useRef } from 'react';
import { ChildProfile, ArchetypeDefinition } from '../../types';
import { ShieldCheck, CheckCircle2, Clock, X, Percent, AlertCircle, RefreshCw, Mail, Pencil } from 'lucide-react';
import { Button } from '../ui/Button';
import { waLink } from '../../lib/site';
import { isValidEmail as isEmailValid } from '../../lib/contact';
import { PRODUCT_BASE_PRICE } from '../../lib/config';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onClose?: () => void;
          onError?: (result: unknown) => void;
        }
      ) => void;
    };
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  childProfile: ChildProfile;
  archetype: ArchetypeDefinition;
  onPaymentSuccess: () => void;
  accessToken: string | null;
  parentEmail: string;
  onEmailChange: (email: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  childProfile,
  archetype,
  onPaymentSuccess,
  accessToken,
  parentEmail,
  onEmailChange
}) => {
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0); // no default promo; 79k only via coupon
  const [voucherSuccess, setVoucherSuccess] = useState<string>('');
  const [voucherError, setVoucherError] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  // Email is authored once (result page) and only confirmed here — this toggles
  // the collapsed summary back to the editable input when the parent wants to
  // change it. Starts expanded when empty so a fresh buyer can type it.
  const [emailEditing, setEmailEditing] = useState<boolean>(!isEmailValid(parentEmail));

  // Countdown timer 15 mins
  const [timeLeft, setTimeLeft] = useState<number>(900);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Snap.js (Midtrans) — load the popup script once when the modal opens.
  // Sandbox in dev, production build in prod. The client key is public and
  // safe to expose (VITE_-prefixed env is shipped to the browser).
  const [snapReady, setSnapReady] = useState(false);
  const [snapError, setSnapError] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  // Saved Snap token from the first create-order call. Reused by
  // handleContinuePayment to reopen the same popup without a new order.
  const [savedSnapToken, setSavedSnapToken] = useState<string | null>(null);

  // Async-payment lifecycle (QRIS/VA). 'idle' = no active transaction; the
  // others surface a guidance panel + background polling so a slow settlement
  // (or the user closing the popup) doesn't strand the order.
  const [paymentPhase, setPaymentPhase] = useState<'idle' | 'pending' | 'closed' | 'expired'>('idle');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTicksRef = useRef(0);
  // QRIS Snap expiry is ~15 min; poll a bit beyond it. VA can take hours —
  // the tab is rarely kept open that long, so recovery for VA is the webhook +
  // email + the ?token= resume URL, not this poll.
  const POLL_INTERVAL_MS = 10000;
  const POLL_MAX_TICKS = 108; // ~18 minutes

  const stopPaidPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollTicksRef.current = 0;
    setIsPolling(false);
  };

  // One-shot status check against the DB (the webhook is the source of truth;
  // this just observes it). Returns true when it detected a paid order and has
  // triggered the unlock — callers should stop polling afterwards.
  const checkPaidOnce = async (): Promise<boolean> => {
    if (!accessToken) return false;
    try {
      const r = await fetch(`/api/ebook/${accessToken}`);
      const d = await r.json();
      if (d.paymentStatus === 'paid') {
        stopPaidPoll();
        setIsProcessing(false);
        setIsSuccess(true);
        // handlePaymentSuccess (App.tsx) reloads the full unmasked ebook.
        setTimeout(() => onPaymentSuccess(), 800);
        return true;
      }
    } catch {
      // transient network blip — keep polling
    }
    return false;
  };

  // Long background poll for pending/async payments. Auto-unlocks when the
  // webhook flips the order to paid; self-terminates at expiry. Cleared on
  // unmount (useEffect below) and on success.
  const startPaidPoll = () => {
    stopPaidPoll();
    setIsPolling(true);
    pollTicksRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollTicksRef.current += 1;
      const paid = await checkPaidOnce();
      if (paid) return;
      if (pollTicksRef.current >= POLL_MAX_TICKS) {
        stopPaidPoll();
        setPaymentPhase('expired');
      }
    }, POLL_INTERVAL_MS);
  };

  // Cleanup any running poll when the modal unmounts (order page left).
  useEffect(() => () => stopPaidPoll(), []);

  useEffect(() => {
    if (!isOpen) return;
    if (window.snap) {
      setSnapReady(true);
      return;
    }
    // Midtrans env is explicit (VITE_MIDTRANS_ENV) — decoupled from the app
    // build mode so sandbox keys always load sandbox Snap.js. Default sandbox.
    const snapEnv = (
      (import.meta.env.VITE_MIDTRANS_ENV as string | undefined) ||
      (import.meta.env.PROD ? 'production' : 'sandbox')
    ).toLowerCase();
    const src = snapEnv === 'production'
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.clientKey = (import.meta.env.VITE_MIDTRANS_CLIENT_KEY as string) || '';
    script.onload = () => setSnapReady(!!window.snap);
    script.onerror = () => setSnapError('Gagal memuat gateway pembayaran. Coba muat ulang.');
    document.head.appendChild(script);
    return () => {
      // Leave the script in the DOM so a re-open doesn't re-download it.
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const originalPrice = PRODUCT_BASE_PRICE;
  const finalPrice = Math.max(0, originalPrice - appliedDiscount);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleApplyVoucher = async () => {
    setVoucherError('');
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setVoucherError('Masukkan kode voucher terlebih dahulu.');
      setAppliedDiscount(0);
      setVoucherSuccess('');
      return;
    }
    try {
      const res = await fetch('/api/voucher/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setVoucherError(data.message || 'Kode voucher tidak ditemukan atau sudah habis.');
        setAppliedDiscount(0);
        setVoucherSuccess('');
        return;
      }
      // Server-validated discount against base price 129.000.
      setAppliedDiscount(data.discountAmount);
      setVoucherSuccess(`${data.label} (Hemat ${formatRupiah(data.discountAmount)})`);
    } catch {
      setVoucherError('Gagal memeriksa voucher. Coba lagi sebentar.');
      setAppliedDiscount(0);
      setVoucherSuccess('');
    }
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    // Dev-only: mark the order paid via the gated /api/payment/success stub so
    // the subsequent ebook reload (handlePaymentSuccess) returns the full
    // unmasked content. This stub is 403 in production — real payment status
    // only changes via the verified Midtrans webhook.
    if (accessToken) {
      try {
        await fetch('/api/payment/success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: accessToken })
        });
      } catch (err) {
        console.error('[DEV] simulate mark-paid failed:', err);
      }
    }
    setIsProcessing(false);
    setIsSuccess(true);
    setTimeout(() => {
      onPaymentSuccess();
    }, 1500);
  };

  // Open the Snap popup with a given token. Callbacks are shared by both
  // handlePayWithMidtrans (new order) and handleContinuePayment (reuse token)
  // so the behaviour is identical regardless of which entry point opened Snap.
  const openSnap = (token: string) => {
    window.snap!.pay(token, {
      onSuccess: () => {
        // P6: never unlock on the client's word alone — Snap "success" is a
        // gateway ack, not a settled payment. Poll until the verified webhook
        // has flipped payment_status to 'paid', then unlock (which reloads
        // the full unmasked ebook). Falls into 'pending' polling while waiting
        // rather than risking a premature unlock that would render masked
        // (preview) content.
        setPaymentPhase('pending');
        startPaidPoll();
      },
      onPending: () => {
        // Normal end-state for QRIS/VA: payment is awaiting settlement. Show
        // the pending panel + start the background poll so a late settlement
        // still auto-unlocks (and email recovery runs server-side regardless).
        setSnapError('');
        setPaymentPhase('pending');
        startPaidPoll();
      },
      onClose: () => {
        // User closed the Snap popup without finishing. If an async method
        // (QRIS/VA) was selected the order may still get paid shortly — keep
        // polling and surface a resume panel. For card-style flows this is
        // just a bail; the poll will expire harmlessly.
        setPaymentPhase('closed');
        startPaidPoll();
      },
      onError: (result) => {
        stopPaidPoll();
        setIsProcessing(false);
        setPaymentPhase('idle');
        setSnapError('Terjadi kesalahan pada gateway pembayaran. Coba lagi atau hubungi kami via WhatsApp.');
        console.error('[Snap] onError:', result);
      }
    });
  };

  // Real Midtrans Snap flow (Track A3). Create a Snap order on the backend,
  // open the Snap popup, then poll the ebook endpoint until the verified
  // webhook flips payment_status to 'paid' — then unlock the reader. The
  // webhook (not the client) is the source of truth; this polling just waits
  // for it. The Snap token is saved so handleContinuePayment can reopen the
  // same popup without creating a new order.
  const handlePayWithMidtrans = async () => {
    if (!accessToken) {
      setSnapError('Sesi tidak valid. Muat ulang halaman dan coba lagi.');
      return;
    }
    if (!window.snap || !snapReady) {
      setSnapError('Gateway pembayaran belum siap. Tunggu sebentar lalu coba lagi.');
      return;
    }

    setSnapError('');
    setCreatingOrder(true);
    let snapToken: string;
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: accessToken,
          voucherCode: voucherCode.trim() || undefined,
          email: parentEmail.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || `HTTP ${res.status}`);
      snapToken = data.snapToken;
    } catch (err) {
      setSnapError(err instanceof Error ? err.message : 'Gagal membuat transaksi pembayaran.');
      setCreatingOrder(false);
      return;
    }
    setCreatingOrder(false);
    setSavedSnapToken(snapToken);
    openSnap(snapToken);
  };

  // Reopen the Snap popup with the saved token — same transaction, same order,
  // no new charge. Midtrans allows reusing a valid, non-expired Snap token.
  // Falls back to creating a new order if the token was lost (page reload).
  const handleContinuePayment = () => {
    if (!window.snap || !snapReady) {
      setSnapError('Gateway pembayaran belum siap. Tunggu sebentar lalu coba lagi.');
      return;
    }
    if (savedSnapToken) {
      stopPaidPoll();
      setIsProcessing(false);
      setSnapError('');
      openSnap(savedSnapToken);
    } else {
      // Token lost (page reload) — create a new order.
      handlePayWithMidtrans();
    }
  };

  // P4/P8: start a fresh payment attempt. The previous child row stays in
  // midtrans_orders (its status mirrors via webhook) so paying it late still
  // unlocks — no orphan / no data loss.
  const handleRetryPayment = () => {
    stopPaidPoll();
    setIsProcessing(false);
    setPaymentPhase('idle');
    setSnapError('');
    handlePayWithMidtrans();
  };

  return (
    <div className="shell shell--content py-8 md:py-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-ink pb-5">
        <div>
          <span className="eyebrow">Checkout</span>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
            Selesaikan pembayaran
          </h1>
          <p className="mt-1 text-sm text-secondary">
            E-book personalisasi untuk {childProfile.name} ({childProfile.age} tahun).
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-outline-variant text-secondary transition-colors hover:border-ink hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isSuccess ? (
        <div className="py-20 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-primary text-primary">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="mt-5 font-display text-2xl font-extrabold text-ink">Pembayaran berhasil</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-secondary">
            Akses e-book lengkap untuk <span className="font-semibold text-ink">{childProfile.name}</span> telah aktif.
          </p>
          <p className="mt-3 font-mono text-xs text-secondary">Mengalihkan ke pembaca…</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
          {/* ============ FORM COLUMN ============ */}
          <div className="min-w-0 space-y-10">
            {/* Email */}
            <section>
              <span className="eyebrow">Email penerima</span>
              {isEmailValid(parentEmail) && !emailEditing ? (
                <div className="mt-3 flex items-center justify-between gap-3 border-b border-outline-variant py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-base text-ink">
                    <Mail className="h-4 w-4 shrink-0 text-secondary" />
                    <span className="truncate">{parentEmail.trim()}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmailEditing(true)}
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary underline"
                  >
                    <Pencil className="h-3 w-3" /> Ubah
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative mt-3">
                    <Mail className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
                    <input
                      id="parent-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={parentEmail}
                      onChange={e => onEmailChange(e.target.value)}
                      placeholder="nama@email.com"
                      className={`w-full border-0 border-b bg-transparent py-2.5 pl-6 text-base text-ink focus:outline-none focus:border-ink ${
                        parentEmail && !isEmailValid(parentEmail) ? 'border-rose-400' : 'border-outline-variant'
                      }`}
                    />
                  </div>
                  {parentEmail && !isEmailValid(parentEmail) && (
                    <p className="mt-1 text-xs text-rose-600">Format email belum benar.</p>
                  )}
                </>
              )}
              <p className="mt-2 text-xs text-secondary">
                E-book dikirim ke email ini setelah pembayaran.
              </p>
            </section>

            {/* Voucher */}
            <section>
              <span className="eyebrow">Kupon</span>
              <div className="mt-3 flex gap-2">
                <div className="relative flex-1">
                  <Percent className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={e => setVoucherCode(e.target.value)}
                    placeholder="Kode kupon (mis. ANAKHEBAT)"
                    className="w-full border-0 border-b border-outline-variant bg-transparent py-2.5 pl-6 text-sm uppercase text-ink focus:border-ink focus:outline-none"
                  />
                </div>
                <Button variant="ghost" size="md" onClick={handleApplyVoucher}>Gunakan</Button>
              </div>
              {voucherSuccess && <p className="mt-2 text-sm font-medium text-primary">{voucherSuccess}</p>}
              {voucherError && <p className="mt-2 text-sm font-medium text-rose-600">{voucherError}</p>}
            </section>

            {/* Status panels */}
            {paymentPhase === 'pending' && (
              <section className="border border-outline-variant p-4">
                <p className="text-sm text-secondary">
                  <span className="font-semibold text-ink">Pembayaran tertunda.</span> Halaman ini terbuka otomatis begitu pembayaran dikonfirmasi. Tautan akses juga dikirim ke email Anda.
                  {isPolling && <span className="ml-1 inline-flex items-center gap-1 text-xs"><Clock className="h-3 w-3 animate-spin" />memeriksa…</span>}
                </p>
                <div className="mt-3">
                  <Button variant="primary" size="md" full onClick={handleContinuePayment}>
                    <RefreshCw className="h-4 w-4" /><span>Lanjutkan pembayaran</span>
                  </Button>
                </div>
              </section>
            )}

            {paymentPhase === 'closed' && (
              <section className="border border-amber-300 bg-amber-50 p-4">
                <p className="flex items-start gap-2 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-semibold">Transaksi belum selesai.</span> Anda bisa melanjutkan pembayaran sekarang.
                    {isPolling && <span className="ml-1 inline-flex items-center gap-1 text-xs"><Clock className="h-3 w-3 animate-spin" />memeriksa…</span>}
                  </span>
                </p>
                <div className="mt-3">
                  <Button variant="primary" size="md" full onClick={handleContinuePayment}>
                    <RefreshCw className="h-4 w-4" /><span>Lanjutkan pembayaran</span>
                  </Button>
                </div>
              </section>
            )}

            {paymentPhase === 'expired' && (
              <section className="border border-rose-300 bg-rose-50 p-4">
                <p className="flex items-start gap-2 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span><span className="font-semibold">Waktu pembayaran habis.</span> Buat transaksi baru untuk melanjutkan.</span>
                </p>
                <div className="mt-3">
                  <Button variant="primary" size="md" full disabled={creatingOrder} onClick={handleRetryPayment}>
                    {creatingOrder ? <><Clock className="h-4 w-4 animate-spin" /><span>Menyiapkan…</span></> : <><RefreshCw className="h-4 w-4" /><span>Buat transaksi baru</span></>}
                  </Button>
                </div>
              </section>
            )}
          </div>

          {/* ============ ORDER SUMMARY ============ */}
          <aside>
            <div className="border border-outline-variant bg-paper p-6 lg:sticky lg:top-24">
              <span className="eyebrow">Ringkasan pesanan</span>
              <h3 className="mt-3 font-display text-lg font-bold text-ink">E-book Peta Bintang</h3>
              <p className="mt-1 text-sm text-secondary">
                {childProfile.name} · {childProfile.age} tahun · {archetype.title}
              </p>

              <dl className="mt-5 space-y-2 border-t border-outline-variant pt-4 text-sm">
                <div className="flex justify-between text-secondary">
                  <dt>Harga normal</dt>
                  <dd className="line-through">{formatRupiah(originalPrice)}</dd>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-primary">
                    <dt>Diskon kupon</dt>
                    <dd>−{formatRupiah(appliedDiscount)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-outline-variant pt-3">
                  <dt className="font-semibold text-ink">Total bayar</dt>
                  <dd className="font-display text-xl font-extrabold text-ink">{formatRupiah(finalPrice)}</dd>
                </div>
              </dl>

              <p className="mt-3 flex items-center justify-between font-mono text-xs text-secondary">
                <span>Batas waktu</span>
                <span className="font-semibold text-ink">{formatTimer(timeLeft)}</span>
              </p>

              <div className="mt-6 space-y-2">
                {paymentPhase === 'idle' && (
                  <Button
                    variant="primary"
                    size="lg"
                    full
                    disabled={creatingOrder || !snapReady || !isEmailValid(parentEmail)}
                    onClick={handlePayWithMidtrans}
                  >
                    {!isEmailValid(parentEmail) ? (
                      <><Mail className="h-4 w-4" /><span>Isi email dulu</span></>
                    ) : creatingOrder ? (
                      <><Clock className="h-4 w-4 animate-spin" /><span>Menyiapkan transaksi…</span></>
                    ) : (
                      <><ShieldCheck className="h-4 w-4" /><span>Bayar {formatRupiah(finalPrice)}</span></>
                    )}
                  </Button>
                )}

                {snapError && <p className="text-sm font-medium text-rose-600">{snapError}</p>}

                {!import.meta.env.PROD && (
                  <Button variant="ghost" size="md" full disabled={isProcessing || !isEmailValid(parentEmail)} onClick={handleSimulatePayment}>
                    {isProcessing ? <><Clock className="h-4 w-4 animate-spin" /><span>Memproses…</span></> : <span>[DEV] Simulasikan pembayaran sukses</span>}
                  </Button>
                )}

                <Button
                  variant="wa"
                  size="md"
                  full
                  href={waLink(
                    'Halo, saya mau tanya tentang pembayaran laporan Peta Bintang.' +
                      (accessToken ? `\nRef: ${accessToken}` : '')
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tanya via WhatsApp
                </Button>
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-xs text-secondary">
                <ShieldCheck className="h-3.5 w-3.5" /> Pembayaran aman &amp; akses selamanya
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
