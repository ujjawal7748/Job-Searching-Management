
import { useState } from 'react'

type MatchResult = {
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
  strengths: string[]
  improvements: string[]
  summary: string
}

type MatchApiResponse = {
  data?: MatchResult
  error?: string
}

function ResumeMatcher() {
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [result, setResult] = useState<MatchResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')

  async function handleAnalyze() {
  if (!resumeText.trim() || !jobDescription.trim()) {
    setError('Please enter both your resume and the job description.')
    return
  }

  setIsAnalyzing(true)
  setError('')
  setResult(null)

  try {
    const response = await fetch('/api/match-resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeText,
        jobDescription,
      }),
    })

    const responseText = await response.text()

    let data: MatchApiResponse

    try {
      data = JSON.parse(responseText) as MatchApiResponse
    } catch {
      throw new Error(
        `The API returned an invalid response (HTTP ${response.status}). Make sure the app is running with your Vercel development setup.`
      )
    }

    if (!response.ok) {
      throw new Error(data.error || 'Resume analysis failed.')
    }

    if (!data.data) {
      throw new Error('The API returned no analysis results.')
    }

    setResult(data.data)
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Something went wrong. Please try again.'
    )
  } finally {
    setIsAnalyzing(false)
  }
}
  

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Resume Matching AI
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Compare your resume with a job description and identify
          skills to improve.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="resume-text"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Resume Text
          </label>

          <textarea
            id="resume-text"
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste your resume text here..."
            rows={14}
            maxLength={30000}
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
          />

          <p className="mt-1 text-xs text-slate-400">
            {resumeText.length}/30,000 characters
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="job-description"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Job Description
          </label>

          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste the job description here..."
            rows={14}
            maxLength={20000}
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
          />

          <p className="mt-1 text-xs text-slate-400">
            {jobDescription.length}/20,000 characters
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isAnalyzing || !resumeText.trim() || !jobDescription.trim()}
        className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAnalyzing ? 'Analyzing Resume...' : 'Analyze Match'}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {isAnalyzing && (
        <p className="text-sm text-slate-500">
          AI is comparing your resume with the job requirements. This may
          take a few seconds.
        </p>
      )}

      {result && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Resume Match Score
            </p>

            <div className="mt-2 flex items-end gap-2">
              <h3 className="text-5xl font-bold text-purple-700">
                {result.matchScore}%
              </h3>
              <span className="pb-1 text-sm text-slate-500">
                estimated match
              </span>
            </div>

            <div
              className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Resume match score"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={result.matchScore}
            >
              <div
                className="h-full rounded-full bg-purple-600 transition-all"
                style={{ width: `${result.matchScore}%` }}
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {result.summary}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              This is an AI-generated estimate, not a hiring prediction.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ResultList
              title="Matched Skills"
              items={result.matchedSkills}
              emptyMessage="No matched skills identified."
              color="green"
            />

            <ResultList
              title="Skills to Develop"
              items={result.missingSkills}
              emptyMessage="No specific skill gaps identified."
              color="amber"
            />

            <ResultList
              title="Your Strengths"
              items={result.strengths}
              emptyMessage="No specific strengths identified."
              color="blue"
            />

            <ResultList
              title="Resume Improvements"
              items={result.improvements}
              emptyMessage="No improvement suggestions returned."
              color="purple"
            />
          </div>
        </div>
      )}
    </div>
  )
}

type ResultListProps = {
  title: string
  items: string[]
  emptyMessage: string
  color: 'green' | 'amber' | 'blue' | 'purple'
}

function ResultList({
  title,
  items,
  emptyMessage,
  color,
}: ResultListProps) {
  const colorClasses = {
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
    blue: 'border-blue-200 bg-blue-50',
    purple: 'border-purple-200 bg-purple-50',
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">
        {title}
      </h3>

      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${index}-${item}`}
              className={`rounded-lg border p-3 text-sm text-slate-700 ${colorClasses[color]}`}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          {emptyMessage}
        </p>
      )}
    </div>
  )
}

export default ResumeMatcher
