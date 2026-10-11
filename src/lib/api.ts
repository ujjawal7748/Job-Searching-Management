import type { Job, JobStatus } from '../types/job'
import { jobs as initialJobs } from './jobs'
import { getSupabase } from './supabase'

export type JobTrackerData = {
  jobs: Job[]
  trash: Job[]
}

function parseStoredJobs(key: 'jobs' | 'trash', fallback: Job[]): Job[] {
  const rawValue = localStorage.getItem(key)
  if (rawValue === null) return fallback

  try {
    const value: unknown = JSON.parse(rawValue)
    if (!Array.isArray(value)) {
      throw new Error()
    }
    return value as Job[]
  } catch {
    throw new Error(
      `Your saved ${key} data is damaged and was not imported. The original browser data has been left unchanged.`,
    )
  }
}

async function getCurrentUserId(expectedUserId?: string): Promise<string> {
  const client = getSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw new Error('Could not read your sign-in. Please sign in again.')
  if (!data.session?.user) throw new Error('You must be signed in to access saved jobs.')
  if (expectedUserId && expectedUserId !== data.session.user.id) {
    throw new Error('Your sign-in changed before this change could be saved. Please retry.')
  }
  return data.session.user.id
}

async function writeJobTrackerData(
  userId: string,
  data: JobTrackerData,
): Promise<void> {
  await getCurrentUserId(userId)
  const client = getSupabase()
  const { error } = await client
    .from('job_tracker_data')
    .upsert(
      { user_id: userId, data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

  if (error) {
    throw new Error(`Could not save your jobs to cloud storage: ${error.message}`)
  }
}

export async function getJobTrackerData(
  expectedUserId?: string,
): Promise<JobTrackerData> {
  const userId = await getCurrentUserId()
  if (expectedUserId && expectedUserId !== userId) {
    throw new Error('Your sign-in changed. Refresh the page to load the correct account.')
  }

  const client = getSupabase()
  const { data, error } = await client
    .from('job_tracker_data')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not load your saved jobs: ${error.message}`)
  }

  if (data) {
    const payload: unknown = data.data
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('jobs' in payload) ||
      !Array.isArray(payload.jobs) ||
      !('trash' in payload) ||
      !Array.isArray(payload.trash)
    ) {
      throw new Error('Cloud job data has an invalid format and was not changed.')
    }

    const now = Date.now()
    const trash = (payload.trash as Job[]).filter((job) => {
      if (!job.deletedAt) return true
      const deletedAt = new Date(job.deletedAt).getTime()
      return now - deletedAt < 28 * 24 * 60 * 60 * 1000
    })
    const result = {
      jobs: payload.jobs as Job[],
      trash,
    }
    if (trash.length !== payload.trash.length) {
      await writeJobTrackerData(userId, result)
    }
    return result
  }

  const migratedData: JobTrackerData = {
    jobs: parseStoredJobs('jobs', initialJobs),
    trash: parseStoredJobs('trash', []),
  }
  const { error: insertError } = await client
    .from('job_tracker_data')
    .insert({ user_id: userId, data: migratedData })

  if (insertError?.code === '23505') {
    return getJobTrackerData(userId)
  }
  if (insertError) {
    throw new Error(`Could not import your browser-saved jobs: ${insertError.message}`)
  }
  return migratedData
}

export async function getJobs(): Promise<Job[]> {
  return (await getJobTrackerData()).jobs
}

export async function saveJobs(
  jobs: Job[],
  expectedUserId?: string,
): Promise<void> {
  const userId = await getCurrentUserId(expectedUserId)
  const data = await getJobTrackerData(userId)
  await writeJobTrackerData(userId, { ...data, jobs })
}

export async function saveTrash(
  trash: Job[],
  expectedUserId?: string,
): Promise<void> {
  const userId = await getCurrentUserId(expectedUserId)
  const data = await getJobTrackerData(userId)
  await writeJobTrackerData(userId, { ...data, trash })
}

export async function addJob(
  job: Job,
  expectedUserId?: string,
): Promise<Job> {
  const userId = await getCurrentUserId(expectedUserId)
  const data = await getJobTrackerData(userId)
  if (data.jobs.some((existingJob) => existingJob.id === job.id)) {
    throw new Error('A job with this ID already exists.')
  }

  await writeJobTrackerData(userId, { ...data, jobs: [...data.jobs, job] })
  return job
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  expectedUserId?: string,
): Promise<Job | null> {
  const userId = await getCurrentUserId(expectedUserId)
  const data = await getJobTrackerData(userId)
  let updatedJob: Job | null = null
  const jobs = data.jobs.map((job) => {
    if (job.id !== jobId) return job
    updatedJob = { ...job, status }
    return updatedJob
  })

  if (!updatedJob) return null

  await writeJobTrackerData(userId, { ...data, jobs })
  return updatedJob
}

export async function deleteJob(
  jobId: string,
  expectedUserId?: string,
): Promise<JobTrackerData> {
  const userId = await getCurrentUserId(expectedUserId)
  const data = await getJobTrackerData(userId)
  const job = data.jobs.find((item) => item.id === jobId)
  if (!job) return data

  const updatedData = {
    jobs: data.jobs.filter((item) => item.id !== jobId),
    trash: [...data.trash, { ...job, deletedAt: new Date().toISOString() }],
  }
  await writeJobTrackerData(userId, updatedData)
  return updatedData
}

export async function updateJob(
  updatedJob: Job,
  expectedUserId?: string,
): Promise<Job> {
  const userId = await getCurrentUserId(expectedUserId)
  const data = await getJobTrackerData(userId)
  if (!data.jobs.some((job) => job.id === updatedJob.id)) {
    throw new Error('The job could not be found in your saved jobs.')
  }

  await writeJobTrackerData(userId, {
    ...data,
    jobs: data.jobs.map((job) =>
      job.id === updatedJob.id ? updatedJob : job,
    ),
  })
  return updatedJob
}

export async function restoreJob(
  job: Job,
  expectedUserId?: string,
): Promise<JobTrackerData> {
  const userId = await getCurrentUserId(expectedUserId)
  const data = await getJobTrackerData(userId)
  const restoredJob: Job = { ...job, deletedAt: undefined }
  const updatedData = {
    jobs: [
      ...data.jobs.filter((existingJob) => existingJob.id !== job.id),
      restoredJob,
    ],
    trash: data.trash.filter((trashJob) => trashJob.id !== job.id),
  }

  await writeJobTrackerData(userId, updatedData)
  return updatedData
}

export async function permanentlyDeleteTrashJob(
  jobId: string,
  expectedUserId?: string,
): Promise<JobTrackerData> {
  const userId = await getCurrentUserId(expectedUserId)
  const data = await getJobTrackerData(userId)
  const updatedData = {
    ...data,
    trash: data.trash.filter((job) => job.id !== jobId),
  }
  await writeJobTrackerData(userId, updatedData)
  return updatedData
}
