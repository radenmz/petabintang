import { describe, it, expect } from 'vitest';
import { applyPreviewMask } from '../ebookPreview.ts';
import type { CompleteEbook, GeneratedEbookModule } from '../../types.ts';

function mod(moduleCode: string, markdownContent: string): GeneratedEbookModule {
  return {
    moduleId: 1,
    moduleCode,
    chapter: 1,
    chapterTitle: 'PENGANTAR',
    title: 'Test',
    sectionGroup: 'PENGANTAR',
    markdownContent,
    isAiGenerated: false,
    lastUpdated: '2026-01-01',
  };
}

const ebook = {
  childProfile: {},
  archetype: {},
  generatedAt: '2026-01-01',
  title: 'T',
  subtitle: 'S',
  modules: [
    mod('Modul 1.1', 'FULL-FREE-1 '.repeat(100)),
    mod('Modul 2.1', 'FULL-FREE-2 '.repeat(100)),
    mod('Modul 3.1', 'PAID-CONTENT '.repeat(100)),
  ],
} as unknown as CompleteEbook;

describe('applyPreviewMask', () => {
  it('keeps free modules untouched', () => {
    const masked = applyPreviewMask(ebook);
    expect(masked.modules[0].markdownContent).toBe(ebook.modules[0].markdownContent);
    expect(masked.modules[1].markdownContent).toBe(ebook.modules[1].markdownContent);
  });

  it('truncates non-free modules to a short excerpt', () => {
    const masked = applyPreviewMask(ebook);
    expect(masked.modules[2].markdownContent.length).toBeLessThan(ebook.modules[2].markdownContent.length);
    expect(masked.modules[2].markdownContent.length).toBeLessThanOrEqual(320);
  });

  it('preserves module metadata while masking content', () => {
    const masked = applyPreviewMask(ebook);
    expect(masked.modules[2].moduleCode).toBe('Modul 3.1');
    expect(masked.modules[2].title).toBe(ebook.modules[2].title);
  });

  it('does not mutate the original ebook', () => {
    const before = ebook.modules[2].markdownContent;
    applyPreviewMask(ebook);
    expect(ebook.modules[2].markdownContent).toBe(before);
  });
});
