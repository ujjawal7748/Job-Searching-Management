import { useEffect, useRef, useState } from 'react'
import { getJobs } from '../lib/api'
import { deleteSavedResume, getSavedResume, saveResume, } from '../lib/resumeStorage'
import type { Job } from '../types/job'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const UNREADABLE_PDF_MESSAGE =
    "We couldn't read this PDF. Please upload a valid PDF file."
const NO_SELECTABLE_TEXT_MESSAGE =
    'No selectable text found in this PDF. Scanned PDFs need OCR.'

async function extractPdfText(file: File): Promise<string> {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

        const buffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

        const pages: string[] = []

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber)
            const content = await page.getTextContent()

            const pageText = content.items
                .filter((item) => 'str' in item)
                .map((item) => ('str' in item ? item.str : ''))
                .join(' ')

            pages.push(pageText)
        }

        const text = pages.join('\n').trim()

        if (!text) {
            throw new Error(NO_SELECTABLE_TEXT_MESSAGE)
        }

        return text
    } catch (err) {
        if (err instanceof Error && err.message === NO_SELECTABLE_TEXT_MESSAGE) {
            throw err
        }

        throw new Error(UNREADABLE_PDF_MESSAGE, { cause: err })
    }
}

function ResumeMatch() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [selectedJobId, setSelectedJobId] = useState('')
    const [resumeName, setResumeName] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    useEffect(() => {
        async function loadData() {
            try {
                const [savedJobs, savedResume] = await Promise.all([
                    getJobs(),
                    getSavedResume(),
                ])

                setJobs(savedJobs.filter((job) => !job.deletedAt))
                setResumeName(savedResume?.name ?? '')
            } catch {
                setError('Could not load saved jobs or resume.')
            } finally {
                setIsLoading(false)
            }
        }

        void loadData()
    }, [])

    async function handleResumeUpload(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0]
        event.target.value = ''

        if (!file) return

        setError('')
        setMessage('')
        setMatchResult(null)
        setProgress(0)

        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setError('Please upload a PDF file.')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('PDF must be smaller than 10 MB.')
            return
        }

        try {
            await extractPdfText(file)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : UNREADABLE_PDF_MESSAGE,
            )
            return
        }

        setIsSaving(true)

        try {
            await saveResume(file)
            setResumeName(file.name)
            setMessage('Resume saved locally in this browser.')
        } catch {
            setError('Could not save the PDF. Please try another file.')
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDeleteResume() {
        try {
            await deleteSavedResume()
            setResumeName('')
            setMatchResult(null)
            setProgress(0)
            setMessage('Saved resume removed.')
            setError('')
        } catch {
            setError('Could not delete the saved resume.')
        }
    }

    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [matchResult, setMatchResult] = useState<{
        matchScore: number
        matchedSkills: string[]
        missingSkills: string[]
        strengths: string[]
        improvements: string[]
        summary: string
    } | null>(null)

    const [progress, setProgress] = useState(0)
    const resultRef = useRef<HTMLElement | null>(null)

    async function handleAnalyze() {
        setError('')
        setMessage('')
        setMatchResult(null)

        if (!resumeName) {
            setError('Please upload your resume PDF first.')
            return
        }

        const selectedJob = jobs.find((job) => job.id === selectedJobId)

        if (!selectedJob) {
            setError('Please select a saved job.')
            return
        }

        const jobDescription = [
            selectedJob.description || '',
            ...(selectedJob.skills ?? []),
        ]
            .filter(Boolean)
            .join('\n')

        if (!jobDescription.trim()) {
            setError('Please add a job description or skills before analyzing.')
            return
        }
        setProgress(0)

        const progressTimer = window.setInterval(() => {
            setProgress((current) =>
                current < 90 ? Math.min(current + 5, 90) : current
            )
        }, 400)
        setIsAnalyzing(true)

        try {
            const savedResume = await getSavedResume()

            if (!savedResume) {
                throw new Error('Saved resume not found. Please upload it again.')
            }

            const resumeText = await extractPdfText(savedResume.file)

            const response = await fetch('/api/match-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeText, jobDescription }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Resume matching failed.')
            }

            if (!data.data) {
                throw new Error('The API returned no matching results.')
            }

            setMatchResult(data.data)
            setProgress(100)
        } catch (err) {
            setProgress(0)
            setError(
                err instanceof Error
                    ? err.message
                    : 'Something went wrong during resume analysis.',
            )
        } finally {
            window.clearInterval(progressTimer)
            setIsAnalyzing(false)
        }
    }

    if (isLoading) {
        return <div className="p-8 text-slate-600">Loading your saved jobs...</div>
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto max-w-5xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Resume Match AI</h1>
                    <p className="mt-2 text-slate-600">
                        Upload your resume and choose any saved job to prepare for the role.
                    </p>
                </div>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">1. Your Resume</h2>

                    <label
                        htmlFor="resume-pdf"
                        className="relative mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-purple-300 p-8 text-center hover:bg-purple-50 focus-within:ring-2 focus-within:ring-purple-500"
                    >
                        <span className="text-3xl">📄</span>
                        <span className="mt-2 font-semibold text-slate-800">
                            {resumeName || 'Choose your resume PDF'}
                        </span>
                        <span className="mt-1 text-sm text-slate-500">
                            PDF only · Maximum 10 MB
                        </span>
                        <span className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                            {resumeName ? 'Choose a different PDF' : 'Choose PDF'}
                        </span>
                        <input
                            id="resume-pdf"
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleResumeUpload}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                    </label>

                    {isSaving && (
                        <p className="mt-3 text-sm text-slate-500">Saving resume...</p>
                    )}

                    {resumeName && (
                        <button
                            type="button"
                            onClick={handleDeleteResume}
                            className="mt-4 text-sm font-medium text-red-600 hover:text-red-700"
                        >
                            Remove saved resume
                        </button>
                    )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">2. Select a Job</h2>

                    <label htmlFor="saved-job" className="mt-4 block text-sm font-medium text-slate-700">
                        All Saved jobs
                    </label>
                    <select
                        id="saved-job"
                        value={selectedJobId}
                        onChange={(event) => {
                            setSelectedJobId(event.target.value)
                            setMatchResult(null)
                            setProgress(0)
                            setError('')
                            setMessage('')
                        }}
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                    >
                        <option value="">Choose a job</option>
                        {jobs.map((job) => (
                            <option key={job.id} value={job.id}>
                                {job.position} — {job.company} ({job.status})
                            </option>
                        ))}
                    </select>

                    {selectedJobId && (() => {
                        const selectedJob = jobs.find((job) => job.id === selectedJobId)
                        if (!selectedJob) return null

                        return (
                            <div className="mt-4 rounded-lg bg-slate-50 p-4">
                                <h3 className="font-semibold text-slate-900">{selectedJob.position}</h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    {selectedJob.company} · {selectedJob.location}
                                </p>
                                <p className="mt-2 text-sm text-slate-500">
                                    Status: {selectedJob.status}
                                </p>
                                <p className="mt-3 text-sm text-slate-700">
                                    {selectedJob.description || 'No job description saved for this job.'}
                                </p>
                                {(selectedJob.skills?.length ?? 0) > 0 && (
                                    <p className="mt-3 text-sm text-slate-600">
                                        <strong>Skills:</strong> {(selectedJob.skills ?? []).join(', ')}
                                    </p>
                                )}
                            </div>
                        )
                    })()}

                    <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !resumeName || !selectedJobId}
                        className="mt-5 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isAnalyzing ? 'Analyzing Resume...' : 'Analyze Resume Match'}
                    </button>
                    
                    {(isAnalyzing || progress > 0) && (
                        <div
                            className="mt-4 rounded-xl border border-purple-100 bg-white p-4"
                            aria-live="polite"
                        >
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-slate-700">
                                    {isAnalyzing ? 'Analyzing your resume...' : 'Analysis complete'}
                                </span>
                                <span className="text-sm font-bold text-purple-700">
                                    {progress}%
                                </span>
                            </div>

                            <div
                                className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
                                role="progressbar"
                                aria-label="Resume analysis progress"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progress}
                            >
                                <div
                                    className="h-full rounded-full bg-purple-600 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                                {isAnalyzing
                                    ? 'Extracting resume details and comparing job requirements.'
                                    : 'Your results are ready below.'}
                            </p>
                        </div>
                    )}
                </section>
                {matchResult && (
                    <section
                        ref={resultRef}
                        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Estimated Resume Match
                            </p>
                            <h2 className="mt-1 text-4xl font-bold text-purple-700">
                                {matchResult.matchScore}%
                            </h2>

                            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-purple-600"
                                    style={{ width: `${matchResult.matchScore}%` }}
                                />
                            </div>

                            <p className="mt-3 text-slate-700">{matchResult.summary}</p>
                            <p className="mt-2 text-xs text-slate-500">
                                AI-generated estimate, not a hiring prediction.
                            </p>
                        </div>

                        {([
                            ['Matched Skills', matchResult.matchedSkills],
                            ['Missing Skills', matchResult.missingSkills],
                            ['Strengths', matchResult.strengths],
                            ['Resume Improvements', matchResult.improvements],
                        ] as [string, string[]][]).map(([title, items]) => (
                            <div key={title}>
                                <h3 className="font-semibold text-slate-900">{title}</h3>
                                {items.length > 0 ? (
                                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                                        {items.map((item, index) => (
                                            <li key={`${title}-${index}`}>{item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-1 text-sm text-slate-500">
                                        No items identified.
                                    </p>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {error && (
                    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </p>
                )}

                {message && (
                    <p className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
                        {message}
                    </p>
                )}
            </div>
        </div>
    )
}

export default ResumeMatch