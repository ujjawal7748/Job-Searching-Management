# AI Job Tracker

A React and TypeScript job-search tracker with a Kanban dashboard, analytics, CSV import, and Gemini-powered resume matching, cover-letter generation, and screenshot extraction.

## Features

- Track jobs through Wishlist, Applied, Interview, Offer, and Rejected.
- Search, filter, edit, and move jobs between Kanban columns.
- Soft-delete jobs to Trash, restore them, delete them permanently, or clear Trash after confirmation.
- Import jobs from CSV and view import, duplicate, and invalid-row counts.
- Review application statistics and charts.
- Upload a PDF resume and compare its extracted text with a saved job.
- Generate a tailored cover letter from saved or manually entered job details.
- Reopen or delete your saved resume-match and cover-letter results from account-specific history.
- Extract job details from a screenshot.

## Requirements

- Node.js 20 or later
- npm
- A Gemini API key for AI features

## Setup

```sh
npm install
```

Add the Gemini key and Supabase project settings to a local `.env.local` file:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

Keep `GEMINI_API_KEY` server-side. The Supabase URL and publishable/anon key are browser-visible by design; never put a Supabase service-role key in frontend variables. Access to job data is protected by the database row-level security policy.

The connected Supabase project must have the `job_tracker_data` and `ai_generation_history` tables configured with per-user row-level security. Their SQL setup is managed directly in the Supabase project and is intentionally not included in this application repository. For local Vite development, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`. For Vercel Preview and Production, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Project Settings, then redeploy. The Vite configuration maps either naming convention to the same two client settings while explicitly exposing only those values. Use the public anon/publishable key, never a service-role key.

Users create an account with email and password. Depending on the Supabase Auth email-confirmation setting, they may need to confirm their email before signing in.

## Run locally

Use Vercel's local development server so the `/api/*` functions are available:

```sh
npm run dev:vercel
```

Open the local URL printed by Vercel. `npm run dev` starts Vite only; API routes require the Vercel development server.

## Data storage

Jobs and Trash are stored in Supabase, scoped to the signed-in user with row-level security, and can be accessed across browsers and devices. On the first sign-in for an account, existing valid jobs and Trash from that browser's `localStorage` are copied to the account if it has no cloud data yet. The local values are not removed by this import. Each account starts with the app's sample jobs only if there is no existing browser data to import.

Resume PDFs remain in browser IndexedDB and do not sync to other devices; upload the PDF separately on each device where resume matching is needed. Removing a job moves it to Trash; permanently deleting or clearing Trash cannot be undone.

Completed resume-match analyses and generated cover-letter text are saved to the signed-in user's Supabase account and can be reopened or deleted from their history panel. Raw resume text, uploaded PDFs, job descriptions, skills, and other source inputs are not stored in AI history. History is separated by tool and account; deleting an item removes that saved result.

## AI endpoints

- `POST /api/match-resume` — analyzes extracted resume text against a job description using Gemini 3.5 Flash-Lite.
- `POST /api/generate-cover-letter` — generates a cover letter using Gemini 3.5 Flash-Lite.
- `POST /api/parse-job` — extracts job details from an image using Gemini 3.5 Flash-Lite; image data is limited to 3 MiB decoded.

Set `GEMINI_API_KEY` in Vercel Project Settings for deployed environments. AI endpoints call Gemini server-side. Configure production request protection in the Vercel Firewall; the application endpoints do not implement authentication or a distributed rate limiter.

## Checks

```sh
npm run build
npm run lint
```

There is currently no automated test runner configured.
