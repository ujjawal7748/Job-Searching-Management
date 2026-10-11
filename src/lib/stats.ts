
import type { Job } from '../types/job'

// Response Rate = Interviews + Offers / Total Applied
export function responseRate(jobs: Job[]): number {
  const totalApplied = jobs.filter(
    (job) => job.status !== 'wishlist'
  ).length

  if (totalApplied === 0) return 0

  const responded = jobs.filter(
    (job) =>
      job.status === 'interview' ||
      job.status === 'offer'
  ).length

  return Math.round((responded / totalApplied) * 1000) / 10
}

// Applications added during the current Monday-Sunday week
export function applicationsThisWeek(jobs: Job[]): number {
  const now = new Date()
  const startOfWeek = new Date(now)

  const daysFromMonday = (now.getDay() + 6) % 7

  startOfWeek.setDate(now.getDate() - daysFromMonday)
  startOfWeek.setHours(0, 0, 0, 0)

  return jobs.filter((job) => {
    if (job.status === 'wishlist' || !job.appliedDate) {
      return false
    }

    const date = new Date(job.appliedDate)

    return (
      !Number.isNaN(date.getTime()) &&
      date >= startOfWeek &&
      date <= now
    )
  }).length
}

// Offer Rate = Total Offers / Total Applied
export function offerRate(jobs: Job[]): number {
  const totalApplied = jobs.filter(
    (job) => job.status !== 'wishlist'
  ).length

  if (totalApplied === 0) return 0

  const offers = jobs.filter(
    (job) => job.status === 'offer'
  ).length

  return Math.round((offers / totalApplied) * 1000) / 10
}

// Jobs grouped by week for future chart use
export function applicationsPerWeek(jobs: Job[]) {
  const weeklyCounts = new Map<string, number>()

  for (const job of jobs) {
    if (job.status === 'wishlist' || !job.appliedDate) continue

    const date = new Date(job.appliedDate)
    if (Number.isNaN(date.getTime())) continue

    const monday = new Date(date)
    const daysFromMonday = (monday.getDay() + 6) % 7

    monday.setDate(monday.getDate() - daysFromMonday)
    monday.setHours(0, 0, 0, 0)

    const weekKey = monday.toISOString().slice(0, 10)

    weeklyCounts.set(
      weekKey,
      (weeklyCounts.get(weekKey) ?? 0) + 1
    )
  }

  return Array.from(weeklyCounts, ([week, applications]) => ({
    week,
    applications,
  })).sort((a, b) => a.week.localeCompare(b.week))
}

// Application funnel: Applied → Interview → Offer
export function funnel(jobs: Job[]) {
  const activeJobs = jobs.filter(
    (job) => job.status !== 'wishlist' && !job.deletedAt
  )

  const interviews = activeJobs.filter(
    (job) =>
      job.status === 'interview' ||
      job.status === 'offer'
  ).length

  const offers = activeJobs.filter(
    (job) => job.status === 'offer'
  ).length

  return [
    { status: 'Applied', count: activeJobs.length },
    { status: 'Interview Stage', count: interviews },
    { status: 'Offers', count: offers },
  ]
}