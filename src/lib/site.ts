// Konfigurasi kontak situs.
export const WA_NUMBER = '6281334380650';

/** Bangun link wa.me dengan pesan yang sudah ter-encode. */
export const waLink = (message: string): string =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
