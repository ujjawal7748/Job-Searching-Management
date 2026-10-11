import { useEffect, useMemo, useState } from 'react'
import type { Job } from '../types/job'
import { getJobs } from '../lib/api'

function CoverLetter() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')

  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [location, setLocation] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [skills, setSkills] = useState('')
  const [experience, setExperience] = useState('')
  const [tone, setTone] = useState('Professional')

  const [coverLetter, setCoverLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getJobs()
      .then((data) => {
        const activeJobs = data.filter((job) => !job.deletedAt)
        setJobs(activeJobs)
      })
      .catch(() => {
        setError('Unable to load saved jobs. Please refresh the page.')
      })
  }, [])

  const companies = useMemo(
    () =>
      [...new Set(
        jobs
          .map((job) => job.company.trim())
          .filter(Boolean),
      )].sort((a, b) => a.localeCompare(b)),
    [jobs],
  )

  const companyJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.company.trim() === selectedCompany &&
          job.position.trim(),
      ),
    [jobs, selectedCompany],
  )

  const selectedJob = jobs.find(
    (job) => job.id === selectedJobId,
  )

  function handleCompanyChange(value: string) {
    setSelectedCompany(value)
    setSelectedJobId('')
    setCompany(value)
    setPosition('')
    setLocation('')
    setSkills('')
    setJobDescription('')
    setCoverLetter('')
    setError('')
    setSuccess('')
  }

  function handleJobChange(jobId: string) {
    setSelectedJobId(jobId)
    setCoverLetter('')
    setError('')
    setSuccess('')

    const job = jobs.find((item) => item.id === jobId)
    if (!job) return

    setCompany(job.company)
    setPosition(job.position)
    setLocation(job.location || '')
    setSkills(job.skills?.join(', ') || '')
    setJobDescription(job.description || '')
  }

  async function generateCoverLetter() {
    setError('')
    setSuccess('')
    setCoverLetter('')

    if (!company.trim() || !position.trim() || !jobDescription.trim()) {
      setError(
        'Please enter the company, position, and job description.',
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: company.trim(),
          position: position.trim(),
          location: location.trim(),
          jobDescription: jobDescription.trim(),
          skills: skills.trim(),
          experience: experience.trim(),
          tone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to generate cover letter.',
        )
      }

      if (typeof data.coverLetter !== 'string' || !data.coverLetter.trim()) {
        throw new Error('The API returned an empty cover letter.')
      }

      setCoverLetter(data.coverLetter)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function copyCoverLetter() {
    try {
      await navigator.clipboard.writeText(coverLetter)
      setSuccess('Cover letter copied to clipboard.')
      setError('')
    } catch {
      setError(
        'Unable to copy automatically. Select the cover letter and copy it manually.',
      )
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-slate-900">
          AI Cover Letter Generator
        </h1>

        <p className="mt-2 text-slate-600">
          Select a saved job or enter job details manually to generate a
          tailored cover letter.
        </p>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Select a Saved Job
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="saved-company"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Company
              </label>

              <select
                id="saved-company"
                value={selectedCompany}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
              >
                <option value="">Select a company</option>
                {companies.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="saved-position"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Job Position
              </label>

              <select
                id="saved-position"
                value={selectedJobId}
                onChange={(e) => handleJobChange(e.target.value)}
                disabled={!selectedCompany || companyJobs.length === 0}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 disabled:bg-slate-100"
              >
                <option value="">Select a position</option>
                {companyJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.position}
                    {job.location ? ` — ${job.location}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {jobs.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              No saved jobs found. You can enter the details manually below.
            </p>
          )}

          {selectedCompany && companyJobs.length === 0 && (
            <p className="mt-3 text-sm text-amber-700">
              No positions found for this company. Enter the details manually.
            </p>
          )}

          {selectedJob && (
            <p className="mt-3 text-sm text-emerald-700">
              Saved job selected. Available details have been filled in below.
            </p>
          )}
        </section>

        <section className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Job and Candidate Details
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="company"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Company Name *
              </label>
              <input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Enter company name"
                className="w-full rounded-lg border border-slate-300 px-3 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="position"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Job Position *
              </label>
              <input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Frontend Developer"
                className="w-full rounded-lg border border-slate-300 px-3 py-3"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="location"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Job Location
            </label>
            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Remote, Bengaluru"
              className="w-full rounded-lg border border-slate-300 px-3 py-3"
            />
          </div>

          <div>
            <label
              htmlFor="job-description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Job Description *
            </label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-3"
            />
          </div>

          <div>
            <label
              htmlFor="skills"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Your Skills
            </label>
            <textarea
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="JavaScript, React, TypeScript..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-3"
            />
          </div>

          <div>
            <label
              htmlFor="experience"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Your Experience and Projects
            </label>
            <textarea
              id="experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Describe your experience, projects, and achievements..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-3"
            />
          </div>

          <div>
            <label
              htmlFor="tone"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Writing Tone
            </label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
            >
              <option value="Professional">Professional</option>
              <option value="Confident">Confident</option>
              <option value="Enthusiastic">Enthusiastic</option>
              <option value="Concise">Concise</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-700" role="status">
              {success}
            </p>
          )}

          <button
            type="button"
            onClick={generateCoverLetter}
            disabled={loading}
            className="w-full rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Generating Cover Letter...' : 'Generate Cover Letter'}
          </button>
        </section>

        {coverLetter && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                Your Cover Letter
              </h2>

              <button
                type="button"
                onClick={copyCoverLetter}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Copy Cover Letter
              </button>
            </div>

            <textarea
              aria-label="Generated cover letter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={18}
              className="w-full rounded-lg border border-slate-200 p-4 leading-7 text-slate-700"
            />
          </section>
        )}
      </div>
    </main>
  )
}

export default CoverLetter