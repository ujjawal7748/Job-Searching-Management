import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { Job } from '../types/job'
import JobStats from '../components/JobStats'
import KanbanBoard from '../components/KanbanBoard'
import { jobs as initialJobs } from '../lib/jobs'
import AddJobOptions from '../components/AddJobOptions'
import { useUIStore } from '../store/uiStore'
import { useAddJob, useDeleteJob, useJobs, useRestoreJob, useUpdateJob, useUpdateJobStatus } from '../hooks/useJobs'

const AddJobModal = lazy(() => import('../components/AddJobModal'))
const CsvUpload = lazy(() => import('../components/CsvUpload'))

type StoredJobsResult = {
    jobs?: Job[]
    trash?: Job[]
    corruptedStorage: Partial<Record<'jobs' | 'trash', string>>
}

function readStoredJobsSafely(): StoredJobsResult {
    const result: StoredJobsResult = { corruptedStorage: {} }

    for (const key of ['jobs', 'trash'] as const) {
        const rawValue = localStorage.getItem(key)

        if (rawValue === null) {
            continue
        }

        try {
            const parsedValue: unknown = JSON.parse(rawValue)

            if (!Array.isArray(parsedValue)) {
                result.corruptedStorage[key] = rawValue
                continue
            }

            if (key === 'jobs') {
                result.jobs = parsedValue as Job[]
            } else {
                result.trash = parsedValue as Job[]
            }
        } catch {
            result.corruptedStorage[key] = rawValue
        }
    }

    return result
}

function Dashboard() {
    const { searchText, statusFilter, setSearchText, setStatusFilter, } = useUIStore()
    const queryClient = useQueryClient()

    const { data: queryJobs = [], isLoading, isError } = useJobs()
    const addJobMutation = useAddJob()
    const updateJobMutation = useUpdateJob()
    const updateJobStatusMutation = useUpdateJobStatus()
    const deleteJobMutation = useDeleteJob()
    const restoreJobMutation = useRestoreJob()
    const [storedJobs, setStoredJobs] = useState(readStoredJobsSafely)
    const [storageRecoveryError, setStorageRecoveryError] = useState('')
    const [storageRecoveryNotice, setStorageRecoveryNotice] = useState('')

    const [jobs, setJobs] = useState<Job[]>(() => {
        if (storedJobs.corruptedStorage.jobs !== undefined) {
            return initialJobs
        }

        return storedJobs.jobs ?? (queryJobs.length > 0 ? queryJobs : initialJobs)
    })

    const [trash, setTrash] = useState<Job[]>(() => {
        if (storedJobs.corruptedStorage.trash !== undefined) {
            return []
        }

        if (!storedJobs.trash) {
            return []
        }

        const now = Date.now()
        const twentyEightDays = 28 * 24 * 60 * 60 * 1000

        return storedJobs.trash.filter((job) => {
            if (!job.deletedAt) {
                return true
            }

            const deletedTime = new Date(job.deletedAt).getTime()
            return now - deletedTime < twentyEightDays
        })
    })
    const [now] = useState(() => Date.now())

    const [isAddJobOpen, setIsAddJobOpen] = useState(false)
    const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false)
    const [isAddJobOptionsOpen, setIsAddJobOptionsOpen] = useState(false)
    const [isTrashOpen, setIsTrashOpen] = useState(false)
    const [editingJob, setEditingJob] = useState<Job | null>(null)

    // Save jobs to localStorage
    useEffect(() => {
        if (Object.keys(storedJobs.corruptedStorage).length > 0) {
            return
        }

        localStorage.setItem('jobs', JSON.stringify(jobs))
    }, [jobs, storedJobs.corruptedStorage])

    // Save trash to localStorage
    useEffect(() => {
        if (Object.keys(storedJobs.corruptedStorage).length > 0) {
            return
        }

        localStorage.setItem('trash', JSON.stringify(trash))
    }, [trash, storedJobs.corruptedStorage])

    function recoverCorruptedStorage() {
        const timestamp = new Date().toISOString().replaceAll(':', '-')
        const backupKeys: string[] = []

        try {
            for (const [key, rawValue] of Object.entries(storedJobs.corruptedStorage)) {
                if (rawValue === undefined) {
                    continue
                }

                const backupKey = `${key}.corrupt-backup.${timestamp}`
                localStorage.setItem(backupKey, rawValue)
                backupKeys.push(backupKey)
            }

            if (storedJobs.corruptedStorage.jobs !== undefined) {
                localStorage.setItem('jobs', JSON.stringify(jobs))
            }

            if (storedJobs.corruptedStorage.trash !== undefined) {
                localStorage.setItem('trash', JSON.stringify(trash))
            }
        } catch {
            setStorageRecoveryError(
                'Recovery could not finish. The original stored values were not intentionally removed; check available browser storage space before trying again.',
            )
            return
        }

        setStoredJobs({ jobs, trash, corruptedStorage: {} })
        setStorageRecoveryError('')
        setStorageRecoveryNotice(
            `Damaged data was backed up under ${backupKeys.join(' and ')}. The damaged collections were replaced with safe defaults; valid collections were preserved.`,
        )
        void queryClient.invalidateQueries({ queryKey: ['jobs'] })
    }

    // Search and filter jobs
    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            const search = searchText.toLowerCase().trim()

            const company = job.company?.toLowerCase() ?? ''
            const position = job.position?.toLowerCase() ?? ''
            const location = job.location?.toLowerCase() ?? ''

            const skills = Array.isArray(job.skills)
                ? job.skills
                : []

            const matchesSearch =
                !search ||
                company.includes(search) ||
                position.includes(search) ||
                location.includes(search) ||
                skills.some((skill) =>
                    String(skill).toLowerCase().includes(search),
                )

            const matchesStatus =
                statusFilter === 'all' ||
                job.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [jobs, searchText, statusFilter])

    if (Object.keys(storedJobs.corruptedStorage).length > 0) {
        const damagedCollections = Object.keys(storedJobs.corruptedStorage).join(' and ')

        return (
            <div className="min-h-screen bg-slate-100 px-4 py-8">
                <main className="mx-auto max-w-3xl rounded-xl border border-amber-300 bg-white p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-slate-900">
                        Saved job data needs recovery
                    </h1>
                    <p className="mt-3 text-slate-700">
                        The saved {damagedCollections} data could not be read. The original text has not been changed.
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                        To continue, the app will first copy each damaged value to a separate localStorage backup key. It will then replace damaged jobs with the built-in sample jobs and/or damaged Trash with an empty list. Any valid collection will be preserved.
                    </p>
                    {storageRecoveryError && (
                        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {storageRecoveryError}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={recoverCorruptedStorage}
                        className="mt-5 rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700"
                    >
                        Back up damaged data and recover
                    </button>
                </main>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <p className="text-slate-600">
                    Loading jobs...
                </p>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <p className="text-red-600">
                    Failed to load jobs.
                </p>
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen bg-slate-100">

            <main className="flex min-h-[calc(100vh-73px)] flex-col items-center gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-8">
                {storageRecoveryNotice && (
                    <p role="status" className="w-full max-w-7xl rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
                        {storageRecoveryNotice}
                    </p>
                )}

                {/* Top Actions */}
                <div className="flex w-full max-w-7xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <h1 className="text-3xl font-bold text-slate-900 sm:text-5xl">
                        AI Job Tracker Dashboard
                    </h1>

                    <button
                        onClick={() => setIsTrashOpen(true)}
                        className="flex items-center gap-2 text-slate-600 transition hover:text-red-600 sm:shrink-0"
                        title="View Trash"
                    >
                        <span className="text-xl">
                            🗑️
                        </span>

                        <span className="font-medium">
                            Trash
                        </span>

                        {trash.length > 0 && (
                            <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded-full">
                                {trash.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Add Job Button */}
                <button
                    onClick={() => setIsAddJobOptionsOpen(true)}
                    className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
                >
                    + Add Job
                </button>

                {/* Search and Filter */}
                <div className="w-full max-w-7xl flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        placeholder="Search by company, position, location or skill..."
                        className="flex-1 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value as typeof statusFilter,
                            )
                        }
                        className="border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="wishlist">Wishlist</option>
                        <option value="applied">Applied</option>
                        <option value="interview">Interview</option>
                        <option value="offer">Offer</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                {/* Stats */}
                <JobStats jobs={jobs} />

                {/* No Results Message */}
                {filteredJobs.length === 0 && jobs.length > 0 && (
                    <div className="w-full max-w-7xl rounded-xl bg-white p-8 text-center">
                        <p className="text-slate-600">
                            No jobs match your current search or filter.
                        </p>
                    </div>
                )}
                {jobs.length === 0 && (
                    <div className="w-full max-w-7xl rounded-xl bg-white p-10 text-center">
                        <div className="text-4xl mb-3">💼</div>

                        <h2 className="text-xl font-semibold text-slate-900">
                            No jobs added yet
                        </h2>

                        <p className="text-slate-500 mt-2">
                            Add your first job application to start tracking your job search.
                        </p>

                        <button
                            onClick={() => setIsAddJobOptionsOpen(true)}
                            className="mt-5 bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700"
                        >
                            + Add Your First Job
                        </button>
                    </div>
                )}

                {/* Kanban */}
                {jobs.length > 0 && (
                    <KanbanBoard
                        jobs={filteredJobs}
                        onMoveJob={async (jobId, status, index) => {
                            const jobToMove = jobs.find((job) => job.id === jobId)

                            if (!jobToMove) {
                                return
                            }

                            const targetJobs = jobs.filter(
                                (job) =>
                                    job.status === status && job.id !== jobId,
                            )
                            const visibleTargetJobs = filteredJobs.filter(
                                (job) =>
                                    job.status === status && job.id !== jobId,
                            )
                            const visibleAnchor = visibleTargetJobs[index]
                            const insertionIndex = visibleAnchor
                                ? targetJobs.findIndex(
                                    (job) => job.id === visibleAnchor.id,
                                )
                                : visibleTargetJobs.length > 0
                                    ? targetJobs.findIndex(
                                        (job) =>
                                            job.id ===
                                            visibleTargetJobs[visibleTargetJobs.length - 1].id,
                                    ) + 1
                                    : targetJobs.length

                            targetJobs.splice(insertionIndex, 0, {
                                ...jobToMove,
                                status,
                            })

                            const otherJobs = jobs.filter(
                                (job) =>
                                    job.status !== status && job.id !== jobId,
                            )
                            const reorderedJobs = [
                                ...otherJobs,
                                ...targetJobs,
                            ]

                            setJobs(reorderedJobs)

                            if (jobToMove.status !== status) {
                                await updateJobStatusMutation.mutateAsync({
                                    jobId,
                                    status,
                                })
                            }
                        }}
                        onDeleteJob={async (jobId) => {
                            const jobToDelete = jobs.find(
                                (job) => job.id === jobId,
                            )

                            if (!jobToDelete) {
                                return
                            }

                            const trashedJob: Job = {
                                ...jobToDelete,
                                deletedAt: new Date().toISOString(),
                            }

                            // Move job to Trash
                            setTrash((currentTrash) => [
                                ...currentTrash,
                                trashedJob,
                            ])

                            // Delete from the jobs data source
                            await deleteJobMutation.mutateAsync(jobId)

                            // Update the visible dashboard
                            setJobs((currentJobs) =>
                                currentJobs.filter(
                                    (job) => job.id !== jobId,
                                ),
                            )
                        }}
                        onEditJob={(job) => {
                            setEditingJob(job)
                            setIsAddJobOpen(true)
                        }}
                    />
                )}

                {/* Add Job Options */}
                {isAddJobOptionsOpen && (
                    <AddJobOptions
                        onClose={() => setIsAddJobOptionsOpen(false)}
                        onManualAdd={() => {
                            setIsAddJobOptionsOpen(false)
                            setIsAddJobOpen(true)
                        }}
                        onCsvUpload={() => {
                            setIsAddJobOptionsOpen(false)
                            setIsCsvUploadOpen(true)
                        }}
                        onScreenshotUpload={() => {
                            setIsAddJobOptionsOpen(false)
                            setIsAddJobOpen(true)
                        }}
                    />
                )}

                {/* Manual Add Job */}
                {isAddJobOpen && (
                    <Suspense fallback={<p className="text-slate-600">Loading job form...</p>}>
                        <AddJobModal
                            onClose={() => {
                                setIsAddJobOpen(false)
                                setEditingJob(null)
                            }}
                            onAddJob={async (updatedJob) => {
                                if (!editingJob) {
                                    const savedJob =
                                        await addJobMutation.mutateAsync(updatedJob)
                                    setJobs((currentJobs) => [
                                        ...currentJobs,
                                        savedJob,
                                    ])
                                } else {
                                    const savedJob =
                                        await updateJobMutation.mutateAsync(updatedJob)
                                    setJobs((currentJobs) =>
                                        currentJobs.map((job) =>
                                            job.id === savedJob.id ? savedJob : job,
                                        ),
                                    )
                                }
                                setEditingJob(null)
                            }}
                            editingJob={editingJob}
                        />
                    </Suspense>
                )}

                {/* CSV Upload */}
                {isCsvUploadOpen && (
                    <Suspense fallback={<p className="text-slate-600">Loading CSV importer...</p>}>
                        <CsvUpload
                            onClose={() => setIsCsvUploadOpen(false)}
                            onJobsParsed={(newJobs) => {
                                const existingJobs = new Set(
                                    jobs.map(
                                        (job) =>
                                            `${job.company.toLowerCase()}-${job.position.toLowerCase()}`,
                                    ),
                                )
                                const uniqueNewJobs: Job[] = []
                                let duplicates = 0

                                for (const job of newJobs) {
                                    const jobKey =
                                        `${job.company.toLowerCase()}-${job.position.toLowerCase()}`

                                    if (existingJobs.has(jobKey)) {
                                        duplicates += 1
                                        continue
                                    }

                                    existingJobs.add(jobKey)
                                    uniqueNewJobs.push(job)
                                }

                                if (uniqueNewJobs.length > 0) {
                                    setJobs((currentJobs) => [
                                        ...currentJobs,
                                        ...uniqueNewJobs,
                                    ])
                                }

                                return {
                                    imported: uniqueNewJobs.length,
                                    duplicates,
                                }
                            }}
                        />
                    </Suspense>
                )}

                {/* Trash Modal */}
                {isTrashOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
                        <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 sm:p-6">

                            <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                                <h2 className="text-2xl font-bold text-slate-900">
                                    🗑️ Trash
                                </h2>

                                <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
                                    {trash.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const confirmed = window.confirm(
                                                    `Permanently delete all ${trash.length} job${trash.length === 1 ? '' : 's'} in Trash? This cannot be undone.`,
                                                )

                                                if (confirmed) {
                                                    setTrash([])
                                                }
                                            }}
                                            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                                        >
                                            Clear Trash
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsTrashOpen(false)}
                                        className="text-slate-500 hover:text-slate-900 text-xl"
                                        aria-label="Close Trash"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {trash.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">
                                    Trash is empty
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {trash.map((job) => (
                                        <div
                                            key={job.id}
                                            className="border border-slate-200 rounded-lg p-4"
                                        >
                                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">

                                                <div>
                                                    <h3 className="font-semibold text-slate-900">
                                                        {job.position}
                                                    </h3>

                                                    <p className="text-sm text-slate-600">
                                                        {job.company} · {job.location}
                                                    </p>

                                                    <p className="text-xs text-slate-400 mt-1">
                                                        Deleted on:{' '}
                                                        {job.deletedAt
                                                            ? new Date(
                                                                job.deletedAt,
                                                            ).toLocaleString()
                                                            : 'Unknown'}
                                                    </p>

                                                    {job.deletedAt && (
                                                        <p className="text-xs text-red-500 mt-1">
                                                            Deletes in{' '}
                                                            {Math.max(
                                                                0,
                                                                28 -
                                                                Math.floor(
                                                                    (now -
                                                                        new Date(
                                                                            job.deletedAt,
                                                                        ).getTime()) /
                                                                    (1000 *
                                                                        60 *
                                                                        60 *
                                                                        24),
                                                                ),
                                                            )}{' '}
                                                            days
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">

                                                    {/* Restore */}
                                                    <button
                                                        onClick={async () => {
                                                            await restoreJobMutation.mutateAsync(job)

                                                            setJobs((currentJobs) => [
                                                                ...currentJobs.filter(
                                                                    (existingJob) => existingJob.id !== job.id,
                                                                ),
                                                                {
                                                                    ...job,
                                                                    deletedAt: undefined,
                                                                },
                                                            ])

                                                            setTrash((currentTrash) =>
                                                                currentTrash.filter(
                                                                    (trashJob) => trashJob.id !== job.id,
                                                                ),
                                                            )
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 text-sm font-medium"
                                                    >
                                                        ↩ Restore
                                                    </button>

                                                    {/* Delete Forever */}
                                                    <button
                                                        onClick={() => {
                                                            setTrash((currentTrash) =>
                                                                currentTrash.filter(
                                                                    (trashJob) =>
                                                                        trashJob.id !== job.id,
                                                                ),
                                                            )
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium"
                                                    >
                                                        Delete Forever
                                                    </button>

                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setIsTrashOpen(false)}
                                className="w-full mt-6 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                                Close
                            </button>

                        </div>
                    </div>
                )}

            </main>
        </div>
    )
}

export default Dashboard