import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { CompleteEbook } from '../../types';
import { Download, Printer, Sun, Moon, Coffee, ChevronRight, ChevronLeft, Loader2, Menu, X, CheckCircle2, AlertTriangle, PartyPopper, Mail } from 'lucide-react';
import { Button } from '../ui/Button';

// C-03: allow-list schema for rendered markdown. Extends the default sanitizer
// schema with the SVG tags/attributes produced by chartGenerators.ts (OCEAN
// radar + MI bar charts) and inline styles used by the templates. Anything not
// listed here — including <script>, event handlers, and javascript: URLs — is
// stripped, so a malicious child name can no longer inject executable HTML.
const SVG_TAGS = [
  'svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'path', 'text', 'tspan', 'defs', 'linearGradient', 'radialGradient',
  'stop', 'title', 'desc'
];

const MARKDOWN_SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), ...SVG_TAGS],
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] || []),
      'style', 'className', 'xmlns', 'viewBox', 'width', 'height',
      'fill', 'stroke', 'strokeWidth', 'strokeOpacity', 'strokeDasharray',
      'strokeLinecap', 'strokeLinejoin', 'opacity', 'fillOpacity',
      'rx', 'ry', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
      'points', 'transform', 'd', 'textAnchor', 'dominantBaseline',
      'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
      // SVG gradient support (OCEAN radar / MI bar use <linearGradient>)
      'id', 'offset', 'stop-color', 'stop-opacity', 'stopColor', 'stopOpacity',
      'gradientUnits', 'fill-opacity'
    ]
  }
} as const;

interface EbookReaderProps {
  ebook: CompleteEbook;
  accessToken?: string | null;
  /**
   * When true the reader fires the PDF generation + download exactly once on
   * mount and shows a status modal, so a freshly-paid user is told what is
   * happening. Set only right after a successful payment (in-memory) — never
   * on a plain reload / email-token visit.
   */
  autoDownloadOnMount?: boolean;
  onBackToResult: () => void;
}

type DownloadModalState =
  | { status: 'preparing' }
  | { status: 'success' }
  | { status: 'error'; message: string }
  | null;

type ResendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; message: string }
  | { status: 'error'; message: string };

export const EbookReader: React.FC<EbookReaderProps> = ({
  ebook,
  accessToken,
  autoDownloadOnMount = false,
  onBackToResult
}) => {
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('sepia');
  const [fontSize, setFontSize] = useState<number>(16); // px
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  // Status modal for the post-payment auto download (null = hidden).
  const [downloadModal, setDownloadModal] = useState<DownloadModalState>(null);
  // Inline status for the "resend access link" action.
  const [resendState, setResendState] = useState<ResendState>({ status: 'idle' });
  // Guards the auto-download so React strict-mode double-invocation / re-renders
  // never trigger two PDF generations.
  const autoDownloadTriggered = useRef(false);

  const currentModule = ebook.modules[activeModuleIndex] || ebook.modules[0];

  // Return to the top of the document when switching modules.
  useEffect(() => {
    if (isPrintMode) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  }, [activeModuleIndex, isPrintMode]);

  // Group modules by chapter (modules are already sorted by chapter/moduleCode).
  const chapterGroups: { chapter: number; title: string; modules: { mod: typeof ebook.modules[0]; idx: number }[] }[] = [];
  ebook.modules.forEach((mod, idx) => {
    const last = chapterGroups[chapterGroups.length - 1];
    if (!last || last.chapter !== mod.chapter) {
      chapterGroups.push({ chapter: mod.chapter, title: mod.chapterTitle, modules: [] });
    }
    chapterGroups[chapterGroups.length - 1].modules.push({ mod, idx });
  });

  const handlePrintPdf = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 500);
  };

  /**
   * Generate + download the paid PDF. `silent` (used by the auto flow) routes
   * feedback into the status modal instead of window.alert.
   */
  const handleDownloadPDF = async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsGeneratingPDF(true);
    if (silent) setDownloadModal({ status: 'preparing' });

    try {
      // C-01: the server requires a paid access token and renders the ebook
      // from its own stored copy — the client never posts the content.
      if (!accessToken) {
        if (silent) {
          setDownloadModal({
            status: 'error',
            message: 'PDF lengkap hanya tersedia untuk pembelian yang sudah dibayar.'
          });
        } else {
          alert('PDF lengkap hanya tersedia untuk pembelian yang sudah dibayar.');
        }
        return;
      }
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.details || errorData.error || `Server returned ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Peta_Bintang_${ebook.childProfile.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (silent) setDownloadModal({ status: 'success' });
    } catch (error) {
      console.error('PDF download failed:', error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      if (silent) {
        setDownloadModal({ status: 'error', message: errMsg });
      } else {
        alert(`Gagal membuat PDF: ${errMsg}`);
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Auto-download once after a successful payment, then surface the status
  // modal so the user understands what is happening (PDF generation can take
  // 5–30s, and some browsers block programmatic downloads — hence the modal's
  // manual retry on failure).
  useEffect(() => {
    if (!autoDownloadOnMount) return;
    if (autoDownloadTriggered.current) return;
    if (!accessToken) return;
    autoDownloadTriggered.current = true;
    void handleDownloadPDF({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownloadOnMount, accessToken]);

  // Re-request the access link by email (recovery when the original post-payment
  // email was lost). Uses the paid access token so only the stored address can
  // ever receive it.
  const handleResendAccess = async () => {
    if (!accessToken) {
      setResendState({ status: 'error', message: 'Tautan akses tidak tersedia.' });
      return;
    }
    setResendState({ status: 'sending' });
    try {
      const res = await fetch('/api/resend-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Server returned ${res.status}`);
      }
      setResendState({ status: 'sent', message: data.sentTo ? `Terkirim ke ${data.sentTo}` : 'Tautan terkirim.' });
      window.setTimeout(() => setResendState({ status: 'idle' }), 6000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengirim ulang.';
      setResendState({ status: 'error', message });
      window.setTimeout(() => setResendState({ status: 'idle' }), 8000);
    }
  };

  const themeClasses = () => {
    switch (theme) {
      case 'light': return 'bg-paper text-ink border-outline-variant';
      case 'dark': return 'bg-[#1b1916] text-paper border-white/10';
      case 'sepia':
      default: return 'bg-surface-container text-ink border-outline-variant';
    }
  };

  const selectModule = (idx: number) => {
    setActiveModuleIndex(idx);
    setSidebarOpen(false);
  };

  if (isPrintMode) {
    return (
      <div className="min-h-screen bg-white p-8 text-black">
        <div className="mx-auto max-w-4xl space-y-12 print-container">
          <div className="border-b-2 border-black pb-8 text-center">
            <h1 className="font-display text-4xl font-extrabold">{ebook.title}</h1>
            <p className="mt-2 text-lg italic">{ebook.subtitle}</p>
            <div className="mt-4 space-x-4 font-mono text-sm">
              <span>{ebook.childProfile.name} ({ebook.childProfile.age} tahun)</span>|
              <span>{ebook.archetype.title}</span>|
              <span>{ebook.generatedAt}</span>
            </div>
          </div>

          {ebook.modules.map(mod => (
            <div key={mod.moduleId} className="page-break-after space-y-4">
              <div className="markdown-body leading-relaxed text-ink">
                <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, MARKDOWN_SANITIZE_SCHEMA]]}>{mod.markdownContent}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream">
      {/* ===== DOCUMENT BAR ===== */}
      <div className="sticky top-14 z-30 border-b border-outline-variant bg-paper/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setSidebarOpen(s => !s)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-outline-variant text-ink lg:hidden"
              aria-label="Daftar isi"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <button
              onClick={onBackToResult}
              className="hidden items-center gap-1.5 text-sm text-secondary transition-colors hover:text-ink sm:inline-flex"
            >
              <ChevronLeft className="h-4 w-4" /> Hasil
            </button>
            <span className="hidden min-w-0 truncate text-sm font-medium text-ink md:inline">
              {ebook.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme */}
            <div className="flex items-center gap-0.5 rounded-lg border border-outline-variant p-0.5">
              {([
                { id: 'light', Icon: Sun, label: 'Terang' },
                { id: 'sepia', Icon: Coffee, label: 'Sepia' },
                { id: 'dark', Icon: Moon, label: 'Gelap' },
              ] as const).map(({ id, Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  title={label}
                  aria-label={label}
                  aria-pressed={theme === id}
                  className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${
                    theme === id ? 'bg-ink text-paper' : 'text-secondary hover:text-ink'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            {/* Font size */}
            <div className="hidden items-center rounded-lg border border-outline-variant font-mono text-xs sm:flex">
              <button onClick={() => setFontSize(Math.max(fontSize - 1, 14))} className="px-2 py-1.5 text-secondary hover:text-ink">A−</button>
              <span className="px-1 text-ink">{fontSize}</span>
              <button onClick={() => setFontSize(Math.min(fontSize + 1, 24))} className="px-2 py-1.5 text-secondary hover:text-ink">A+</button>
            </div>

            <button
              onClick={handlePrintPdf}
              title="Cetak"
              aria-label="Cetak"
              className="hidden h-8 w-8 place-items-center rounded-lg border border-outline-variant text-secondary transition-colors hover:border-ink hover:text-ink sm:grid"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => void handleResendAccess()}
              disabled={resendState.status === 'sending' || !accessToken}
              title="Kirim ulang tautan akses ke email"
              aria-label="Kirim ulang tautan akses ke email"
              className="hidden h-8 items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 text-xs font-semibold text-secondary transition-colors hover:border-ink hover:text-ink disabled:opacity-50 sm:inline-flex"
            >
              {resendState.status === 'sending' ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengirim…</>
              ) : (
                <><Mail className="h-3.5 w-3.5" /> Kirim ulang email</>
              )}
            </button>

            <Button variant="primary" size="md" onClick={() => void handleDownloadPDF()} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> <span className="hidden sm:inline">Menyiapkan…</span></>
              ) : (
                <><Download className="h-4 w-4" /> <span className="hidden sm:inline">Unduh PDF</span></>
              )}
            </Button>
          </div>
        </div>

        {/* Inline feedback for the resend action */}
        {(resendState.status === 'sent' || resendState.status === 'error') && (
          <div
            role="status"
            className={`px-4 py-2 text-xs ${
              resendState.status === 'sent'
                ? 'bg-emerald-500/10 text-emerald-800'
                : 'bg-error/10 text-error'
            }`}
          >
            {resendState.status === 'sent'
              ? `✓ ${resendState.message}`
              : `⚠ ${resendState.message}`}
          </div>
        )}
      </div>

      {/* ===== DOCUMENT LAYOUT ===== */}
      <div className="mx-auto flex max-w-[1180px] gap-8 px-4 py-8">
        {/* TOC sidebar */}
        <nav
          aria-label="Daftar isi"
          className={`${
            sidebarOpen ? 'fixed inset-x-4 top-32 z-40 block' : 'hidden'
          } lg:sticky lg:top-32 lg:block lg:w-64 lg:shrink-0 lg:self-start`}
        >
          <div className="max-h-[70vh] overflow-y-auto border border-outline-variant bg-paper p-4 custom-scrollbar">
            <span className="eyebrow">Daftar isi</span>
            <div className="mt-4 space-y-5">
              {chapterGroups.map(group => (
                <div key={group.chapter}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-secondary">
                    Bab {group.chapter}: {group.title}
                  </p>
                  <ul className="space-y-0.5">
                    {group.modules.map(({ mod, idx }) => {
                      const active = activeModuleIndex === idx;
                      return (
                        <li key={mod.moduleId}>
                          <button
                            onClick={() => selectModule(idx)}
                            className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                              active ? 'bg-ink text-paper' : 'text-secondary hover:bg-surface-container hover:text-ink'
                            }`}
                          >
                            <span className={`mr-1.5 font-mono text-[10px] ${active ? 'text-paper/70' : 'text-secondary/70'}`}>
                              {mod.moduleCode.replace('Modul ', '')}
                            </span>
                            {mod.title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* Document column */}
        <div className="min-w-0 flex-1">
          <article className={`border p-6 md:p-12 ${themeClasses()}`}>
            {/* Document header */}
            <header className="border-b border-current/10 pb-6">
              <span className="font-mono text-xs uppercase tracking-wider opacity-60">
                Bab {currentModule.chapter}: {currentModule.chapterTitle} · {currentModule.moduleCode}
              </span>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                {currentModule.title}
              </h1>
            </header>

            <div
              className="markdown-body mt-8 leading-relaxed"
              style={{ fontSize: `${fontSize}px` }}
            >
              <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, MARKDOWN_SANITIZE_SCHEMA]]}>
                {currentModule.markdownContent}
              </ReactMarkdown>
            </div>
          </article>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                if (activeModuleIndex > 0) setActiveModuleIndex(activeModuleIndex - 1);
                else onBackToResult();
              }}
            >
              <ChevronLeft className="h-4 w-4" /> Sebelumnya
            </Button>

            <span className="font-mono text-xs text-secondary">
              Bab {activeModuleIndex + 1} / {ebook.modules.length}
            </span>

            <Button
              variant="primary"
              size="md"
              disabled={activeModuleIndex === ebook.modules.length - 1}
              onClick={() => setActiveModuleIndex(Math.min(activeModuleIndex + 1, ebook.modules.length - 1))}
            >
              Selanjutnya <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ===== POST-PAYMENT DOWNLOAD STATUS MODAL ===== */}
      {downloadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-paper p-6 shadow-2xl md:p-8">
            {downloadModal.status === 'preparing' && (
              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
                <h2 id="pdf-modal-title" className="mt-4 font-display text-xl font-extrabold text-ink">
                  Menyiapkan PDF Anda…
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  Pembayaran berhasil. Kami sedang menyusun e-book lengkap anak Anda
                  (±10–30 detik). Unduhan akan <strong className="text-ink">dimulai otomatis</strong> begitu selesai.
                  Biarkan halaman ini tetap terbuka.
                </p>
              </div>
            )}

            {downloadModal.status === 'success' && (
              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h2 id="pdf-modal-title" className="mt-4 flex items-center justify-center gap-2 font-display text-xl font-extrabold text-ink">
                  <PartyPopper className="h-5 w-5 text-tertiary" /> PDF Berhasil Diunduh!
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  Cek folder <strong className="text-ink">Downloads</strong> di perangkat Anda.
                  Tautan akses juga dikirim ke email pembelian Anda, sehingga e-book bisa
                  dibuka kembali kapan saja.
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button variant="primary" size="md" onClick={() => void handleDownloadPDF()} disabled={isGeneratingPDF}>
                    {isGeneratingPDF
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan…</>
                      : <><Download className="h-4 w-4" /> Unduh Ulang</>}
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => setDownloadModal(null)}>
                    Baca Online
                  </Button>
                </div>
              </div>
            )}

            {downloadModal.status === 'error' && (
              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-error/10">
                  <AlertTriangle className="h-7 w-7 text-error" />
                </div>
                <h2 id="pdf-modal-title" className="mt-4 font-display text-xl font-extrabold text-ink">
                  Gagal Membuat PDF
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  {downloadModal.message}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-secondary/80">
                  Anda tetap bisa membaca e-book langsung di halaman ini. Coba unduh lagi
                  sebentar lagi, atau gunakan tombol <strong>Unduh PDF</strong> di atas.
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button variant="primary" size="md" onClick={() => void handleDownloadPDF({ silent: true })} disabled={isGeneratingPDF}>
                    {isGeneratingPDF
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Mencoba…</>
                      : <><Download className="h-4 w-4" /> Coba Lagi</>}
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => setDownloadModal(null)}>
                    Baca Online
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
