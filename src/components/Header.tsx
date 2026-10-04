import React from 'react';
import { Check, Eye, Compass, Cpu, Music, Users, Heart, Waves, Star, Shield, Crown } from 'lucide-react';
import { ChildProfile, ArchetypeDefinition, WizardStep } from '../types';

// Maps an archetype's `avatarIcon` string to its lucide-react icon element.
// Rendered in a single ink tone — the multi-colour palette made the header
// read as a generic dashboard.
const ARCHETYPE_ICON: Record<string, React.ElementType> = {
  Eye, Compass, Cpu, Music, Users, Heart, Waves, Star, Shield, Crown,
};

const WIZARD_STEPS: { key: WizardStep; label: string; short: string }[] = [
  { key: 'input', label: 'Data Anak', short: 'Data' },
  { key: 'quiz', label: 'Kuis Karakter', short: 'Kuis' },
  { key: 'result', label: 'Hasil Analisis', short: 'Hasil' },
  { key: 'payment', label: 'Pembayaran', short: 'Bayar' },
  { key: 'reader', label: 'Baca E-book', short: 'Baca' },
];

interface HeaderProps {
  step: WizardStep;
  activeProfile: ChildProfile | null;
  activeArchetype: ArchetypeDefinition | null;
}

/**
 * Phase-aware header. Instead of one passive sticky bar for every screen, the
 * header changes shape with the phase:
 *  - result/payment: shows the reading-order stepper + active child context.
 *  - reader: a compact document bar (title + exit), no stepper noise.
 */
export const Header: React.FC<HeaderProps> = ({ step, activeProfile, activeArchetype }) => {
  const currentIndex = Math.max(0, WIZARD_STEPS.findIndex(s => s.key === step));
  const currentLabel = WIZARD_STEPS[currentIndex].label;

  const ArchetypeIcon = activeArchetype
    ? ARCHETYPE_ICON[activeArchetype.avatarIcon] ?? Star
    : null;

  const isReader = step === 'reader';

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface/85 backdrop-blur">
      <div className="shell shell--wide flex min-h-14 items-center justify-between gap-4 py-2">
        {/* Brand — wordmark only, no gradient tile */}
        <div className="flex items-center gap-3">
          <span className="font-display text-base font-extrabold tracking-tight text-ink">
            Peta Bintang
          </span>
          <span className="hidden text-xs text-secondary sm:inline">Anakku</span>

          {activeProfile && activeArchetype && (
            <span className="hidden items-center gap-2 border-l border-outline-variant pl-3 text-xs text-secondary md:inline-flex">
              {ArchetypeIcon && <ArchetypeIcon className="h-3.5 w-3.5 text-ink" />}
              <span className="font-medium text-ink">{activeProfile.name}</span>
              <span aria-hidden>·</span>
              <span>{activeArchetype.title}</span>
            </span>
          )}
        </div>

        {/* Phase navigation */}
        {isReader ? (
          <span className="eyebrow hidden sm:block">E-book</span>
        ) : (
          <nav aria-label="Langkah pengisian" className="flex items-center">
            <ol className="flex items-center gap-1 sm:gap-2">
              {WIZARD_STEPS.map((s, idx) => {
                const isCompleted = idx < currentIndex;
                const isActive = idx === currentIndex;
                return (
                  <li key={s.key} className="flex items-center gap-1 sm:gap-2">
                    <span
                      className={`flex items-center gap-1.5 text-xs ${
                        isActive
                          ? 'font-semibold text-ink'
                          : isCompleted
                            ? 'text-primary'
                            : 'text-secondary/70'
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-primary text-on-primary'
                            : isCompleted
                              ? 'bg-primary-container text-on-primary-container'
                              : 'bg-surface-container text-secondary'
                        }`}
                        aria-hidden
                      >
                        {isCompleted ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                      </span>
                      <span className="hidden lg:inline">{s.label}</span>
                      <span className="lg:hidden">{s.short}</span>
                    </span>
                    {idx < WIZARD_STEPS.length - 1 && (
                      <span className="h-px w-3 bg-outline-variant sm:w-5" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ol>
            <span className="sr-only">
              Langkah {currentIndex + 1} dari {WIZARD_STEPS.length}: {currentLabel}
            </span>
          </nav>
        )}
      </div>
    </header>
  );
};
