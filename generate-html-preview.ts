/**
 * generate-html-preview.ts
 *
 * Standalone HTML ebook generator for the "Peta Bintang" app.
 *
 * Produces 3 self-contained, downloadable HTML files (one per sample profile)
 * in dist-preview/ that can be opened directly in a browser WITHOUT a dev
 * server — fully styled with the brand palette (Jacarta/Wisteria/Casablanca)
 * and embedded CSS.
 *
 * Usage:
 *   npx tsx generate-html-preview.ts
 *
 * This is the single server-side ebook generator: it reads the markdown
 * templates from src/templates/ via fs and assembles the personalised ebook.
 * The pure data functions (matchArchetype, SAMPLE_PROFILES, synergyFragments)
 * are imported directly from the TypeScript source.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { matchArchetype } from './src/data/archetypes';
import { SAMPLE_PROFILES } from './src/data/questions';
import { archetypeSynergyFragments, miSynergyFragments } from './src/data/synergyFragments';
import { generateOceanRadarSVG, generateMIBarSVG } from './src/data/chartGenerators';
import type {
  ChildProfile,
  ArchetypeDefinition,
  MIScores,
  CompleteEbook,
  GeneratedEbookModule
} from './src/types';

// ============================================================================
// Setup
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the project root (the directory containing `src/templates/`) by
 * searching upward from `__dirname`. This keeps file reads working whether the
 * module runs from source (dev via tsx: __dirname = project root) or from a
 * bundled copy inside `dist/` (production: __dirname = dist/, project root is
 * one level up). Falls back to `__dirname` if not found.
 *
 * NOTE: This is path-resolution infrastructure only — it does NOT alter any
 * HTML generation logic. In dev/standalone it resolves to `__dirname`, so
 * behaviour is identical to before.
 */
function findProjectRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'src', 'templates'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

const PROJECT_ROOT = findProjectRoot(__dirname);

// Configure marked: GFM for tables/task-lists; no auto line-breaks (matches
// react-markdown's default rendering which the reader uses).
marked.setOptions({ gfm: true, breaks: false });

// Read a raw markdown file as a UTF-8 string (replaces Vite's `?raw` suffix).
function readRaw(relPath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf-8');
}

// ============================================================================
// Raw markdown templates (server-side)
// ============================================================================

// Universal modules (single-module files)
const universalModul0 = readRaw('src/templates/universal/modul-0-pengantar.md');
const universalModul1 = readRaw('src/templates/universal/modul-1-teori-ocean.md');
const universalModul3 = readRaw('src/templates/universal/modul-3-teori-mi.md');
const universalModul12 = readRaw('src/templates/universal/modul-12-penutup.md');

// Modul 4.4 — Sinergy (assembled from archetype + MI fragments)
const modul44Template = readRaw('src/templates/universal/modul-4-4-sinergi.md');
// Modul 6.3 — Emotion handling (assembled from top-3 MI fragments)
const modul63Template = readRaw('src/templates/universal/modul-6-3-penanganan-emosi.md');
// MI disclaimer — appended to combined Modul 4
const miDisclaimer = readRaw('src/templates/universal/mi-disclaimer.md');

// Modul 11 — Misi Bintang 21 Hari (assembled from archetype + MI + finale)
const modul11Wrapper = readRaw('src/templates/universal/modul-11-misi-21-hari.md');
const modul11Finale = readRaw('src/templates/universal/modul-11-finale.md');

// Modul 8 — Bank Ide Aktivitas & Belajar (assembled from top-3 MI fragments)
const modul8Wrapper = readRaw('src/templates/universal/modul-8-bank-ide-aktivitas.md');

// Archetype modules (10 multi-module files; each contains modul 2,5,6,7,9,10,11)
const arch01 = readRaw('src/templates/archetypes/01-nebula-owl.md');
const arch02 = readRaw('src/templates/archetypes/02-comet-fox.md');
const arch03 = readRaw('src/templates/archetypes/03-cosmic-beaver.md');
const arch04 = readRaw('src/templates/archetypes/04-moon-deer.md');
const arch05 = readRaw('src/templates/archetypes/05-supernova-lion.md');
const arch06 = readRaw('src/templates/archetypes/06-space-whale.md');
const arch07 = readRaw('src/templates/archetypes/07-astronomer-cat.md');
const arch08 = readRaw('src/templates/archetypes/08-galaxy-dolphin.md');
const arch09 = readRaw('src/templates/archetypes/09-supernova-peacock.md');
const arch10 = readRaw('src/templates/archetypes/10-planetary-panda.md');

// Intelligence modules (8 multi-module files; each contains modul 4 & 8)
const miLinguistic = readRaw('src/templates/intelligences/linguistic.md');
const miLogical = readRaw('src/templates/intelligences/logical.md');
const miSpatial = readRaw('src/templates/intelligences/spatial.md');
const miKinesthetic = readRaw('src/templates/intelligences/kinesthetic.md');
const miMusical = readRaw('src/templates/intelligences/musical.md');
const miInterpersonal = readRaw('src/templates/intelligences/interpersonal.md');
const miIntrapersonal = readRaw('src/templates/intelligences/intrapersonal.md');
const miNaturalist = readRaw('src/templates/intelligences/naturalist.md');

// ============================================================================
// Constants (MI names / media / emoji / activity labels)
// ============================================================================

interface ParsedModule {
  id: number;
  title: string;
  content: string;
}

const MI_NAMES: Record<keyof MIScores, string> = {
  linguistic: 'Kecerdasan Linguistik (Bahasa)',
  logical: 'Kecerdasan Logika-Matematika',
  spatial: 'Kecerdasan Spasial-Visual',
  kinesthetic: 'Kecerdasan Kinestetik-Jasmani',
  musical: 'Kecerdasan Musikal',
  interpersonal: 'Kecerdasan Interpersonal (Sosial)',
  intrapersonal: 'Kecerdasan Intrapersonal (Diri)',
  naturalist: 'Kecerdasan Naturalis (Alam)'
};

const MI_MEDIA: Record<keyof MIScores, string> = {
  linguistic: 'buku, cerita, kata-kata, dan dialog',
  logical: 'pola, angka, teka-teki, dan eksperimen',
  spatial: 'gambar, krayon, warna, dan visualisasi',
  kinesthetic: 'gerakan tubuh, lari, dan permainan fisik',
  musical: 'lagu, ritme, nada, dan instrumen musik',
  interpersonal: 'bermain peran, kelompok, dan diskusi',
  intrapersonal: 'jurnal, refleksi, dan waktu tenang',
  naturalist: 'alam, tanaman, hewan, dan aktivitas outdoor'
};

const MI_EMOJI: Record<keyof MIScores, string> = {
  linguistic: '🗣️',
  logical: '🧮',
  spatial: '🎨',
  kinesthetic: '🤸',
  musical: '🎼',
  interpersonal: '🤝',
  intrapersonal: '🧘',
  naturalist: '🌿'
};

const MI_ACTIVITIES_LABEL: Record<keyof MIScores, string> = {
  linguistic: 'Linguistik',
  logical: 'Logika',
  spatial: 'Spasial',
  kinesthetic: 'Kinestetik',
  musical: 'Musikal',
  interpersonal: 'Interpersonal',
  intrapersonal: 'Intrapersonal',
  naturalist: 'Naturalis'
};

const ARCHETYPE_RAW_MAP: Record<string, string> = {
  'ARK_NEBULA_OWL': arch01,
  'ARK_COMET_FOX': arch02,
  'ARK_COSMIC_BEAVER': arch03,
  'ARK_MOON_DEER': arch04,
  'ARK_SUPERNOVA_LION': arch05,
  'ARK_SPACE_WHALE': arch06,
  'ARK_ASTRONOMER_CAT': arch07,
  'ARK_GALAXY_DOLPHIN': arch08,
  'ARK_SUPERNOVA_PEACOCK': arch09,
  'ARK_PLANETARY_PANDA': arch10
};

const MI_RAW_MAP: Record<keyof MIScores, string> = {
  linguistic: miLinguistic,
  logical: miLogical,
  spatial: miSpatial,
  kinesthetic: miKinesthetic,
  musical: miMusical,
  interpersonal: miInterpersonal,
  intrapersonal: miIntrapersonal,
  naturalist: miNaturalist
};

// ============================================================================
// Core ebook-assembly functions
// ============================================================================

// Split a multi-module markdown file into individual modules using the
// <!-- MODUL:{id}:{title} --> delimiter.
function parseMultiModule(raw: string): ParsedModule[] {
  const regex = /<!-- MODUL:(\d+(?:\.\d+)?):(.*?) -->/g;
  const delimiters: { id: number; title: string; matchStart: number; matchEnd: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    delimiters.push({
      id: parseFloat(m[1]),
      title: m[2].trim(),
      matchStart: m.index,
      matchEnd: m.index + m[0].length
    });
  }

  if (delimiters.length === 0) {
    return [{ id: -1, title: 'Tanpa Judul', content: raw.trim() }];
  }

  const result: ParsedModule[] = [];
  for (let i = 0; i < delimiters.length; i++) {
    const d = delimiters[i];
    const contentEnd = i + 1 < delimiters.length ? delimiters[i + 1].matchStart : raw.length;
    const content = raw.slice(d.matchEnd, contentEnd).trim();
    result.push({ id: d.id, title: d.title, content });
  }
  return result;
}

interface ChapterInfo {
  chapter: number;
  chapterTitle: string;
  moduleCode: string;  // e.g., "Modul 2.1"
}

function getChapterInfo(moduleId: number): ChapterInfo {
  const key = moduleId.toString();
  const mapping: Record<string, ChapterInfo> = {
    '0':   { chapter: 1, chapterTitle: 'PENGANTAR', moduleCode: 'Modul 1.1' },
    '1':   { chapter: 1, chapterTitle: 'PENGANTAR', moduleCode: 'Modul 1.2' },
    '2':   { chapter: 2, chapterTitle: 'KARAKTER ANAK', moduleCode: 'Modul 2.1' },
    '5':   { chapter: 2, chapterTitle: 'KARAKTER ANAK', moduleCode: 'Modul 2.2' },
    '7':   { chapter: 2, chapterTitle: 'KARAKTER ANAK', moduleCode: 'Modul 2.3' },
    '3':   { chapter: 3, chapterTitle: 'KECERDASAN ANAK', moduleCode: 'Modul 3.1' },
    '4':   { chapter: 3, chapterTitle: 'KECERDASAN ANAK', moduleCode: 'Modul 3.2' },
    '4.4': { chapter: 3, chapterTitle: 'KECERDASAN ANAK', moduleCode: 'Modul 3.3' },
    '6':   { chapter: 4, chapterTitle: 'PANDUAN PRAKTIS HARIAN', moduleCode: 'Modul 4.1' },
    '6.3': { chapter: 4, chapterTitle: 'PANDUAN PRAKTIS HARIAN', moduleCode: 'Modul 4.2' },
    '8':   { chapter: 4, chapterTitle: 'PANDUAN PRAKTIS HARIAN', moduleCode: 'Modul 4.3' },
    '9':   { chapter: 4, chapterTitle: 'PANDUAN PRAKTIS HARIAN', moduleCode: 'Modul 4.4' },
    '10':  { chapter: 4, chapterTitle: 'PANDUAN PRAKTIS HARIAN', moduleCode: 'Modul 4.5' },
    '11':  { chapter: 5, chapterTitle: 'AKSI & PENUTUP', moduleCode: 'Modul 5.1' },
    '12':  { chapter: 5, chapterTitle: 'AKSI & PENUTUP', moduleCode: 'Modul 5.2' }
  };
  return mapping[key] || { chapter: 1, chapterTitle: 'PENGANTAR', moduleCode: `Modul ${moduleId}` };
}

// Inspirational quotes shown on chapter divider pages, keyed by chapter number.
const CHAPTER_QUOTES: Record<number, string> = {
  1: 'Setiap anak lahir membawa peta bintangnya sendiri. Tugas kita bukan menggambar ulang, melainkan membantu mereka membaca peta itu.',
  2: 'Karakter anak bukan cetakan yang dibentuk paksa, melainkan benih yang tumbuh sesuai kodratnya. Kenali, hormati, dan bimbing.',
  3: 'Kecerdasan bukan satu jalur bercabang. Ia adalah delapan sungai yang mengalir — masing-masing membawa keajaiban tersendiri.',
  4: 'Pengasuhan terbaik bukan yang sempurna, melainkan yang konsisten. Langkah kecil setiap hari lebih berarti daripada lompatan besar sesekali.',
  5: 'Bintang tidak bersinar dalam sekejap — ia menempa cahayanya selama miliaran tahun. Begitu pula anak Anda: sedang menjadi.'
};

// PALET BRAND (satu sumber kebenaran untuk CSS embedded & divider).
// Diselaraskan dengan `src/index.css` (White Linen / Jacarta / Wisteria /
// Casablanca) agar PDF mencerminkan warna brand, bukan palet "botanical" hijau
// yang lama.
//   paper   White Linen  · ink  Jacarta gelap · botanical(→primary) Jacarta
//   starlight Casablanca · secondary Wisteria · stone netral
const PALETTE = {
  paper: '#FAF1EC',
  ink: '#1C1A2E',
  botanical: '#2A306C',
  botanicalDeep: '#1A1E46',
  botanicalTint: '#E8E9F3',
  secondary: '#846BB5',
  secondaryTint: '#ECE6F6',
  starlight: '#F8BB53',
  starlightDeep: '#D99A2B',
  stone: '#6B6787',
  outlineVariant: '#D9CFC7',
  surfaceContainerHigh: '#EDDFD5'
} as const;

// Eksekusi modern (Opsi 3 — Modern-warm): gradasi statis + bayangan berlapis +
// radius besar. Palet TIDAK berubah; PDF tidak pakai blur/backdrop-filter
// (tak bisa dicetak). Sinkron dengan token modern di src/index.css.
const GRADIENTS = {
  primary: 'linear-gradient(135deg, #2A306C 0%, #846BB5 100%)',
  primarySoft: 'linear-gradient(135deg, #2A306C 0%, #3D4488 100%)',
  gold: 'linear-gradient(135deg, #F8BB53 0%, #D99A2B 100%)',
  warmSurface: 'linear-gradient(180deg, #FFFFFF 0%, #FAF1EC 100%)',
  warmTint: 'linear-gradient(135deg, #ECE6F6 0%, #E8E9F3 100%)',
  coverHero: 'linear-gradient(160deg, #2A306C 0%, #4B3E86 55%, #846BB5 100%)'
} as const;
const SHADOWS = {
  soft: '0 1px 2px rgba(28,26,46,0.05), 0 4px 16px rgba(28,26,46,0.06)',
  card: '0 2px 6px rgba(28,26,46,0.05), 0 12px 32px rgba(42,48,108,0.10)',
  lift: '0 8px 24px rgba(42,48,108,0.18)'
} as const;
const RADIUS = { card: '18px' } as const;

const CHAPTER_DIVIDER_STYLES: Record<number, {
  background: string;
  accent: string;
  text: string;
  quoteColor: string;
  labelSpacing: string;
}> = {
  1: { background: GRADIENTS.warmSurface, accent: PALETTE.botanical, text: PALETTE.ink, quoteColor: PALETTE.stone, labelSpacing: '0.3em' },
  2: { background: GRADIENTS.warmTint, accent: PALETTE.botanical, text: PALETTE.ink, quoteColor: PALETTE.stone, labelSpacing: '0.34em' },
  3: { background: GRADIENTS.warmTint, accent: PALETTE.secondary, text: PALETTE.ink, quoteColor: PALETTE.stone, labelSpacing: '0.28em' },
  4: { background: GRADIENTS.warmSurface, accent: PALETTE.starlightDeep, text: PALETTE.ink, quoteColor: PALETTE.stone, labelSpacing: '0.32em' },
  5: { background: GRADIENTS.primary, accent: PALETTE.starlight, text: '#FFFFFF', quoteColor: 'rgba(255,255,255,0.85)', labelSpacing: '0.38em' }
};

function getTop3MI(mi: MIScores): { key: keyof MIScores; name: string; score: number }[] {
  return (Object.entries(mi) as [keyof MIScores, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, score]) => ({ key, name: MI_NAMES[key], score }));
}

// Build the variable map used for {{variable}} interpolation.
function buildInterpolationContext(child: ChildProfile, archetype: ArchetypeDefinition): Record<string, string> {
  const o = child.oceanScores;
  const statusOf = (val: number) => (val >= 7 ? 'Tinggi' : val >= 5 ? 'Sedang' : 'Rendah');

  const top3 = getTop3MI(child.miScores);
  const miScoreListText = (Object.entries(child.miScores) as [keyof MIScores, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([key, val]) => `- **${MI_NAMES[key]}:** ${val}/100`)
    .join('\n');

  return {
    childName: child.name,
    childAge: child.age.toString(),
    parentName: child.parentName || 'Orang Tua',
    archetypeTitle: archetype.title,
    archetypeSlogan: archetype.slogan,
    archetypeDescription: archetype.description,
    archetypeStrengths: archetype.strengths.map(s => `- 🌟 ${s}`).join('\n'),
    archetypeChallenges: archetype.challenges.map(c => `- 🎯 ${c}`).join('\n'),
    oceanO: o.openness.toString(),
    oceanC: o.conscientiousness.toString(),
    oceanE: o.extraversion.toString(),
    oceanA: o.agreeableness.toString(),
    oceanN: o.neuroticism.toString(),
    statusO: statusOf(o.openness),
    statusC: statusOf(o.conscientiousness),
    statusE: statusOf(o.extraversion),
    statusA: statusOf(o.agreeableness),
    statusN: o.neuroticism >= 7 ? 'Sensitif' : o.neuroticism >= 5 ? 'Sedang' : 'Stabil',
    miScoreList: miScoreListText,
    oceanRadarChart: generateOceanRadarSVG(child.oceanScores),
    miBarChart: generateMIBarSVG(child.miScores),
    topMI1_Name: top3[0]?.name ?? '',
    topMI1_Score: (top3[0]?.score ?? 0).toString(),
    topMI2_Name: top3[1]?.name ?? '',
    topMI2_Score: (top3[1]?.score ?? 0).toString(),
    topMI3_Name: top3[2]?.name ?? '',
    topMI3_Score: (top3[2]?.score ?? 0).toString(),
    topMI1_Media: MI_MEDIA[top3[0]?.key] ?? '',
    topMI2_Media: MI_MEDIA[top3[1]?.key] ?? '',
    topMI3_Media: MI_MEDIA[top3[2]?.key] ?? ''
  };
}

function interpolate(content: string, ctx: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(ctx)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// Strip writer-guidance content (PANDUAN PENULISAN blocks & [ISI SENDIRI] markers)
// so they never appear in the final rendered ebook.
function stripGuidanceContent(content: string): string {
  let result = content;

  // 1. Remove PANDUAN PENULISAN blockquote blocks.
  const lines = result.split('\n');
  const filtered: string[] = [];
  let skipBlockquote = false;
  for (const line of lines) {
    if (line.match(/^>\s*\*\*PANDUAN PENULISAN:/)) {
      skipBlockquote = true;
      continue;
    }
    if (skipBlockquote) {
      if (line.match(/^>/)) {
        continue;
      } else {
        skipBlockquote = false;
      }
    }
    filtered.push(line);
  }
  result = filtered.join('\n');

  // 2. Remove [ISI SENDIRI ...] markers
  result = result.replace(/\[[^\]]*ISI SENDIRI[^\]]*\]/g, '');

  // 3. Clean up empty list items
  result = result.replace(/^\s*(?:-\s*|\d+\.\s*)$/gm, '');

  // 4. Collapse 3+ consecutive newlines into 2
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

// Remove a "## {titleStart} ..." section (from its heading to the next ## heading or end).
function removeSection(content: string, titleStart: string): string {
  const escaped = titleStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`## ${escaped}[^\\n]*\\n[\\s\\S]*?(?=## |$)`, 'g');
  return content.replace(regex, '').trim();
}

function buildGeneratedModule(parsed: ParsedModule, ctx: Record<string, string>): GeneratedEbookModule {
  const chapterInfo = getChapterInfo(parsed.id);
  const strippedContent = stripGuidanceContent(parsed.content);
  let content = interpolate(strippedContent, ctx);

  // Replace heading H1 "# MODUL X:" with the new moduleCode.
  const newCodeNum = chapterInfo.moduleCode.replace('Modul ', '');
  content = content.replace(/^# MODUL \d+(?:\.\d+)?:/m, `# MODUL ${newCodeNum}:`);

  return {
    moduleId: parsed.id,
    moduleCode: chapterInfo.moduleCode,
    chapter: chapterInfo.chapter,
    chapterTitle: chapterInfo.chapterTitle,
    title: parsed.title,
    sectionGroup: chapterInfo.chapterTitle,
    markdownContent: content,
    isAiGenerated: false,
    lastUpdated: new Date().toISOString().slice(0, 10)
  };
}

// ============================================================================
// generateEbook — assembles the personalised ebook
// ============================================================================

export function generateEbook(child: ChildProfile): CompleteEbook {
  const archetype = matchArchetype(child.oceanScores);
  const ctx = buildInterpolationContext(child, archetype);
  const top3MI = getTop3MI(child.miScores);
  const today = new Date().toISOString().slice(0, 10);

  const modules: GeneratedEbookModule[] = [];

  // 4 universal modules (each file is single-module)
  [universalModul0, universalModul1, universalModul3, universalModul12].forEach(raw => {
    parseMultiModule(raw).forEach(m => modules.push(buildGeneratedModule(m, ctx)));
  });

  // 7 modules from the matched archetype file (modul 2,5,6,7,9,10,11)
  // Modul 11 is extracted separately for assembly into Misi Bintang 21 Hari
  const archRaw = ARCHETYPE_RAW_MAP[archetype.id] ?? arch01;
  let archetypeMissions = '';
  parseMultiModule(archRaw).forEach(m => {
    if (m.id === 11) {
      archetypeMissions = interpolate(stripGuidanceContent(m.content), ctx);
    } else {
      modules.push(buildGeneratedModule(m, ctx));
    }
  });

  // MI files: collect modul-4, modul-8, modul-6.3, and modul-11 fragments (each combined into 1)
  const modul4Contents: string[] = [];
  const modul8Contents: string[] = [];
  const modul63Contents: string[] = [];
  const modul11MIContents: string[] = [];
  top3MI.forEach((mi, index) => {
    const miRaw = MI_RAW_MAP[mi.key];
    const currentMedia = MI_MEDIA[mi.key];
    const currentScore = mi.score.toString();
    parseMultiModule(miRaw).forEach(m => {
      if (m.id === 4) {
        let content = stripGuidanceContent(m.content);
        content = content
          .replaceAll('{{currentMIMedia}}', currentMedia)
          .replaceAll('{{currentMIScore}}', currentScore);
        if (index > 0) {
          content = removeSection(content, 'Peta Skor');
          // Strip the H1 ("# MODUL 4: ...") and H2 ("## Fokus Kecerdasan Dominan ...") so that
          // MI #2 and #3 only contribute their H3 subsection. MI #1 keeps the
          // full structure (H1 + Peta Skor + Fokus + H3) -> no triplicated headings.
          content = content.replace(/^# MODUL 4[^\n]*\n/gm, '');
          content = content.replace(/^## Fokus Kecerdasan Dominan[^\n]*\n/gm, '');
          content = content.trim();
        }
        modul4Contents.push(interpolate(content, ctx));
      } else if (Math.abs(m.id - 6.3) < 0.01) {
        const contentWithMedia = m.content
          .replaceAll('{{currentMIMedia}}', currentMedia)
          .replaceAll('{{currentMIScore}}', currentScore);
        modul63Contents.push(interpolate(stripGuidanceContent(contentWithMedia), ctx));
      } else if (m.id === 11) {
        const contentWithMedia = m.content
          .replaceAll('{{currentMIMedia}}', currentMedia)
          .replaceAll('{{currentMIScore}}', currentScore);
        modul11MIContents.push(interpolate(stripGuidanceContent(contentWithMedia), ctx));
      } else if (m.id === 8) {
        // Collect modul 8 fragments to combine into a single module below.
        let content8 = stripGuidanceContent(m.content);
        content8 = content8
          .replaceAll('{{currentMIMedia}}', currentMedia)
          .replaceAll('{{currentMIScore}}', currentScore);
        const miEmoji = MI_EMOJI[mi.key] || '🎯';
        const miLabel = MI_ACTIVITIES_LABEL[mi.key] || mi.name;
        if (index === 0) {
          // MI #1: Keep Lingkungan (environment) + Rekomendasi (activities), add H3 label before Rekomendasi
          content8 = content8.replace(
            /(## Rekomendasi[^\n]*)/,
            `### ${miEmoji} Rekomendasi Aktivitas ${miLabel} (Pilih yang Disukai)\n\n$1`
          );
        } else {
          // MI #2/#3: Strip Lingkungan (environment) section and any H1, replace Rekomendasi heading with H3 label
          content8 = removeSection(content8, 'Lingkungan');
          content8 = content8.replace(/^# MODUL 8[^\n]*\n/gm, '');
          content8 = content8.replace(
            /## Rekomendasi[^\n]*\n/,
            `### ${miEmoji} Rekomendasi Aktivitas ${miLabel} (Pilih yang Disukai)\n`
          );
        }
        modul8Contents.push(interpolate(content8, ctx));
      } else {
        const contentWithMedia = m.content
          .replaceAll('{{currentMIMedia}}', currentMedia)
          .replaceAll('{{currentMIScore}}', currentScore);
        modules.push(buildGeneratedModule({ ...m, content: contentWithMedia }, ctx));
      }
    });
  });

  // Combine the 3 modul-8 fragments into one, wrapped by the callout + H1 template
  const modul8Chapter = getChapterInfo(8);
  const combinedModul8Content = modul8Wrapper
    .replaceAll('{{modul8Content}}', modul8Contents.join('\n\n---\n\n'))
    .replaceAll('{{childName}}', child.name)
    .replace(/^# MODUL \d+(?:\.\d+)?:/m, `# MODUL ${modul8Chapter.moduleCode.replace('Modul ', '')}:`);
  modules.push({
    moduleId: 8,
    moduleCode: modul8Chapter.moduleCode,
    chapter: modul8Chapter.chapter,
    chapterTitle: modul8Chapter.chapterTitle,
    title: 'Bank Ide Aktivitas & Belajar',
    sectionGroup: modul8Chapter.chapterTitle,
    markdownContent: combinedModul8Content,
    isAiGenerated: false,
    lastUpdated: today
  });

  // Combine the 3 modul-4 fragments into one + append the MI disclaimer
  const modul4Chapter = getChapterInfo(4);
  const disclaimerContent = miDisclaimer.replaceAll('{{childName}}', child.name);
  const combinedModul4Content = (modul4Contents.join('\n\n---\n\n') + '\n\n' + disclaimerContent)
    .replace(/^# MODUL \d+(?:\.\d+)?:/m, `# MODUL ${modul4Chapter.moduleCode.replace('Modul ', '')}:`);
  modules.push({
    moduleId: 4,
    moduleCode: modul4Chapter.moduleCode,
    chapter: modul4Chapter.chapter,
    chapterTitle: modul4Chapter.chapterTitle,
    title: 'Profil Kecerdasan',
    sectionGroup: modul4Chapter.chapterTitle,
    markdownContent: combinedModul4Content,
    isAiGenerated: false,
    lastUpdated: today
  });

  // Generate Modul 4.4 — Sinergi
  const top3MIKeys = top3MI.map(mi => mi.key);
  const topMINames = top3MI.map(mi => mi.name);
  const archetypeFragment = archetypeSynergyFragments[archetype.id] || '';
  const miFragment1 = miSynergyFragments[top3MIKeys[0] as string] || '';
  const miFragment2 = miSynergyFragments[top3MIKeys[1] as string] || '';
  const miFragment3 = miSynergyFragments[top3MIKeys[2] as string] || '';

  const modul44Chapter = getChapterInfo(4.4);
  const modul44Content = stripGuidanceContent(modul44Template
    .replaceAll('{{archetypeSynergyFragment}}', archetypeFragment)
    .replaceAll('{{miSynergyFragment_1}}', miFragment1)
    .replaceAll('{{miSynergyFragment_2}}', miFragment2)
    .replaceAll('{{miSynergyFragment_3}}', miFragment3)
    .replaceAll('{{childName}}', child.name)
    .replaceAll('{{archetypeTitle}}', archetype.title)
    .replaceAll('{{topMI1_Name}}', topMINames[0] || '')
    .replaceAll('{{topMI2_Name}}', topMINames[1] || '')
    .replaceAll('{{topMI3_Name}}', topMINames[2] || ''))
    .replace(/^# MODUL \d+(?:\.\d+)?:/m, `# MODUL ${modul44Chapter.moduleCode.replace('Modul ', '')}:`);

  modules.push({
    moduleId: 4.4,
    moduleCode: modul44Chapter.moduleCode,
    chapter: modul44Chapter.chapter,
    chapterTitle: modul44Chapter.chapterTitle,
    title: 'Sinergi Karakter & Kecerdasan',
    sectionGroup: modul44Chapter.chapterTitle,
    markdownContent: modul44Content,
    isAiGenerated: false,
    lastUpdated: today
  });

  // Generate Modul 6.3 — Penanganan Emosi Berbasis Kecerdasan
  const modul63Chapter = getChapterInfo(6.3);
  const modul63Content = modul63Template
    .replaceAll('{{miCalmingFragment_1}}', modul63Contents[0] || '')
    .replaceAll('{{miCalmingFragment_2}}', modul63Contents[1] || '')
    .replaceAll('{{miCalmingFragment_3}}', modul63Contents[2] || '')
    .replaceAll('{{childName}}', child.name)
    .replace(/^# MODUL \d+(?:\.\d+)?:/m, `# MODUL ${modul63Chapter.moduleCode.replace('Modul ', '')}:`);

  modules.push({
    moduleId: 6.3,
    moduleCode: modul63Chapter.moduleCode,
    chapter: modul63Chapter.chapter,
    chapterTitle: modul63Chapter.chapterTitle,
    title: 'Penanganan Emosi Berbasis Kecerdasan',
    sectionGroup: modul63Chapter.chapterTitle,
    markdownContent: modul63Content,
    isAiGenerated: false,
    lastUpdated: today
  });

  // Assemble Modul 11 — Misi Bintang 21 Misi
  const modul11Chapter = getChapterInfo(11);
  const miMissions = modul11MIContents.join('\n\n');
  const finaleContent = interpolate(stripGuidanceContent(modul11Finale), ctx);

  const modul11Content = modul11Wrapper
    .replaceAll('{{archetypeMissions}}', archetypeMissions)
    .replaceAll('{{miMissions}}', miMissions)
    .replaceAll('{{finaleMission}}', finaleContent)
    .replaceAll('{{childName}}', child.name)
    .replaceAll('{{archetypeTitle}}', archetype.title)
    .replaceAll('{{topMI1_Name}}', topMINames[0] || '')
    .replaceAll('{{topMI2_Name}}', topMINames[1] || '')
    .replaceAll('{{topMI3_Name}}', topMINames[2] || '')
    .replace(/^# MODUL \d+(?:\.\d+)?:/m, `# MODUL ${modul11Chapter.moduleCode.replace('Modul ', '')}:`);

  modules.push({
    moduleId: 11,
    moduleCode: modul11Chapter.moduleCode,
    chapter: modul11Chapter.chapter,
    chapterTitle: modul11Chapter.chapterTitle,
    title: 'Misi Bintang 21 Hari',
    sectionGroup: modul11Chapter.chapterTitle,
    markdownContent: modul11Content,
    isAiGenerated: false,
    lastUpdated: today
  });

  // Sort by chapter, then by moduleCode numeric value (e.g., 2.1 < 2.2 < 2.3 < 3.1)
  modules.sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    const aNum = parseFloat(a.moduleCode.replace('Modul ', ''));
    const bNum = parseFloat(b.moduleCode.replace('Modul ', ''));
    return aNum - bNum;
  });

  return {
    childProfile: child,
    archetype,
    generatedAt: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
    title: `Peta Bintang ${child.name}`,
    subtitle: `Panduan Personalisasi Karakter (${archetype.title}) & Kecerdasan Majemuk`,
    modules
  };
}

// ============================================================================
// HTML rendering
// ============================================================================

/** Escape a plain string for safe insertion into HTML text/attributes. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================================
// Mascot illustration helpers
// ============================================================================

/**
 * Resolve the 4 mascot poses for the MATCHED archetype to INLINE base64
 * `data:` URIs read from `src/assets/mascots/` on disk.
 *
 * Why inline (changed from `/mascots/...` URLs served by Express):
 * the previous URL approach required the headless Chromium page (created via
 * `page.setContent()` with an injected `<base href>`) to fetch images over the
 * network from the running Express server. When that fetch failed — IPv6
 * localhost resolution, proxy/HTTPS-first interference, or the static route
 * pointing at the wrong path in the bundled `dist/server.mjs` — the
 * `onerror` handler silently hid the images and the PDF was produced with NO
 * mascots and no warning. Embedding the 4 poses as base64 removes the network
 * dependency entirely: the PDF is self-contained and works in dev, in the
 * production bundle, and in standalone `dist-preview` files opened via
 * `file://`.
 *
 * Size guard: only the matched archetype's 4 poses are embedded (webp files
 * are ~50–120 KB each → roughly 300–400 KB of base64 per ebook HTML). The
 * earlier "massive base64 payload" OOM concern applied to embedding ALL 40
 * mascot images, which we do NOT do. If a file is missing on disk, the pose
 * falls back to the site-relative `/mascots/...` URL and a warning is logged.
 *
 * Filename patterns (verified against src/assets/mascots/):
 *   hero        : pb-mascot-archetype-ark-{name}-v01.webp
 *   default     : pb-mascot-ark-{name}-default-v01.webp
 *   reading     : pb-mascot-ark-{name}-reading-v01.webp
 *   tipPointing : pb-mascot-ark-{name}-tip-pointing-v01.webp
 *
 * archetypeId (e.g. "ARK_NEBULA_OWL") → prefix ("ark-nebula-owl"). Note: the
 * prefix already begins with "ark-", so pose suffixes use `${prefix}-<pose>`
 * (NOT `ark-${prefix}-<pose>`, which would double the "ark-" token).
 */
const mascotDataUriCache = new Map<string, string>();

function getMascotUrl(archetypeId: string): {
  hero: string;
  default: string;
  reading: string;
  tipPointing: string;
} {
  // Convert archetype ID (ARK_NEBULA_OWL) to filename token (ark-nebula-owl).
  const prefix = archetypeId.toLowerCase().replace(/_/g, '-');

  function getSrc(nameSuffix: string): string {
    const fileName = `pb-mascot-${nameSuffix}-v01.webp`;
    let uri = mascotDataUriCache.get(fileName);
    if (uri) return uri;

    const filePath = path.join(PROJECT_ROOT, 'src', 'assets', 'mascots', fileName);
    try {
      const bytes = fs.readFileSync(filePath);
      uri = `data:image/webp;base64,${bytes.toString('base64')}`;
    } catch {
      console.warn(`[ebook] Mascot file not found on disk, falling back to URL: ${fileName}`);
      uri = `/mascots/${fileName}`;
    }
    mascotDataUriCache.set(fileName, uri);
    return uri;
  }

  return {
    hero: getSrc(`archetype-${prefix}`),
    default: getSrc(`${prefix}-default`),
    reading: getSrc(`${prefix}-reading`),
    tipPointing: getSrc(`${prefix}-tip-pointing`)
  };
}

/**
 * Build an <img> tag for a mascot URL. Returns an empty string when the source
 * is missing so no broken-image icon is ever rendered. An onerror handler is
 * added as a belt-and-braces guard against broken images (e.g. if a network
 * fetch fails when rendered by Puppeteer). `alt` is required for WCAG 1.1.1.
 */
function buildImgTag(src: string, style: string, alt: string): string {
  if (!src) return '';
  return `<img src="${src}" alt="${alt}" style="${style}" onerror="this.style.display='none'" />`;
}

/** The embedded CSS — brand palette (Jacarta/Wisteria/Casablanca) + markdown typography. */
const CSS = `
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto !important; } }
body {
  font-family: 'Plus Jakarta Sans', Arial, Helvetica, sans-serif;
  background: ${PALETTE.paper};
  color: ${PALETTE.ink};
  max-width: 820px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  line-height: 1.75;
  font-size: 16px;
  overflow-x: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
a:focus-visible, button:focus-visible { outline: 2px solid ${PALETTE.botanical}; outline-offset: 2px; border-radius: 4px; }

/* ---------- Cover page ---------- */
.cover {
  text-align: center;
  padding: 84px 32px 64px;
  border: 1px solid ${PALETTE.outlineVariant};
  margin-bottom: 48px;
  background: ${GRADIENTS.coverHero};
  border-radius: ${RADIUS.card};
  box-shadow: ${SHADOWS.card};
  color: #FFFFFF;
}
.cover .badge {
  display: inline-block;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #FFFFFF;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.32);
  padding: 7px 18px;
  border-radius: 999px;
  margin-bottom: 22px;
}
.cover img { max-width: 200px; max-height: 200px; margin: 0 auto 24px; display: block; border-radius: 16px; box-shadow: ${SHADOWS.lift}; }
.cover .star-divider { color: ${PALETTE.starlight}; font-size: 1.3rem; letter-spacing: 0.3em; margin: 22px 0; text-shadow: 0 2px 12px rgba(248,187,83,0.45); }
.cover h1 {
  font-size: 2.8rem;
  font-weight: 800;
  margin: 0 0 10px;
  color: #FFFFFF;
  border: none;
  padding: 0;
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-family: 'Nunito', 'Plus Jakarta Sans', sans-serif;
  text-shadow: 0 2px 16px rgba(28, 26, 46, 0.35);
}
.cover .subtitle {
  font-size: 1.12rem;
  color: ${PALETTE.starlight};
  font-style: italic;
  margin: 4px 0 0;
}
.cover .meta {
  margin-top: 34px;
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.9;
}
.cover .meta strong { color: #FFFFFF; }

/* ---------- Table of contents ---------- */
.toc {
  background: ${GRADIENTS.warmTint};
  border: 1px solid ${PALETTE.outlineVariant};
  border-radius: ${RADIUS.card};
  box-shadow: ${SHADOWS.soft};
  padding: 32px 36px;
  margin-bottom: 56px;
}
.toc h2 {
  margin-top: 0;
  font-size: 1.3rem;
  color: ${PALETTE.ink};
  border-bottom: 1px solid ${PALETTE.outlineVariant};
  padding-bottom: 12px;
  font-family: 'Nunito', 'Plus Jakarta Sans', sans-serif;
}
.toc ol.toc-chapters { list-style: none; padding: 0; margin: 0; }
.toc li.toc-chapter { margin-bottom: 14px; }
.toc .toc-chapter-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: ${PALETTE.botanicalDeep};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 6px 10px;
  margin-bottom: 4px;
  border-bottom: 1px solid ${PALETTE.outlineVariant};
}
.toc li.toc-chapter ul { list-style: none; padding: 0; margin: 0; }
.toc li.toc-chapter li { margin-bottom: 4px; }
.toc li.toc-chapter li a {
  color: ${PALETTE.ink};
  text-decoration: none;
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  transition: background 0.15s;
  font-size: 0.9rem;
}
.toc li.toc-chapter li a:hover { background: ${PALETTE.botanicalTint}; color: ${PALETTE.botanicalDeep}; }
.toc .toc-code {
  font-family: 'Consolas', monospace;
  font-size: 0.72rem;
  background: ${PALETTE.botanicalTint};
  color: ${PALETTE.botanicalDeep};
  padding: 2px 7px;
  border-radius: 5px;
  font-weight: 700;
  margin-right: 4px;
  white-space: nowrap;
}

/* ---------- Module blocks ---------- */
.module {
  border-top: 1px solid ${PALETTE.outlineVariant};
  border-image: ${GRADIENTS.primary} 1;
  border-image-slice: 1;
  margin-top: 56px;
  padding-top: 30px;
  scroll-margin-top: 20px;
}
.module:first-of-type { border-top: none; margin-top: 0; }
.module-header { margin-bottom: 20px; }
.module-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${PALETTE.botanical};
  font-weight: 700;
  margin: 0 0 6px;
  font-family: 'Consolas', monospace;
}
.module-header h2 {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  color: ${PALETTE.ink};
  border: none;
  padding: 0;
  font-family: 'Nunito', 'Plus Jakarta Sans', sans-serif;
}

/* ---------- Markdown typography (rendered by marked) ----------
   NOTE: markdown H1 ("# MODUL X:") is demoted one level in renderEbookToHtml,
   so module-header h2 is the page's H2 and markdown headings start at H2 (MODUL)
   → H3 (sections). No H1 appears in module markdown. */
.markdown h2 {
  font-size: 1.4rem;
  font-weight: 800;
  margin-top: 1.6rem;
  margin-bottom: 0.85rem;
  border-bottom: 2px solid ${PALETTE.outlineVariant};
  padding-bottom: 6px;
  color: ${PALETTE.ink};
  font-family: 'Nunito', 'Plus Jakarta Sans', sans-serif;
}
.markdown h3 {
  font-size: 1.18rem;
  font-weight: 700;
  margin-top: 1.4rem;
  margin-bottom: 0.6rem;
  color: ${PALETTE.ink};
  font-family: 'Nunito', 'Plus Jakarta Sans', sans-serif;
}
.markdown h4 {
  font-size: 1.02rem;
  font-weight: 600;
  margin-top: 1.1rem;
  margin-bottom: 0.5rem;
  color: ${PALETTE.botanicalDeep};
}
.markdown h5, .markdown h6 { font-weight: 600; margin-top: 0.8rem; color: ${PALETTE.botanicalDeep}; }
.markdown p { margin: 0 0 0.9rem; text-align: justify; hyphens: auto; -webkit-hyphens: auto; }
.markdown ul { list-style-type: disc; padding-left: 1.6rem; margin: 0 0 1rem; }
.markdown ol { list-style-type: decimal; padding-left: 2.5rem; margin: 0 0 1rem; }
.markdown li { margin-bottom: 0.4rem; }
.markdown li > ul, .markdown li > ol { margin-top: 0.4rem; margin-bottom: 0; }
.markdown blockquote {
  border-left: 4px solid ${PALETTE.botanical};
  margin: 1.1rem 0;
  font-style: italic;
  color: ${PALETTE.botanicalDeep};
  background: ${GRADIENTS.warmTint};
  padding: 14px 20px;
  border-radius: 0 14px 14px 0;
  box-shadow: ${SHADOWS.soft};
}
.markdown blockquote p:last-child { margin-bottom: 0; }
.markdown blockquote p { margin-bottom: 0.6rem; }
.markdown table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2rem 0;
  font-size: 0.9rem;
}
.markdown th, .markdown td {
  border: 1px solid ${PALETTE.outlineVariant};
  padding: 8px 12px;
  text-align: left;
}
.markdown th { background: ${PALETTE.surfaceContainerHigh}; font-weight: 600; color: ${PALETTE.ink}; }
.markdown tr:nth-child(even) td { background: ${PALETTE.paper}; }
.markdown hr { border: none; text-align: center; margin: 2.5rem 0; }
.markdown hr::after { content: "\\2726 \\2726 \\2726 \\2726 \\2726"; color: ${PALETTE.starlight}; font-size: 1.2rem; letter-spacing: 0.3em; display: block; }
.markdown strong { font-weight: 700; color: ${PALETTE.ink}; }
.markdown em { font-style: italic; }
.markdown code {
  background: ${PALETTE.surfaceContainerHigh};
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
  font-size: 0.88em;
  color: ${PALETTE.botanicalDeep};
}
.markdown a { color: ${PALETTE.botanical}; text-decoration: underline; }
/* GFM task list checkboxes */
.markdown input[type="checkbox"] {
  margin-right: 6px;
  accent-color: ${PALETTE.botanical};
}

/* ---------- Misi 21 Hari cards (Modul 5.1) ---------- */
.misi-grid hr { display: none; }
.misi-card {
  border: 1px solid ${PALETTE.outlineVariant};
  border-radius: ${RADIUS.card};
  padding: 22px 26px;
  margin-bottom: 20px;
  background: #FFFFFF;
  box-shadow: ${SHADOWS.soft};
}
.misi-card h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 800;
  color: ${PALETTE.ink};
  font-family: 'Nunito', 'Plus Jakarta Sans', sans-serif;
  margin-top: 0;
  padding-bottom: 10px;
  border-bottom: 2px solid ${PALETTE.botanicalTint};
}
.misi-card h5 {
  font-size: 0.92rem;
  font-weight: 700;
  color: ${PALETTE.botanical};
  margin-top: 1rem;
  margin-bottom: 0.4rem;
}
.misi-card blockquote {
  background: ${GRADIENTS.warmTint};
  border-left: 3px solid ${PALETTE.starlight};
  font-size: 1rem;
  padding: 12px 18px;
  margin: 0.8rem 0;
  border-radius: 0 12px 12px 0;
  color: ${PALETTE.botanicalDeep};
  box-shadow: none;
}
.misi-card input[type="checkbox"] {
  margin-top: 0.8rem;
}

/* ---------- Back-to-top ---------- */
.back-top {
  display: inline-block;
  margin-top: 24px;
  font-size: 0.8rem;
  color: ${PALETTE.botanical};
  text-decoration: none;
  font-family: 'Consolas', monospace;
  opacity: 0.7;
}
.back-top:hover { opacity: 1; text-decoration: underline; }

/* ---------- Footer ---------- */
.footer {
  margin-top: 64px;
  padding-top: 24px;
  border-top: 2px solid ${PALETTE.outlineVariant};
  text-align: center;
  font-size: 0.82rem;
  color: ${PALETTE.stone};
  font-style: italic;
}

/* ---------- Chapter dividers (mascot illustrations) ---------- */
.chapter-divider img { max-width: 250px; }

/* Page break rules (also for Puppeteer preferCSSPageSize) */
table { page-break-inside: avoid; break-inside: avoid; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; break-inside: avoid; }
h1, h2, h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; }
img { page-break-inside: avoid; break-inside: avoid; }
blockquote { page-break-inside: avoid; break-inside: avoid; }
pre { page-break-inside: avoid; break-inside: avoid; }
li { page-break-inside: avoid; break-inside: avoid; }
p { page-break-inside: avoid; break-inside: avoid; }

/* ---------- Responsive: global element safety nets ---------- */
svg {
  max-width: 100% !important;
  height: auto !important;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.875rem;
  table-layout: fixed;
}
th, td {
  border: 1px solid ${PALETTE.outlineVariant};
  padding: 0.5rem 0.75rem;
  text-align: left;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
img {
  max-width: 100%;
  height: auto;
}
pre, code {
  overflow-x: auto;
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Float clearing: contain floated mascot images inside module content */
.module-content::after {
  content: "";
  display: table;
  clear: both;
}

/* ---------- Mobile responsive ---------- */
@media (max-width: 640px) {
  body {
    padding: 20px 16px;
    font-size: 15px;
  }

  /* Tables: smaller font, less padding */
  table {
    font-size: 0.7rem;
  }
  th, td {
    padding: 0.3rem 0.4rem;
  }

  /* Float images: remove float, center inline */
  div[style*="float:right"] {
    float: none !important;
    display: block !important;
    margin: 1rem auto !important;
    width: 100px !important;
    max-width: 100px !important;
  }

  /* Divider pages: compact */
  .chapter-divider {
    min-height: auto !important;
    padding: 40px 16px !important;
  }
  .chapter-divider img {
    max-width: 180px !important;
  }

  /* Module code: smaller */
  .chapter-divider p[style*="font-style:italic"] {
    font-size: 13px !important;
    max-width: 280px !important;
  }

  /* Headings: smaller */
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.2rem; }
  h3 { font-size: 1.05rem; }

  /* Cover page: compact */
  .cover {
    padding: 40px 16px;
  }
  .cover h1 {
    font-size: 1.8rem;
  }
}

/* ---------- Print ---------- */
@media print {
  /* PDF typography baseline — freeze before manual pagination review */
  body { background: white; padding: 0; max-width: none; font-family: 'Plus Jakarta Sans', Arial, Helvetica, sans-serif; font-size: 16pt; line-height: 1.7; }

  /* Readability: cap the measure so a line is ~65–72 chars instead of the
     full ~180mm content width, and stop justify (which opens ugly gaps on
     short lines). Applied to .module-body so the module header aligns with
     its content; centred so the column sits evenly between the margins. */
  .module-body { max-width: 150mm; margin-left: auto; margin-right: auto; }
  .markdown p { text-align: left; }
  .cover {
    border-radius: ${RADIUS.card};
    padding: 40px 20px;
    min-height: calc(100vh - 30mm);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: ${GRADIENTS.coverHero};
    border: 1px solid ${PALETTE.outlineVariant};
    box-shadow: none;
    margin-bottom: 0;
    break-after: page;
    page-break-after: always;
  }
  .cover img { max-width: 180px; max-height: 180px; margin: 0 auto 32px; display: block; border-radius: 16px; box-shadow: none; }
  .cover .star-divider { font-size: 1.4rem; margin: 24px 0; }
  .toc { background: ${GRADIENTS.warmTint}; border: 1px solid ${PALETTE.outlineVariant}; border-radius: ${RADIUS.card}; }
  .toc {
    break-before: page;
    page-break-before: always;
    break-after: page;
    page-break-after: always;
  }

  .markdown h2 { font-size: 22pt; }
  .markdown h3 { font-size: 20pt; }
  .markdown h4 { font-size: 18pt; }
  .markdown h5 { font-size: 16pt; }

  /* Do NOT force a break after every module: that created empty pages when a
     module already ended near a page boundary (e.g. Modul 3.2 → blank → 3.3).
     Chapter starts are already guaranteed by .chapter-divider { break-before },
     and each .module is kept intact by the header/binding rules below. */
  .module { page-break-inside: auto; }
  .module:first-of-type { page-break-before: avoid; }

  /* The header + markdown are wrapped in .module-body. We do NOT force a break
     inside it (so content flows naturally), but the header itself must never be
     separated from the first content block. */
  .module-body { page-break-inside: auto; break-inside: auto; }

  /* Keep the module header glued to the first block of its content so the
     header can never be orphaned onto a page by itself. */
  .module-header { page-break-after: avoid; break-after: avoid; page-break-inside: avoid; break-inside: avoid; }
  .module-header + .markdown { page-break-before: avoid; break-before: avoid; }
  /* Chapter dividers always start on a new page.
     Bordered card: contained within the 15mm page margin — the natural white
     margin acts as a frame. No full-bleed attempt (margin -15mm hack removed;
     Puppeteer page margin is a non-paintable print area). */
  .chapter-divider {
    page-break-before: always;
    page-break-after: always;
    min-height: calc(100vh - 30mm);
    box-sizing: border-box;
  }

  /* === PAGE BREAK PREVENTION RULES === */

  /* Tables: never split across pages */
  table { page-break-inside: avoid; break-inside: avoid; }
  thead { display: table-header-group; } /* Repeat header on each page if table MUST break */
  tr { page-break-inside: avoid; break-inside: avoid; }

  /* Headings: never orphaned at bottom of page */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    break-after: avoid;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Images & figures: never split */
  img { page-break-inside: avoid; break-inside: avoid; }
  figure { page-break-inside: avoid; break-inside: avoid; }

  /* Blockquotes: keep together */
  blockquote { page-break-inside: avoid; break-inside: avoid; }

  /* Code blocks: keep together */
  pre { page-break-inside: avoid; break-inside: avoid; }

  /* List items: don't split individual items */
  li { page-break-inside: avoid; break-inside: avoid; }

  /* Paragraphs: allow long ones to flow across pages (avoiding a near-empty
     page when a single long paragraph cannot fit). Keep at least 2 lines
     together at the break to avoid ugly single-line orphans/widows. */
  p {
    orphans: 2;
    widows: 2;
  }

  /* Callout boxes / tip sections / misi cards: keep together */
  .callout, .tip-box, .tip-ahli, .misi-card { page-break-inside: avoid; break-inside: avoid; }

  /* Misi card blockquote: besarkan 1-2pt dari default utk keterbacaan PDF */
  .misi-card blockquote { font-size: 14pt; }

  /* Utility: hidden in print */
  .back-top, .footer { display: none; }
}
`;

/** Build the full standalone HTML document for one ebook. */
export function renderEbookToHtml(ebook: CompleteEbook): string {
  const child = ebook.childProfile;

  // Group modules by chapter (modules are already sorted by chapter/moduleCode).
  const chapters: { chapter: number; title: string; modules: { mod: GeneratedEbookModule; idx: number }[] }[] = [];
  ebook.modules.forEach((mod, idx) => {
    const last = chapters[chapters.length - 1];
    if (!last || last.chapter !== mod.chapter) {
      chapters.push({ chapter: mod.chapter, title: mod.chapterTitle, modules: [] });
    }
    chapters[chapters.length - 1].modules.push({ mod, idx });
  });

  // Build a chapter-grouped TOC.
  const tocChapters = chapters
    .map((ch) => {
      const items = ch.modules
        .map(({ mod, idx }) => {
          const code = escapeHtml(mod.moduleCode);
          const title = escapeHtml(mod.title);
          return `        <li><a href="#mod-${idx}"><span class="toc-code">${code}</span>${title}</a></li>`;
        })
        .join('\n');
      return `      <li class="toc-chapter">
        <span class="toc-chapter-label">BAB ${ch.chapter}: ${escapeHtml(ch.title)}</span>
        <ul>
${items}
        </ul>
      </li>`;
    })
    .join('\n');

  // Resolve the 4 mascot poses for the matched archetype to static URL paths
  // served by Express (/mascots/...). Keeps the HTML payload small (no base64).
  const mascots = getMascotUrl(ebook.archetype.id);

  // Build module sections — 1 full-page chapter divider per chapter (not per
  // module), followed by all modules in that chapter. Contextual mascot poses
  // are still injected per-module (reading pose for Modul 1 & 3, default pose
  // elsewhere, and tip-pointing pose next to every "Tips Ahli" callout).
  const moduleSections = chapters
    .map((ch) => {
      // 1 divider page for the chapter (hero pose).
      const dividerStyle = CHAPTER_DIVIDER_STYLES[ch.chapter] ?? CHAPTER_DIVIDER_STYLES[1];
      const heroImg = buildImgTag(
        mascots.hero,
        'max-width:250px;max-height:350px;margin-bottom:30px;border-radius:16px;box-shadow:0 20px 60px rgba(33,29,23,0.18);',
        `Ilustrasi mascot arketipe ${escapeHtml(ebook.archetype.title)} - pose pahlawan`
      );
      const chapterLabel = `BAB ${ch.chapter}: ${ch.title}`;
      const dividerHtml = `<div class="chapter-divider" style="page-break-after:always;min-height:90vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:64px 24px;background:${dividerStyle.background};color:${dividerStyle.text};border:1px solid ${PALETTE.outlineVariant};border-radius:${RADIUS.card};box-shadow:${SHADOWS.card};">
      ${heroImg}
      <p style="font-size:11px;letter-spacing:${dividerStyle.labelSpacing};color:${dividerStyle.accent};text-transform:uppercase;margin-bottom:8px;">${escapeHtml(chapterLabel)}</p>
      <p style="font-size:15px;color:${dividerStyle.quoteColor};font-style:italic;font-weight:300;margin:24px auto 0;max-width:360px;line-height:1.7;letter-spacing:0.01em;">"${CHAPTER_QUOTES[ch.chapter] || ''}"</p>
      <p style="margin-top:32px;color:${dividerStyle.accent};letter-spacing:0.5em;font-size:1.2rem;">✦ ✦ ✦</p>
    </div>`;

      // All modules in this chapter (no divider between them).
      const moduleHtml = ch.modules
        .map(({ mod, idx }) => {
          let htmlBody = marked.parse(mod.markdownContent) as string;

          // Demote markdown headings one level (H1→H2, H2→H3, …) so the
          // module-header <h2> is the page's H2 and markdown "MODUL X:" (H1)
          // becomes H2 — no heading-order jump (WCAG 1.3.1/1.3.2). H6 is left.
          htmlBody = htmlBody.replace(/<(\/?)h([1-5])\b/g, (_m, slash, n) => `<${slash}h${Number(n) + 1}`);

          // Inject reading pose (Modul 1 & 3) or default pose (other modules)
          // immediately after the first <h2> in the rendered markdown (was <h1>).
          const isReadingModul = mod.moduleId === 1 || mod.moduleId === 3;
          const poseSrc = isReadingModul ? mascots.reading : mascots.default;
          const poseWidth = isReadingModul ? '120px' : '100px';
          const poseImg = buildImgTag(
            poseSrc,
            'width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(33,29,23,0.12);',
            `Mascot ${escapeHtml(ebook.archetype.title)} sedang membaca`
          );
          if (poseImg) {
            const poseDiv = `<div style="float:right;margin:0 0 1rem 1.5rem;width:${poseWidth};">${poseImg}</div>`;
            htmlBody = htmlBody.replace(/(<h2[^>]*>.*?<\/h2>)/s, `$1\n${poseDiv}`);
          }

          // Inject tip-pointing pose next to every "Tips Ahli" callout.
          const tipImg = buildImgTag(mascots.tipPointing, 'width:100%;border-radius:8px;', `Mascot ${escapeHtml(ebook.archetype.title)} memberi tips`);
          if (tipImg) {
            const tipDiv = `<div style="float:right;margin:0 0 0.5rem 1rem;width:70px;">${tipImg}</div>`;
            htmlBody = htmlBody.replace(/(💡\s*<strong>Tips Ahli)/g, `${tipDiv}$1`);
          }

          // Misi 21 Hari (Modul 5.1): wrap each mission in a visual card.
          // After demotion, mission headings are <h4>MISI ...</h4>. Split by
          // h4-MISI blocks (bounded by next h3/h4/hr/end) → .misi-card divs.
          if (mod.moduleId === 11) {
            htmlBody = htmlBody.replace(
              /(<h4[^>]*>[^<]*MISI[\s\S]*?)(?=<h[34][^>]*>|<hr|$)/gi,
              '<div class="misi-card">$1</div>'
            );
            htmlBody = `<div class="misi-grid">${htmlBody}</div>`;
          }

          return `    <section class="module module-content" id="mod-${idx}" style="overflow:hidden;">
      <div class="module-body">
      <div class="module-header">
        <p class="module-label">BAB ${mod.chapter}: ${escapeHtml(mod.chapterTitle)} &bull; ${escapeHtml(mod.moduleCode)}</p>
        <h2>${escapeHtml(mod.title)}</h2>
      </div>
      <div class="markdown">
${htmlBody}
      </div>
      </div>
      <a href="#top" class="back-top">&uarr; Kembali ke Daftar Isi</a>
    </section>`;
        })
        .join('\n\n');

      return `${dividerHtml}\n${moduleHtml}`;
    })
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(ebook.title)} - Ebook Personalisasi</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
${CSS}
  </style>
</head>
<body id="top">

  <!-- ===== Cover page ===== -->
  <div class="cover">
    <span class="badge">Ebook Personalisasi Peta Bintang</span>
    ${buildImgTag(mascots.hero, 'max-width:200px;max-height:200px;margin:0 auto 24px;display:block;border-radius:16px;', `Ilustrasi mascot arketipe ${escapeHtml(ebook.archetype.title)}`)}
    <h1>${escapeHtml(ebook.title)}</h1>
    <p class="subtitle">${escapeHtml(ebook.subtitle)}</p>
    <p class="star-divider">✦ ✦ ✦ ✦ ✦</p>
    <div class="meta">
      <p><strong>Anak:</strong> ${escapeHtml(child.name)} (${child.age} Tahun, ${escapeHtml(child.gender)})</p>
      <p><strong>Orang Tua:</strong> ${escapeHtml(child.parentName || 'Orang Tua')}</p>
      <p><strong>Arketipe:</strong> ${escapeHtml(ebook.archetype.title)} &mdash; &ldquo;${escapeHtml(ebook.archetype.slogan)}&rdquo;</p>
      <p><strong>Diterbitkan:</strong> ${escapeHtml(ebook.generatedAt)}</p>
    </div>
  </div>

  <!-- ===== Table of contents ===== -->
  <nav class="toc" id="toc">
    <h2>&#128214; Daftar Isi (${chapters.length} Bab)</h2>
    <ol class="toc-chapters">
${tocChapters}
    </ol>
  </nav>

  <!-- ===== Modules ===== -->
  <main>
${moduleSections}
  </main>

  <!-- ===== Footer ===== -->
  <div class="footer">
    Ebook ini digenerate oleh Peta Bintang &mdash; ${escapeHtml(ebook.generatedAt)}<br>
    ${chapters.length} bab &bull; ${ebook.modules.length} modul &bull; Profil: ${escapeHtml(child.name)}
  </div>

</body>
</html>`;
}

// ============================================================================
// Main — generate 3 HTML files
// ============================================================================

function main(): void {
  const outDir = path.join(__dirname, 'dist-preview');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Generating standalone HTML ebooks...\n');

  for (const profile of SAMPLE_PROFILES) {
    const ebook = generateEbook(profile);
    const html = renderEbookToHtml(ebook);

    // File name: lowercase first name (budi, aisyah, reyhan)
    const slug = profile.name.split(' ')[0].toLowerCase();
    const outFile = path.join(outDir, `ebook-${slug}.html`);
    fs.writeFileSync(outFile, html, 'utf-8');

    const sizeKb = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
    console.log(`  ✓ ${path.basename(outFile)}`);
    console.log(`    Anak   : ${profile.name} (${profile.age} thn)`);
    console.log(`    Arketipe: ${ebook.archetype.title}`);
    console.log(`    Modul  : ${ebook.modules.length} modul (5 bab)`);
    console.log(`    Ukuran : ${sizeKb} KB\n`);
  }

  console.log('Selesai! 3 file HTML tersimpan di dist-preview/');
  console.log('Buka dengan double-click di browser, atau Ctrl+P untuk cetak/PDF.');
}

// Only run main when this file is executed directly via
// `npx tsx generate-html-preview.ts` — NOT when it is imported by server.ts.
//
// IMPORTANT: do NOT compare `process.argv[1] === __filename`. In the production
// bundle (esbuild merges this module into dist/server.mjs) both sides resolve to
// dist/server.mjs, so the check would be true on every `node dist/server.mjs`
// start — silently regenerating 3 large HTML files into dist-preview/ on each
// boot. Compare the *basename* of the entrypoint instead: it is only
// "generate-html-preview.*" when this script is run standalone.
const entryBasename = process.argv[1] ? path.basename(process.argv[1]).toLowerCase() : '';
if (entryBasename.startsWith('generate-html-preview')) {
  main();
}
