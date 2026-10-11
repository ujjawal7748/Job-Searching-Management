import type { Job, JobStatus } from '../types/job'
import { jobs as initialJobs } from './jobs'

const JOBS_KEY = 'jobs'


export async function getJobs(): Promise<Job[]> {
  const savedJobs = localStorage.getItem(JOBS_KEY)

  if (!savedJobs) {
    await saveJobs(initialJobs)
    return initialJobs
  }

  try {
    return JSON.parse(savedJobs) as Job[]
  } catch {
    throw new Error('Failed to read saved jobs.')
  }
}


export async function saveJobs(
  jobs: Job[],
): Promise<void> {
  localStorage.setItem(
    JOBS_KEY,
    JSON.stringify(jobs),
  )
}

export async function addJob(
  job: Job,
): Promise<Job> {
  const jobs = await getJobs()

  if (jobs.some((existingJob) => existingJob.id === job.id)) {
    throw new Error('A job with this ID already exists.')
  }

  await saveJobs([...jobs, job])

  return job
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
): Promise<Job | null> {
  const jobs = await getJobs()

  let updatedJob: Job | null = null

  const updatedJobs = jobs.map((job) => {
    if (job.id !== jobId) {
      return job
    }

    const changedJob: Job = {
      ...job,
      status,
    }

    updatedJob = changedJob

    return changedJob
  })

  if (!updatedJob) {
    return null
  }

  await saveJobs(updatedJobs)

  return updatedJob
}

export async function deleteJob(
  jobId: string,
): Promise<void> {
  const jobs = await getJobs()

  const updatedJobs = jobs.filter(
    (job) => job.id !== jobId,
  )

  await saveJobs(updatedJobs)
}

export async function updateJob(
  updatedJob: Job,
): Promise<Job> {
  const jobs = await getJobs()

  const updatedJobs = jobs.map((job) =>
    job.id === updatedJob.id
      ? updatedJob
      : job,
  )

  await saveJobs(updatedJobs)

  return updatedJob
}

export async function restoreJob(job: Job): Promise<Job> {
  const jobs = await getJobs()

  const restoredJob: Job = {
    ...job,
    deletedAt: undefined,
  }

  const updatedJobs = [
    ...jobs.filter((existingJob) => existingJob.id !== job.id),
    restoredJob,
  ]

  await saveJobs(updatedJobs)

  return restoredJob
}