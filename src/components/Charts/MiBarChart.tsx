import React from 'react';
import { MIScores } from '../../types';

interface MiBarChartProps {
  scores: MIScores;
}

export const MiBarChart: React.FC<MiBarChartProps> = ({ scores }) => {
  // Single-tone bars; the top three are emphasised by ink + label only
  // (no emoji, no per-series rainbow, no pill badges).
  const miList = [
    { key: 'linguistic', label: 'Linguistik (Bahasa)', val: scores.linguistic },
    { key: 'logical', label: 'Logika-Matematika', val: scores.logical },
    { key: 'spatial', label: 'Spasial-Visual', val: scores.spatial },
    { key: 'kinesthetic', label: 'Kinestetik-Jasmani', val: scores.kinesthetic },
    { key: 'musical', label: 'Musikal', val: scores.musical },
    { key: 'interpersonal', label: 'Interpersonal (Sosial)', val: scores.interpersonal },
    { key: 'intrapersonal', label: 'Intrapersonal (Diri)', val: scores.intrapersonal },
    { key: 'naturalist', label: 'Naturalis (Alam)', val: scores.naturalist }
  ].sort((a, b) => b.val - a.val);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Distribusi 8 Kecerdasan</span>
        <span className="text-[11px] text-secondary">Tiga teratas ditebalkan</span>
      </div>

      {miList.map((item, idx) => {
        const isTop3 = idx < 3;
        return (
          <div key={item.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className={isTop3 ? 'font-semibold text-ink' : 'text-secondary'}>
                {item.label}
              </span>
              <span className={`font-mono ${isTop3 ? 'font-semibold text-ink' : 'text-secondary'}`}>
                {item.val}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className={`h-full rounded-full ${isTop3 ? 'bg-primary' : 'bg-primary/45'}`}
                style={{ width: `${Math.min(Math.max(item.val, 5), 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
