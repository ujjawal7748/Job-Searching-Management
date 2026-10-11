# AI Job Tracker — QA Test Report

**Test date:** October 11, 2026  
**Test environment:** Local Vercel development server, React/Vite app  
**Overall result:** **FAIL for production readiness; core local workflows passed**

## Executive summary

The dashboard, analytics, resume matching, cover-letter generation, and screenshot job extraction were exercised locally. Core job-management and AI workflows worked with synthetic test data. The Gemini-backed resume matcher, cover-letter generator, and screenshot extractor each returned successful results during testing.

The assessment found six issues: mobile horizontal overflow, an uncaught application failure when stored jobs contain malformed JSON, unauthenticated AI endpoints that could be abused for quota/cost, no explicit screenshot upload size limit, inaccurate CSV import counts when duplicates are present, and raw PDF parsing errors for corrupt files.

No application source, configuration, dependencies, environment files, deployment settings, or existing user data were changed. Temporary QA records and the synthetic resume were removed from the isolated browser origin; temporary PDF and CSV fixtures were also cleaned up.

## Test results

| Area | Result | Notes |
|---|---|---|
| Dashboard and navigation | **PASS** | Dashboard and nested routes loaded and refreshed. Unknown routes redirected to `/`. One navbar appeared per page. |
| Add and edit jobs | **PASS** | Added records with all fields and with optional fields blank; required validation and edit/save worked. |
| Job status changes | **PASS** | Saved a QA job in each of Wishlist, Applied, Interview, Offer, and Rejected. |
| Delete, Trash, restore | **PASS** | Soft delete removed a card from the board and placed it in Trash; restore returned it; permanent delete removed QA records. |
| Search and status filtering | **PASS** | Search and status filter returned expected results. |
| Drag-and-drop status change | **NOT RUN** | Status transitions were tested using the edit form, not drag-and-drop. |
| Job persistence after refresh | **PASS** | A uniquely named QA record and details remained after refresh. |
| Exact date and URL persistence | **NOT RUN** | Entered in a test record but did not independently verify stored values after refresh. |
| CSV valid and invalid row handling | **PASS** | Valid rows imported; a row missing a required field was skipped. Duplicate record was not inserted twice. |
| CSV duplicate count | **FAIL** | Import summary counted a duplicate as imported even though the dashboard did not add it. See bug 5. |
| Empty data states | **PASS** | Dashboard empty state and Analytics zero-data states rendered; original browser storage was restored. |
| Malformed local storage | **FAIL** | Malformed jobs JSON produced an uncaught `SyntaxError` and a blank Dashboard. See bug 2. |
| Analytics totals and rates | **PASS** | Tested totals and rates matched the QA data; Wishlist was excluded from Total Applied. |
| Excluding deleted jobs from analytics | **PASS** | Analytics totals decreased on soft-delete and returned after restore. |
| Weekly applications chart | **PASS** | Chart rendered with weekly labels. A current-week application affected the weekly total as expected. |
| Funnel semantics | **PASS — behavior documented** | This is not a conversion funnel: Interview Stage includes interviews and offers, and Offers is a subset. These overlapping counts are displayed as pie slices. |
| Analytics chart responsive behavior | **NOT RUN** | Page overflow was found on mobile; chart-specific resizing was not independently evaluated. |
| Resume upload and replacement | **PASS** | Synthetic text PDF uploaded, saved, replaced, and displayed with the new filename. |
| Resume PDF text extraction and matching | **PASS** | PDF.js extracted synthetic text; Gemini returned a score, skills, strengths, improvements, and summary. |
| Unsupported resume file | **PASS** | Non-PDF file showed a validation message and did not replace the saved resume. |
| Corrupt PDF feedback | **FAIL** | Corrupt `.pdf` file was accepted for storage; matching later showed the raw `Invalid PDF structure.` error. See bug 6. |
| Wishlist behavior in Resume Match | **NOT RUN** | Source provides non-deleted jobs, but the Wishlist path was not exercised in the UI. |
| Resume matching API validation | **PASS** | Missing/invalid inputs and oversized resume text returned HTTP 400 JSON errors. |
| Cover-letter saved job selection | **PASS** | Company options were unique in the test data; selecting a role populated details; switching company cleared the old role. |
| Cover-letter validation and tone selection | **PASS** | Empty required fields showed an error; all four tone options were present and selectable. |
| Cover-letter generation and copy | **PASS** | Gemini returned editable, relevant text using synthetic candidate details; clipboard copy succeeded. The one tested response did not claim an unsupported degree or years of experience. |
| Cover-letter editing | **NOT RUN** | Output is an editable textarea, but editing the generated text was not exercised. |
| Screenshot extraction API | **PASS** | A synthetic screenshot returned HTTP 200 JSON with expected job fields. |
| API method, input, and field-size validation | **PASS** | GET returned 405 for all three APIs; invalid inputs returned 400; oversized resume and cover-letter fields returned 400. |
| Screenshot image size limit | **FAIL** | No explicit application-level image-size check was found before forwarding data to Gemini. See bug 4. |
| Network failure / missing API key | **NOT RUN** | No credentials or network settings were changed to force failure scenarios. |
| Routes, refresh, runtime errors | **PASS** | Dashboard, Analytics, Resume Match, and Cover Letter loaded after navigation and refresh; no runtime errors observed during normal route checks. |
| Mobile layout | **FAIL** | At 390 px viewport, document width was 488 px on Analytics, Resume Match, and Cover Letter; Dashboard width was 973 px. See bug 1. |
| Keyboard-only and screen-reader testing | **NOT RUN** | No full assistive-technology audit was performed. |

## Defects

### 1. Mobile horizontal overflow

- **Severity:** Medium
- **Reproduction:** Set the browser viewport to 390 px wide and open the app routes.
- **Expected:** Page content fits the viewport, or scrolling is intentionally limited to an appropriate region.
- **Actual:** Navbar overflows on all routes; the Dashboard's Kanban columns increase the page width further.
- **Affected files:** `src/components/Navbar.tsx` (line 12), `src/components/KanbanBoard.tsx` (line 58)

### 2. Malformed local storage crashes the Dashboard

- **Severity:** Medium
- **Reproduction:** Set `localStorage.jobs` to malformed JSON such as `{malformed`, then refresh `/`.
- **Expected:** A recoverable message or safe recovery path.
- **Actual:** Dashboard becomes blank and throws an uncaught `SyntaxError`. Trash parsing is also unguarded.
- **Affected files:** `src/pages/dashboard.tsx` (lines 28, 44)

### 3. Public AI endpoints have no visible access control or rate limiting

- **Severity:** Medium — security/quota risk
- **Reproduction:** Send a valid POST to an AI endpoint without authentication.
- **Expected:** If deployed publicly, protect or rate-limit access to prevent unauthorized consumption of the server-side Gemini quota.
- **Actual:** A valid unauthenticated request reached Gemini and returned successfully. No authentication or rate limiting was found in the handlers.
- **Affected files:** `api/match-resume.ts` (line 21), `api/generate-cover-letter.ts` (line 26), `api/parse-job.ts` (line 18)

### 4. Screenshot endpoint has no explicit application-level image-size limit

- **Severity:** Medium — resource/cost risk
- **Reproduction:** Send a large screenshot request. A 5 MB malformed body reached local Vercel handling and was rejected for format; it did not test a valid large image against Gemini.
- **Expected:** Reject oversized images with a 4xx response before forwarding them to Gemini.
- **Actual:** Source validates the data-URL image format but has no explicit byte-size check before the Gemini call.
- **Affected file:** `api/parse-job.ts` (lines 44, 75)

### 5. CSV import count includes duplicate jobs

- **Severity:** Low
- **Reproduction:** Import a CSV with one already-saved company/position, one new valid job, and one invalid row.
- **Expected:** Report the number actually inserted, and ideally distinguish duplicates from invalid rows.
- **Actual:** The UI reported two successful imports, while only the one new job was added.
- **Affected files:** `src/components/CsvUpload.tsx` (lines 103, 106); duplicate filtering is in `src/pages/dashboard.tsx`.

### 6. Corrupt PDF produces a technical error

- **Severity:** Low
- **Reproduction:** Upload a corrupt file with a `.pdf` extension, then start analysis.
- **Expected:** Reject it early or show a clear, user-friendly “couldn’t read this PDF” message.
- **Actual:** File was saved based on its extension, then analysis displayed PDF.js's raw `Invalid PDF structure.` error.
- **Affected file:** `src/pages/ResumeMatch.tsx`

## Build and deployment checks

| Command/check | Result | Summary |
|---|---|---|
| `npm run build` | **PASS with warning** | TypeScript and Vite build completed. Main JS bundle: 1,195.70 kB minified; PDF worker: 1,264.34 kB. Vite warned about chunks larger than 500 kB. |
| `npm run lint` | **PASS** | ESLint completed successfully. |
| Automated test suite | **NOT RUN** | No test script or test/spec files were found. |
| `npm run dev:vercel` | **PASS locally** | Vercel local API routing worked. Port 3000 was occupied, so the test server ran on 3001. |
| Production deployment | **NOT RUN** | No production deployment or external production environment was tested. No `vercel.json` was present. |

## Security and configuration

- **Client-side API key exposure: PASS.** `.env.local` is ignored and not tracked. The key value was not printed. The production static output was checked against the configured key in memory; the key was not present.
- **Server-side Gemini calls: PASS.** Gemini requests are issued from the API handlers, not bundled frontend code.
- **Public endpoint access / quota abuse: FAIL — risk.** No authentication or rate limiting was found on AI endpoints.
- **Screenshot input size restriction: FAIL — risk.** No explicit app-level byte-size check was found before the AI request.
- **Production environment configuration: NOT RUN.** Local key configuration was present; production provider settings were not inspected.

## Prioritized fix plan

1. Protect or rate-limit AI endpoints and enforce a screenshot byte-size limit before calling Gemini.
2. Handle malformed and structurally invalid local storage safely so the Dashboard remains recoverable.
3. Fix navbar and Kanban horizontal overflow at mobile widths.
4. Report actual CSV insertion counts and duplicates accurately.
5. Validate PDF contents before saving and translate parser failures into useful messages.
6. Consider splitting the PDF.js/Recharts-heavy client bundle to address the production build-size warning.

## Exporting this report

This is a standalone Markdown file. Open it in VS Code or another Markdown editor to print/export it as PDF, or copy it into Word/Google Docs.
