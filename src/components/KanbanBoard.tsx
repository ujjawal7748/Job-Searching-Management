import type { Job } from '../types/job'
import type { JobStatus } from '../types/job'
import KanbanColumn from './KanbanColumn'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'

const statuses: JobStatus[] = [
  'wishlist',
  'applied',
  'interview',
  'offer',
  'rejected',
]

type KanbanBoardProps = {
  jobs: Job[]
  onDeleteJob: (jobId: string) => void
  onEditJob: (job: Job) => void
  onMoveJob: (jobId: string, status: JobStatus, index: number) => void
}

function KanbanBoard({
  jobs,
  onDeleteJob,
  onEditJob,
  onMoveJob,
}: KanbanBoardProps) {
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) {
      return
    }

    const targetJob = jobs.find((job) => job.id === String(over.id))
    const targetStatus =
      targetJob?.status ??
      statuses.find((status) => status === over.id)

    if (!targetStatus) {
      return
    }

    const targetJobs = jobs.filter(
      (job) => job.status === targetStatus && job.id !== String(active.id),
    )
    const targetIndex =
      over.id === targetStatus
        ? targetJobs.length
        : targetJobs.findIndex((job) => job.id === String(over.id))

    onMoveJob(
      String(active.id),
      targetStatus,
      targetIndex < 0 ? targetJobs.length : targetIndex,
    )
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="w-full max-w-7xl min-w-0 overflow-x-auto">
        <div className="flex w-max gap-6 pb-2 md:w-full">
          {statuses.map((status) => {
            const title = status[0].toUpperCase() + status.slice(1)

            return (
              <div
                key={status}
                className="w-72 shrink-0 md:w-auto md:min-w-0 md:flex-1"
              >
                <KanbanColumn
                  title={title}
                  status={status}
                  jobs={jobs}
                  onDeleteJob={onDeleteJob}
                  onEditJob={onEditJob}
                />
              </div>
            )
          })}
        </div>
      </div>
    </DndContext>
  )
}

export default KanbanBoard