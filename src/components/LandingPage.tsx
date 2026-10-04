import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { waLink } from '../lib/site';

// Mascot visuals — hero pose per archetype. Used as the landing's visual
// identity (hero = Comet Fox; grid = diversity of archetypes).
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

interface LandingPageProps {
  onStart: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const }
  })
};

const NAV = [
  { href: '#mengapa', label: 'Mengapa' },
  { href: '#cara-kerja', label: 'Cara Kerja' },
  { href: '#arketipe', label: 'Arketipe' },
  { href: '#tanya', label: 'Tanya' }
];

const VALUE_PROPS = [
  { n: '01', title: 'Dua kerangka ilmiah', desc: 'Big Five (OCEAN) untuk kepribadian dan Teori Kecerdasan Majemuk Gardner untuk kecerdasan — satu gambaran utuh, bukan tebakan.' },
  { n: '02', title: 'Personalisasi menyeluruh', desc: 'Setiap kalimat, strategi, dan rekomendasi disusun mengikuti profil anak Anda — bukan template yang diganti namanya saja.' },
  { n: '03', title: 'Laporan siap baca', desc: 'Profil arketipe, grafik OCEAN & 8 kecerdasan, panduan praktis, dan lembar kerja Misi Bintang 21 Hari.' }
];

const STEPS = [
  { n: '01', title: 'Isi data anak', desc: 'Nama, usia, dan catatan singkat sebagai dasar personalisasi laporan.' },
  { n: '02', title: 'Jawab 75 pertanyaan', desc: 'Observasi perilaku harian anak pada skala 1–5. Sekitar 12–15 menit.' },
  { n: '03', title: 'Terima laporan', desc: 'Profil dicocokkan ke salah satu arketipe & e-book disusun untuk anak Anda.' }
];

const ARCHETYPES = [
  { name: 'Si Burung Hantu Bijak', img: nebulaOwlHero },
  { name: 'Si Rubah Penjelajah Ceria', img: cometFoxHero },
  { name: 'Si Berang-berang Kosmik', img: cosmicBeaverHero },
  { name: 'Si Rusa Bulan', img: moonDeerHero },
  { name: 'Si Singa Supernova', img: supernovaLionHero },
  { name: 'Si Paus Angkasa', img: spaceWhaleHero },
  { name: 'Si Kucing Astronom', img: astronomerCatHero },
  { name: 'Si Lumba-lumba Galaksi', img: galaxyDolphinHero },
  { name: 'Si Merak Supernova', img: supernovaPeacockHero },
  { name: 'Si Panda Planet', img: planetaryPandaHero }
];

const FAQS = [
  { q: 'Apakah hasil kuis ini akurat dan ilmiah?', a: 'Kuis ini dibangun di atas dua kerangka riset yang mapan: Big Five (OCEAN, konvensi IPIP) untuk kepribadian, dan Teori Kecerdasan Majemuk (Howard Gardner) untuk kecerdasan. Ini alat bantu pemahaman pengasuhan, bukan diagnosis klinis.' },
  { q: 'Berapa lama pengerjaannya, dan apakah perlu daftar?', a: 'Sekitar 12–15 menit untuk 75 pertanyaan observasi. Tanpa daftar, tanpa email — hasil langsung tampil begitu selesai.' },
  { q: 'Untuk anak usia berapa kuis ini?', a: 'Dirancang untuk anak usia 3–12 tahun. Ayah/Bunda yang menjawab berdasarkan pengamatan perilaku anak sehari-hari.' },
  { q: 'Apa yang saya dapat setelah membayar?', a: 'E-book PDF yang dipersonalisasi: profil arketipe, grafik OCEAN & 8 Kecerdasan, panduan praktis, dan lembar kerja Misi Bintang 21 Hari. Bisa diunduh dan dicetak.' },
  { q: 'Apakah data anak saya aman?', a: 'Kami hanya menyimpan nama anak dan skor hasil, terikat pada token akses anonim. Tidak ada akun atau password, dan tautan e-book Anda tidak dibagikan ke pihak lain.' },
  { q: 'Bagaimana cara membayar?', a: 'Bisa via QRIS, e-wallet (GoPay/OVO/DANA/ShopeePay), atau Virtual Account bank. Akses e-book terbuka otomatis begitu pembayaran terkonfirmasi.' }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="bg-paper text-ink">
      {/* ===== TOP NAV (anchor) ===== */}
      <nav className="border-b border-outline-variant">
        <div className="shell shell--wide flex h-14 items-center justify-between">
          <span className="font-display text-base font-extrabold tracking-tight">Peta Bintang</span>
          <div className="hidden items-center gap-7 md:flex">
            {NAV.map(n => (
              <a key={n.href} href={n.href} className="text-sm text-secondary transition-colors hover:text-ink">
                {n.label}
              </a>
            ))}
          </div>
          <Button variant="primary" size="md" onClick={onStart}>Mulai</Button>
        </div>
      </nav>

      {/* ===== HERO — mascot-led, asymmetrical ===== */}
      <section className="relative overflow-hidden border-b border-outline-variant bg-primary text-paper">
        <div className="shell shell--wide grid items-center gap-10 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-7">
            <motion.p custom={0} initial="hidden" animate="visible" variants={fadeUp} className="eyebrow text-tertiary">
              Kuis Karakter &amp; Kecerdasan Anak
            </motion.p>
            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-5 font-display text-4xl font-extrabold leading-[1.04] tracking-tight md:text-6xl"
            >
              Setiap anak punya
              <br />
              peta bintangnya sendiri.
            </motion.h1>
            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-6 max-w-[var(--measure-prose)] text-lg leading-relaxed text-paper/75"
            >
              Kenali profil kepribadian dan kecerdasan buah hati melalui 75 pertanyaan
              observasi berbasis riset, lalu terima e-book panduan pengasuhan yang disusun
              khusus untuknya.
            </motion.p>
            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <button
                onClick={onStart}
                className="group inline-flex items-center gap-2 rounded-[10px] bg-tertiary px-6 py-3.5 font-semibold text-on-tertiary transition-colors hover:bg-starlight-deep"
              >
                Mulai kuis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <span className="text-sm text-paper/60">Gratis · Tanpa daftar</span>
            </motion.div>
          </div>

          {/* Hero mascot — Comet Fox */}
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="relative md:col-span-5"
          >
            <div className="pointer-events-none absolute -right-10 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-secondary/30 blur-3xl" aria-hidden />
            <img
              src={cometFoxHero}
              alt="Maskot Si Rubah Penjelajah Ceria"
              width={420}
              height={420}
              fetchPriority="high"
              decoding="async"
              className="relative mx-auto w-56 drop-shadow-2xl md:w-full md:max-w-[380px]"
            />
          </motion.div>
        </div>
      </section>

      {/* ===== STATS — full-bleed, big type ===== */}
      <section className="border-b border-outline-variant bg-primary-container text-on-primary-container">
        <div className="shell shell--wide grid grid-cols-1 divide-y divide-outline-variant py-10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            ['75', 'pertanyaan observasi'],
            ['8', 'jenis kecerdasan'],
            ['10', 'arketipe karakter']
          ].map(([n, label], i) => (
            <motion.div
              key={label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fadeUp}
              className="flex items-baseline gap-4 px-0 py-5 sm:px-8 sm:py-2"
            >
              <span className="font-display text-5xl font-extrabold leading-none tracking-tight md:text-6xl">{n}</span>
              <span className="text-sm text-on-primary-container/70">{label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== MENGAPA ===== */}
      <section id="mengapa" className="border-b border-outline-variant">
        <div className="shell shell--wide py-16 md:py-20">
          <p className="eyebrow">Mengapa Peta Bintang</p>
          <h2 className="mt-3 max-w-[var(--measure-prose)] font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Bukan sekadar kuis — sebuah laporan yang dibuat untuk anak Anda.
          </h2>

          <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {VALUE_PROPS.map((v, i) => (
              <motion.div
                key={v.n}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeUp}
                className="border-t-2 border-primary pt-5"
              >
                <span className="font-mono text-xs text-secondary">{v.n}</span>
                <h3 className="mt-4 font-display text-xl font-bold tracking-tight">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CARA KERJA — full-bleed Wisteria ===== */}
      <section id="cara-kerja" className="border-b border-outline-variant bg-secondary text-paper">
        <div className="shell shell--wide py-16 md:py-20">
          <p className="eyebrow text-paper/70">Cara Kerja</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Tiga langkah sederhana.
          </h2>

          <ol className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.n}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeUp}
                className="flex gap-5 border-t border-white/25 pt-5"
              >
                <span className="font-display text-4xl font-extrabold leading-none text-tertiary">{s.n}</span>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper/75">{s.desc}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== ARKETIPE — mascot grid ===== */}
      <section id="arketipe" className="border-b border-outline-variant">
        <div className="shell shell--wide py-16 md:py-20">
          <p className="eyebrow">Profil Arketipe</p>
          <h2 className="mt-3 max-w-[var(--measure-prose)] font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Sepuluh konstelasi karakter.
          </h2>
          <p className="mt-3 max-w-[var(--measure-prose)] text-secondary">
            Sistem akan mencocokkan profil anak Anda ke salah satunya.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {ARCHETYPES.map((a, i) => (
              <motion.div
                key={a.name}
                custom={i % 5}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={fadeUp}
                className="text-center"
              >
                <img
                  src={a.img}
                  alt={`Maskot ${a.name}`}
                  width={140}
                  height={140}
                  loading="lazy"
                  decoding="async"
                  className="mx-auto h-24 w-24 object-contain transition-transform duration-300 hover:scale-105 md:h-28 md:w-28"
                />
                <p className="mt-3 text-xs font-semibold leading-snug text-ink">{a.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="tanya" className="border-b border-outline-variant">
        <div className="shell shell--wide py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="eyebrow">Pertanyaan</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                Yang sering ditanyakan.
              </h2>
            </div>

            <dl className="md:col-span-8">
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} className="border-t border-outline-variant last:border-b">
                    <dt>
                      <button
                        onClick={() => setOpenFaq(open ? null : i)}
                        className="flex w-full items-center justify-between gap-4 py-4 text-left"
                        aria-expanded={open}
                      >
                        <span className="text-base font-semibold text-ink">{f.q}</span>
                        <span className="shrink-0 font-mono text-lg text-secondary" aria-hidden>
                          {open ? '−' : '+'}
                        </span>
                      </button>
                    </dt>
                    {open && (
                      <dd className="pb-5 pr-8 text-sm leading-relaxed text-secondary">{f.a}</dd>
                    )}
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-primary text-paper">
        <div className="shell shell--wide grid items-center gap-10 py-16 md:grid-cols-12 md:py-20">
          <div className="md:col-span-8">
            <h2 className="max-w-[var(--measure-prose)] font-display text-3xl font-extrabold tracking-tight md:text-5xl">
              Siap memulai?
            </h2>
            <p className="mt-4 max-w-[var(--measure-prose)] text-paper/70">
              Luangkan beberapa menit hari ini untuk memahami anak Anda lebih dalam.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={onStart}
                className="group inline-flex items-center gap-2 rounded-[10px] bg-tertiary px-6 py-3.5 font-semibold text-on-tertiary transition-colors hover:bg-starlight-deep"
              >
                Mulai kuis gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <span className="flex items-center gap-2 text-sm text-paper/60">
                <Check className="h-4 w-4" /> Tanpa daftar · Hasil langsung terlihat
              </span>
            </div>
          </div>
          <div className="md:col-span-4">
            <img
              src={cometFoxHero}
              alt=""
              width={200}
              height={200}
              loading="lazy"
              decoding="async"
              className="mx-auto w-32 md:w-full md:max-w-[200px]"
            />
          </div>
        </div>
      </section>

      <footer className="bg-ink text-paper/60">
        <div className="shell shell--wide flex flex-col gap-3 border-t border-white/10 py-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Peta Bintang Anakku</span>
          <a href={waLink('Halo, saya ingin bertanya tentang Peta Bintang Anakku.')} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-paper">
            Butuh bantuan? Hubungi kami
          </a>
        </div>
      </footer>
    </div>
  );
};
