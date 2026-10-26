---
doc: prd
status: approved
---

# Ghostlisted — Product Requirements

Before you apply, find out if anyone's really hiring.  
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`, `scope.md > The Core Loop`, `scope.md > The POC Boundary`.

## The Core Journey
1. **Arrival**: User arrives at a single-page web app featuring the app name, tagline, and a concise summary of the three signal types checked (Scam, Ghost, and Fresher-Mismatch).
2. **Input**: User selects one of three input tabs:
   - *Paste text*: Direct text area for pasting raw job post text (English or Bengali).
   - *Upload screenshot*: File selector / drag-and-drop accepting up to 2 images (JPG, PNG or WebP, each up to 4 MB; limited to 2 images because the vision model's free tier allows 8,000 tokens per minute and each image counts as 2,048 tokens), shown as ordered thumbnails that can be removed one by one. They are analyzed together, in order, as one post, and the extracted text joins them in that order.
   - *Try a sample*: Selection of 4 pre-loaded fictional job posts (one Scam-like, one Ghost-like, one Fresher-mismatch, and a fourth fictional sample written in Bengali [scam-like] so Bengali support is visible in one click) with invented company names.
3. **Context Selection**: User answers 3 quick chip-selection questions:
   - *Where did you find it?* (LinkedIn / Job board / Facebook group / WhatsApp or Telegram / Company website / Other)
   - *How old is the post?* (Under 1 week / 1-4 weeks / 1-3 months / Over 3 months / Not sure)
   - *Have you seen it reposted?* (Yes / No / Not sure)  
   *(Questions default to "Not sure" / "Other" if unselected)*
4. **Submit**: The "Check this post" button activates as soon as input text or image is present.
5. **Loading**: App shows progressive step labels ("Reading the post" → "Looking for signals" → "Checking quotes") instead of a generic spinner.
6. **Report Generation**: Within seconds, the user receives an evidence-based report:
   - *Post View*: Displays full post text (or OCR-extracted screenshot text labeled *"Text read from your screenshot"* for 1 image or *"Text read from your N screenshots"* for multiple images) with quoted evidence highlighted in lane-specific highlighter colors.
   - *Three Signal Lanes*: Scam signals (translucent red `#E5484D`), Ghost signals (translucent highlighter yellow `#F5C400`), and Fresher-mismatch signals (translucent blue `#2F6FDB`). Each lane shows signal strength (Low / Medium / High), quoted text, and a plain-language explanation.
   - *Interactive Highlights*: Clicking any signal item in a lane card smooth-scrolls to and pulses its highlighted line in the Post View.
   - *Recommended Move*: Displays a rubber-stamp badge (**Apply** / **Verify first** / **Skip**) plus 2-3 concrete verification steps.
   - *Persistent Disclaimer*: Footer note stating: *"Signals, not verdicts. A post can't prove what a company decides internally."*
7. **Reset**: User clicks "Check another post" to clear state and evaluate another listing.

## Screens and Layout
Single-page application operating in two distinct view states:

- **Input State**: Centered, focused layout containing hero header, 3 input tabs, text/file input area, context question chips, and the primary "Check this post" action button.
- **Report State**:
  - **Desktop Layout**: Two-column layout with Post View (with inline highlighted quotes) on the left, and the right column containing the Next Move rubber stamp + verification steps at the top, followed by the 3 Signal Lane cards below.
  - **Mobile Layout**: Responsive vertical stack ordering: Next Move stamp first, followed by Signal Lane cards, followed by the highlighted Post View.

## Look and Feel
- **Visual Direction**: "Case File" — styled like an investigator's physical evidence file.
- **Color Palette**: Warm off-white paper background (`#F4F1EA`), ink-black typography (`#1B1B1B`).
- **Typography**:
  - Headings: Editorial serif (*Fraunces*).
  - Body Text: Clean sans-serif (*IBM Plex Sans*).
  - Post / Source Text: Typewriter-style monospace (*IBM Plex Mono*).
- **Highlighter Signal Styling**:
  - Scam Signals: Translucent red highlighter stroke (`#E5484D` tint) behind ink text + warning icon.
  - Ghost Signals: Translucent highlighter yellow stroke (`#F5C400` tint) behind ink text + ghost icon.
  - Fresher-Mismatch Signals: Translucent blue highlighter stroke (`#2F6FDB` tint) behind ink text + mismatch icon.
  - *Accessibility*: High contrast ink text, translucent tints behind text, plus a lane icon and text label so color is never the sole indicator.
- **Next Move Stamp**: Rubber-stamp graphic with slight rotational angle.
- **Explicitly Avoided**: Purple/blue AI gradients, glassmorphism, chat bubbles, emoji-heavy UI, generic dashboard cards.
- **Accessibility & Usability**: Visible focus states, keyboard-usable tabs and context chips.

## Features and Behavior

### Deterministic Application Rules (App Logic)
- **Quote Validation Rule**: Any signal quote returned by the AI that cannot be found strictly inside the post text is dropped before rendering.
- **Duplicate Quote Resolution Rule**: If the same quote (after normalization) appears in more than one lane, keep it only in the higher-severity lane (Scam > Mismatch > Ghost). Covered by a unit test.
- **Context Signal Rule**: The 3 context answers are sent with the post. Signals based only on a context answer (e.g. post older than 3 months, seen reposted) are shown in their lane with the label 'From your answers' instead of a quote. They are not highlighted in the Post View and are exempt from the Quote Validation Rule. All other signals must quote the post.
- **Next Move Logic Matrix**:
  - **Skip**: Triggered if Scam lane strength is **High**.
  - **Verify First**: Triggered if any lane strength is **Medium** or **High** (and Scam is not High).
  - **Apply**: Default when all lanes are **Low** or have no signals.
- **Empty Lane Rule**: A lane with zero signals displays *"No [lane] signals found in this post."* (Never states "safe" or "verified clean").

### Input & Text Extraction
- **Text & Screenshot Processing**: Handles raw text or up to 2 screenshot image uploads (JPG, PNG, or WebP, each up to 4 MB; limited to 2 images because the vision model's free tier allows 8,000 tokens per minute and each image counts as 2,048 tokens), shown as ordered thumbnails that can be removed one by one. The browser downscales each image and keeps the total payload under Vercel's 4.5 MB limit. They are analyzed together, in order, as one post, and the extracted text joins them in that order. The report label reads *"Text read from your screenshot"* (for 1 image) or *"Text read from your N screenshots"* (for N images) and is used for inline quote highlighting.
- **Sample Selection**: 4 built-in fictional posts (Scam-like, Ghost-like, Fresher-mismatch, and Bengali scam-like) with invented company names for instant demo testing.

### Interactive Signal Reporting
- **Highlight Interactivity**: Clicking a signal card item scrolls the Post View to the matching quote line and triggers a visual pulse effect.

## States and Boundaries

- **Input State**: Default view with input tabs and disabled CTA until text/image is provided.
- **Loading State**: Step-by-step progress indicator ("Reading the post", "Looking for signals", "Checking quotes").
- **Report State**: Complete report layout with Post View, Signal Lanes, Next Move Stamp, and "Check another post" reset button.
- **Short Text Error**: Friendly message when submitted text is too short, requesting the full job post.
- **Invalid Input Error**: Displays *"This doesn't look like a job post"* with a direct link to try a sample post.
- **Invalid Image Error**: Only JPG, PNG, or WebP images up to 4 MB each (up to 2 images) are accepted; anything else shows a clear message before any analysis runs.
- **Unreadable Screenshot Error**: Prompts user to upload a clearer image or paste text manually.
- **API Error / Rate Limit**: Displays an error message with a "Retry" button. For built-in sample posts, falls back to a saved example result labeled *"Saved example result"* captured from a real run.
- **Privacy & Data Boundary**: Zero user data saved. Footer note states: *"Post text is sent to an AI service for analysis and is not stored."*

## Product Decisions
- **"Case File" Investigator Aesthetic**: Establishes an objective, evidence-based tone rather than a generic AI chat or dashboard wrapper.
- **Deterministic Guardrails**: Guarantees reliability by filtering missing quotes in app code, resolving duplicate quotes across lanes by severity priority (Scam > Mismatch > Ghost), and calculating next moves via explicit rules rather than trusting raw AI outputs.
- **Social Media Screenshot Focus**: Direct support for image posts from Facebook job groups and WhatsApp/Telegram forwards where many openings are shared across 1 or 2 screenshots and never appear on job boards.
- **Built-in Sample Fallbacks**: Ensures robust hackathon demo execution even during API downtime or rate limits. Saved fallback results for all 4 samples are captured from real runs.

## What We're Building
- Single-page application supporting Input and Report states.
- 3 input tabs (Paste text, Screenshot upload accepting up to 2 images with ordered removable thumbnails and joined text extraction display, 4 Fictional samples including Bengali sample).
- 3 context chip questions.
- Step-by-step loading state.
- 3-lane signal report (Scam, Ghost, Fresher Mismatch) with strength levels, verbatim quotes, and plain-language explanations.
- Highlighted post text view with pulse navigation on signal selection.
- Deterministic quote validation, duplicate quote resolution across lanes by severity (Scam > Mismatch > Ghost), context signal handling, and next-move stamp calculation.
- Fallback cached results for 4 built-in sample posts captured from real runs.
- Fully responsive "Case File" UI with accessible contrast, fonts, and keyboard navigation.

## Deferred From the POC
- Community signal voting & crowd-sourced warning reports.
- Browser extension for inline job board checking.
- User accounts and saved check history.
- Direct URL job scraping.

## Possible Later Enhancements
- Multi-language UI translation (currently Bengali job text is supported while UI remains English).
- Company credibility lookup integration.

## Non-Goals
- Ghostlisted will not output definitive verdicts like "This post is 100% fake".
- Ghostlisted will not store user submissions or scraped data.
- Ghostlisted will not provide resume optimization or job search functionality.

## Open Questions
None. All functional, behavioral, edge-case, and visual design requirements have been fully specified by the learner.
