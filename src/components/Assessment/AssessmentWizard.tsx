import React, { useState, useRef, useEffect } from 'react';
import { ChildProfile, OceanScores, MIScores } from '../../types';
import { OCEAN_QUESTIONS, MI_QUESTIONS } from '../../data/questions';
import { matchArchetype } from '../../data/archetypes';
import { ArrowRight, ArrowLeft, Clock, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  loadQuizProgress,
  saveQuizProgress,
  clearQuizProgress,
  hasMeaningfulProgress,
  type QuizProgress
} from '../../lib/quizStorage';

interface AssessmentWizardProps {
  currentProfile: ChildProfile | null;
  activeSubTab: 'info' | 'quiz';
  onStartQuiz: () => void;
  onProfileComplete: (profile: ChildProfile) => void;
}

const DEFAULT_OCEAN: OceanScores = {
  openness: 5,
  conscientiousness: 5,
  extraversion: 5,
  agreeableness: 5,
  neuroticism: 5
};

const DEFAULT_MI: MIScores = {
  linguistic: 50,
  logical: 50,
  spatial: 50,
  kinesthetic: 50,
  musical: 50,
  interpersonal: 50,
  intrapersonal: 50,
  naturalist: 50
};

const MILESTONE_INTERVAL = 15;

const MILESTONES = [
  {
    at: 15,
    title: 'Sepertiga Perjalanan OCEAN',
    quote: 'Anak bukan vas yang harus diisi, melainkan api yang harus dinyalakan.',
    desc: 'Ayah Bunda telah mengamati 15 perilaku dasar ananda. Lanjutkan dengan jujur — tidak ada jawaban benar atau salah, hanya yang paling mendekati kenyataan sehari-hari.'
  },
  {
    at: 30,
    title: 'Hampir Menyelesaikan Profil Kepribadian',
    quote: 'Karakter adalah peta bintang yang terbentuk perlahan — setiap bintang adalah satu kebiasaan kecil.',
    desc: 'Tinggal 5 pertanyaan lagi untuk menyelesaikan dimensi OCEAN (Big Five). Setelahnya, kita akan menjelajah 8 Kecerdasan Majemuk ananda.'
  },
  {
    at: 45,
    title: 'Memasuki Kecerdasan Majemuk',
    quote: 'Setiap anak cerdas dengan caranya sendiri — tugas kita adalah menemukan caranya.',
    desc: 'Profil kepribadian OCEAN ananda sudah lengkap. Sekarang kita memetakan 8 jenis kecerdasan: linguistik, logis, visual, jasmani, musikal, sosial, diri, dan alam.'
  },
  {
    at: 60,
    title: 'Garis Finis di Depan Mata',
    quote: 'Mengenal anak adalah perjalanan seumur hidup — hari ini Ayah Bunda sedang memetakan fondasinya.',
    desc: 'Hanya 15 pertanyaan tersisa. Hasil observasi ini akan menjadi dasar e-book panduan pengasuhan yang dipersonalisasi khusus untuk ananda.'
  }
];

// C-03: names are interpolated into the ebook and rendered as HTML. Keep the
// client-side check aligned with the server allowlist so users get immediate
// feedback instead of a 400 on submit.
const PERSON_NAME_RE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}' .,-]{0,59}$/u;

export const AssessmentWizard: React.FC<AssessmentWizardProps> = ({
  currentProfile,
  activeSubTab,
  onStartQuiz,
  onProfileComplete
}) => {
  // Form State (initialized from currentProfile if present, otherwise empty defaults)
  const [name, setName] = useState(currentProfile?.name ?? '');
  const [age, setAge] = useState(currentProfile?.age ?? 6);
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>(currentProfile?.gender ?? 'Laki-laki');
  const [parentName, setParentName] = useState(currentProfile?.parentName ?? '');
  const [showFormErrors, setShowFormErrors] = useState(false);

  const isNameValid = PERSON_NAME_RE.test(name.trim());
  const isParentValid = PERSON_NAME_RE.test(parentName.trim());
  const isAgeValid = typeof age === 'number' && age >= 3 && age <= 12;
  const isFormValid = isNameValid && isParentValid && isAgeValid;

  // Personalisasi soal: ganti kata "Anak" dengan nama anak (pola parentia).
  const childName = name.trim() || 'Anak';
  const personalize = (text: string) => text.replace(/\b[Aa]nak\b/g, childName);

  const handleStartQuiz = () => {
    if (!isFormValid) {
      setShowFormErrors(true);
      return;
    }
    onStartQuiz();
  };

  // Combine questions: 35 OCEAN + 40 MI = 75 total
  const allQuestions = [...OCEAN_QUESTIONS, ...MI_QUESTIONS];

  // One-by-one question state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'one-by-one' | 'list'>('one-by-one');
  const [quizPhase, setQuizPhase] = useState<'intro' | 'questions' | 'milestone'>('intro');
  const [pendingMilestoneIndex, setPendingMilestoneIndex] = useState<number | null>(null);

  // Session dots (B-3): potong 75 soal jadi 5 bagian agar progress terasa ringan.
  const SESSIONS = 5;
  const perSession = Math.ceil(allQuestions.length / SESSIONS);
  const currentSession = Math.min(SESSIONS - 1, Math.floor(currentQuestionIndex / perSession));

  // Answers state (1-5 per question id) — empty until user explicitly answers
  const [answers, setAnswers] = useState<Record<number, number>>({});

  // Task 1: recover an interrupted quiz draft. Read once on mount; the banner
  // stays until the parent either resumes or discards it.
  const [resumeDraft, setResumeDraft] = useState<QuizProgress | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [autoSaveReady, setAutoSaveReady] = useState(false);

  useEffect(() => {
    const saved = loadQuizProgress();
    if (hasMeaningfulProgress(saved)) {
      setResumeDraft(saved);
      setShowResumePrompt(true);
    }
    setAutoSaveReady(true);
  }, []);

  const applyResumeDraft = (draft: QuizProgress) => {
    setName(draft.name);
    setAge(draft.age);
    setGender(draft.gender);
    setParentName(draft.parentName);
    setAnswers(draft.answers);
    setCurrentQuestionIndex(
      Math.min(Math.max(0, draft.currentQuestionIndex), allQuestions.length - 1)
    );
    setShowResumePrompt(false);
    setResumeDraft(null);
  };

  const discardResumeDraft = () => {
    clearQuizProgress();
    setShowResumePrompt(false);
    setResumeDraft(null);
  };

  // Task 1: auto-save the draft whenever meaningful input changes. Gated on
  // `autoSaveReady` so we never overwrite an on-disk draft with the empty
  // initial state before the resume prompt has had a chance to show.
  useEffect(() => {
    if (!autoSaveReady || showResumePrompt) return;
    const hasInput = name.trim().length > 0 || Object.keys(answers).length > 0;
    if (!hasInput) return;
    saveQuizProgress({ name, age, gender, parentName, answers, currentQuestionIndex });
  }, [autoSaveReady, showResumePrompt, name, age, gender, parentName, answers, currentQuestionIndex]);

  const [oceanScores, setOceanScores] = useState<OceanScores>(currentProfile?.oceanScores ?? DEFAULT_OCEAN);
  const [miScores, setMiScores] = useState<MIScores>(currentProfile?.miScores ?? DEFAULT_MI);

  // Latest computed profile (kept in a ref so the "Selesai" button always has the
  // freshest values even when quiz is completed without a fresh answer change.)
  const latestProfileRef = useRef<ChildProfile | null>(null);

  const buildProfile = (ocean: OceanScores, mi: MIScores): ChildProfile => {
    const matched = matchArchetype(ocean);
    return {
      id: currentProfile?.id || `child-${Date.now()}`,
      name,
      age,
      gender,
      parentName,
      oceanScores: ocean,
      miScores: mi,
      archetypeId: matched.id,
      createdDate: new Date().toISOString().slice(0, 10)
    };
  };

  const calculateScores = (ansRecord: Record<number, number>): ChildProfile => {
    // Calculate OCEAN (out of 10)
    const oceanDims: Record<string, number[]> = {
      openness: [],
      conscientiousness: [],
      extraversion: [],
      agreeableness: [],
      neuroticism: []
    };

    OCEAN_QUESTIONS.forEach(q => {
      const val = ansRecord[q.id] || 3;
      const score = q.reverse ? (6 - val) : val; // reverse scoring per IPIP
      if (oceanDims[q.dimension]) {
        oceanDims[q.dimension].push(score);
      }
    });

    // OCEAN normalization: 7 questions per dimension, raw sum range 7-35.
    // Normalized = ((Sum - 7) / 28) * 9 + 1  => range 1-10
    const newOcean: OceanScores = {
      openness: Math.round(((oceanDims.openness.reduce((a, b) => a + b, 0) - 7) / 28) * 9 + 1),
      conscientiousness: Math.round(((oceanDims.conscientiousness.reduce((a, b) => a + b, 0) - 7) / 28) * 9 + 1),
      extraversion: Math.round(((oceanDims.extraversion.reduce((a, b) => a + b, 0) - 7) / 28) * 9 + 1),
      agreeableness: Math.round(((oceanDims.agreeableness.reduce((a, b) => a + b, 0) - 7) / 28) * 9 + 1),
      neuroticism: Math.round(((oceanDims.neuroticism.reduce((a, b) => a + b, 0) - 7) / 28) * 9 + 1)
    };

    // Calculate MI (out of 100)
    const miDims: Record<string, number[]> = {
      linguistic: [],
      logical: [],
      spatial: [],
      kinesthetic: [],
      musical: [],
      interpersonal: [],
      intrapersonal: [],
      naturalist: []
    };

    MI_QUESTIONS.forEach(q => {
      const val = ansRecord[q.id] || 3;
      const score = q.reverse ? (6 - val) : val; // reverse scoring per IPIP
      if (miDims[q.dimension]) {
        miDims[q.dimension].push(score);
      }
    });

    // MI normalization: 5 questions per dimension, raw sum range 5-25.
    // Normalized = ((Sum - 5) / 20) * 100  => range 0-100
    const newMi: MIScores = {
      linguistic: Math.round(((miDims.linguistic.reduce((a, b) => a + b, 0) - 5) / 20) * 100),
      logical: Math.round(((miDims.logical.reduce((a, b) => a + b, 0) - 5) / 20) * 100),
      spatial: Math.round(((miDims.spatial.reduce((a, b) => a + b, 0) - 5) / 20) * 100),
      kinesthetic: Math.round(((miDims.kinesthetic.reduce((a, b) => a + b, 0) - 5) / 20) * 100),
      musical: Math.round(((miDims.musical.reduce((a, b) => a + b, 0) - 5) / 20) * 100),
      interpersonal: Math.round(((miDims.interpersonal.reduce((a, b) => a + b, 0) - 5) / 20) * 100),
      intrapersonal: Math.round(((miDims.intrapersonal.reduce((a, b) => a + b, 0) - 5) / 20) * 100),
      naturalist: Math.round(((miDims.naturalist.reduce((a, b) => a + b, 0) - 5) / 20) * 100)
    };

    setOceanScores(newOcean);
    setMiScores(newMi);

    const updatedProfile = buildProfile(newOcean, newMi);
    latestProfileRef.current = updatedProfile;
    return updatedProfile;
  };

  const handleAnswerChange = (qId: number, val: number) => {
    const updated = { ...answers, [qId]: val };
    setAnswers(updated);
    const profile = calculateScores(updated);

    if (viewMode === 'one-by-one' && autoAdvance) {
      if (currentQuestionIndex < allQuestions.length - 1) {
        setTimeout(() => {
          advanceToNextQuestion();
        }, 180);
      } else {
        // Quiz completed — advance to result step
        setTimeout(() => {
          onProfileComplete(profile);
        }, 300);
      }
    }
  };

  const handleFinishQuiz = () => {
    const profile = latestProfileRef.current ?? buildProfile(oceanScores, miScores);
    onProfileComplete(profile);
  };

  const currentQ = allQuestions[currentQuestionIndex];
  const progressPercent = Math.round(((currentQuestionIndex + 1) / allQuestions.length) * 100);

  const isCurrentAnswered = currentQ ? answers[currentQ.id] !== undefined : false;
  const answeredCount = allQuestions.filter(q => answers[q.id] !== undefined).length;
  const allAnswered = answeredCount === allQuestions.length;

  const isMilestoneBoundary = (idx: number) =>
    idx > 0 && idx < allQuestions.length && idx % MILESTONE_INTERVAL === 0;

  const activeMilestone = pendingMilestoneIndex !== null
    ? MILESTONES.find(m => m.at === pendingMilestoneIndex) ?? null
    : null;

  const advanceToNextQuestion = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      if (viewMode === 'one-by-one' && isMilestoneBoundary(nextIndex)) {
        setPendingMilestoneIndex(nextIndex);
        setQuizPhase('milestone');
      } else {
        setCurrentQuestionIndex(nextIndex);
      }
    }
  };

  return (
    <div className="shell shell--narrow py-8 md:py-12 space-y-6">
      {/* Task 1: interrupted-quiz resume banner */}
      {showResumePrompt && resumeDraft && activeSubTab === 'info' && (
        <div className="flex flex-col gap-3 border border-primary bg-primary-container px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-on-primary-container" />
            <div>
              <p className="font-semibold text-on-primary-container">
                Lanjutkan kuis sebelumnya?
              </p>
              <p className="text-sm text-on-primary-container/80">
                Kami menyimpan draf untuk{' '}
                <span className="font-semibold">{resumeDraft.name || 'ananda'}</span> —{' '}
                {Object.keys(resumeDraft.answers).length} dari {allQuestions.length} pertanyaan
                sudah terjawab.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="md" onClick={discardResumeDraft}>
              Mulai baru
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                applyResumeDraft(resumeDraft);
                onStartQuiz();
              }}
            >
              Lanjutkan
            </Button>
          </div>
        </div>
      )}

      {/* Top Welcome Bar — hanya tampil di awal (form info & intro kuis), hilang saat sesi soal/milestone */}
      {quizPhase === 'intro' && (
      <div className="rounded-lg border border-ink bg-ink px-6 py-7 text-paper relative overflow-hidden">
        <div className="relative z-10">
          <span className="eyebrow text-paper/60">Kuis Orang Tua · Karakter &amp; Kecerdasan</span>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-paper">Kuis Peta Bintang</h2>
           <p className="mt-2 max-w-[var(--measure-prose)] text-base text-paper/70">
            Jawab pertanyaan bergantian satu per satu untuk mendeteksi profil kepribadian (OCEAN) &amp; kecerdasan majemuk (MI) buah hati Anda.
          </p>
        </div>
      </div>
      )}

      {/* SUBTAB 1: Identitas Anak & Orang Tua */}
      {activeSubTab === 'info' && (
        <div className="border-t border-ink pt-7 space-y-7">
          <div>
            <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
              Langkah 1: Identitas Anak & Catatan Pengasuhan
            </h3>
             <p className="mt-1 text-sm text-secondary">
              Data ini digunakan untuk mempersonalisasi seluruh teks dan rekomendasi pada laporan e-book.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
               <label className="mb-1.5 block text-sm font-semibold text-ink/80">Nama Lengkap Anak *</label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setShowFormErrors(false); }}
                 className={`w-full border-0 border-b bg-transparent px-0 py-2.5 text-base text-ink focus:outline-none focus:border-ink ${
                  showFormErrors && !isNameValid ? 'border-rose-500' : 'border-outline-variant'
                }`}
                placeholder="Contoh: Budi Kurniawan"
              />
              {showFormErrors && !isNameValid && (
                 <p className="mt-1 text-sm text-rose-600">Nama anak wajib diisi.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                 <label className="mb-1.5 block text-sm font-semibold text-ink/80">Usia (3-12 Tahun) *</label>
                <input
                  type="number"
                  min={3}
                  max={12}
                  value={age}
                  onChange={e => {
                    const newAge = parseInt(e.target.value);
                    setAge(isNaN(newAge) ? 0 : newAge);
                    setShowFormErrors(false);
                  }}
                   className={`w-full border-0 border-b bg-transparent px-0 py-2.5 text-base text-ink focus:outline-none focus:border-ink ${
                    showFormErrors && !isAgeValid ? 'border-rose-500' : 'border-outline-variant'
                  }`}
                />
                {showFormErrors && !isAgeValid && (
                   <p className="mt-1 text-sm text-rose-600">Usia wajib diisi (3-12 tahun).</p>
                )}
              </div>

              <div>
                 <label className="mb-1.5 block text-sm font-semibold text-ink/80">Jenis Kelamin *</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as 'Laki-laki' | 'Perempuan')}
                   className="w-full border-0 border-b border-outline-variant bg-transparent px-0 py-2.5 text-base text-ink focus:outline-none focus:border-ink"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>

            <div>
               <label className="mb-1.5 block text-sm font-semibold text-ink/80">Nama Orang Tua / Panggilan *</label>
              <input
                type="text"
                value={parentName}
                onChange={e => { setParentName(e.target.value); setShowFormErrors(false); }}
                 className={`w-full border-0 border-b bg-transparent px-0 py-2.5 text-base text-ink focus:outline-none focus:border-ink ${
                  showFormErrors && !isParentValid ? 'border-rose-500' : 'border-outline-variant'
                }`}
                placeholder="Contoh: Bunda Ratna, Ayah Budi"
              />
              {showFormErrors && !isParentValid && (
                 <p className="mt-1 text-sm text-rose-600">Nama orang tua wajib diisi.</p>
              )}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            {showFormErrors && !isFormValid && (
               <span className="text-sm text-rose-600">Lengkapi field wajib (*) terlebih dahulu.</span>
            )}
            <Button variant="primary" size="lg" onClick={handleStartQuiz} disabled={!isFormValid}>
              Mulai isi pertanyaan kuis <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Interactive Quiz — Intro → Questions → Milestone breaks */}
      {activeSubTab === 'quiz' && quizPhase === 'intro' && (
        <div className="border-t border-ink pt-7 space-y-6">
          <div className="space-y-3">
            <div className="eyebrow">
              Sebelum memulai
            </div>
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-ink">Petunjuk Pengisian Kuis</h3>
          </div>

           <div className="space-y-4 text-base leading-relaxed text-secondary">
            <p>
              Isi pertanyaan berikut berdasarkan hasil observasi Ayah Bunda tentang perilaku
              ananda sehari-hari — bukan berdasarkan harapan atau ekspektasi. Jawablah
              sejujur mungkin, karena hasil yang akurat akan menghasilkan panduan pengasuhan
              yang tepat untuk ananda.
            </p>
            <p>
              Kuis ini terdiri dari <span className="font-semibold text-ink">75 pertanyaan</span> yang
              akan memetakan dua aspek ananda:
            </p>
            <ul className="space-y-2.5 pl-1">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 font-bold text-primary">•</span>
                <span>
                  <span className="font-semibold text-ink">OCEAN (Big Five)</span> — 35 pertanyaan
                  untuk mendeteksi 5 dimensi kepribadian: Keterbukaan, Ketelitian, Ekstraversi,
                  Keramahan, dan Stabilitas Emosi.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 font-bold text-primary">•</span>
                <span>
                  <span className="font-semibold text-ink">Kecerdasan Majemuk (MI)</span> — 40 pertanyaan
                  untuk memetakan 8 jenis kecerdasan unik ananda.
                </span>
              </li>
            </ul>
            <p>
              Setiap pertanyaan punya 5 pilihan: dari
              <span className="text-ink"> 1 (Sangat Tidak Sesuai)</span> hingga
              <span className="text-ink"> 5 (Sangat Sesuai)</span>. Pilih angka yang paling
              menggambarkan ananda. Tidak ada jawaban benar atau salah — hanya yang paling akurat.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-secondary">
              <Clock className="w-4 h-4" />
              <span>Diperkirakan 12–15 menit. Anda akan diberi jeda singkat setiap 15 pertanyaan.</span>
            </div>
          </div>

          <div className="pt-2">
            <Button variant="primary" size="lg" onClick={() => setQuizPhase('questions')}>
              Saya siap, mulai <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {activeSubTab === 'quiz' && quizPhase === 'milestone' && activeMilestone && (
        <div className="rounded-2xl bg-gradient-to-br from-primary via-[#3d4488] to-secondary px-6 py-14 text-center text-paper md:px-12">
          <div className="eyebrow text-tertiary">
            Jeda · {activeMilestone.at} dari {allQuestions.length} soal
          </div>

          <h3 className="mt-4 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{activeMilestone.title}</h3>

          <div className="border-y border-white/20 py-8 my-6">
            <p className="mx-auto max-w-[var(--measure-prose)] font-display text-2xl italic leading-relaxed text-tertiary">
              “{activeMilestone.quote}”
            </p>
          </div>

           <p className="mx-auto max-w-[var(--measure-prose)] text-base leading-relaxed text-paper/75">
            {activeMilestone.desc}
          </p>

          <div className="mt-8 space-y-2">
            <div className="mx-auto h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-tertiary transition-all duration-500"
                style={{ width: `${Math.round((activeMilestone.at / allQuestions.length) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-paper/60">
              {Math.round((activeMilestone.at / allQuestions.length) * 100)}% selesai · {allQuestions.length - activeMilestone.at} pertanyaan tersisa
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                if (pendingMilestoneIndex !== null) {
                  setCurrentQuestionIndex(pendingMilestoneIndex);
                  setPendingMilestoneIndex(null);
                }
                setQuizPhase('questions');
              }}
              className="inline-flex items-center gap-2 rounded-[10px] bg-tertiary px-6 py-3.5 font-semibold text-on-tertiary transition-colors hover:bg-starlight-deep"
            >
              Lanjutkan <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'quiz' && quizPhase === 'questions' && (
        <div className="border-t border-ink pt-6 space-y-6">
          {/* Controls Bar — hanya toggle tampilan; judul & instruksi dihilangkan agar sesi soal bersih */}
          <div className="flex items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <div className="flex border-b border-outline-variant text-xs font-semibold">
                <button
                  onClick={() => setViewMode('one-by-one')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'one-by-one' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-ink'
                  }`}
                >
                  Satu per satu
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-ink'
                  }`}
                >
                  Lihat semua
                </button>
              </div>
            </div>
          </div>

          {/* MODE 1: ONE-BY-ONE SEQUENTIAL DISPLAY */}
          {viewMode === 'one-by-one' && currentQ && (
            <div className="space-y-8 py-4">
              {/* Progress — thick, accented */}
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-secondary">
                    Soal <span className="font-bold text-ink">{currentQuestionIndex + 1}</span> / {allQuestions.length}
                  </span>
                  <span className="font-display text-lg font-extrabold text-primary">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full bg-secondary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {/* Session dots */}
                <div className="flex items-center justify-center gap-2 pt-1.5">
                  {Array.from({ length: SESSIONS }).map((_, i) => (
                    <span
                      key={i}
                      className={`rounded-full transition-all ${
                        i < currentSession
                          ? 'h-2.5 w-2.5 bg-tertiary'
                          : i === currentSession
                            ? 'h-3 w-3 scale-110 bg-primary'
                            : 'h-2.5 w-2.5 bg-outline-variant'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-center text-[11px] font-medium text-secondary">Bagian {currentSession + 1} dari {SESSIONS}</p>
              </div>

              {/* Statement — big number as visual anchor */}
              <div className="space-y-6 py-4 text-center">
                <div className="flex flex-col items-center gap-3">
                  <span className="font-display text-6xl font-extrabold leading-none tracking-tight text-primary md:text-7xl">
                    {String(currentQuestionIndex + 1).padStart(2, '0')}
                  </span>
                  <p className="eyebrow">Seberapa sesuai untuk {name || 'Anak'}?</p>
                </div>
                <h4 className="mx-auto max-w-2xl font-display text-2xl font-extrabold leading-snug tracking-tight text-ink md:text-3xl">
                  {personalize(currentQ.statement)}
                </h4>

                {currentQ.example && (
                  <p className="mx-auto max-w-xl rounded-xl border border-outline-variant bg-surface-container/60 px-4 py-3 text-sm leading-relaxed text-secondary">
                    <span className="mr-1 inline-flex align-middle text-tertiary" aria-hidden="true">💡</span>
                    {currentQ.example}
                  </p>
                )}

                {/* Likert 1-5 */}
                <div className="mx-auto max-w-xl space-y-3 pt-2">
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map(v => {
                      const isSelected = answers[currentQ.id] === v;
                      return (
                        <button
                          key={v}
                          onClick={() => handleAnswerChange(currentQ.id, v)}
                          className={`h-16 rounded-xl border-2 font-display text-xl font-extrabold transition-all ${
                            isSelected
                              ? 'scale-105 border-primary bg-primary text-on-primary shadow-lg shadow-primary/25'
                              : 'border-outline-variant bg-paper text-ink hover:border-secondary hover:bg-secondary-container'
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                   <div className="grid grid-cols-5 gap-2 text-xs leading-normal font-medium">
                    {['Sangat Tidak Sesuai', 'Tidak Sesuai', 'Netral', 'Sesuai', 'Sangat Sesuai'].map((label, i) => {
                      const v = i + 1;
                      const isSelected = answers[currentQ.id] === v;
                      return (
                        <span
                          key={v}
                          className={`text-center ${isSelected ? 'font-semibold text-primary' : 'text-secondary'}`}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom controls — subtle text links */}
              <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  className="flex items-center gap-1.5 px-2 py-2 text-xs font-medium text-secondary transition-colors hover:text-ink disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" /> Sebelumnya
                </button>

                <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-secondary">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={e => setAutoAdvance(e.target.checked)}
                    className="rounded border-outline-variant bg-paper accent-primary"
                  />
                  <span>Lanjut otomatis</span>
                </label>

                {currentQuestionIndex < allQuestions.length - 1 ? (
                  <button
                    onClick={advanceToNextQuestion}
                    disabled={!isCurrentAnswered}
                    className={`px-2 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      isCurrentAnswered
                        ? 'text-ink hover:text-ink'
                        : 'cursor-not-allowed text-secondary/50'
                    }`}
                  >
                    Selanjutnya <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Button variant="primary" size="md" onClick={handleFinishQuiz} disabled={!isCurrentAnswered}>
                    Lihat hasil
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: MATRIX ALL QUESTIONS LIST */}
          {viewMode === 'list' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary">
                  Terjawab: <span className="font-bold text-ink">{answeredCount}</span> / {allQuestions.length}
                </span>
                {!allAnswered && (
                  <span className="text-secondary">Jawab semua soal untuk melihat hasil.</span>
                )}
              </div>
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                {allQuestions.map((q, idx) => {
                  const currentVal = answers[q.id];
                  return (
                    <div key={q.id} className="flex flex-col justify-between gap-3 border-b border-outline-variant py-4 md:flex-row md:items-center">
                      <div className="flex items-start gap-3">
                        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                          currentVal !== undefined
                            ? 'bg-primary-container text-on-primary-container'
                            : 'bg-surface-container text-secondary'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="text-sm text-ink">{personalize(q.statement)}</p>
                          {q.example && (
                            <p className="mt-1 text-xs leading-relaxed text-secondary">
                              <span className="mr-1" aria-hidden="true">💡</span>
                              {q.example}
                            </p>
                          )}
                          <span className="text-[10px] font-mono uppercase text-secondary">Dimensi: {q.dimension} ({q.type})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-center">
                        {[1, 2, 3, 4, 5].map(v => (
                          <button
                            key={v}
                            onClick={() => handleAnswerChange(q.id, v)}
                            className={`h-9 w-9 rounded-md text-xs font-bold transition-all ${
                              currentVal === v
                                ? 'scale-105 border border-primary bg-primary text-on-primary'
                                : 'bg-surface-container text-secondary hover:bg-surface-container-high'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {!allAnswered && (
                   <span className="text-sm text-rose-600">Masih ada {allQuestions.length - answeredCount} soal belum dijawab.</span>
                )}
                <Button variant="primary" size="lg" onClick={handleFinishQuiz} disabled={!allAnswered}>
                  Selesai &amp; lihat hasil
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
