import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteAiHistory,
  getAiHistory,
  saveAiHistory,
} from '../lib/aiHistory'
import type {
  AiHistoryKind,
  AiHistoryRecord,
  ResumeMatchResult,
} from '../lib/aiHistory'

const aiHistoryQueryKey = (userId: string, kind: AiHistoryKind) => [
  'ai-history',
  userId,
  kind,
]

export function useAiHistory(userId: string, kind: AiHistoryKind) {
  const queryClient = useQueryClient()
  const queryKey = aiHistoryQueryKey(userId, kind)
  const query = useQuery({
    queryKey,
    queryFn: () => getAiHistory(kind, userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: ({
      title,
      result,
    }: {
      title: string
      result: ResumeMatchResult | string
    }) => saveAiHistory(kind, title, result, userId),
    onSuccess: (record) => {
      queryClient.setQueryData<AiHistoryRecord[]>(queryKey, (records = []) => [
        record,
        ...records,
      ])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAiHistory(id, userId),
    onSuccess: (_, id) => {
      queryClient.setQueryData<AiHistoryRecord[]>(queryKey, (records = []) =>
        records.filter((record) => record.id !== id),
      )
    },
  })

  return {
    records: query.data ?? [],
    isLoading: query.isPending,
    error: query.error instanceof Error ? query.error.message : '',
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  }
}
