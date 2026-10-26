---
doc: spec
status: approved
---

# Ghostlisted — Technical Spec

## How This Works, In Plain Language
Ghostlisted is a single-page Next.js web application designed to help fresh job seekers detect warning signals in job listings before applying. 

1. **Input & Extraction**: The user pastes job post text or uploads up to 2 screenshots (or selects one of 4 pre-loaded samples, including a Bengali scam-like sample). The limit is up to 2 screenshots because the vision model's free tier allows 8,000 tokens per minute and each image counts as 2,048 tokens. If screenshots are provided (JPG, PNG, or WebP, up to 4 MB each), ordered thumbnails allow removing images one by one. Client-side canvas logic in `src/client/lib/image.ts` validates and downscales each image to keep the total payload under Vercel's 4.5 MB limit before sending to `src/app/api/analyze/route.ts`. Multiple screenshots are analyzed together in order as one post, and the extracted text joins them in that order. The report label reads *"Text read from your screenshot"* (for 1 image) or *"Text read from your N screenshots"* (for N images).
2. **AI Signal Extraction**: The server logic (`src/server/groq.ts` and `src/server/prompt.ts`, protected by `import "server-only"`) passes the post text and context choices to Groq with strict system instructions and a JSON response schema generated directly from Zod (`src/shared/schema.ts`). Groq returns structured signals categorized into Scam, Ghost, and Fresher-Mismatch lanes with exact quotes (where Mismatch lane applies only to posts labeled fresher, graduate, trainee, entry-level, junior, or intern, and each quote appears in only one lane).
3. **Deterministic Rules Engine**: Before rendering, pure TypeScript functions in `src/shared/rules.ts` sanitize the output:
   - Quotes that do not match the post text after collapsing whitespace and ignoring case (while preserving exact punctuation) are discarded.
   - If the same quote (after normalization) appears in more than one lane, keep it only in the higher-severity lane (Scam > Mismatch > Ghost). Covered by a unit test.
   - Signals derived solely from context answers are tagged as "From your answers" and exempted from quote matching.
   - The overall recommended action (**Apply**, **Verify first**, or **Skip**) is calculated deterministically based on lane severity strength.
4. **Interactive "Case File" UI**: The browser renders a high-contrast investigator-style report. Highlight range logic in `src/shared/highlight.ts` maps validated quotes back to their exact character indices in the unmodified text. Clicking any signal item in a lane card smooth-scrolls and pulses the matching highlight in `PostView`.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Arrival & Input Selection**: User opens `src/app/page.tsx`. `InputPanel` renders 3 tabs (*Paste text*, *Upload screenshot* [accepting up to 2 images with removable ordered thumbnails], *Try a sample* [4 fictional samples including Bengali scam-like]) and 3 `ContextChips` questions.
2. **Client Validation & Image Downscaling**:
   - For text: Validated between 80 and 8,000 characters.
   - For image: `src/client/lib/image.ts` validates file formats (JPG, PNG, WebP) and size (≤ 4 MB each, up to 2 images due to the vision model's 8,000 TPM limit where each image uses 2,048 tokens), then downscales each image and re-encodes as JPEG base64 to ensure the total request body stays under Vercel's 4.5 MB limit.
3. **API Request**: Browser posts JSON payload matching the discriminated union request schema (`src/shared/schema.ts`) to `POST /api/analyze` (in image mode, sending `images: [{ imageBase64, mimeType }, ...]`).
4. **Server Execution (`src/app/api/analyze/route.ts`)**:
   - Validates request payload using Zod (`src/shared/schema.ts`). On failure, returns `TOO_SHORT` or `INVALID_IMAGE`.
   - Server-only modules (`src/server/groq.ts`, `src/server/prompt.ts`) execute Groq API call with `response_format` `json_schema` generated via `z.toJSONSchema` (`strict: false`) and prompt-injection defenses. In image mode, multiple images (up to 2) are analyzed together in order as one post, and the extracted text joins them in that order. In text mode the model returns an empty `extractedText` and the server sets it to the user's original text, so highlights always map to the exact input.
   - Handles errors deterministically: `isJobPost === false` → `NOT_A_JOB_POST`; image mode with empty `extractedText` → `UNREADABLE_IMAGE`; HTTP 429 → `RATE_LIMITED`; invalid JSON, schema failure after one retry, or API failure → `AI_ERROR`.
5. **Deterministic Processing (`src/shared/rules.ts` & `src/shared/highlight.ts`)**:
   - `validateQuotes`: Drops invalid quotes (collapsing whitespace/ignoring case only, preserving punctuation); resolves duplicate quotes across lanes by keeping the quote strictly in the higher-severity lane (Scam > Mismatch > Ghost); marks context signals as "From your answers".
   - `nextMove`: Computes stamp (**Skip** if Scam is High; **Verify first** if any lane is Medium/High; else **Apply**).
   - `highlightRanges`: Maps quotes back to original character indices in the unmodified post text with color priority (Scam > Mismatch > Ghost).
6. **Report Rendering (`ReportView`)**:
   - Renders `NextMoveStamp`, `PostView` (with highlights and label *"Text read from your screenshot"* or *"Text read from your N screenshots"*), and 3 `LaneCard` components.
   - Clicking a signal item smooth-scrolls to and pulses the matching highlight span.

## Stack
Implements `prd.md > Features and Behavior`.

- **Framework**: Next.js (App Router, React 19) — *SSR API route and client-side single page.* [Next.js Docs](https://nextjs.org/docs)
- **Language**: TypeScript (strict mode enabled) — *Type-safe client, server, and shared data flow.* [TypeScript Docs](https://www.typescriptlang.org/docs/)
- **Server Guard**: `server-only` — *Ensures server modules (`src/server/`) can never be imported into browser bundles.* [server-only package](https://www.npmjs.com/package/server-only)
- **Styling & Fonts**: Tailwind CSS v4 (configured via `@theme` in `src/app/globals.css`, no `tailwind.config.ts`) + `next/font/google` (*Fraunces*, *IBM Plex Sans*, *IBM Plex Mono*). [Tailwind v4 Docs](https://tailwindcss.com/docs)
- **Schema Validation**: Zod v4 — *Validates client API requests, generates Gemini responseSchema via `z.toJSONSchema`, and validates AI responses.* [Zod Docs](https://zod.dev/)
- **AI SDK**: `groq-sdk` (Groq TypeScript SDK) — *Server-side Groq API integration using JSON schema structured outputs; text requests retry on an optional text-only fallback model set by `GROQ_TEXT_FALLBACK_MODEL` (`openai/gpt-oss-120b`) when `GROQ_MODEL` is rate limited, while image requests use only `GROQ_MODEL`.* [Groq SDK Docs](https://github.com/groq/groq-typescript)
- **Unit Testing**: Vitest — *Fast unit testing for pure logic in `src/shared/rules.ts` and `src/shared/highlight.ts`.* [Vitest Docs](https://vitest.dev/)
- **Deployment**: Vercel Free Plan — *Zero-config hosting for Next.js App Router.* [Vercel Docs](https://vercel.com/docs)

## Where It Runs and How Someone Tries It
- **Development**: Runs locally on Node.js v24+ via `npm run dev` at `http://localhost:3000`.
- **Environment Variables**:
  - `GROQ_API_KEY`: Groq API key (server-side only).
  - `GROQ_MODEL`: Groq model identifier supporting image input and JSON schema structured outputs (no hardcoded default).
  - `GROQ_TEXT_FALLBACK_MODEL`: Optional text-only fallback model identifier (`openai/gpt-oss-120b`) used when `GROQ_MODEL` is rate limited on text requests.
  - `.env.example` committed to git repository; `.env.local` kept private.
- **Deployment**: Deployed on Vercel (`git push` integration).
- **Submission Requirements**: Public GitHub repo + 1–3 minute demo video.

## Look and Feel
Implements `prd.md > Look and Feel`.

- **Visual Theme**: "Case File" investigator aesthetic.
- **Color & Design Tokens**: Defined using Tailwind v4 `@theme` directives in `src/app/globals.css`:
  - Background: Warm paper `#F4F1EA`
  - Typography: Ink Black `#1B1B1B`
  - Scam Highlight: Translucent Red tint (`#E5484D` / `bg-scam/45 text-ink` behind ink text)
  - Ghost Highlight: Translucent Highlighter Yellow tint (`#F5C400` / `bg-ghost/60 text-ink` behind ink text)
  - Fresher-Mismatch Highlight: Translucent Blue tint (`#2F6FDB` / `bg-mismatch/35 text-ink` behind ink text)
- **Typography Integration**:
  - Headings & Stamps: `Fraunces` (serif)
  - UI Labels & Body: `IBM Plex Sans` (sans-serif)
  - Post Source & Extracted Text: `IBM Plex Mono` (monospace)
- **Rubber Stamp Component**: Rotated badge (-3deg) with distinct border styling for Apply (green), Verify first (amber), and Skip (red).

## Components

### `src/app/page.tsx`
Main page component managing client state transition between `InputState` and `ReportState`.
PRD ref: `prd.md > Screens and Layout`.

### `src/client/components/InputPanel.tsx`
Tabbed container (*Paste text*, *Upload screenshot*, *Try a sample*) managing text area, screenshot file dropzone accepting up to 2 images (due to vision model 8,000 TPM limit at 2,048 tokens/image) with removable ordered thumbnails, and sample selection (4 fictional posts including Bengali scam-like).
PRD ref: `prd.md > Core Journey (Step 2)`.

### `src/client/components/ContextChips.tsx`
Tap-to-select chip controls for 3 context questions with exact enum bindings.
PRD ref: `prd.md > Core Journey (Step 3)`.

### `src/client/components/LoadingSteps.tsx`
Progressive step label indicator ("Reading the post" → "Looking for signals" → "Checking quotes").
PRD ref: `prd.md > Core Journey (Step 5)`.

### `src/client/components/ReportView.tsx`
Report layout shell orchestrating two-column desktop / stacked mobile views.
PRD ref: `prd.md > Screens and Layout`.

### `src/client/components/PostView.tsx`
Monospace text viewer displaying full post text (or joined extracted text labeled *"Text read from your screenshot"* or *"Text read from your N screenshots"*) with embedded highlight spans and scroll-into-view pulse handlers.
PRD ref: `prd.md > Core Journey (Step 6)`.

### `src/client/components/LaneCard.tsx`
Signal lane card displaying signal strength badge (Low/Medium/High), quoted lines (or "From your answers"), and plain-language reasons.
PRD ref: `prd.md > Core Journey (Step 6)`.

### `src/client/components/NextMoveStamp.tsx`
Visual rubber stamp badge (**Apply** / **Verify first** / **Skip**) and 2-3 concrete verification steps.
PRD ref: `prd.md > Core Journey (Step 6)`.

### `src/client/components/ErrorNotice.tsx`
Friendly error notice container displaying specific error states and retry buttons.
PRD ref: `prd.md > States and Boundaries`.

## Data Model

### Context Enums & Request Schema (`src/shared/schema.ts`)
```ts
export const SourceEnum = z.enum([
  "linkedin",
  "job_board",
  "facebook_group",
  "whatsapp_telegram",
  "company_website",
  "other"
]);

export const AgeEnum = z.enum([
  "under_1_week",
  "1_4_weeks",
  "1_3_months",
  "over_3_months",
  "not_sure"
]);

export const RepostedEnum = z.enum(["yes", "no", "not_sure"]);

export const ContextSchema = z.object({
  source: SourceEnum,
  age: AgeEnum,
  reposted: RepostedEnum,
});

const TextRequestSchema = z.object({
  mode: z.literal("text"),
  text: z.string().min(80).max(8000),
  context: ContextSchema,
});

const ImageItemSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const ImageRequestSchema = z.object({
  mode: z.literal("image"),
  images: z.array(ImageItemSchema).min(1).max(2),
  context: ContextSchema,
});

export const AnalyzeRequestSchema = z.discriminatedUnion("mode", [
  TextRequestSchema,
  ImageRequestSchema,
]);

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
```

### AI Response Schema (`src/shared/schema.ts`)
```ts
export const PostSignalSchema = z.object({
  source: z.literal("post"),
  quote: z.string().min(1),
  reason: z.string(),
});

export const ContextSignalSchema = z.object({
  source: z.literal("context"),
  reason: z.string(),
});

export const SignalSchema = z.discriminatedUnion("source", [
  PostSignalSchema,
  ContextSignalSchema,
]);

export const LaneSchema = z.object({
  strength: z.enum(["low", "medium", "high"]),
  signals: z.array(SignalSchema),
});

export const AnalyzeResponseSchema = z.object({
  isJobPost: z.boolean(),
  extractedText: z.string(),
  lanes: z.object({
    scam: LaneSchema,
    ghost: LaneSchema,
    mismatch: LaneSchema,
  }),
  verificationSteps: z.array(z.string()).min(2).max(3),
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
```

## File Structure

```
d:\devpost-hackathon/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts        # POST endpoint with error mapping & validation
│   │   ├── globals.css             # Tailwind v4 @theme design tokens & custom styles
│   │   ├── layout.tsx              # Font preloading & page shell layout
│   │   └── page.tsx                # Single-page client container (Input <-> Report)
│   ├── client/
│   │   ├── components/
│   │   │   ├── ContextChips.tsx    # 3 chip questions (enum bindings)
│   │   │   ├── ErrorNotice.tsx     # Error notice component
│   │   │   ├── InputPanel.tsx      # Input tabs (Text, Image, Sample)
│   │   │   ├── LaneCard.tsx        # Signal lane card component
│   │   │   ├── LoadingSteps.tsx    # Step progress indicator
│   │   │   ├── NextMoveStamp.tsx   # Stamp badge & verification steps
│   │   │   ├── PostView.tsx        # Highlighted post text viewer
│   │   │   └── ReportView.tsx      # Report view layout shell
│   │   └── lib/
│   │       └── image.ts            # Client-side image validation & downscaling (up to 2 images)
│   ├── server/
│   │   ├── groq.ts                 # Groq client using z.toJSONSchema (server-only)
│   │   └── prompt.ts               # System instructions & prompt builder (server-only)
│   └── shared/
│       ├── data/
│       │   ├── sample-results.ts   # Cached fallback results for 4 sample posts (captured from real runs)
│       │   └── samples.ts          # 4 fictional pre-loaded sample job posts (including Bengali scam-like)
│       ├── errors.ts               # Error codes & user-facing message mapping
│       ├── highlight.ts            # Pure function: maps quotes to original char indices
│       ├── rules.ts                # Pure logic: validateQuotes, duplicate quote lane priority & nextMove
│       ├── schema.ts               # Zod request & response schemas
│       └── types.ts                # Exported TypeScript types & interfaces
├── devpost/
│   ├── learner-profile.md          # Learner profile configuration
│   ├── prd.md                      # Approved PRD specification
│   ├── scope.md                    # Approved Scope specification
│   └── spec.md                     # Approved Technical Specification
├── scripts/
│   └── capture-sample-results.mjs # Script to capture real API results for sample posts
├── tests/
│   ├── highlight.test.ts           # Vitest unit tests for highlight range mappings
│   └── rules.test.ts               # Vitest unit tests for quote verification, duplicate quote priority & next move
├── .env.example                    # Environment variable template
├── next.config.ts                  # Next.js configuration
├── package.json                    # Application dependencies & npm scripts (including capture:samples)
├── tsconfig.json                   # Strict TypeScript configuration
└── vitest.config.ts                # Vitest configuration
```

## External Services and Dependencies
- **Groq API (`groq-sdk`)**:
  - SDK: `https://github.com/groq/groq-typescript`
  - Model: Read from `GROQ_MODEL` (supports image input and JSON schema structured outputs; no hardcoded default). Text requests retry on an optional text-only fallback model set by `GROQ_TEXT_FALLBACK_MODEL` (`openai/gpt-oss-120b`) when `GROQ_MODEL` is rate limited; image requests use only `GROQ_MODEL`.
  - Key storage: `GROQ_API_KEY` in environment variables.
  - Response format: `json_schema` generated from Zod via `z.toJSONSchema` (`strict: false`), with one retry on invalid response before returning `AI_ERROR`.

## Important Failure Modes
PRD ref: `prd.md > States and Boundaries`.

- **API Request Validation Error**: Zod request schema failure returns `TOO_SHORT` or `INVALID_IMAGE`.
- **Non-Job Post Input**: AI response returning `isJobPost === false` maps to `NOT_A_JOB_POST`.
- **Unreadable Screenshot**: Image mode returning empty `extractedText` maps to `UNREADABLE_IMAGE`.
- **API Rate Limit (HTTP 429)**: Groq HTTP 429 status maps to `RATE_LIMITED`. When `GROQ_MODEL` is rate limited, text requests retry on an optional text-only fallback model set by `GROQ_TEXT_FALLBACK_MODEL` (`openai/gpt-oss-120b`); image requests use only `GROQ_MODEL`.
- **AI / Parsing Error**: Any other API error or invalid AI JSON response maps to `AI_ERROR`.
- **Sample Fallback**: Built-in sample posts (4 samples) catching `RATE_LIMITED` or `AI_ERROR` display a saved example result from `src/shared/data/sample-results.ts` labeled *"Saved example result"*, captured from a real run.
- **Hallucinated & Duplicate Signal Quotes**: Handled deterministically by `src/shared/rules.ts > validateQuotes`. Quotes not matching the post text after collapsing whitespace and ignoring case (with exact punctuation preserved) are dropped before rendering. If the same quote (after normalization) appears in more than one lane, it is kept only in the higher-severity lane (Scam > Mismatch > Ghost), covered by a unit test in `tests/rules.test.ts`.

## What Was Simplified and Why
- **Client-Side Canvas Downscaling**: Replaces heavy server-side image processing libraries with HTML5 Canvas downscaling in `src/client/lib/image.ts`, resizing each image (up to 2) to keep the combined request payload under Vercel's 4.5 MB body limit.
- **Single Source Schema (`z.toJSONSchema`)**: Automatically generates Groq structured response schemas directly from Zod definitions, preventing schema drift between AI prompt configuration and server validation.
- **Pure Function Verification**: Uses lightweight TypeScript substring checking in `src/shared/rules.ts` rather than complex NLP string distance engines.

## Decisions and Open Issues

### Decisions Made
- **Client/Server Code Separation (`src/server/` & `server-only`)**: Prevents API secrets, AI SDK logic, and server prompt logic from ever leaking into client browser bundles.
- **Tailwind v4 Theme Tokens**: Configured `@theme` rules directly in `src/app/globals.css`, eliminating the need for `tailwind.config.ts`.
- **Exact Punctuation & Normalization Match**: Quote matching collapses extra whitespace and ignores case, but strictly matches punctuation to ensure exact highlight mapping back to original character indices in `src/shared/highlight.ts`.
- **Duplicate Quote Lane Priority**: When the same quote appears in more than one lane, `rules.ts` keeps it only in the higher-severity lane (Scam > Mismatch > Ghost). Covered by a unit test.
- **2-Screenshot Limit**: Capped at 2 images per request because the Groq vision model's free tier has an 8,000 tokens-per-minute (TPM) rate limit, and each image consumes 2,048 tokens.

### Learner Technical Uncertainty / Investigation
- **Quote Validation & Highlight Alignment**: Resolved by normalizing whitespace and casing during quote search while mapping character indices back to the original unmodified text string for highlight rendering in `PostView`.

### Open Issues
- Bengali support & OCR: A fourth built-in fictional sample written in Bengali (scam-like) allows instant one-click demonstration of Bengali post analysis, with fallback captured from a real run. Groq reads Bengali screenshots accurately enough for quote highlights to match, with occasional misread words on unfamiliar names. Groq remains sole provider; Slice 6 will add a user note to compare AI text reading with the image.

## Build Plan

The build will proceed in 6 ordered, verifiable steps:

1. **Slice 1: Scaffold & Static Input UI**: Set up Next.js + Tailwind v4 + Fonts + Zod + Vitest. Build `InputPanel` (text, multi-screenshot dropzone with ordered removable thumbnails up to 2 images, 4 samples), `ContextChips`, and static page layout.
2. **Slice 2: Groq API Route & Samples**: Implement `src/shared/schema.ts` (including `images` array schema), `src/server/groq.ts`, `src/server/prompt.ts`, `src/shared/data/samples.ts` (4 samples including Bengali scam-like), `src/shared/errors.ts`, and `src/app/api/analyze/route.ts` for text and image analysis.
3. **Slice 3: Rules Engine, Highlights & Report UI**: Implement `src/shared/rules.ts` (including duplicate quote lane priority Scam > Mismatch > Ghost), `src/shared/highlight.ts`, and unit tests (`tests/rules.test.ts`, `tests/highlight.test.ts`). Build `ReportView`, `PostView`, `LaneCard`, and `NextMoveStamp`.
4. **Slice 4: Multi-Image Handling & OCR**: Implement `src/client/lib/image.ts` for image format/size validation and client-side downscaling (up to 2 images, total payload < 4.5 MB). Test screenshot uploads and joined text display.
5. **Slice 5: Loading, Error States & Fallback for Sample Posts**: Build `LoadingSteps`, `ErrorNotice`, and `src/shared/data/sample-results.ts` (captured from real runs for all 4 samples) for fallback for sample posts.
6. **Slice 6: Visual Polish, Accessibility & Vercel Deployment**: Final responsive pass, contrast check, keyboard navigation, and deploy to Vercel.
