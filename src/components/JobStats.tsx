
import type { Job } from '../types/job'
import {
  responseRate,
  applicationsThisWeek,
  offerRate,
} from '../lib/stats'

type JobStatsProps = {
  jobs: Job[]
}

function JobStats({ jobs }: JobStatsProps) {
  const wishlist = jobs.filter(
    (job) => job.status === 'wishlist'
  ).length

  const totalApplied = jobs.filter(
    (job) => job.status !== 'wishlist'
  ).length

  const activeInterviews = jobs.filter(
    (job) => job.status === 'interview'
  ).length

  const totalOffers = jobs.filter(
    (job) => job.status === 'offer'
  ).length

  const rejected = jobs.filter(
    (job) => job.status === 'rejected'
  ).length

  const rate = responseRate(jobs)
  const appliedThisWeek = applicationsThisWeek(jobs)
  const currentOfferRate = offerRate(jobs)

  const stats = [
    {
      label: 'Wishlist',
      value: wishlist,
      description: 'Jobs saved for later',
    },
    {
      label: 'Total Applied',
      value: totalApplied,
      description: 'Excludes wishlist jobs',
    },
    {
      label: 'Response Rate',
      value: `${rate}%`,
      description: 'Interviews + offers / applied',
    },
    {
      label: 'Active Interviews',
      value: activeInterviews,
      description: 'Currently in interview stage',
    },
    {
      label: 'Total Offers',
      value: totalOffers,
      description: 'Jobs currently at offer stage',
    },
    {
      label: 'Rejected',
      value: rejected,
      description: 'Jobs marked as rejected',
    },
    {
      label: 'Applied This Week',
      value: appliedThisWeek,
      description: 'Applications this Monday–Sunday',
    },
    {
      label: 'Offer Rate',
      value: `${currentOfferRate}%`,
      description: 'Offers / total applied',
    },
  ]

  return (
    <div className="grid w-full max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-500">
            {stat.label}
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {stat.value}
          </h2>

          <p className="mt-2 text-xs text-slate-500">
            {stat.description}
          </p>
        </div>
      ))}
    </div>
  )
}

export default JobStats
