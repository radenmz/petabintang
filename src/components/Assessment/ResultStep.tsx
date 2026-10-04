import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  ChildProfile,
  ArchetypeDefinition,
  CompleteEbook,
  GeneratedEbookModule,
  MIScores
} from '../../types';
import { OceanRadarChart } from '../Charts/OceanRadarChart';
import { MiBarChart } from '../Charts/MiBarChart';
import { Button } from '../ui/Button';
import { waLink } from '../../lib/site';
import { PRODUCT_BASE_PRICE, PROMO_DISCOUNT_AMOUNT, PROMO_PRICE } from '../../lib/config';
import { Lock, Check } from 'lucide-react';
import astronomerCatHero from '../../assets/mascots/pb-mascot-archetype-ark-astronomer-cat-v01.webp?url';
import cometFoxHero from '../../assets/mascots/pb-mascot-archetype-ark-comet-fox-v01.webp?url';
import cosmicBeaverHero from '../../assets/mascots/pb-mascot-archetype-ark-cosmic-beaver-v01.webp?url';
import galaxyDolphinHero from '../../assets/mascots/pb-mascot-archetype-ark-galaxy-dolphin-v01.webp?url';
import moonDeerHero from '../../assets/mascots/pb-mascot-archetype-ark-moon-deer-v01.webp?url';
import nebulaOwlHero from '../../assets/mascots/pb-mascot-archetype-ark-nebula-owl-v01.webp?url';
import planetaryPandaHero from '../../assets/mascots/pb-mascot-archetype-ark-planetary-panda-v01.webp?url';
import spaceWhaleHero from '../../assets/mascots/pb-mascot-archetype-ark-space-whale-v01.webp?url';
import supernovaLionHero from '../../assets/mascots/pb-mascot-archetype-ark-supernova-lion-v01.webp?url';
import supernovaPeacockHero from '../../assets/mascots/pb-mascot-archetype-ark-supernova-peacock-v01.webp?url';

marked.setOptions({ gfm: true, breaks: false });

interface ResultStepProps {
  profile: ChildProfile;
  archetype: ArchetypeDefinition;
  ebook: CompleteEbook;
  onProceedToPayment: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as const }
  })
};

const MASCOT_HERO_BY_ARCHETYPE: Record<string, string> = {
  ARK_ASTRONOMER_CAT: astronomerCatHero,
  ARK_COMET_FOX: cometFoxHero,
  ARK_COSMIC_BEAVER: cosmicBeaverHero,
  ARK_GALAXY_DOLPHIN: galaxyDolphinHero,
  ARK_MOON_DEER: moonDeerHero,
  ARK_NEBULA_OWL: nebulaOwlHero,
  ARK_PLANETARY_PANDA: planetaryPandaHero,
  ARK_SPACE_WHALE: spaceWhaleHero,
  ARK_SUPERNOVA_LION: supernovaLionHero,
  ARK_SUPERNOVA_PEACOCK: supernovaPeacockHero,
};

function extractExcerpt(markdown: string, maxChars: number = 260): string {
  const lines = markdown.split('\n');
  let startIdx = 0;
  if (lines[0]?.startsWith('# ')) startIdx = 1;
  while (startIdx < lines.length && lines[startIdx].trim() === '') startIdx++;

  const content = lines.slice(startIdx).join('\n');
  const plain = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n');

  if (plain.length <= maxChars) return plain.trim();
  const truncated = plain.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.slice(0, lastSpace > 100 ? lastSpace : maxChars).trim() + '…';
}

function findModule(ebook: CompleteEbook, moduleId: number): GeneratedEbookModule | undefined {
  return ebook.modules.find(m => m.moduleId === moduleId);
}
function findModuleByCode(ebook: CompleteEbook, moduleCode: string): GeneratedEbookModule | undefined {
  return ebook.modules.find(m => m.moduleCode === moduleCode);
}

function useCountdown(seconds: number): string {
  const [timeLeft, setTimeLeft] = useState(seconds);
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const MI_LABELS: Record<keyof MIScores, string> = {
  linguistic: 'Linguistik (Bahasa)',
  logical: 'Logika-Matematika',
  spatial: 'Spasial-Visual',
  kinesthetic: 'Kinestetik-Jasmani',
  musical: 'Musikal',
  interpersonal: 'Interpersonal (Sosial)',
  intrapersonal: 'Intrapersonal (Diri)',
  naturalist: 'Naturalis (Alam)'
};

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

const ORIGINAL_PRICE = PRODUCT_BASE_PRICE;
const DISCOUNT_AMOUNT = PROMO_DISCOUNT_AMOUNT; // kupon ANAKHEBAT
const FINAL_PRICE = PROMO_PRICE;

export const ResultStep: React.FC<ResultStepProps> = ({
  profile,
  archetype,
  ebook,
  onProceedToPayment
}) => {
  const countdown = useCountdown(900);

  const mascotHero = MASCOT_HERO_BY_ARCHETYPE[archetype.id] ?? null;

  const topMI = useMemo(() => {
    const entries = Object.entries(profile.miScores) as [keyof MIScores, number][];
    entries.sort((a, b) => b[1] - a[1]);
    const topKey = entries[0][0];
    return { key: topKey, name: MI_LABELS[topKey], score: entries[0][1] };
  }, [profile.miScores]);

  const fullPengantarHtml = useMemo(() => {
    const mod = findModule(ebook, 0);
    if (!mod) return '';
    const content = mod.markdownContent.replace(/^#\s+MODUL[^\n]*\n*/i, '');
    return DOMPurify.sanitize(marked.parse(content) as string, {
      USE_PROFILES: { html: true, svg: true, svgFilters: true }
    });
  }, [ebook]);

  const excerptSinergi = useMemo(
    () => extractExcerpt(findModuleByCode(ebook, 'Modul 3.3')?.markdownContent || '', 260),
    [ebook]
  );
  const excerptMisi = useMemo(
    () => extractExcerpt(findModuleByCode(ebook, 'Modul 5.1')?.markdownContent || '', 260),
    [ebook]
  );

  const chapterGroups = useMemo(() => {
    const groups: Record<number, { title: string; modules: GeneratedEbookModule[] }> = {};
    for (const mod of ebook.modules) {
      if (!groups[mod.chapter]) groups[mod.chapter] = { title: mod.chapterTitle, modules: [] };
      groups[mod.chapter].modules.push(mod);
    }
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  }, [ebook]);

  const pricingFeatures = [
    'E-book PDF lengkap siap cetak',
    `Nama ${profile.name} di seluruh laporan`,
    '5 bab & 15 modul',
    'Grafik OCEAN & 8 kecerdasan',
    'Lembar kerja Misi Bintang 21 Hari',
    'Unduh & cetak kapan saja'
  ];

  return (
    <div className="shell shell--content py-8 md:py-12">
      <style>{`
        .modul-preview-prose h1 { color: var(--color-ink); font-weight: 800; font-size: 1.125rem; margin: 0.5rem 0 0.75rem; }
        .modul-preview-prose h2 { color: var(--color-ink); font-weight: 700; font-size: 1rem; margin: 1rem 0 0.5rem; }
        .modul-preview-prose h3 { color: var(--color-ink); font-weight: 600; font-size: 0.875rem; margin: 0.75rem 0 0.375rem; }
        .modul-preview-prose h4 { color: var(--color-ink); font-weight: 600; font-size: 0.8125rem; margin: 0.625rem 0 0.3rem; }
        .modul-preview-prose p { color: var(--color-ink); font-size: 0.875rem; margin-bottom: 0.75rem; line-height: 1.7; }
        .modul-preview-prose ul { color: var(--color-ink); padding-left: 1.25rem; margin-bottom: 0.75rem; list-style-type: disc; }
        .modul-preview-prose ol { color: var(--color-ink); padding-left: 1.25rem; margin-bottom: 0.75rem; list-style-type: decimal; }
        .modul-preview-prose li { margin-bottom: 0.25rem; font-size: 0.875rem; }
        .modul-preview-prose strong { color: var(--color-ink); font-weight: 700; }
        .modul-preview-prose em { color: var(--color-secondary); }
        .modul-preview-prose blockquote { border-left: 2px solid var(--color-primary); padding-left: 0.75rem; font-style: italic; color: var(--color-secondary); margin: 0.5rem 0; }
        .modul-preview-prose table { width: 100%; font-size: 0.75rem; border-collapse: collapse; margin: 0.5rem 0; }
        .modul-preview-prose th { background: var(--color-surface-container); color: var(--color-ink); padding: 0.5rem; border: 1px solid var(--color-outline-variant); }
        .modul-preview-prose td { padding: 0.5rem; border: 1px solid var(--color-outline-variant); color: var(--color-ink); }
        .modul-preview-prose code { background: var(--color-ink); color: var(--color-paper); padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; }
        .modul-preview-prose hr { border-color: var(--color-outline-variant); margin: 1rem 0; }
      `}</style>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        {/* ================= MAIN COLUMN ================= */}
        <div className="min-w-0 space-y-14">
          {/* HERO — report opening */}
          <section className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
            <div>
              <span className="eyebrow">Hasil kuis untuk {profile.name}</span>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight text-ink md:text-5xl">
                {archetype.title}
              </h1>
              <p className="mt-3 font-display text-lg italic text-secondary">“{archetype.slogan}”</p>
              <p className="mt-5 max-w-[var(--measure-prose)] leading-relaxed text-secondary">
                {archetype.description}
              </p>
              <p className="mt-4 text-sm text-secondary">
                {profile.name}, {profile.age} tahun · {archetype.badge}
              </p>
            </div>
            {mascotHero && (
              <img
                src={mascotHero}
                alt={`Ilustrasi ${archetype.title}`}
                className="mx-auto w-40 object-contain sm:w-full sm:max-w-[180px]"
              />
            )}
          </section>

          {/* VISUAL PROFILE */}
          <section className="space-y-6">
            <div>
              <span className="eyebrow">Profil visual</span>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
                Dua kerangka yang membentuk laporan ini
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="eyebrow mb-4">Radar OCEAN</h3>
                <OceanRadarChart scores={profile.oceanScores} size={300} />
              </div>
              <div>
                <h3 className="eyebrow mb-4">8 Kecerdasan majemuk</h3>
                <MiBarChart scores={profile.miScores} />
              </div>
            </div>

            <dl className="grid gap-6 border-t border-outline-variant pt-6 sm:grid-cols-3">
              <div>
                <dt className="eyebrow">Kepribadian dominan</dt>
                <dd className="mt-2 font-display text-lg font-bold text-ink">{archetype.title}</dd>
                <dd className="mt-1 text-sm text-secondary">{archetype.learningStyleSummary}</dd>
              </div>
              <div>
                <dt className="eyebrow">Kecerdasan terkuat</dt>
                <dd className="mt-2 font-display text-lg font-bold text-ink">{topMI.name}</dd>
                <dd className="mt-1 text-sm text-secondary">Skor {topMI.score} dari 100.</dd>
              </div>
              <div>
                <dt className="eyebrow">Tantangan utama</dt>
                <dd className="mt-2 text-sm text-secondary">{archetype.challenges[0] ?? '—'}</dd>
              </div>
            </dl>
          </section>

          {/* PREVIEW — free chapters */}
          <section className="space-y-6">
            <div>
              <span className="eyebrow">Cuplikan laporan</span>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
                Baca bagian pembuka {profile.name}
              </h2>
              <p className="mt-2 max-w-[var(--measure-prose)] text-sm text-secondary">
                Setiap kalimat dipersonalisasi untuk anak Anda.
              </p>
            </div>

            <article className="border-t border-ink pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-secondary">BAB 1 · MODUL 1.1</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Gratis</span>
              </div>
              <h3 className="font-display text-lg font-bold text-ink">Pengantar untuk Orang Tua</h3>
              <div
                className="modul-preview-prose mt-4 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: fullPengantarHtml || '<p>Konten sedang dimuat…</p>' }}
              />
            </article>

            {/* Locked preview (blurred) */}
            <div className="relative">
              <div className="min-h-[320px] space-y-6 blur-[4px] select-none opacity-50" aria-hidden="true">
                <div className="border-t border-outline-variant pt-5">
                  <span className="font-mono text-xs text-secondary">BAB 3 · MODUL 3.3</span>
                  <h3 className="mt-1 font-display text-lg font-bold text-ink">Sinergi Karakter &amp; Kecerdasan</h3>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{excerptSinergi}</p>
                </div>
                <div className="border-t border-outline-variant pt-5">
                  <span className="font-mono text-xs text-secondary">BAB 5 · MODUL 5.1</span>
                  <h3 className="mt-1 font-display text-lg font-bold text-ink">Misi Bintang 21 Hari</h3>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{excerptMisi}</p>
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-paper/0 via-paper/70 to-paper px-4">
                <div className="w-full max-w-sm border border-ink bg-paper p-6 text-center">
                  <span className="eyebrow inline-flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Pratinjau terkunci
                  </span>
                  <h3 className="mt-3 font-display text-xl font-extrabold text-ink">
                    Buka laporan lengkap {profile.name}
                  </h3>
                  <div className="mt-3 flex items-baseline justify-center gap-2">
                    <span className="text-sm text-secondary line-through">{formatRupiah(ORIGINAL_PRICE)}</span>
                    <span className="font-display text-3xl font-extrabold text-ink">{formatRupiah(FINAL_PRICE)}</span>
                  </div>
                  <ul className="mt-4 space-y-1.5 text-left">
                    {pricingFeatures.slice(0, 4).map(item => (
                      <li key={item} className="flex items-start gap-2 text-sm text-secondary">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    <Button variant="primary" size="lg" full onClick={onProceedToPayment}>
                      <Lock className="h-4 w-4" /> Buka sekarang
                    </Button>
                  </div>
                  <p className="mt-3 font-mono text-[11px] text-secondary">
                    Promo berakhir dalam {countdown}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* TOC */}
          <section className="space-y-6">
            <div>
              <span className="eyebrow">Daftar isi</span>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
                5 bab · 15 modul
              </h2>
            </div>

            <div className="space-y-6">
              {chapterGroups.map(([ch, group]) => (
                <div key={ch}>
                  <h3 className="border-b border-ink pb-2 text-sm font-bold uppercase tracking-wide text-ink">
                    Bab {ch}: {group.title}
                  </h3>
                  <ul>
                    {group.modules.map(mod => {
                      const isFree = mod.moduleCode === 'Modul 1.1' || mod.moduleCode === 'Modul 2.1';
                      return (
                        <li key={`${mod.moduleId}-${mod.moduleCode}`} className="flex items-center justify-between gap-3 border-b border-outline-variant py-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="shrink-0 font-mono text-xs text-secondary">{mod.moduleCode}</span>
                            <span className={`truncate text-sm ${isFree ? 'font-semibold text-ink' : 'text-secondary'}`}>
                              {mod.title}
                            </span>
                          </div>
                          {isFree ? (
                            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-primary">Gratis</span>
                          ) : (
                            <Lock className="h-3.5 w-3.5 shrink-0 text-secondary/60" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ================= SIDEBAR (desktop) ================= */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 border border-outline-variant bg-paper p-6">
            <span className="eyebrow">Laporan lengkap</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-sm text-secondary line-through">{formatRupiah(ORIGINAL_PRICE)}</span>
              <span className="font-display text-2xl font-extrabold text-ink">{formatRupiah(FINAL_PRICE)}</span>
            </div>
            <p className="mt-1 text-xs text-secondary">Kupon ANAKHEBAT · sekali bayar</p>

            <ul className="mt-5 space-y-2">
              {pricingFeatures.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-secondary">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <Button variant="primary" size="lg" full onClick={onProceedToPayment}>
                <Lock className="h-4 w-4" /> Buka akses lengkap
              </Button>
            </div>

            <p className="mt-3 text-center font-mono text-[11px] text-secondary">
              Harga naik dalam {countdown}
            </p>

            <div className="mt-5 border-t border-outline-variant pt-4">
              <Button
                variant="ghost"
                size="md"
                full
                href={waLink(`Halo, saya baru kuis ${profile.name}. Hasilnya: ${archetype.title}. Saya mau tanya tentang laporan lengkapnya.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Tanya via WhatsApp
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* ================= MOBILE STICKY CTA ================= */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-outline-variant bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <div className="text-xs text-secondary line-through leading-none">{formatRupiah(ORIGINAL_PRICE)}</div>
          <div className="font-display text-lg font-extrabold leading-tight text-ink">{formatRupiah(FINAL_PRICE)}</div>
        </div>
        <Button variant="primary" size="md" onClick={onProceedToPayment} className="flex-1">
          <Lock className="h-4 w-4" /> Buka akses
        </Button>
      </div>
    </div>
  );
};
