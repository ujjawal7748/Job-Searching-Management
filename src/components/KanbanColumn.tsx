import type { Job, JobStatus } from '../types/job'
import { useDroppable } from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type KanbanColumnProps = {
    title: string
    status: JobStatus
    jobs: Job[]
    onDeleteJob: (jobId: string) => void
    onEditJob: (job: Job) => void
}

type DraggableJobCardProps = {
    job: Job
    onDeleteJob: (jobId: string) => void
    onEditJob: (job: Job) => void
}

function DraggableJobCard({ job, onDeleteJob, onEditJob }: DraggableJobCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: job.id,
    })

    return (
        <article
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            {...listeners}
            {...attributes}
            className="bg-white rounded-lg p-4 shadow cursor-grab active:cursor-grabbing touch-none"
        >
            <div className="flex items-center justify-center gap-3">
                <h3 className="font-bold text-slate-900">{job.position}</h3>
                <button
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onEditJob(job)}
                    className="text-slate-400 hover:text-blue-600 transition"
                    title="Edit Job"
                >
                    ✏️
                </button>
                <button
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onDeleteJob(job.id)}
                    className="text-slate-400 hover:text-red-600 transition"
                    title="Move to Trash"
                >
                    🗑️
                </button>
            </div>
            <p className="text-slate-600">{job.company}</p>
            <p className="text-sm text-slate-500">{job.location}</p>
            {job.salary && (
                <p className="mt-2 text-sm font-medium text-slate-700">
                    Salary: {job.salary}
                </p>
            )}
            {job.skills?.length > 0 && (
                <div className="mt-2">
                    <p className="text-sm font-medium text-slate-700">Skills:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {job.skills.map((skill) => (
                            <span
                                key={skill}
                                className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {job.description && (
                <div className="mt-2">
                    <p className="text-sm font-medium text-slate-700">Description:</p>
                    <p className="text-sm text-slate-600 mt-1">{job.description}</p>
                </div>
            )}
        </article>
    )
}

function KanbanColumn({
    title,
    status,
    jobs,
    onDeleteJob,
    onEditJob,
}: KanbanColumnProps) {
    const columnJobs = jobs.filter((job) => job.status === status)
    const { setNodeRef, isOver } = useDroppable({ id: status })

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 rounded-xl p-4 transition-colors ${
                isOver ? 'bg-blue-100' : 'bg-slate-200'
            }`}
        >
            <h2 className="text-lg font-bold text-slate-900 mb-4">{title}</h2>
            <SortableContext
                items={columnJobs.map((job) => job.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-4 min-h-24">
                    {columnJobs.map((job) => (
                        <DraggableJobCard
                            key={job.id}
                            job={job}
                            onDeleteJob={onDeleteJob}
                            onEditJob={onEditJob}
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    )
}

export default KanbanColumn