import { getSupabase } from './supabase'

export type ResumeMatchResult = {
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
  strengths: string[]
  improvements: string[]
  summary: string
}

export type AiHistoryKind = 'resume-match' | 'cover-letter'

export type AiHistoryRecord = {
  id: string
  kind: AiHistoryKind
  title: string
  result: ResumeMatchResult | string
  createdAt: string
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isResumeMatchResult(value: unknown): value is ResumeMatchResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'matchScore' in value &&
    typeof value.matchScore === 'number' &&
    'matchedSkills' in value &&
    isStringArray(value.matchedSkills) &&
    'missingSkills' in value &&
    isStringArray(value.missingSkills) &&
    'strengths' in value &&
    isStringArray(value.strengths) &&
    'improvements' in value &&
    isStringArray(value.improvements) &&
    'summary' in value &&
    typeof value.summary === 'string'
  )
}

function parseHistoryRecord(value: unknown): AiHistoryRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('kind' in value) ||
    (value.kind !== 'resume-match' && value.kind !== 'cover-letter') ||
    !('title' in value) ||
    typeof value.title !== 'string' ||
    !('result' in value) ||
    !('created_at' in value) ||
    typeof value.created_at !== 'string'
  ) {
    throw new Error('Saved AI history contains an invalid record.')
  }

  if (value.kind === 'cover-letter' && typeof value.result === 'string') {
    return {
      id: value.id,
      kind: value.kind,
      title: value.title,
      result: value.result,
      createdAt: value.created_at,
    }
  }

  if (value.kind === 'resume-match' && isResumeMatchResult(value.result)) {
    return {
      id: value.id,
      kind: value.kind,
      title: value.title,
      result: value.result,
      createdAt: value.created_at,
    }
  }

  throw new Error('Saved AI history contains an invalid result.')
}

async function getVerifiedUserId(expectedUserId: string): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser()
  if (error) throw new Error('Could not verify your sign-in. Please sign in again.')
  if (!data.user) throw new Error('You must be signed in to access AI history.')
  if (data.user.id !== expectedUserId) {
    throw new Error('Your sign-in changed. Refresh the page and try again.')
  }
  return data.user.id
}

export async function getAiHistory(
  kind: AiHistoryKind,
  expectedUserId: string,
): Promise<AiHistoryRecord[]> {
  const userId = await getVerifiedUserId(expectedUserId)
  const { data, error } = await getSupabase()
    .from('ai_generation_history')
    .select('id, kind, title, result, created_at')
    .eq('user_id', userId)
    .eq('kind', kind)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Could not load AI history: ${error.message}`)
  return (data ?? []).map(parseHistoryRecord)
}

export async function saveAiHistory(
  kind: AiHistoryKind,
  title: string,
  result: ResumeMatchResult | string,
  expectedUserId: string,
): Promise<AiHistoryRecord> {
  const userId = await getVerifiedUserId(expectedUserId)
  const { data, error } = await getSupabase()
    .from('ai_generation_history')
    .insert({ user_id: userId, kind, title, result })
    .select('id, kind, title, result, created_at')
    .single()

  if (error) throw new Error(`Could not save this result to history: ${error.message}`)
  return parseHistoryRecord(data)
}

export async function deleteAiHistory(
  id: string,
  expectedUserId: string,
): Promise<void> {
  const userId = await getVerifiedUserId(expectedUserId)
  const { error } = await getSupabase()
    .from('ai_generation_history')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(`Could not delete this history item: ${error.message}`)
}
