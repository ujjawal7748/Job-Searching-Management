import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import type { Job, JobStatus } from '../types/job'
import {
  addJob,
  deleteJob,
  getJobs,
  restoreJob,
  saveJobs,
  updateJob,
  updateJobStatus,
} from '../lib/api'

const JOBS_QUERY_KEY = ['jobs']

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: JOBS_QUERY_KEY,
    queryFn: getJobs,
  })
}

export function useAddJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (job: Job) => addJob(job),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: JOBS_QUERY_KEY,
      })
    },
  })
}

export function useRestoreJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (job: Job) => restoreJob(job),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: JOBS_QUERY_KEY,
      })
    },
  })
}

export function useUpdateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (job: Job) => updateJob(job),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: JOBS_QUERY_KEY,
      })
    },
  })
}


export function useSaveJobs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobs: Job[]) => saveJobs(jobs),

    onMutate: async (jobs: Job[]) => {
      await queryClient.cancelQueries({ queryKey: JOBS_QUERY_KEY })

      const previousJobs = queryClient.getQueryData<Job[]>(JOBS_QUERY_KEY)

      queryClient.setQueryData<Job[]>(JOBS_QUERY_KEY, jobs)

      return { previousJobs }
    },

    onError: (_error, _jobs, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(JOBS_QUERY_KEY, context.previousJobs)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY })
    },
  })
}


export function useUpdateJobStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      jobId,
      status,
    }: {
      jobId: string
      status: JobStatus
    }) => updateJobStatus(jobId, status),

    onMutate: async ({ jobId, status }) => {
      await queryClient.cancelQueries({
        queryKey: JOBS_QUERY_KEY,
      })

      const previousJobs =
        queryClient.getQueryData<Job[]>(JOBS_QUERY_KEY)

      queryClient.setQueryData<Job[]>(
        JOBS_QUERY_KEY,
        (currentJobs = []) =>
          currentJobs.map((job) =>
            job.id === jobId
              ? { ...job, status }
              : job,
          ),
      )

      return { previousJobs }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(
          JOBS_QUERY_KEY,
          context.previousJobs,
        )
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: JOBS_QUERY_KEY,
      })
    },
  })
}

export function useDeleteJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => deleteJob(jobId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: JOBS_QUERY_KEY,
      })
    },
  })
}