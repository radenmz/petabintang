import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, ShieldCheck, Sparkles, BarChart3, Target, AlertTriangle, ChevronDown, CheckCircle2, HeartHandshake, Compass } from 'lucide-react';
import { Button } from './ui/Button';
import { waLink } from '../lib/site';
import { PRODUCT_BASE_PRICE, PROMO_PRICE, PROMO_VOUCHER_CODE } from '../lib/config';

import cometFoxHero from '../assets/mascots/pb-mascot-archetype-ark-comet-fox-v01.webp?url';
import nebulaOwlHero from '../assets/mascots/pb-mascot-archetype-ark-nebula-owl-v01.webp?url';
import cosmicBeaverHero from '../assets/mascots/pb-mascot-archetype-ark-cosmic-beaver-v01.webp?url';
import moonDeerHero from '../assets/mascots/pb-mascot-archetype-ark-moon-deer-v01.webp?url';
import supernovaLionHero from '../assets/mascots/pb-mascot-archetype-ark-supernova-lion-v01.webp?url';
import spaceWhaleHero from '../assets/mascots/pb-mascot-archetype-ark-space-whale-v01.webp?url';
import astronomerCatHero from '../assets/mascots/pb-mascot-archetype-ark-astronomer-cat-v01.webp?url';
import galaxyDolphinHero from '../assets/mascots/pb-mascot-archetype-ark-galaxy-dolphin-v01.webp?url';
import supernovaPeacockHero from '../assets/mascots/pb-mascot-archetype-ark-supernova-peacock-v01.webp?url';
import planetaryPandaHero from '../assets/mascots/pb-mascot-archetype-ark-planetary-panda-v01.webp?url';

interface LandingPageBProps {
  onStart: () => void;
  onSwitchVariant?: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as const }
  })
};

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

const TEASER_OPTIONS = [
  {
    id: 'fox',
    label: 'Suka mencoba hal baru, energik, & mudah penasaran dengan barang di sekitar',
    archetype: 'Si Rubah Penjelajah Ceria',
    mascot: cometFoxHero,
    previewTitle: 'Jejak "Si Penjelajah Antusias"',
    previewDesc: 'Anak Anda memiliki dorongan eksplorasi tinggi (High Openness & Extraversion). Laporan Peta Bintang akan menganalisis dinamika minatnya, serta memberi panduan menyalurkan energinya agar fokus tanpa mematikan rasa ingin tahunya.'
  },
  {
    id: 'owl',
    label: 'Tekun mengamati, suka membaca/bertanya "kenapa", & berpikir terstruktur',
    archetype: 'Si Burung Hantu Bijak',
    mascot: nebulaOwlHero,
    previewTitle: 'Jejak "Si Analitis & Pembelajar"',
    previewDesc: 'Anak Anda menonjol dalam kecerdasan Logis-Matematik & Konsistensi (Conscientiousness tinggi). E-book Peta Bintang menyusun Misi Bintang 21 Hari untuk mengasah kemampuan pemecahan masalah tanpa membuat anak merasa tertekan.'
  },
  {
    id: 'panda',
    label: 'Penyayang, tenang, suka membantu, & peka terhadap perasaan teman/keluarga',
    archetype: 'Si Panda Planet',
    mascot: planetaryPandaHero,
    previewTitle: 'Jejak "Si Pengayom & Empatis"',
    previewDesc: 'Kecerdasan Interpersonal & Keramahan (Agreeableness) anak Anda sangat dominan. Laporan akan membantu Anda menguatkan rasa percaya dirinya agar tidak mudah canggung atau mengalah secara berlebihan.'
  },
  {
    id: 'lion',
    label: 'Percaya diri, suka memimpin main, berani tampil, & penuh inisiatif',
    archetype: 'Si Singa Supernova',
    mascot: supernovaLionHero,
    previewTitle: 'Jejak "Si Pemimpin Karismatik"',
    previewDesc: 'Dominansi Extraversion & Kecerdasan Lingual/Interpersonal. Laporan Peta Bintang memberikan skrip komunikasi khusus agar kepemimpinannya berkembang menjadi empati positif, bukan sifat dominan berlebih.'
  }
];

const TRAPS = [
  {
    title: '1. Jebakan "Les Duluan Sebelum Tahu Profil"',
    desc: 'Mendaftarkan anak les mahal karena "katanya bagus", lalu berhenti di bulan kedua karena anak menangis menolak berangkat. Penolakan itu sering tanda gaya belajar tidak cocok, bukan anak malas.'
  },
  {
    title: '2. Jebakan "Label Seumur Hidup"',
    desc: 'Menyempitkan anak dengan 1 label kaku seperti "anak visual" atau "anak kinestetik". Padahal kepribadian dan kecerdasan anak berkembang dinamis dari kombinasi OCEAN & 8 Kecerdasan.'
  },
  {
    title: '3. Jebakan "Sekali Antusias = Pasti Bakat Utama"',
    desc: 'Anak heboh 2 minggu lalu membelikan semua perlengkapannya. Di minggu ketiga minatnya berganti. Peta Bintang mengukur sinergi minat agar Anda tahu mana potensi sejati.'
  },
  {
    title: '4. Jebakan Pujian Sifat ("Kamu Pintar")',
    desc: 'Memuji kecerdasan alami sering membuat anak takut gagal atau enggan mencoba hal sulit. Peta Bintang membekali Anda skrip pujian proses yang menguatkan Growth Mindset.'
  }
];

const MODULE_DELIVERABLES = [
  {
    icon: BarChart3,
    title: 'Grafik Diagnosis OCEAN & 8 Kecerdasan',
    desc: 'Visualisasi lengkap 5 dimensi kepribadian (Big Five OCEAN) & 8 jenis Kecerdasan Majemuk Gardner dalam bentuk Radar Chart dan Bar Chart presisi.'
  },
  {
    icon: Sparkles,
    title: 'Analisis Sinergi Khas Anak Anda',
    desc: 'Bagaimana kepribadian (misal: Introvert + High Openness) berinteraksi dengan kecerdasan utamanya, menghasilkan gaya belajar unik yang tidak bisa disamaratakan.'
  },
  {
    icon: Target,
    title: 'Misi Bintang 21 Hari (Lembar Kerja)',
    desc: 'Rencana aktivitas harian terstruktur 21 hari dengan materi rumahan hemat biaya untuk melatih fokus, minat, dan kemandirian anak.'
  },
  {
    icon: HeartHandshake,
    title: 'Skrip Komunikasi & Penanganan Emosi',
    desc: 'Kalimat konkret siap pakai saat anak tantrum, cepat menyerah, atau menolak belajar — disesuaikan dengan arketipe kepribadiannya.'
  }
];

const ARCHETYPES = [
  { name: 'Si Burung Hantu Bijak', tag: 'Analitis & Tekun', img: nebulaOwlHero },
  { name: 'Si Rubah Penjelajah Ceria', tag: 'Eksploratif & Energik', img: cometFoxHero },
  { name: 'Si Berang-berang Kosmik', tag: 'Kreatif & Pembangun', img: cosmicBeaverHero },
  { name: 'Si Rusa Bulan', tag: 'Reflektif & Empatis', img: moonDeerHero },
  { name: 'Si Singa Supernova', tag: 'Pemimpin & Berani', img: supernovaLionHero },
  { name: 'Si Paus Angkasa', tag: 'Imajinatif & Luas', img: spaceWhaleHero },
  { name: 'Si Kucing Astronom', tag: 'Fokus & Pengamat', img: astronomerCatHero },
  { name: 'Si Lumba-lumba Galaksi', tag: 'Sosial & Komunikatif', img: galaxyDolphinHero },
  { name: 'Si Merak Supernova', tag: 'Ekspresif & Artistik', img: supernovaPeacockHero },
  { name: 'Si Panda Planet', tag: 'Pengayom & Penyeimbang', img: planetaryPandaHero }
];

const FAQS = [
  {
    q: 'Apa perbedaan Peta Bintang dengan kuis atau tes psikotes biasa?',
    a: 'Peta Bintang tidak memberi label kaku atau angka IQ tunggal. Kami menggabungkan dua kerangka ilmiah teruji: Big Five (OCEAN IPIP) untuk dinamika kepribadian dan Teori Kecerdasan Majemuk Howard Gardner (8 MI). Hasilnya adalah e-book personal ~100+ halaman yang bukan hanya mendiagnosis, tetapi memberikan skrip komunikasi dan panduan aksi 21 hari.'
  },
  {
    q: 'Berapa lama waktu pengisian dan apakah anak harus ikut menjawab?',
    a: 'Kuis terdiri dari 75 pertanyaan pengamatan yang diisi oleh Orang Tua (Ayah/Bunda) berdasarkan perilaku harian anak. Pengisian membutuhkan waktu sekitar 12–15 menit. Anak tidak perlu berada di depan layar.'
  },
  {
    q: 'Apa yang saya dapatkan setelah menyelesaikan kuis?',
    a: `Anda langsung mendapatkan pratinjau grafik diagnosis (Radar & Bar Chart) serta pratinjau Arketipe. Setelah pembayaran promo ${formatRupiah(PROMO_PRICE)} (dengan kupon ${PROMO_VOUCHER_CODE}), Anda membuka akses penuh e-book terpersonalisasi (~100+ halaman PDF) yang bisa dibaca di layar HP/Tablet atau diunduh & dicetak.`
  },
  {
    q: 'Apakah e-book ini benar-benar terpersonalisasi untuk nama dan profil anak saya?',
    a: 'Ya! Setiap modul e-book disusun secara dinamis oleh algoritma server kami berdasarkan skor pasti 5 dimensi OCEAN dan 8 kecerdasan anak Anda. Tidak ada 2 e-book yang sama persis.'
  },
  {
    q: 'Bagaimana garansi coba Misi Bintang 21 Hari bekerja?',
    a: 'Jalankan rencana aktivitas dari e-book selama 14–21 hari. Jika dalam kurun waktu tersebut tidak ada panduan atau aktivitas yang cocok untuk anak Anda, cukup hubungi tim support kami. Kami akan mengembalikan uang Anda 100% tanpa pertanyaan rumit.'
  },
  {
    q: 'Bagaimana cara melakukan pembayaran?',
    a: 'Pembayaran dapat dilakukan dengan mudah via QRIS (BCA, Mandiri, GoPay, OVO, DANA, ShopeePay) maupun Virtual Account Bank. Akses e-book terbuka otomatis dalam hitungan detik setelah bayar.'
  }
];

export const LandingPageB: React.FC<LandingPageBProps> = ({ onStart, onSwitchVariant }) => {
  const [selectedTeaser, setSelectedTeaser] = useState<string>('fox');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeTeaser = TEASER_OPTIONS.find(t => t.id === selectedTeaser) || TEASER_OPTIONS[0];

  return (
    <div className="bg-paper text-ink font-sans">
      {/* Top Banner / Announcement */}
      <div className="bg-primary text-paper px-4 py-2 text-xs md:text-sm font-medium text-center flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-tertiary shrink-0" />
        <span>Peta Bintang — Diagnosis Kepribadian OCEAN &amp; 8 Kecerdasan Majemuk Anak (3–12 Tahun)</span>
        {onSwitchVariant && (
          <button
            onClick={onSwitchVariant}
            className="ml-3 underline hover:text-tertiary transition-colors text-xs shrink-0 font-bold"
          >
            Lihat Tampilan A
          </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="border-b border-outline-variant sticky top-0 bg-paper/95 backdrop-blur-md z-40">
        <div className="shell shell--wide flex h-14 items-center justify-between">
          <span className="font-display text-base font-extrabold tracking-tight">Peta Bintang</span>

          <div className="hidden md:flex items-center gap-7 text-sm text-secondary font-medium">
            <a href="#teaser" className="hover:text-ink transition-colors">Cek 30 Detik</a>
            <a href="#jebakan" className="hover:text-ink transition-colors">4 Jebakan Ortu</a>
            <a href="#metode" className="hover:text-ink transition-colors">Metode Ilmiah</a>
            <a href="#isi-ebook" className="hover:text-ink transition-colors">Isi Laporan</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
          </div>

          <Button variant="primary" size="md" onClick={onStart}>
            Mulai
          </Button>
        </div>
      </nav>

      {/* HERO SECTION — Primary Jacarta / Paper theme matching LP A */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-[#3d4488] to-secondary text-paper border-b border-outline-variant py-14 md:py-20">
        <div className="shell shell--wide">
          <div className="max-w-4xl mx-auto text-center">
            <motion.p custom={0} initial="hidden" animate="visible" variants={fadeUp} className="eyebrow text-tertiary">
              <Compass className="w-4 h-4 inline mr-1 text-tertiary" />
              Untuk Ayah &amp; Bunda Anak Usia 3–12 Tahun
            </motion.p>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight"
            >
              Kenali Minat, Bakat, &amp; Kepribadian Asli Anakmu dalam 15 Menit
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-5 text-base md:text-xl text-paper/80 max-w-3xl mx-auto leading-relaxed"
            >
              Tanpa tes fisik mahal, tanpa memberi label kaku, dan tanpa menebak-nebak.
              Jawab 75 pertanyaan observasi harian untuk menyusun <strong className="text-paper font-semibold">Laporan E-Book Personal ~100+ Halaman PDF</strong> lengkap dengan Grafik Radar OCEAN, 8 Kecerdasan Majemuk, &amp; Misi Bintang 21 Hari.
            </motion.p>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={onStart}
                className="w-full sm:w-auto group inline-flex items-center justify-center gap-3 rounded-[10px] bg-gradient-to-br from-starlight to-starlight-deep px-8 py-4 text-base font-bold text-on-tertiary shadow-lg hover:brightness-105 transition-all hover:scale-[1.02]"
              >
                <span>Mulai Kuis Peta Bintang Sekarang</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>

            <motion.div
              custom={4}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs md:text-sm text-paper/70"
            >
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-tertiary font-bold" /> Gratis Cek Pratinjau Grafik
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-tertiary font-bold" /> Tanpa Perlu Daftar Akun
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-tertiary font-bold" /> Hasil Langsung Terbit
              </span>
            </motion.div>
          </div>

          {/* INTERACTIVE 30-SECOND TEASER */}
          <div id="teaser" className="mt-14 max-w-4xl mx-auto rounded-2xl border border-outline-variant bg-paper p-6 md:p-8 text-ink shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 text-primary font-display font-bold text-xs tracking-wider uppercase">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span>Simulasi Cepat (Cek 30 Detik)</span>
            </div>
            <h3 className="mt-2 text-xl md:text-2xl font-bold font-display text-ink">
              Saat punya waktu bebas di rumah, anak Anda paling sering memilih...
            </h3>
            <p className="mt-1 text-sm text-secondary">
              Pilih salah satu kebiasaan di bawah untuk melihat cuplikan analisis jejaknya:
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {TEASER_OPTIONS.map(opt => {
                const isActive = opt.id === selectedTeaser;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedTeaser(opt.id)}
                    className={`text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                      isActive
                        ? 'border-primary bg-primary-container/40 shadow-sm'
                        : 'border-outline-variant hover:border-primary/40 bg-paper'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isActive ? 'border-primary bg-primary text-paper' : 'border-outline-variant'
                    }`}>
                      {isActive && <div className="w-2 h-2 rounded-full bg-tertiary" />}
                    </div>
                    <span className="text-sm font-medium text-ink leading-snug">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Teaser Result Box */}
            <motion.div
              key={activeTeaser.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 p-5 rounded-xl bg-primary-container text-on-primary-container border border-outline-variant/50 flex flex-col md:flex-row items-center gap-6"
            >
              <img
                src={activeTeaser.mascot}
                alt={activeTeaser.archetype}
                className="w-24 h-24 object-contain shrink-0 drop-shadow-md"
              />
              <div>
                <div className="inline-block px-2.5 py-0.5 rounded bg-secondary text-paper font-bold text-xs mb-1">
                  {activeTeaser.previewTitle} — Arketipe: {activeTeaser.archetype}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-on-primary-container/90">
                  {activeTeaser.previewDesc}
                </p>
                <p className="mt-2 text-xs font-semibold text-primary italic">
                  *Ini baru cuplikan dari 1 indikator. Kuis lengkap 75 pertanyaan menganalisis 5 dimensi OCEAN &amp; 8 kecerdasan secara terpadu.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* COST OF INACTION & 4 TRAPS SECTION */}
      <section id="jebakan" className="py-16 md:py-24 border-b border-outline-variant bg-paper">
        <div className="shell shell--wide">
          <div className="max-w-3xl mx-auto text-center">
            <p className="eyebrow text-secondary">Mengapa Banyak Orang Tua Kecewa?</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold tracking-tight">
              4 Jebakan Utama yang Membuat Orang Tua Salah Membaca Karakter &amp; Bakat Anak
            </h2>
            <p className="mt-3 text-secondary text-base md:text-lg">
              Ini bukan salah Orang Tua — kebanyakan dari kita memang tidak pernah dibekali alat bantu pengamatan yang tepat.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {TRAPS.map((t, idx) => (
              <div key={idx} className="p-6 rounded-2xl border border-outline-variant bg-surface hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center font-bold text-lg mb-4">
                  <AlertTriangle className="w-5 h-5 text-error" />
                </div>
                <h3 className="font-display text-lg font-bold text-ink leading-snug">{t.title}</h3>
                <p className="mt-3 text-sm text-secondary leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>

          {/* Cost Comparison Card */}
          <div className="mt-12 max-w-4xl mx-auto p-6 md:p-8 rounded-2xl bg-tertiary-container/40 border border-tertiary/40 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold font-display text-ink">Berapa Harga dari Salah Menebak Bakat Anak?</h3>
              <p className="mt-2 text-sm text-secondary leading-relaxed">
                Contoh: Les Rp 300.000/bulan yang berhenti di bulan ke-3 karena anak stres &amp; tidak cocok = <strong className="text-error font-bold">Rp 900.000+ hilang sia-sia</strong> (belum termasuk biaya seragam, alat, &amp; rasa bersalah).
              </p>
            </div>
            <div className="shrink-0 text-center md:text-right border-t md:border-t-0 md:border-l border-tertiary/40 pt-4 md:pt-0 md:pl-6">
              <span className="text-xs uppercase text-secondary font-bold tracking-wider">Bandingkan Dengan Promo</span>
              <div className="text-3xl font-extrabold font-display text-primary">{formatRupiah(PROMO_PRICE)}</div>
              <span className="text-xs text-secondary">Kupon {PROMO_VOUCHER_CODE} (Normal {formatRupiah(PRODUCT_BASE_PRICE)})</span>
            </div>
          </div>
        </div>
      </section>

      {/* DUAL RESEARCH FRAMEWORK SECTION */}
      <section id="metode" className="py-16 md:py-24 bg-secondary text-paper border-b border-outline-variant">
        <div className="shell shell--wide">
          <div className="grid gap-12 md:grid-cols-12 items-center">
            <div className="md:col-span-6">
              <p className="eyebrow text-paper/70">Landasan Pengamatan Terstruktur</p>
              <h2 className="mt-3 font-display text-3xl md:text-5xl font-extrabold leading-tight">
                Dua Kerangka Ilmiah Dunia dalam Satu Laporan Utuh
              </h2>
              <p className="mt-4 text-paper/80 text-base md:text-lg leading-relaxed">
                Peta Bintang menggabungkan dua kerangka psikologi terkemuka untuk menyusun peta profil anak Anda:
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-paper">Big Five Personality Traits (OCEAN)</h3>
                    <p className="mt-1 text-sm text-paper/75 leading-relaxed">
                      Mengukur 5 dimensi utama: Openness (Rasa Ingin Tahu), Conscientiousness (Keteraturan), Extraversion (Energi Sosial), Agreeableness (Empati), dan Neuroticism (Sensitivitas Emosi) menggunakan konvensi IPIP internasional.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-paper">Teori Kecerdasan Majemuk (Howard Gardner)</h3>
                    <p className="mt-1 text-sm text-paper/75 leading-relaxed">
                      Mengukur 8 spektrum kecerdasan: Lingual, Logis-Matematik, Spasial, Kinestetik, Musik, Interpersonal, Intrapersonal, dan Naturalis.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 rounded-2xl bg-paper/10 backdrop-blur-md p-6 md:p-8 border border-white/20">
              <h3 className="font-display text-2xl font-bold text-paper mb-4">Prinsip Pengasuhan Peta Bintang</h3>
              <ul className="space-y-4 text-sm text-paper/90">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
                  <span><strong>Non-Diagnosis Klinis:</strong> Alat pengamatan mandiri pengasuhan orang tua, bukan alat diagnosis atau psikotes klinis kaku.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
                  <span><strong>Growth Mindset:</strong> Fokus pada penguatan proses dan respon pendampingan, bukan melabeli anak seumur hidup.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
                  <span><strong>Aktivitas Terjangkau:</strong> Panduan Misi 21 Hari yang dirancang dapat dimulai dari rumah dengan biaya minimal.</span>
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-paper/70">
                <span>75 Pertanyaan Observasi Perilaku Harian</span>
                <span className="font-semibold text-tertiary">100% Bebas Label Kaku</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10 COSMIC ARCHETYPES SHOWCASE */}
      <section className="py-16 md:py-24 border-b border-outline-variant bg-paper">
        <div className="shell shell--wide">
          <div className="max-w-3xl mx-auto text-center">
            <p className="eyebrow text-secondary">Konstelasi Karakter</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold tracking-tight">
              10 Arketipe Karakter Peta Bintang
            </h2>
            <p className="mt-3 text-secondary text-base">
              Sistem akan mencocokkan profil anak Anda ke salah satu konstelasi karakter unik berikut:
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {ARCHETYPES.map((a, i) => (
              <div key={i} className="p-4 rounded-2xl border border-outline-variant bg-surface text-center hover:border-primary/50 transition-all hover:-translate-y-1">
                <img
                  src={a.img}
                  alt={a.name}
                  className="w-20 h-20 md:w-24 md:h-24 mx-auto object-contain drop-shadow-sm"
                  loading="lazy"
                />
                <h4 className="mt-3 text-xs md:text-sm font-bold font-display text-ink leading-snug">{a.name}</h4>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">
                  {a.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DELIVERABLES & INSIDE EBOOK SECTION */}
      <section id="isi-ebook" className="py-16 md:py-24 bg-surface border-b border-outline-variant">
        <div className="shell shell--wide">
          <div className="max-w-3xl mx-auto text-center">
            <p className="eyebrow text-secondary">Apa Yang Anda Dapatkan</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold tracking-tight">
              Isi Lengkap Laporan E-Book ~100+ Halaman Peta Bintang
            </h2>
            <p className="mt-3 text-secondary text-base md:text-lg">
              Disusun otomatis oleh server berdasarkan jawaban 75 pertanyaan observasi Anda.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {MODULE_DELIVERABLES.map((m, idx) => {
              const Icon = m.icon;
              return (
                <div key={idx} className="p-6 md:p-8 rounded-2xl bg-paper border border-outline-variant shadow-sm flex gap-5 items-start">
                  <div className="w-12 h-12 rounded-xl bg-primary text-tertiary flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-ink">{m.title}</h3>
                    <p className="mt-2 text-sm text-secondary leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sample Case Studies (Reyhan & Nadia) */}
          <div className="mt-16 rounded-2xl border border-outline-variant bg-paper p-6 md:p-8">
            <h3 className="font-display text-2xl font-bold text-ink text-center mb-6">
              Contoh Hasil Personalisasi Profil Anak
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-5 rounded-xl bg-surface border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink font-display text-lg">Reyhan, 7 Tahun</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-tertiary-container text-on-tertiary-container font-semibold">Si Rubah Penjelajah</span>
                </div>
                <p className="mt-3 text-xs text-secondary leading-relaxed">
                  <strong>Hasil OCEAN:</strong> High Openness, High Extraversion. <strong>Hasil MI:</strong> Spasial &amp; Kinestetik.<br />
                  <strong>Rencana 21 Hari:</strong> Tantangan eksperimen sains rumahan, skrip pengalihan saat bosan, &amp; teknik pujian keberanian mencoba.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-surface border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink font-display text-lg">Aisyah, 10 Tahun</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-semibold">Si Burung Hantu Bijak</span>
                </div>
                <p className="mt-3 text-xs text-secondary leading-relaxed">
                  <strong>Hasil OCEAN:</strong> High Conscientiousness, Introvert. <strong>Hasil MI:</strong> Logis-Matematik &amp; Lingual.<br />
                  <strong>Rencana 21 Hari:</strong> Jurnal Peneliti Cilik, teknik membangun rasa percaya diri saat bicara di depan umum, &amp; jembatan kegiatan sosial.
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-secondary">
              *Dua anak, dua laporan utuh terpersonalisasi. Tidak ada rekomendasi yang disamaratakan.
            </p>
          </div>
        </div>
      </section>

      {/* SUITABILITY CHECK */}
      <section className="py-16 border-b border-outline-variant bg-paper">
        <div className="shell shell--wide">
          <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-2">
            <div className="p-6 md:p-8 rounded-2xl bg-secondary-container/40 border border-secondary/30">
              <h3 className="font-display text-xl font-bold text-on-secondary-container flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-secondary" />
                Cocok Untuk Anda Jika:
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-on-secondary-container/90">
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>Bingung memilih kegiatan atau minat yang paling cocok untuk anak.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>Ingin memahami penyebab anak cepat bosan atau gampang menyerah.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>Menginginkan panduan pengasuhan berbasis observasi terstruktur.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 md:p-8 rounded-2xl bg-error/5 border border-error/30">
              <h3 className="font-display text-xl font-bold text-error flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-error" />
                TIDAK Cocok Jika:
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-error/90">
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>Anak berusia di bawah 3 tahun atau sudah berusia di atas 12 tahun.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>Mencari skor kecerdasan tunggal (IQ test) atau diagnosis klinis medis.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>Memerlukan konsultasi tatap muka dengan psikolog klinis.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* OFFER STACK & GUARANTEE SECTION */}
      <section className="py-16 md:py-24 bg-primary-container text-on-primary-container border-b border-outline-variant">
        <div className="shell shell--wide">
          <div className="max-w-3xl mx-auto rounded-3xl bg-paper p-8 md:p-12 text-ink shadow-2xl border border-outline-variant text-center">
            <span className="px-3.5 py-1 rounded-full bg-tertiary text-on-tertiary font-bold text-xs uppercase tracking-wider">
              Penawaran E-Book Lengkap
            </span>
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-extrabold">
              Semua Yang Anda Dapatkan Hari Ini
            </h2>

            <div className="mt-8 space-y-4 text-left max-w-xl mx-auto">
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="font-semibold text-sm">Laporan E-Book Personal ~100+ Halaman PDF</span>
                <span className="text-xs text-secondary">Est. Nilai Rp 249.000</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="font-semibold text-sm">Diagram Radar OCEAN &amp; Bar Chart 8 Kecerdasan</span>
                <span className="text-xs text-secondary">Est. Nilai Rp 99.000</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="font-semibold text-sm">Lembar Kerja &amp; Panduan Misi Bintang 21 Hari</span>
                <span className="text-xs text-secondary">Est. Nilai Rp 79.000</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="font-semibold text-sm">Skrip Komunikasi &amp; Kalimat Penguat Growth Mindset</span>
                <span className="text-xs text-secondary">Est. Nilai Rp 79.000</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-primary/20 flex flex-col items-center">
              <span className="text-sm text-secondary line-through">Harga Normal {formatRupiah(PRODUCT_BASE_PRICE)}</span>
              <div className="text-4xl md:text-5xl font-extrabold font-display text-primary mt-1">
                {formatRupiah(PROMO_PRICE)}
              </div>
              <span className="text-xs text-secondary mt-1">Dengan kupon promo {PROMO_VOUCHER_CODE} · Akses seumur hidup</span>

              <button
                onClick={onStart}
                className="mt-6 w-full max-w-md group inline-flex items-center justify-center gap-3 rounded-[10px] bg-gradient-to-br from-primary to-secondary px-8 py-4 text-base font-bold text-paper shadow-xl hover:brightness-110 transition-all hover:scale-[1.02]"
              >
                <span>Mulai Kuis Peta Bintang — {formatRupiah(PROMO_PRICE)}</span>
                <ArrowRight className="h-5 w-5 text-tertiary transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Guarantee Box */}
            <div className="mt-8 p-5 rounded-xl bg-secondary-container/50 border border-secondary/30 flex items-center gap-4 text-left">
              <ShieldCheck className="w-10 h-10 text-secondary shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-on-secondary-container font-display">Garansi Coba Misi Bintang 21 Hari</h4>
                <p className="mt-0.5 text-xs text-on-secondary-container/80 leading-relaxed">
                  Jalankan Misi Bintang 21 Hari dari laporan. Jika panduan kami tidak memberikan manfaat untuk pendampingan anak Anda, hubungi tim kami untuk pengembalian dana 100%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section id="faq" className="py-16 md:py-24 border-b border-outline-variant bg-paper">
        <div className="shell shell--wide">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="eyebrow text-secondary font-bold">Tanya Jawab</p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold">Pertanyaan Sering Diajukan</h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="rounded-xl border border-outline-variant bg-surface overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-bold font-display text-base md:text-lg text-ink flex justify-between items-center gap-4 hover:bg-primary/5 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-secondary shrink-0 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 text-sm text-secondary leading-relaxed border-t border-outline-variant/40 bg-paper">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-ink text-paper/70 py-12">
        <div className="shell shell--wide">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-8 border-b border-white/10 text-xs">
            <div>
              <span className="font-display font-extrabold text-base text-paper">Peta Bintang</span>
              <p className="mt-1 max-w-md text-paper/60">
                Alat bantu pengamatan kepribadian &amp; kecerdasan anak berbasis Big Five OCEAN &amp; Multiple Intelligences. Bukan diagnosis klinis medis.
              </p>
            </div>
            <div className="flex items-center gap-4 text-paper/80">
              <a href={waLink('Halo, saya ingin bertanya tentang Peta Bintang.')} target="_blank" rel="noopener noreferrer" className="hover:text-tertiary transition-colors">
                Bantuan WhatsApp
              </a>
              <span>·</span>
              <button onClick={onStart} className="hover:text-tertiary transition-colors">
                Mulai Kuis
              </button>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-paper/40">
            <span>© {new Date().getFullYear()} Peta Bintang. Hak cipta dilindungi undang-undang.</span>
            <span>Konvensi IPIP OCEAN &amp; Multiple Intelligences Gardner</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
