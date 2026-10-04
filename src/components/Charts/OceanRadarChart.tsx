import React from 'react';
import { OceanScores } from '../../types';

interface OceanRadarChartProps {
  scores: OceanScores;
  size?: number;
}

export const OceanRadarChart: React.FC<OceanRadarChartProps> = ({ scores, size = 300 }) => {
  const center = size / 2;
  const radius = size * 0.38;

  // Palet terang botanical (ebook-color-review: hindari rainbow & indigo).
  const dimensions = [
    { label: 'Keterbukaan (O)', val: scores.openness },
    { label: 'Ketelitian (C)', val: scores.conscientiousness },
    { label: 'Ekstraversi (E)', val: scores.extraversion },
    { label: 'Keramahan (A)', val: scores.agreeableness },
    { label: 'Resiliensi (R)', val: 11 - scores.neuroticism } // R = 11 - N (inverted neuroticism for positivity)
  ];

  const totalPoints = dimensions.length;
  const angleStep = (Math.PI * 2) / totalPoints;

  // Grid circles
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Polygon points
  const points = dimensions.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const normVal = Math.min(Math.max(d.val / 10, 0.1), 1);
    const r = radius * normVal;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, labelX: center + (radius + 24) * Math.cos(angle), labelY: center + (radius + 20) * Math.sin(angle), d };
  });

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Concentric Grid */}
        {levels.map((lvl, idx) => (
          <circle
            key={idx}
            cx={center}
            cy={center}
            r={radius * lvl}
            fill="none"
            stroke="var(--color-outline-variant)"
            strokeWidth="1"
            strokeDasharray={idx === levels.length - 1 ? 'none' : '3 3'}
          />
        ))}

        {/* Spokes */}
        {dimensions.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return <line key={i} x1={center} y1={center} x2={x2} y2={y2} stroke="var(--color-outline)" strokeWidth="1" />;
        })}

        {/* Radar Polygon */}
        <polygon points={polygonPath} fill="rgba(44, 106, 95, 0.16)" stroke="var(--color-botanical)" strokeWidth="2.5" />

        {/* Points and Labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--color-botanical)" stroke="#fff" strokeWidth="2" />
            <text
              x={p.labelX}
              y={p.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[11px] font-semibold"
              style={{ fill: 'var(--color-ink)' }}
            >
              {p.d.label}: {p.d.val}/10
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-3 text-xs text-center" style={{ color: 'var(--color-on-surface-variant)' }}>
        Grafik Radar 5 Dimensi Kepribadian OCEAN (Skala 1-10)
      </div>
    </div>
  );
};
