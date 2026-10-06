/**
 * Browser-side persistence for the assessment flow.
 *
 * Two independent pieces of state are kept in localStorage:
 *
 *   1. `pb_quiz_progress_v1` — an in-progress quiz draft (identity + answers +
 *      current question). Lets a parent resume after an accidental refresh/close
 *      instead of restarting 75 questions.
 *   2. `pb_active_token` — the capability token of the most recent saved order.
 *      If a visitor returns to the site without a `?token=` in the URL, we can
 *      send them straight back to their result/paywall (or paid reader).
 *
 * This module only runs in the browser (imported by React components). It is
 * defensive about missing/parsing-bad values and never throws.
 */

const QUIZ_PROGRESS_KEY = 'pb_quiz_progress_v1';
const ACTIVE_TOKEN_KEY = 'pb_active_token';

export interface QuizProgress {
  name: string;
  age: number;
  gender: 'Laki-laki' | 'Perempuan';
  parentName: string;
  answers: Record<number, number>;
  currentQuestionIndex: number;
  savedAt: string;
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    // Private mode / storage disabled — degrade silently.
    return null;
  }
}

export function saveQuizProgress(progress: Omit<QuizProgress, 'savedAt'>): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const payload: QuizProgress = { ...progress, savedAt: new Date().toISOString() };
    storage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(payload));
  } catch {
    // Quota / serialization errors are non-fatal.
  }
}

export function loadQuizProgress(): QuizProgress | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(QUIZ_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuizProgress>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      age: typeof parsed.age === 'number' ? parsed.age : 6,
      gender: parsed.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
      parentName: typeof parsed.parentName === 'string' ? parsed.parentName : '',
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
      currentQuestionIndex:
        typeof parsed.currentQuestionIndex === 'number' ? parsed.currentQuestionIndex : 0,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function clearQuizProgress(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(QUIZ_PROGRESS_KEY);
  } catch {
    // ignore
  }
}

/** True when a draft has enough user input to be worth offering a resume for. */
export function hasMeaningfulProgress(progress: QuizProgress | null): boolean {
  if (!progress) return false;
  const answered = Object.keys(progress.answers || {}).length;
  return answered > 0 || progress.name.trim().length > 0;
}

export function saveActiveToken(token: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(ACTIVE_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function loadActiveToken(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const token = storage.getItem(ACTIVE_TOKEN_KEY);
    return token && token.length >= 10 ? token : null;
  } catch {
    return null;
  }
}

export function clearActiveToken(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(ACTIVE_TOKEN_KEY);
  } catch {
    // ignore
  }
}
