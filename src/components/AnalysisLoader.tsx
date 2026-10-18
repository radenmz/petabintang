import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, CheckCircle2, Brain, Lightbulb, Sparkles, BookOpen, Star } from 'lucide-react';
import { OceanScores, MIScores, ArchetypeDefinition } from '../types';

interface AnalysisLoaderProps {
  childName: string;
  oceanScores: OceanScores;
  miScores: MIScores;
  archetype: ArchetypeDefinition;
}

const OCEAN_LABELS: Record<keyof OceanScores, string> = {
  openness: 'Keterbukaan',
  conscientiousness: 'Ketelitian',
  extraversion: 'Ekstroversi',
  agreeableness: 'Keramahan',
  neuroticism: 'Stabilitas Emosi'
};

const MI_LABELS: Record<keyof MIScores, string> = {
  linguistic: 'Linguistik',
  logical: 'Logika-Matematika',
  spatial: 'Spasial-Visual',
  kinesthetic: 'Kinestetik',
  musical: 'Musikal',
  interpersonal: 'Interpersonal',
  intrapersonal: 'Intrapersonal',
  naturalist: 'Naturalis'
};

function getTopOcean(scores: OceanScores): string {
  const entries = Object.entries(scores) as [keyof OceanScores, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [key, val] = entries[0];
  const level = val >= 7 ? 'tinggi' : val >= 4 ? 'sedang' : 'rendah';
  return `${OCEAN_LABELS[key]} ${level}`;
}

function getTop3MI(scores: MIScores): string {
  const entries = Object.entries(scores) as [keyof MIScores, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 3).map(([k]) => MI_LABELS[k]).join(', ');
}

const STEP_ICONS = [Brain, Lightbulb, Sparkles, BookOpen];
const STEP_TITLES = [
  'Menganalisis kepribadian',
  'Mengidentifikasi kecerdasan',
  'Menentukan archetype',
  'Menyusun laporan'
];
const STEP_SUBTITLES_BASE = [
  'Profil OCEAN — 5 dimensi',
  '8 Multiple Intelligences',
  'Pencocokan pola kepribadian',
  '' // filled dynamically with childName
];

const INITIAL_DELAY = 200;
const STEP_INTERVAL = 800;

export const AnalysisLoader: React.FC<AnalysisLoaderProps> = ({
  childName,
  oceanScores,
  miScores,
  archetype
}) => {
  const [visibleStep, setVisibleStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 4; i++) {
      timers.push(
        setTimeout(() => setVisibleStep(i), INITIAL_DELAY + (i - 1) * STEP_INTERVAL)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const stepResults: (string | null)[] = [
    getTopOcean(oceanScores),
    getTop3MI(miScores),
    archetype.title,
    null
  ];

  const stepSubtitles = [
    STEP_SUBTITLES_BASE[0],
    STEP_SUBTITLES_BASE[1],
    STEP_SUBTITLES_BASE[2],
    `15 modul e-book untuk ${childName}`
  ];

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-12">
      {/* Brand header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10 flex items-center gap-2"
      >
        <Star className="h-5 w-5 text-primary" fill="currentColor" />
        <span className="font-display text-lg font-bold text-ink">Peta Bintang</span>
      </motion.div>

      {/* Steps */}
      <div className="w-full max-w-md">
        {STEP_ICONS.map((Icon, idx) => {
          const stepNum = idx + 1;
          const isVisible = visibleStep >= stepNum;
          const isDone = visibleStep > stepNum;
          const isActive = visibleStep === stepNum;
          const result = stepResults[idx];

          if (!isVisible) return null;

          return (
            <motion.div
              key={stepNum}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex gap-4"
            >
              {/* Icon column + connecting line */}
              <div className="flex flex-col items-center">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300 ${
                    isDone || isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant text-secondary'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                </div>
                {/* Connecting line to next step */}
                {stepNum < 4 && (
                  <div
                    className={`w-0.5 h-10 transition-colors duration-300 ${
                      isDone ? 'bg-primary/20' : 'bg-transparent'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pt-1.5 ${stepNum === 4 ? 'pb-0' : 'pb-2'}`}>
                <p
                  className={`text-sm font-semibold transition-colors duration-300 ${
                    isDone || isActive ? 'text-ink' : 'text-secondary'
                  }`}
                >
                  {STEP_TITLES[idx]}
                </p>
                <p className="mt-0.5 text-xs text-secondary">{stepSubtitles[idx]}</p>
                {isDone && result && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="mt-1 text-xs font-medium text-primary"
                  >
                    → {result}
                  </motion.p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: visibleStep >= 4 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="mt-6 text-xs text-secondary"
      >
        Tunggu sebentar, laporan sedang disusun…
      </motion.p>
    </div>
  );
};
