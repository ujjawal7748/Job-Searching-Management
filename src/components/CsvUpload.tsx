import Papa from 'papaparse'
import { useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import type { Job, JobStatus } from '../types/job'

type CsvUploadProps = {
    onClose: () => void
    onJobsParsed: (jobs: Job[]) => {
        imported: number
        duplicates: number
    }
}

function CsvUpload({ onClose, onJobsParsed }: CsvUploadProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [importResult, setImportResult] = useState<{
        imported: number
        duplicates: number
        invalid: number
    } | null>(null)

    function parseCsvFile(file: File) {
        if (!file.name.endsWith('.csv')) {
            alert('Please select a CSV file.')
            return
        }

        setIsProcessing(true)

        Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,

            complete: (results) => {
                const rows = results.data
                const normalizeKey = (key: string) =>
                    key
                        .trim()
                        .toLowerCase()
                        .replace(/[\s_-]+/g, '')
                const normalizedRows = rows.map((row) => {
                    const normalizedRow: Record<string, unknown> = {}

                    Object.entries(row).forEach(([key, value]) => {
                        normalizedRow[normalizeKey(key)] = value
                    })

                    return normalizedRow
                })
                const validStatuses: JobStatus[] = [
                    'applied',
                    'interview',
                    'offer',
                    'wishlist',
                    'rejected',
                ]

                const validRows = normalizedRows.filter((row) => {
                    const company = typeof row.company === 'string' ? row.company.trim() : ''
                    const position = typeof row.position === 'string' ? row.position.trim() : ''
                    const location = typeof row.location === 'string' ? row.location.trim() : ''
                    const appliedDate = typeof row.applieddate === 'string' ? row.applieddate.trim() : ''
                    const status = typeof row.status === 'string' ? row.status.trim().toLowerCase() : ''

                    return (
                        company &&
                        position &&
                        location &&
                        appliedDate &&
                        validStatuses.includes(status as JobStatus)
                    )
                })

                const invalidRows = rows.length - validRows.length

                const parsedJobs: Job[] = validRows.map((row) => {
                    const company = typeof row.company === 'string' ? row.company.trim() : ''
                    const position = typeof row.position === 'string' ? row.position.trim() : ''
                    const location = typeof row.location === 'string' ? row.location.trim() : ''
                    const status = typeof row.status === 'string' ? row.status.trim().toLowerCase() : ''
                    const appliedDate = typeof row.applieddate === 'string' ? row.applieddate.trim() : ''
                    const skills = typeof row.skills === 'string' ? row.skills : ''

                    return {
                        id: crypto.randomUUID(),
                        company,
                        position,
                        location,
                        status: status as JobStatus,
                        appliedDate,
                        jobUrl: typeof row.joburl === 'string' ? row.joburl : '',

                        // New job details
                        skills: skills
                            ? skills
                                .split(',')
                                .map((skill) => skill.trim())
                                .filter(Boolean)
                            : [],

                        salary: typeof row.salary === 'string' ? row.salary : '',
                        description: typeof row.description === 'string' ? row.description : '',
                    }
                })

                const { imported, duplicates } = onJobsParsed(parsedJobs)

                setImportResult({
                    imported,
                    duplicates,
                    invalid: invalidRows,
                })

                setIsProcessing(false)
            },
        })
    }

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]

        if (!file) {
            return
        }

        parseCsvFile(file)
    }

    function handleDragOver(event: DragEvent<HTMLDivElement>) {
        event.preventDefault()
        setIsDragging(true)
    }

    function handleDragLeave() {
        setIsDragging(false)
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault()
        setIsDragging(false)

        const file = event.dataTransfer.files?.[0]

        if (!file) {
            return
        }

        parseCsvFile(file)
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                        Upload CSV
                    </h2>

                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-900 text-xl"
                    >
                        ✕
                    </button>
                </div>

                {!importResult && (
                    <>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition ${isDragging
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-300'
                                }`}
                        >
                            {isProcessing ? (
                                <p className="text-slate-600">
                                    Processing CSV...
                                </p>
                            ) : (
                                <>
                                    <p className="text-slate-600 mb-4">
                                        Drag & drop your CSV file here
                                    </p>

                                    <p className="text-sm text-slate-400 mb-4">
                                        or
                                    </p>

                                    <label className="inline-block cursor-pointer px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                                        Browse Files

                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>

                                    <p className="text-xs text-slate-400 mt-4">
                                        Only CSV files are supported
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                )}

                {importResult && (
                    <div className="space-y-4">

                        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                            <p className="font-semibold text-green-800">
                                ✓ {importResult.imported} new job
                                {importResult.imported === 1 ? '' : 's'} imported successfully
                            </p>
                        </div>

                        {importResult.duplicates > 0 && (
                            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                                <p className="font-semibold text-blue-800">
                                    ↷ {importResult.duplicates} duplicate job
                                    {importResult.duplicates === 1 ? '' : 's'} skipped
                                </p>
                            </div>
                        )}

                        {importResult.invalid > 0 && (
                            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                                <p className="font-semibold text-yellow-800">
                                    ⚠ {importResult.invalid} invalid row
                                    {importResult.invalid > 1 ? 's' : ''} skipped
                                </p>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Done
                        </button>

                    </div>
                )}

            </div>
        </div>
    )
}

export default CsvUpload