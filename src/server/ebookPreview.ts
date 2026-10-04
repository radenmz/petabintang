/**
 * Ebook preview masking (Track A2).
 *
 * Module codes whose full content is shown to unpaid users as a free preview
 * (mirrors ResultStep.tsx `isFree` logic). All other modules have their
 * markdownContent truncated to a short excerpt so the sales-page teasers still
 * work, but the full paid content never leaves the server until payment is
 * confirmed.
 */
import type { CompleteEbook } from '../types';

const FREE_MODULE_CODES = new Set(['Modul 1.1', 'Modul 2.1']);
const PREVIEW_EXCERPT_CHARS = 320;

export function applyPreviewMask(ebook: CompleteEbook): CompleteEbook {
  return {
    ...ebook,
    modules: ebook.modules.map(m =>
      FREE_MODULE_CODES.has(m.moduleCode)
        ? m
        : { ...m, markdownContent: m.markdownContent.slice(0, PREVIEW_EXCERPT_CHARS) }
    ),
  };
}
