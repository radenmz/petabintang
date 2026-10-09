export interface OceanScores {
  openness: number; // 1-10
  conscientiousness: number; // 1-10
  extraversion: number; // 1-10
  agreeableness: number; // 1-10
  neuroticism: number; // 1-10 (resilience inverse)
}

export interface MIScores {
  linguistic: number; // 0-100
  logical: number; // 0-100
  spatial: number; // 0-100
  kinesthetic: number; // 0-100
  musical: number; // 0-100
  interpersonal: number; // 0-100
  intrapersonal: number; // 0-100
  naturalist: number; // 0-100
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number; // 3-12
  gender: 'Laki-laki' | 'Perempuan';
  parentName: string;
  oceanScores: OceanScores;
  miScores: MIScores;
  archetypeId: string;
  createdDate: string;
}

export interface ArchetypeDefinition {
  id: string;
  title: string;
  slogan: string;
  badge: string;
  description: string;
  avatarIcon: string;
  oceanPattern: {
    o: 'high' | 'med' | 'low';
    c: 'high' | 'med' | 'low';
    e: 'high' | 'med' | 'low';
    a: 'high' | 'med' | 'low';
    n: 'high' | 'med' | 'low';
  };
  ref: {
    O: number;
    C: number;
    E: number;
    A: number;
    R: number; // Resiliensi = 11 - N (inverted Neuroticism)
  };
  strengths: string[];
  challenges: string[];
  learningStyleSummary: string;
  communicationStyle: string;
  markdownTemplatePrompt: string;
}

export type WizardStep = 'landing' | 'input' | 'quiz' | 'result' | 'payment' | 'reader';

export interface EbookModule {
  id: number;
  code: string; // e.g. "Modul 0"
  title: string;
  sectionGroup: 'BAGIAN 1: PENGANTAR' | 'BAGIAN 2: KARAKTER' | 'BAGIAN 3: KECERDASAN' | 'BAGIAN 4: PANDUAN PRAKTIS';
  pageEstimate: string;
  subsections: string[];
  staticMarkdownTemplate: string;
  aiPromptGuidance: string;
}

export interface GeneratedEbookModule {
  moduleId: number;
  moduleCode: string;        // e.g., "Modul 2.1"
  chapter: number;           // 1-5
  chapterTitle: string;      // e.g., "KARAKTER ANAK"
  title: string;
  sectionGroup: string;      // Kept for backward compat, but chapter/chapterTitle take precedence
  markdownContent: string;
  isAiGenerated: boolean;
  lastUpdated: string;
}

export interface CompleteEbook {
  childProfile: ChildProfile;
  archetype: ArchetypeDefinition;
  generatedAt: string;
  title: string;
  subtitle: string;
  modules: GeneratedEbookModule[];
}

export interface AssessmentQuestion {
  id: number;
  type: 'OCEAN' | 'MI';
  dimension: string;
  statement: string;
  /**
   * Contoh konkret perilaku sehari-hari agar orang tua lebih mudah menilai.
   * Ditonjolkan di bawah pernyataan. Diambil dari `questionExamples.ts`.
   */
  example?: string;
  reverse: boolean; // true => reverse-scored (6 - val) per IPIP conventions
}
