import { useState, useEffect, type ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { ChildProfile, CompleteEbook, WizardStep } from './types';
import { getArchetypeById } from './data/archetypes';
import { SAMPLE_PROFILES } from './data/questions';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { AssessmentWizard } from './components/Assessment/AssessmentWizard';
import { ResultStep } from './components/Assessment/ResultStep';
import { PaymentStep } from './components/Payment/PaymentStep';
import { EbookReader } from './components/Reader/EbookReader';

export default function App() {
  const [step, setStep] = useState<WizardStep>('landing');
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [ebook, setEbook] = useState<CompleteEbook | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // A5: optional parent email captured on the result/paywall step and forwarded
  // to create-order so the payment webhook can email the access link.
  const [parentEmail, setParentEmail] = useState<string>('');

  // Preview/debug mode state — see useEffect below for URL param shortcuts
  const [previewMode, setPreviewMode] = useState<string | null>(null);
  const [previewProfileIndex, setPreviewProfileIndex] = useState(0);
  // Dev-only preview component, loaded on demand so the paid templates it
  // depends on are NOT part of the production bundle (C-02).
  const [PreviewComponent, setPreviewComponent] = useState<
    ComponentType<{ initialProfileIndex: number }> | null
  >(null);
  // True while the server is generating + persisting the ebook after the quiz.
  const [isPreparingEbook, setIsPreparingEbook] = useState(false);
  const [ebookError, setEbookError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Preview/debug mode — activate via URL params to jump straight to a step
    // for testing the sales/payment/reader flows without the 75-question quiz.
    //   ?preview=true[&profile=0|1|2]        → PreviewPage (legacy EbookReader w/ switcher)
    //   ?preview=result&profile=0|1|2         → ResultStep (sales landing) with a sample profile
    //   ?preview=payment&profile=0|1|2        → PaymentStep with a sample profile
    //   ?preview=reader&profile=0|1|2         → EbookReader (unlocked) with a sample profile
    //   ?preview=landing                      → LandingPage (default step, for testing)
    // Preview modes never touch the DB — they use SAMPLE_PROFILES directly.
    // A1: preview/debug is DISABLED in production builds to avoid leaking the
    // sales/payment/reader flows or the stub "Simulasikan" payment to real
    // visitors. Use `vite dev` (NODE_ENV !== production) to access these.
    //
    // C-02: the ebook generators are server-side only. The dev preview modes
    // fetch a generated sample from a dev-only endpoint so the paid markdown
    // templates are never part of the production bundle.
    const mode = import.meta.env.PROD ? null : params.get('preview');
    if (mode) {
      const profileIdx = parseInt(params.get('profile') || '0', 10);
      const safeIdx =
        !isNaN(profileIdx) && profileIdx >= 0 && profileIdx < SAMPLE_PROFILES.length
          ? profileIdx
          : 0;
      setPreviewProfileIndex(safeIdx);
      setPreviewMode(mode);

      // Legacy mode: PreviewPage renders its own full-screen UI — load on demand.
      if (mode === 'true') {
        import('./components/PreviewPage').then(mod => {
          setPreviewComponent(() => mod.PreviewPage);
        });
        return;
      }
      // Landing preview: default state is already step='landing' — nothing to set up.
      if (mode === 'landing') return;

      if (mode === 'result' || mode === 'payment' || mode === 'reader') {
        const profile = SAMPLE_PROFILES[safeIdx];
        setChildProfile(profile);
        fetch(`/api/dev/sample-ebook?index=${safeIdx}`)
          .then(r => r.json())
          .then(d => {
            if (d.ebook) setEbook(d.ebook as CompleteEbook);
          })
          .catch(err => console.error('[App] Failed to load dev sample ebook:', err));
        if (mode === 'reader') {
          setIsUnlocked(true);
        }
        setStep(mode);
      }
      return;
    }

    // Production flow — reload ebook from DB via token in URL (?token=xxx)
    const token = params.get('token');
    if (token && token.length >= 10) {
      console.log('[App] Found token in URL, loading from DB...');
      fetch(`/api/ebook/${token}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load ebook');
          return res.json();
        })
        .then(data => {
          if (data.ebook) {
            const loadedEbook = data.ebook as CompleteEbook;
            setChildProfile(loadedEbook.childProfile);
            setEbook(loadedEbook);
            setAccessToken(token);
            const isPaid = data.paymentStatus === 'paid';
            setIsUnlocked(isPaid);
            setStep(isPaid ? 'reader' : 'result');
            console.log(`[App] Loaded ebook for ${data.childName} (payment: ${data.paymentStatus})`);
          }
        })
        .catch(err => {
          console.error('[App] Failed to load ebook from DB:', err);
          // Stay on landing page if DB load fails
        });
    }
  }, []);

  // Legacy preview page (?preview=true) renders its own full-screen reader UI
  // with a profile switcher. Loaded dynamically (dev-only) so its paid-template
  // dependency is excluded from the production bundle.
  if (previewMode === 'true') {
    if (!PreviewComponent) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream text-navy">
          Memuat preview…
        </div>
      );
    }
    return <PreviewComponent initialProfileIndex={previewProfileIndex} />;
  }

  const showDevBanner =
    previewMode === 'result' || previewMode === 'payment' || previewMode === 'reader';

  const activeArchetype = childProfile ? getArchetypeById(childProfile.archetypeId) : null;

  // input/quiz -> result: the ebook is generated SERVER-SIDE (C-02). We show a
  // brief loading state, persist the profile, then fetch the masked ebook for
  // the free-preview sales page from the API.
  const handleProfileComplete = async (profile: ChildProfile) => {
    setChildProfile(profile);
    setEbook(null);
    setEbookError(null);
    setIsPreparingEbook(true);
    setStep('result');

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childProfile: profile })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const { token } = await res.json();
      setAccessToken(token);

      // Update URL so refresh keeps data (replaceState = no history pollution)
      window.history.replaceState(null, '', `?token=${token}`);

      const ebookRes = await fetch(`/api/ebook/${token}`);
      if (!ebookRes.ok) throw new Error('Gagal memuat konten.');
      const data = await ebookRes.json();
      if (data.ebook) setEbook(data.ebook as CompleteEbook);

      console.log(`[App] Saved to DB, token: ${token}`);
    } catch (err) {
      console.error('[App] Failed to generate/save ebook:', err);
      setEbookError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setIsPreparingEbook(false);
    }
  };

  // payment -> reader: unlock full ebook access. After payment, reload the
  // ebook from DB so we get the full (unmasked) content — A2 masks non-free
  // modules for unpaid clients, so the in-memory copy the ResultStep used is a
  // preview slice and must be replaced before the reader renders it.
  const handlePaymentSuccess = async () => {
    if (accessToken) {
      try {
        const res = await fetch(`/api/ebook/${accessToken}`);
        const data = await res.json();
        if (data.ebook) {
          setEbook(data.ebook);
          console.log('[App] Reloaded full (unmasked) ebook after payment');
        }
      } catch (err) {
        console.error('[App] Failed to reload ebook after payment:', err);
        // Fall through to reader with whatever ebook we have — it may be masked
        // (in-memory) if the webhook is lagging; a refresh will fix it.
      }
    }
    setIsUnlocked(true);
    setStep('reader');
  };

  return (
    <div
      className={`min-h-screen bg-cream font-sans text-ink selection:bg-primary selection:text-on-primary ${
        showDevBanner ? 'pt-8' : ''
      }`}
    >
      {showDevBanner && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500/90 text-slate-950 text-[11px] font-mono py-1 px-3 flex items-center justify-center gap-3">
          <span className="font-bold">DEV PREVIEW</span>
          <span>mode={previewMode}</span>
          <span>
            profile={previewProfileIndex} ({childProfile?.name})
          </span>
          <span className="opacity-70">
            | shortcuts: ?preview=result|payment|reader&amp;profile=0|1|2
          </span>
        </div>
      )}

      {/* Header per fase:
          - landing: LandingPage punya nav + footer sendiri (tanpa header global)
          - input/quiz: immersive, header disembunyikan agar sesi soal fokus
          - result/payment: stepper pengisian + konteks anak
          - reader: bar dokumen ringkas */}
      {step !== 'landing' && step !== 'input' && step !== 'quiz' && (
        <Header step={step} activeProfile={childProfile} activeArchetype={activeArchetype} />
      )}

      <main className={step === 'landing' ? '' : 'pb-16'}>
        {/* Step 0: landing — pre-quiz intro page */}
        {step === 'landing' && (
          <LandingPage onStart={() => setStep('input')} />
        )}

        {/* Steps 1 (input) & 2 (quiz) handled by AssessmentWizard — kept mounted to preserve form state */}
        {(step === 'input' || step === 'quiz') && (
          <AssessmentWizard
            currentProfile={childProfile}
            activeSubTab={step === 'input' ? 'info' : 'quiz'}
            onStartQuiz={() => setStep('quiz')}
            onProfileComplete={handleProfileComplete}
          />
        )}

        {/* Step 3: result */}
        {step === 'result' && isPreparingEbook && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-navy/70">
            <Loader2 className="w-8 h-8 animate-spin text-blue" />
            <p className="text-sm font-medium">Menyiapkan laporan personal…</p>
          </div>
        )}

        {step === 'result' && !isPreparingEbook && ebookError && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-rose-500 font-semibold">Gagal menyiapkan laporan.</p>
            <p className="text-sm text-navy/60">{ebookError}</p>
            <button
              onClick={() => setStep('input')}
              className="mt-2 rounded-xl bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-navy transition-colors"
            >
              Coba lagi
            </button>
          </div>
        )}

        {step === 'result' && !isPreparingEbook && !ebookError && childProfile && activeArchetype && ebook && (
          <ResultStep
            profile={childProfile}
            archetype={activeArchetype}
            ebook={ebook}
            onProceedToPayment={() => setStep('payment')}
          />
        )}

        {/* Step 4: payment */}
        {step === 'payment' && childProfile && activeArchetype && (
          <PaymentStep
            childProfile={childProfile}
            archetype={activeArchetype}
            onPaymentSuccess={handlePaymentSuccess}
            onClose={() => setStep('result')}
            accessToken={accessToken}
            parentEmail={parentEmail}
            onEmailChange={setParentEmail}
          />
        )}

        {/* Step 5: reader — only accessible after payment unlocks access */}
        {step === 'reader' && isUnlocked && ebook && (
          <EbookReader
            ebook={ebook}
            accessToken={accessToken}
            onBackToResult={() => setStep('result')}
          />
        )}
      </main>
    </div>
  );
}
