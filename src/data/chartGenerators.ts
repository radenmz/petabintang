import { OceanScores, MIScores } from '../types';

/**
 * Generate an OCEAN radar chart as a self-contained SVG string.
 *
 * Shows the 5 raw OCEAN dimensions: O, C, E, A, N. The 5th axis is
 * Neuroticism (Sensitivitas Emosi) — the SAME value shown in the text list, so
 * the chart and the written profile never disagree. (The archetype matcher
 * still uses Resiliensi R = 11 - N internally; that conversion is not shown to
 * the reader.) The SVG uses inline styles so it renders correctly both inside
 * ReactMarkdown (via rehype-raw) and in the static HTML exports.
 *
 * Palet: brand (Jacarta/Wisteria/Casablanca) — selaras dengan `src/index.css`.
 */
export function generateOceanRadarSVG(scores: OceanScores, size = 320): string {
  const center = size / 2;
  const radius = size * 0.32;

  // Palet brand (hardcoded — SVG self-contained untuk export HTML/PDF).
  const BOTANICAL = '#2A306C';
  const INK = '#1C1A2E';
  const STONE = '#6B6787';
  const OUTLINE_VAR = '#D9CFC7';
  const OUTLINE = '#8F8AA8';

  const dimensions = [
    { label: 'Keterbukaan (O)', short: 'O', val: scores.openness },
    { label: 'Ketelitian (C)', short: 'C', val: scores.conscientiousness },
    { label: 'Ekstraversi (E)', short: 'E', val: scores.extraversion },
    { label: 'Keramahan (A)', short: 'A', val: scores.agreeableness },
    { label: 'Sensitivitas Emosi (N)', short: 'N', val: scores.neuroticism }
  ];

  const totalPoints = dimensions.length;
  const angleStep = (Math.PI * 2) / totalPoints;
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const points = dimensions.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const normVal = Math.min(Math.max(d.val / 10, 0.1), 1);
    const r = radius * normVal;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return {
      x, y,
      labelX: center + (radius + 28) * Math.cos(angle),
      labelY: center + (radius + 24) * Math.sin(angle),
      d
    };
  });

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

  // Build SVG string (unic-gradient)
  const gradId = `pbRadarGrad-${Math.random().toString(36).slice(2, 8)}`;
  let svg = `<div style="text-align:center;margin:1.5rem 0;">`;
  svg += `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="max-width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">`;
  svg += `<stop offset="0%" stop-color="#2A306C" stop-opacity="0.30"/>`;
  svg += `<stop offset="100%" stop-color="#846BB5" stop-opacity="0.22"/>`;
  svg += `</linearGradient></defs>`;

  // Background
  svg += `<rect width="${size}" height="${size}" fill="rgba(42,48,108,0.04)" rx="16"/>`;

  // Grid circles
  levels.forEach((lvl, idx) => {
    svg += `<circle cx="${center}" cy="${center}" r="${radius * lvl}" fill="none" stroke="${OUTLINE_VAR}" stroke-width="0.5" stroke-opacity="0.7" ${idx === levels.length - 1 ? '' : 'stroke-dasharray="3 3"'}/>`;
  });

  // Spokes
  dimensions.forEach((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x2 = center + radius * Math.cos(angle);
    const y2 = center + radius * Math.sin(angle);
    svg += `<line x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" stroke="${OUTLINE}" stroke-width="0.5" stroke-opacity="0.5"/>`;
  });

  // Polygon fill
  svg += `<polygon points="${polygonPath}" fill="url(#${gradId})" stroke="${BOTANICAL}" stroke-width="2.5"/>`;

  // Points and labels
  points.forEach((p) => {
    svg += `<circle cx="${p.x}" cy="${p.y}" r="7" fill="${BOTANICAL}" fill-opacity="0.16"/>`;
    svg += `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${BOTANICAL}" stroke="white" stroke-width="1.5"/>`;
    svg += `<text x="${p.labelX}" y="${p.labelY}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-family="sans-serif" fill="${INK}" font-weight="600">${p.d.short}: ${p.d.val}/10</text>`;
  });

  svg += `</svg>`;
  svg += `<p style="font-size:11px;color:${STONE};margin-top:8px;">Grafik Radar 5 Dimensi Kepribadian OCEAN (Skala 1-10). N tinggi = lebih peka terhadap emosi.</p>`;
  svg += `</div>`;

  return svg;
}

/**
 * Generate a Multiple Intelligences (MI) horizontal bar chart as a
 * self-contained SVG string.
 *
 * Shows all 8 MI scores sorted descending; the top 3 are highlighted with
 * starlight (gold) coloring and a `#1`/`#2`/`#3` badge. The SVG uses inline
 * styles so it renders correctly both inside ReactMarkdown (via rehype-raw)
 * and in the static HTML exports.
 *
 * Palet: batang botanical tunggal, gold (starlight) hanya untuk Top 3
 * (ebook-color-review.md: kurangi warna per-seri / rainbow).
 */
export function generateMIBarSVG(scores: MIScores, width = 480): string {
  // Palet brand (hardcoded — SVG self-contained).
  const BOTANICAL = '#2A306C';
  const STARLIGHT = '#F8BB53';
  const STARLIGHT_DEEP = '#D99A2B';
  const INK = '#1C1A2E';
  const STONE = '#6B6787';
  const TRACK = '#EDDFD5';

  const miList = [
    { key: 'linguistic', label: 'Linguistik', icon: '🗣️', val: scores.linguistic },
    { key: 'logical', label: 'Logika', icon: '🧮', val: scores.logical },
    { key: 'spatial', label: 'Spasial', icon: '🎨', val: scores.spatial },
    { key: 'kinesthetic', label: 'Kinestetik', icon: '🤸', val: scores.kinesthetic },
    { key: 'musical', label: 'Musikal', icon: '🎼', val: scores.musical },
    { key: 'interpersonal', label: 'Interpersonal', icon: '🤝', val: scores.interpersonal },
    { key: 'intrapersonal', label: 'Intrapersonal', icon: '🧘', val: scores.intrapersonal },
    { key: 'naturalist', label: 'Naturalis', icon: '🌿', val: scores.naturalist }
  ].sort((a, b) => b.val - a.val);

  const barHeight = 24;
  const barGap = 8;
  const labelWidth = 110;
  const scoreWidth = 50;
  const chartWidth = width - labelWidth - scoreWidth - 20;
  const totalHeight = miList.length * (barHeight + barGap) + 40;

  let svg = `<div style="margin:1.5rem 0;max-width:100%;">`;
  svg += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
  svg += `<span style="font-size:11px;font-weight:600;color:${INK};text-transform:uppercase;letter-spacing:0.05em;">Distribusi 8 Kecerdasan Majemuk</span>`;
  svg += `<span style="font-size:11px;color:${STARLIGHT_DEEP};font-weight:600;">★ Top 3 Teratas Di-Highlight</span>`;
  svg += `</div>`;
  svg += `<svg width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" style="max-width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg">`;
  const barGradId = `pbBarGrad-${Math.random().toString(36).slice(2, 8)}`;
  svg += `<defs><linearGradient id="${barGradId}" x1="0%" y1="0%" x2="100%" y2="0%">`;
  svg += `<stop offset="0%" stop-color="#F8BB53"/><stop offset="100%" stop-color="#D99A2B"/>`;
  svg += `</linearGradient></defs>`;

  // Background
  svg += `<rect width="${width}" height="${totalHeight}" fill="rgba(42,48,108,0.04)" rx="12"/>`;

  miList.forEach((item, idx) => {
    const isTop3 = idx < 3;
    const y = idx * (barHeight + barGap) + 20;
    const barW = Math.min(Math.max(item.val, 5), 100) / 100 * chartWidth;

    // Label
    svg += `<text x="10" y="${y + barHeight / 2 + 4}" font-size="11" font-family="sans-serif" fill="${isTop3 ? STARLIGHT_DEEP : INK}" font-weight="${isTop3 ? '700' : '500'}">${item.icon} ${item.label}</text>`;

    // Bar background (track)
    svg += `<rect x="${labelWidth}" y="${y}" width="${chartWidth}" height="${barHeight}" fill="${TRACK}" rx="6"/>`;

    // Bar fill — botanical (non-top3), gold gradient (top3)
    if (isTop3) {
      svg += `<rect x="${labelWidth}" y="${y}" width="${barW}" height="${barHeight}" fill="url(#${barGradId})" rx="6"/>`;
    } else {
      svg += `<rect x="${labelWidth}" y="${y}" width="${barW}" height="${barHeight}" fill="${BOTANICAL}" rx="6"/>`;
    }

    // Score text
    svg += `<text x="${labelWidth + chartWidth + 8}" y="${y + barHeight / 2 + 4}" font-size="11" font-family="sans-serif" fill="${isTop3 ? STARLIGHT_DEEP : STONE}" font-weight="${isTop3 ? '700' : '500'}">${item.val}/100</text>`;

    // Top badge
    if (isTop3) {
      svg += `<text x="${labelWidth + barW + 4}" y="${y + barHeight / 2 + 4}" font-size="9" font-family="sans-serif" fill="${STARLIGHT_DEEP}" font-weight="700">#${idx + 1}</text>`;
    }
  });

  svg += `</svg>`;
  svg += `</div>`;

  return svg;
}
