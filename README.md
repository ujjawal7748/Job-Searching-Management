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
- Extract job details from a screenshot.

## Requirements

- Node.js 20 or later
- npm
- A Gemini API key for AI features

## Setup

```sh
npm install
```

Add the Gemini key to a local `.env.local` file:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
```

Keep this key server-side. Do not expose it in frontend variables such as `VITE_*` or commit `.env.local`.

## Run locally

Use Vercel's local development server so the `/api/*` functions are available:

```sh
npm run dev:vercel
```

Open the local URL printed by Vercel. `npm run dev` starts Vite only; API routes require the Vercel development server.

## Data storage

Jobs and Trash are stored in the browser's `localStorage`; the resume PDF is stored in IndexedDB. Data is local to the current browser profile and site origin. It does not automatically sync between browsers, devices, local development, and the deployed site. Refreshing the page should retain saved records. Removing a job moves it to Trash; permanently deleting or clearing Trash cannot be undone.

## AI endpoints

- `POST /api/match-resume` — analyzes extracted resume text against a job description. It uses Gemini 3.8 Flash and falls back to Gemini 3.5 Flash-Lite if the primary model responds with HTTP 503.
- `POST /api/generate-cover-letter` — generates a cover letter.
- `POST /api/parse-job` — extracts job details from an image; image data is limited to 3 MiB decoded.

Set `GEMINI_API_KEY` in Vercel Project Settings for deployed environments. AI endpoints call Gemini server-side. Configure production request protection in the Vercel Firewall; the application endpoints do not implement authentication or a distributed rate limiter.

## Checks

```sh
npm run build
npm run lint
```

There is currently no automated test runner configured.
