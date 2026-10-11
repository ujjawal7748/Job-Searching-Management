import { useEffect, useRef, useState } from 'react'
import { deleteSavedResume, getSavedResume, saveResume, } from '../lib/resumeStorage'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useAuth } from '../auth/authState'
import AIHistoryPanel from '../components/AIHistoryPanel'
import type { AiHistoryRecord, ResumeMatchResult } from '../lib/aiHistory'
import { useAiHistory } from '../hooks/useAiHistory'
import { useJobData } from '../hooks/useJobs'

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
    const { session } = useAuth()
    const userId = session?.user.id ?? ''
    const { data: jobData, isPending: isJobsLoading, error: jobsError } = useJobData(userId)
    const jobs = jobData?.jobs.filter((job) => !job.deletedAt) ?? []
    const {
        records: history,
        isLoading: isHistoryLoading,
        error: historyError,
        save: saveHistory,
        remove: removeHistory,
    } = useAiHistory(userId, 'resume-match')
    const [selectedJobId, setSelectedJobId] = useState('')
    const [resumeName, setResumeName] = useState('')
    const [isResumeLoading, setIsResumeLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [historyActionError, setHistoryActionError] = useState('')

    useEffect(() => {
        let active = true
        void getSavedResume()
            .then((savedResume) => {
                if (active) setResumeName(savedResume?.name ?? '')
            })
            .catch(() => {
                if (active) setError('Could not load your saved resume.')
            })
            .finally(() => {
                if (active) setIsResumeLoading(false)
            })

        return () => {
            active = false
        }
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
    const [matchResult, setMatchResult] = useState<ResumeMatchResult | null>(null)

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
            try {
                await saveHistory({
                    title: `${selectedJob.company} · ${selectedJob.position}`.slice(0, 300),
                    result: data.data,
                })
                setHistoryActionError('')
            } catch (historySaveError) {
                setHistoryActionError(
                    historySaveError instanceof Error
                        ? `Analysis completed, but could not save it: ${historySaveError.message}`
                        : 'Analysis completed, but this result could not be saved to your history.',
                )
            }
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

    function openHistoryRecord(record: AiHistoryRecord) {
        if (record.kind !== 'resume-match' || typeof record.result === 'string') return
        setMatchResult(record.result)
        setSelectedJobId('')
        setProgress(100)
        setError('')
        setMessage(`Showing saved result: ${record.title}`)
        window.setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
    }

    async function removeHistoryRecord(record: AiHistoryRecord) {
        if (!window.confirm(`Delete the saved result “${record.title}”?`)) return
        try {
            await removeHistory(record.id)
            setHistoryActionError('')
        } catch (err) {
            setHistoryActionError(err instanceof Error ? err.message : 'Could not delete this history item.')
        }
    }

    if (isJobsLoading || isResumeLoading) {
        return <div className="p-8 text-slate-600">Loading your saved jobs...</div>
    }

    return (
        <main className="ai-page min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="ai-page-layout mx-auto max-w-7xl">
              <div className="min-w-0 space-y-6">
                <header className="ai-hero animate-page-enter">
                    <div className="ai-hero-icon" aria-hidden="true">✦</div>
                    <p className="eyebrow-label">CAREER INTELLIGENCE</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Resume Match AI</h1>
                    <p className="mt-2 text-slate-600">
                        Turn your resume into a role-specific strategy with a thoughtful, evidence-based match analysis.
                    </p>
                    <div className="hero-badges">
                      <span>Private by account</span><span>AI-powered insights</span><span>Instant analysis</span>
                    </div>
                </header>

                <section className="surface-card animate-page-enter min-w-0 p-4 sm:p-6">
                    <div className="section-heading">
                      <span className="step-number">01</span>
                      <div><p className="eyebrow-label">START HERE</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Your Resume</h2></div>
                    </div>

                    <label
                        htmlFor="resume-pdf"
                        className="relative mt-4 flex min-w-0 cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-indigo-300 p-5 text-center hover:bg-indigo-50 focus-within:ring-2 focus-within:ring-indigo-500 sm:p-8"
                    >
                        <span className="text-3xl">📄</span>
                        <span                         className="mt-2 max-w-full break-words font-semibold text-slate-800">
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

                <section className="surface-card animate-page-enter min-w-0 p-4 sm:p-6">
                    <div className="section-heading">
                      <span className="step-number">02</span>
                      <div><p className="eyebrow-label">TARGET ROLE</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Choose a Job</h2></div>
                    </div>

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
                            <div className="mt-4 min-w-0 rounded-lg bg-slate-50 p-4">
                                <h3 className="break-words font-semibold text-slate-900">{selectedJob.position}</h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    {selectedJob.company} · {selectedJob.location}
                                </p>
                                <p className="mt-2 text-sm text-slate-500">
                                    Status: {selectedJob.status}
                                </p>
                                <p className="mt-3 break-words text-sm text-slate-700">
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
                        className="primary-action mt-5 w-full sm:w-auto"
                    >
                        {isAnalyzing ? 'Analyzing Resume...' : 'Analyze Resume Match'}
                    </button>
                    
                    {(isAnalyzing || progress > 0) && (
                        <div
                            className="mt-4 rounded-xl border border-indigo-100 bg-white p-4"
                            aria-live="polite"
                        >
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-slate-700">
                                    {isAnalyzing ? 'Analyzing your resume...' : 'Analysis complete'}
                                </span>
                                <span className="text-sm font-bold text-teal-700">
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
                                    className="h-full rounded-full bg-teal-600 transition-all duration-300"
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
                        className="surface-card animate-result min-w-0 space-y-5 p-4 sm:p-6">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Estimated Resume Match
                            </p>
                            <h2 className="mt-1 text-4xl font-bold text-indigo-800">
                                {matchResult.matchScore}%
                            </h2>

                            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-teal-600"
                                    style={{ width: `${matchResult.matchScore}%` }}
                                />
                            </div>

                            <p className="mt-3 break-words text-slate-700">{matchResult.summary}</p>
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
              <AIHistoryPanel
                kind="resume-match"
                records={history}
                isLoading={isHistoryLoading}
                error={historyActionError || historyError || jobsError?.message || ''}
                onSelect={openHistoryRecord}
                onDelete={(record) => void removeHistoryRecord(record)}
              />
            </div>
        </main>
    )
}

export default ResumeMatch