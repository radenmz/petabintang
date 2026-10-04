# AI Context: Peta Bintang

## 1. Project Purpose
Peta Bintang is a personalized parenting e-book assessment web app. Parents answer a 75-question quiz evaluating their child's OCEAN personality traits and Multiple Intelligences (MI) to generate a customized ~100+ page e-book containing diagnostic charts, archetype profiles, and tailored action plans.

## 2. Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React
- **Backend / Tooling**: Node.js, Express 5, `tsx`, `esbuild`, Puppeteer (Chromium PDF rendering), `marked`, `dompurify`
- **Database / Auth / Backend Services**: Supabase (PostgreSQL), Midtrans Snap (Payment Gateway), Resend / Nodemailer (Email)
- **Build / Bundler**: Vite 6, TypeScript 5.8

## 3. Architecture
- **Monolithic Hybrid SPA + Express API**: Single Express server (`server.ts`) serves Vite dev middleware in development, handles static assets (`/dist`) in production, and provides REST API endpoints.
- **Server-Side Generation**: E-book template resolution, chart generation, and HTML rendering take place on the server (`generate-html-preview.ts`).
- **Paywall & Content Masking**: Unpaid quiz submissions return masked e-book content (only modules 1.1 and 2.1 are full; others are truncated excerpts). Full e-books are served only when `payment_status === 'paid'`.
- **PDF Generation Singleton**: Express uses a singleton Puppeteer headless browser instance to render full e-books into downloadable A4 PDFs via `POST /api/generate-pdf`.

## 4. Important Directories
- `src/components/`: Frontend React components (Wizard, Landing, Payment, Reader, Charts).
- `src/templates/`: E-book content templates (Markdown) organized into `archetypes/`, `intelligences/`, and `universal/`.
- `src/data/`: Data definitions for quiz questions, archetypes, scoring, and markdown loaders.
- `src/lib/`: Core backend and API client utilities (Supabase, Midtrans, Email).
- `supabase/`: Database SQL schema migrations and config (`schema.sql`).

## 5. Application Entry Points
- Client SPA Entry: `src/main.tsx` & `src/App.tsx`
- Express Server Entry: `server.ts`
- HTML/E-book Template Renderer Entry: `generate-html-preview.ts`

## 6. Main User / Application Flows
1. **Landing Page (`landing`)**: Introduction and CTA to begin assessment.
2. **Assessment Wizard (`input` & `quiz`)**: Collect child profile info (name, age, gender) and complete 75 scored questions.
3. **Result / Sales Page (`result`)**: Submits quiz (`POST /api/quiz/submit`), generates token, fetches server-side masked e-book preview, displays radar/bar charts and archetype teaser.
4. **Payment (`payment`)**: Creates Snap payment order (`POST /api/payment/create-order`), initiates Midtrans payment. Webhook (`POST /api/webhook/midtrans`) updates database status to `paid` and sends access email.
5. **Reader / PDF Download (`reader`)**: Loads unmasked full e-book (`GET /api/ebook/:token`) and requests PDF generation (`POST /api/generate-pdf`).

## 7. Data Models and Important State
- `ChildProfile`: Name, gender, ageGroup, OCEAN scores (O, C, E, A, N raw & 1-5 scale), MI scores (8 intelligences), primary/secondary archetype IDs, primary/secondary MI IDs.
- `CompleteEbook`: `childProfile`, `archetype`, `modules` array (moduleCode, title, category, markdownContent), totalWords.
- Database Tables (`supabase/schema.sql`):
  - `ebook_orders`: Primary order record indexed by 21-char `token`. Stores `child_profile`, `ebook_json`, `payment_status` (`pending` | `paid`), `payment_amount`, `voucher_code`, `email`.
  - `midtrans_orders`: Payment attempts matching `order_id` (e.g. `PB-...`) to `token` for idempotency and webhook reconciliation.
  - `vouchers`: Active discount codes, max uses, and usage counters.

## 8. API / Backend Integrations
- `POST /api/quiz/submit`: Generates e-book server-side, inserts order record, returns 21-character `token`.
- `GET /api/ebook/:token`: Fetches e-book data (masked preview if unpaid, full if paid).
- `POST /api/voucher/validate`: Server-side voucher code re-validation and discount calculation.
- `POST /api/payment/create-order`: Generates Midtrans Snap transaction token.
- `POST /api/webhook/midtrans`: Verified notification handler for Midtrans payment updates.
- `POST /api/generate-pdf`: Renders paid HTML e-book to PDF using Puppeteer.
- `GET /api/dev/sample-ebook`: Dev-only endpoint for preview modes.

## 9. Authentication
- Token-based stateless access via 21-character unguessable URL tokens (`?token=...`).
- Admin / Backend DB access via Supabase Service Role key (`SUPABASE_SERVICE_ROLE_KEY`).
- Server-side signature verification (`verifyNotificationSignature`) using `MIDTRANS_SERVER_KEY` for payment webhooks.

## 10. Build / Test / Development Commands
- `npm run dev`: Runs server in development mode using `tsx server.ts` with Vite SPA middleware.
- `npm run build`: Builds client SPA with Vite and bundles Express server into `dist/server.mjs` via `esbuild`.
- `npm run start`: Runs production server `dist/server.mjs`.
- `npm run lint`: Runs TypeScript typecheck (`tsc --noEmit`).
- `npm run gen-preview`: CLI runner for generating sample HTML/PDF files locally.

## 11. Important Conventions
- **Strict E-book Security**: Full e-book templates are never bundled into the client build. All markdown parsing and e-book assembly occur strictly server-side.
- **Name Validation**: `isValidPersonName` enforces strict character allowlists (`^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}' .,-]{0,59}$`) before markdown interpolation to prevent script injection.
- **Puppeteer Base URL**: `page.setContent()` must inject `<base href="http://localhost:PORT/">` so mascot images in `/mascots` load correctly.

## 12. Known Limitations or Technical Debt
- Single database table fallback: `SUPABASE_TABLE` defaults to `ebook_orders`.
- Soft limit on vouchers: Voucher `used_count` increments on payment webhook in a read-then-write manner suitable for MVP.
- Font loading in PDF: Relies on explicit `document.fonts.load()` triggers inside Puppeteer.

## 13. Important Files and Why They Matter
- `server.ts`: Central Express server handling API routes, Vite middleware, payment webhooks, and Puppeteer PDF generation.
- `generate-html-preview.ts`: Server-side template compiler that converts markdown files and profile scores into full e-book HTML.
- `src/App.tsx`: Main React state coordinator managing wizard steps (`landing`, `input`, `quiz`, `result`, `payment`, `reader`).
- `src/lib/midtrans.ts`: Midtrans Snap integration and HMAC SHA-512 signature validation.
- `src/lib/supabaseServer.ts`: Server-side Supabase client initialization.
- `src/data/questions.ts`: 75 OCEAN/MI assessment questions and score calculation logic (`calculateScores`).
