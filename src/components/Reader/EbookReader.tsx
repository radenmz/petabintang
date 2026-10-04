import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { CompleteEbook } from '../../types';
import { Download, Printer, Sun, Moon, Coffee, ChevronRight, ChevronLeft, Loader2, Menu, X } from 'lucide-react';
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
      'fontSize', 'fontFamily', 'fontWeight', 'fontStyle'
    ]
  }
} as const;

interface EbookReaderProps {
  ebook: CompleteEbook;
  accessToken?: string | null;
  onBackToResult: () => void;
}

export const EbookReader: React.FC<EbookReaderProps> = ({ ebook, accessToken, onBackToResult }) => {
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('sepia');
  const [fontSize, setFontSize] = useState<number>(16); // px
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

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

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);

    try {
      // C-01: the server requires a paid access token and renders the ebook
      // from its own stored copy — the client never posts the content.
      if (!accessToken) {
        alert('PDF lengkap hanya tersedia untuk pembelian yang sudah dibayar.');
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
    } catch (error) {
      console.error('PDF download failed:', error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Gagal membuat PDF: ${errMsg}`);
    } finally {
      setIsGeneratingPDF(false);
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

            <Button variant="primary" size="md" onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> <span className="hidden sm:inline">Menyiapkan…</span></>
              ) : (
                <><Download className="h-4 w-4" /> <span className="hidden sm:inline">Unduh PDF</span></>
              )}
            </Button>
          </div>
        </div>
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
    </div>
  );
};
