import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import type { Job } from '../types/job'
import {
  addJob,
  deleteJob,
  getJobTrackerData,
  permanentlyDeleteTrashJob,
  restoreJob,
  saveJobs,
  saveTrash,
  updateJob,
} from '../lib/api'
import type { JobTrackerData } from '../lib/api'

const jobDataQueryKey = (userId: string) => ['job-data', userId]

function useJobDataMutation<TVariables, TResult>(
  userId: string,
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: jobDataQueryKey(userId),
      })
    },
  })
}

export function useJobData(userId: string) {
  return useQuery<JobTrackerData>({
    queryKey: jobDataQueryKey(userId),
    queryFn: () => getJobTrackerData(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useAddJob(userId: string) {
  return useJobDataMutation(userId, (job: Job) => addJob(job, userId))
}

export function useRestoreJob(userId: string) {
  return useJobDataMutation(userId, (job: Job) => restoreJob(job, userId))
}

export function useUpdateJob(userId: string) {
  return useJobDataMutation(userId, (job: Job) => updateJob(job, userId))
}

export function useSaveJobs(userId: string) {
  return useJobDataMutation(userId, (jobs: Job[]) => saveJobs(jobs, userId))
}

export function useSaveTrash(userId: string) {
  return useJobDataMutation(userId, (trash: Job[]) => saveTrash(trash, userId))
}

export function useDeleteJob(userId: string) {
  return useJobDataMutation(
    userId,
    (jobId: string) => deleteJob(jobId, userId),
  )
}

export function usePermanentlyDeleteTrashJob(userId: string) {
  return useJobDataMutation(
    userId,
    (jobId: string) => permanentlyDeleteTrashJob(jobId, userId),
  )
}
