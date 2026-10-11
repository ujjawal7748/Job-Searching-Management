import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Job, JobStatus } from '../types/job'

type AddJobModalProps = {
    onClose: () => void
    onAddJob: (job: Job) => Promise<void> | void
    editingJob?: Job | null
}

function AddJobModal({ onClose, onAddJob, editingJob }: AddJobModalProps) {
    const [company, setCompany] = useState(editingJob?.company ?? '')
    const [position, setPosition] = useState(editingJob?.position ?? '')
    const [location, setLocation] = useState(editingJob?.location ?? '')
    const [status, setStatus] = useState<JobStatus>(editingJob?.status ?? 'applied')
    const [jobUrl, setJobUrl] = useState(editingJob?.jobUrl ?? '')
    const [appliedDate, setAppliedDate] = useState(editingJob?.appliedDate ?? '')

    const [skills, setSkills] = useState(editingJob?.skills.join(', ') ?? '')
    const [salary, setSalary] = useState(editingJob?.salary ?? '')
    const [description, setDescription] = useState(editingJob?.description ?? '')

    const [jobImage, setJobImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState('')

    const [isExtracting, setIsExtracting] = useState(false)
    const [extractError, setExtractError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]

        if (!file) {
            return
        }

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.')
            return
        }

        setJobImage(file)

        const previewUrl = URL.createObjectURL(file)
        setImagePreview(previewUrl)
    }

    function removeImage() {
        setJobImage(null)
        setImagePreview('')
    }

    async function handleExtractJobDetails() {
        if (!jobImage) {
            return
        }

        setIsExtracting(true)
        setExtractError('')

        try {
            const reader = new FileReader()

            const imageData = await new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                    if (typeof reader.result === 'string') {
                        resolve(reader.result)
                    } else {
                        reject(new Error('Could not read image'))
                    }
                }

                reader.onerror = () => {
                    reject(new Error('Could not read image'))
                }

                reader.readAsDataURL(jobImage)
            })

            const response = await fetch('/api/parse-job', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageData,
                }),
            })

            type ExtractionResponse = {
                error?: string
                data?: {
                    company?: unknown
                    position?: unknown
                    location?: unknown
                    jobUrl?: unknown
                    status?: unknown
                    appliedDate?: unknown
                    skills?: unknown
                    salary?: unknown
                    description?: unknown
                } | string
            }

            const responseText = await response.text()

            if (!responseText) {
                throw new Error(
                    `The screenshot API returned an empty response (HTTP ${response.status}). Restart the app with npm run dev:vercel.`
                )
            }

            let result: ExtractionResponse

            try {
                result = JSON.parse(responseText) as ExtractionResponse
            } catch {
                throw new Error(
                    `The screenshot API returned a non-JSON response (HTTP ${response.status}). Restart the app with npm run dev:vercel.`
                )
            }

            if (!response.ok) {
                throw new Error(
                    result.error || 'Failed to extract job details'
                )
            }

            // Gemini may return the extracted data either as an object
            // or as a JSON string. Handle both formats.
            let data = result.data

            if (typeof data === 'string') {
                const cleanedData = data
                    .replace(/^```json\s*/i, '')
                    .replace(/^```\s*/i, '')
                    .replace(/\s*```$/i, '')
                    .trim()

                try {
                    data = JSON.parse(cleanedData)
                } catch {
                    throw new Error('The AI returned invalid job data')
                }
            }

            if (!data || typeof data !== 'object') {
                throw new Error('The extraction response was invalid')
            }

            const validStatuses: JobStatus[] = [
                'wishlist',
                'applied',
                'interview',
                'offer',
                'rejected',
            ]

            const extractedStatus =
                validStatuses.find(
                    (candidate) => candidate === data.status
                ) ?? 'applied'

            const today = new Date()

            const localDate = new Date(
                today.getTime() - today.getTimezoneOffset() * 60_000
            )
                .toISOString()
                .slice(0, 10)

            // Fill form fields with AI-extracted values.
            setCompany(
                typeof data.company === 'string'
                    ? data.company
                    : ''
            )

            setPosition(
                typeof data.position === 'string'
                    ? data.position
                    : ''
            )

            setLocation(
                typeof data.location === 'string'
                    ? data.location
                    : ''
            )

            setJobUrl(
                typeof data.jobUrl === 'string'
                    ? data.jobUrl
                    : ''
            )

            // Convert AI skills array into a comma-separated
            // string for the form input.
            setSkills(
                Array.isArray(data.skills)
                    ? data.skills
                        .map((skill) => String(skill))
                        .join(', ')
                    : ''
            )

            setSalary(
                typeof data.salary === 'string'
                    ? data.salary
                    : ''
            )

            setDescription(
                typeof data.description === 'string'
                    ? data.description
                    : ''
            )

            setStatus(extractedStatus)

            setAppliedDate(
                typeof data.appliedDate === 'string' &&
                    data.appliedDate
                    ? data.appliedDate
                    : localDate
            )

            console.log('Extracted job details:', data)
        } catch (error) {
            console.error('Extraction error:', error)

            setExtractError(
                error instanceof Error
                    ? error.message
                    : 'Failed to extract job details'
            )
        } finally {
            setIsExtracting(false)
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSaving(true)
        setSaveError('')

        const newJob: Job = {
            id: editingJob?.id ?? crypto.randomUUID(),
            company,
            position,
            location,
            status,
            appliedDate,
            jobUrl,

            // Convert comma-separated skills into an array.
            skills: skills
                .split(',')
                .map((skill) => skill.trim())
                .filter(Boolean),

            salary,
            description,
        }

        try {
            await onAddJob(newJob)
            onClose()
        } catch {
            setSaveError('Could not save the job. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div
                className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                        {editingJob ? 'Edit Job' : 'Add Job'}
                    </h2>

                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-900 text-xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Image Upload */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2 text-left">
                        Job Screenshot
                    </label>

                    {!jobImage ? (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                            <div className="text-center">
                                <p className="text-2xl mb-1">
                                    📷
                                </p>

                                <p className="text-sm font-medium text-slate-700">
                                    Upload job screenshot
                                </p>

                                <p className="text-xs text-slate-500 mt-1">
                                    PNG, JPG or WEBP
                                </p>
                            </div>

                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </label>
                    ) : (
                        <div className="border border-slate-200 rounded-xl p-3">
                            <img
                                src={imagePreview}
                                alt="Job screenshot preview"
                                className="w-full max-h-56 object-contain rounded-lg bg-slate-100"
                            />

                            <div className="flex items-center justify-between mt-3">
                                <p className="text-sm text-slate-600 truncate mr-3">
                                    {jobImage.name}
                                </p>

                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                                >
                                    Remove
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleExtractJobDetails}
                                disabled={isExtracting}
                                className="w-full mt-3 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExtracting
                                    ? '✨ Extracting...'
                                    : '✨ Extract Job Details'}
                            </button>

                            {extractError && (
                                <p className="text-sm text-red-600 mt-2">
                                    {extractError}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <form
                    onSubmit={(event) => void handleSubmit(event)}
                    className="space-y-4"
                >
                    {/* Company */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">
                            Company
                        </label>

                        <input
                            type="text"
                            value={company}
                            onChange={(e) =>
                                setCompany(e.target.value)
                            }
                            placeholder="e.g. Google"
                            required
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Position */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">
                            Position
                        </label>

                        <input
                            type="text"
                            value={position}
                            onChange={(e) =>
                                setPosition(e.target.value)
                            }
                            placeholder="e.g. Java Backend Developer"
                            required
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">
                            Location
                        </label>

                        <input
                            type="text"
                            value={location}
                            onChange={(e) =>
                                setLocation(e.target.value)
                            }
                            placeholder="e.g. Bangalore"
                            required
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">
                            Status
                        </label>

                        <select
                            value={status}
                            onChange={(e) =>
                                setStatus(
                                    e.target.value as JobStatus
                                )
                            }
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="wishlist">
                                Wishlist
                            </option>
                            <option value="applied">
                                Applied
                            </option>
                            <option value="interview">
                                Interview
                            </option>
                            <option value="offer">
                                Offer
                            </option>
                            <option value="rejected">
                                Rejected
                            </option>
                        </select>
                    </div>

                    {/* Job URL */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">
                            Job URL
                        </label>

                        <input
                            type="url"
                            value={jobUrl}
                            onChange={(e) =>
                                setJobUrl(e.target.value)
                            }
                            placeholder="https://..."
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Applied Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">
                            Applied Date
                        </label>

                        <input
                            type="date"
                            value={appliedDate}
                            onChange={(e) =>
                                setAppliedDate(e.target.value)
                            }
                            required
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Skills */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">
                            Skills
                        </label>

                        <input
                            type="text"
                            value={skills}
                            onChange={(e) =>
                                setSkills(e.target.value)
                            }
                            placeholder="e.g. Java, Spring Boot, SQL, AWS"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <p className="text-xs text-slate-400 mt-1">
                            Separate multiple skills with commas.
                        </p>
                    </div>

                    {/* Salary */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">
                            Salary
                        </label>

                        <input
                            type="text"
                            value={salary}
                            onChange={(e) =>
                                setSalary(e.target.value)
                            }
                            placeholder="e.g. ₹8-12 LPA"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">
                            Description
                        </label>

                        <textarea
                            value={description}
                            onChange={(e) =>
                                setDescription(e.target.value)
                            }
                            placeholder="Enter job description..."
                            rows={5}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                    </div>

                    {/* Buttons */}
                    {saveError && (
                        <p role="alert" className="text-sm text-red-600">
                            {saveError}
                        </p>
                    )}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving
                                ? 'Saving...'
                                : editingJob
                                    ? 'Update Job'
                                    : 'Add Job'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddJobModal