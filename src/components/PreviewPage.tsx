import React, { useState, useEffect } from 'react';
import { SAMPLE_PROFILES } from '../data/questions';
import type { CompleteEbook } from '../types';
import { EbookReader } from './Reader/EbookReader';
import { Eye, BookOpen, FileText, ArrowLeft } from 'lucide-react';

interface PreviewPageProps {
  initialProfileIndex: number;
}

type ViewMode = 'reader' | 'raw-markdown' | 'modules';

export const PreviewPage: React.FC<PreviewPageProps> = ({ initialProfileIndex }) => {
  const [profileIndex, setProfileIndex] = useState(initialProfileIndex);
  const [viewMode, setViewMode] = useState<ViewMode>('reader');
  // C-02: generated server-side (dev-only endpoint) so the paid templates are
  // never bundled into the client.
  const [ebook, setEbook] = useState<CompleteEbook | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const profile = SAMPLE_PROFILES[profileIndex];

  useEffect(() => {
    setEbook(null);
    setLoadError(null);
    fetch(`/api/dev/sample-ebook?index=${profileIndex}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => setEbook(d.ebook as CompleteEbook))
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Gagal memuat'));
  }, [profileIndex]);

  if (!ebook) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream text-navy">
        {loadError ?? 'Memuat preview…'}
      </div>
    );
  }

  const totalChars = ebook.modules.reduce((sum, m) => sum + m.markdownContent.length, 0);
  const top3MI = Object.entries(profile.miScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}(${v})`)
    .join(', ');

  return (
    <div className="min-h-screen bg-cream text-navy">
      {/* Preview Control Bar */}
      <div className="sticky top-0 z-50 bg-mist border-b border-blue/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left: Brand + Back */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue to-navy flex items-center justify-center text-white shadow-lg">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-navy flex items-center gap-2">
                Preview Mode
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  DEV
                </span>
              </h1>
              <p className="text-xs text-navy/60">Lihat ebook yang di-generate tanpa lewat wizard</p>
            </div>
          </div>

          {/* Center: Profile Switcher */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-blue/20">
            <span className="text-xs text-navy/60 font-medium px-2">Profile:</span>
            {SAMPLE_PROFILES.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setProfileIndex(idx)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  profileIndex === idx
                    ? 'bg-blue text-white shadow'
                    : 'text-navy/60 hover:text-navy hover:bg-blue/15'
                }`}
              >
                {p.name} ({p.age}th)
              </button>
            ))}
          </div>

          {/* Right: View Mode + Exit */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-blue/20">
              <button
                onClick={() => setViewMode('reader')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'reader' ? 'bg-blue text-white' : 'text-navy/60 hover:text-navy'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Reader
              </button>
              <button
                onClick={() => setViewMode('raw-markdown')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'raw-markdown' ? 'bg-blue text-white' : 'text-navy/60 hover:text-navy'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Markdown
              </button>
              <button
                onClick={() => setViewMode('modules')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'modules' ? 'bg-blue text-white' : 'text-navy/60 hover:text-navy'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Modules
              </button>
            </div>

            <a
              href={window.location.pathname}
              className="text-xs bg-blue/15 hover:bg-blue/25 text-blue px-3 py-2 rounded-lg border border-blue/30 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Exit Preview
            </a>
          </div>
        </div>

        {/* Profile Info Bar */}
        <div className="max-w-7xl mx-auto mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="bg-mist px-3 py-1 rounded-full">
            <span className="text-navy/60">Arketipe:</span>{' '}
            <span className="text-blue font-bold">{ebook.archetype.title}</span>
          </span>
          <span className="bg-mist px-3 py-1 rounded-full">
            <span className="text-navy/60">Top 3 MI:</span>{' '}
            <span className="text-blue font-medium">{top3MI}</span>
          </span>
          <span className="bg-mist px-3 py-1 rounded-full">
            <span className="text-navy/60">Modul:</span>{' '}
            <span className="text-sage font-medium">{ebook.modules.length} modul</span>
          </span>
          <span className="bg-mist px-3 py-1 rounded-full">
            <span className="text-navy/60">Total konten:</span>{' '}
            <span className="text-navy/80 font-medium">{totalChars.toLocaleString()} karakter</span>
          </span>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'reader' && (
        <EbookReader
          ebook={ebook}
          onBackToResult={() => setViewMode('modules')}
        />
      )}

      {viewMode === 'raw-markdown' && (
        <div className="max-w-4xl mx-auto p-6">
          <pre className="bg-mist border border-blue/20 rounded-2xl p-6 text-xs font-mono text-navy/80 whitespace-pre-wrap overflow-x-auto custom-scrollbar">
            {ebook.modules
              .map(
                (m) =>
                  `<!-- ${m.moduleCode}: ${m.title} (${m.sectionGroup}) -->\n\n${m.markdownContent}\n\n---\n\n`
              )
              .join('')}
          </pre>
        </div>
      )}

      {viewMode === 'modules' && (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue" /> Daftar Modul ({ebook.modules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ebook.modules.map((mod, idx) => (
              <div key={idx} className="bg-mist border border-blue/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono bg-blue/15 text-blue text-[11px] font-bold px-2 py-0.5 rounded">
                    {mod.moduleCode}
                  </span>
                  <span className="text-[10px] text-navy/50">{mod.sectionGroup}</span>
                </div>
                <h3 className="text-sm font-bold text-navy mb-2">{mod.title}</h3>
                <p className="text-xs text-navy/60">
                  {mod.markdownContent.length.toLocaleString()} karakter
                </p>
                <details className="mt-2">
                  <summary className="text-xs text-blue cursor-pointer hover:underline">
                    Preview konten
                  </summary>
                  <pre className="mt-2 bg-white p-3 rounded-lg text-[10px] font-mono text-navy/80 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                    {mod.markdownContent.slice(0, 500)}...
                  </pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
