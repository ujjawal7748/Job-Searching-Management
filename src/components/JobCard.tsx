import type { Job } from '../types/job'

type JobCardProps = {
  job: Job
}

function JobCard({ job }: JobCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow">
      <h2 className="text-xl font-bold text-slate-900">
        {job.position}
      </h2>

      <p className="text-slate-600">
        {job.company}
      </p>

      <p className="text-slate-500">
        {job.location}
      </p>

      {/* Salary */}
      {job.salary && (
        <p className="mt-3 text-sm font-medium text-slate-700">
          Salary: {job.salary}
        </p>
      )}

      {/* Skills */}
      {job.skills.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium text-slate-700">
            Skills:
          </p>

          <div className="mt-1 flex flex-wrap gap-2">
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

      {/* Description */}
      {job.description && (
        <div className="mt-3">
          <p className="text-sm font-medium text-slate-700">
            Description:
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {job.description}
          </p>
        </div>
      )}

      <p className="mt-3 text-sm font-medium">
        Status: {job.status}
      </p>
    </div>
  )
}

export default JobCard