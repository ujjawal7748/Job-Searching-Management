import { GoogleGenerativeAI } from '@google/generative-ai'

declare const process: {
  env: Record<string, string | undefined>
  loadEnvFile?: (path?: string) => void
}

type ApiRequest = {
  method?: string
  body?: {
    resumeText?: unknown
    jobDescription?: unknown
  }
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (payload: Record<string, unknown>) => void
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  const { resumeText, jobDescription } = req.body ?? {}

  if (
    typeof resumeText !== 'string' ||
    typeof jobDescription !== 'string' ||
    !resumeText.trim() ||
    !jobDescription.trim()
  ) {
    return res.status(400).json({
      error: 'Resume text and job description are required.',
    })
  }

  if (resumeText.length > 30000 || jobDescription.length > 20000) {
    return res.status(400).json({
      error: 'Resume or job description is too long.',
    })
  }

  let apiKey = process.env.GEMINI_API_KEY

  if (!apiKey && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile('.env.local')
      apiKey = process.env.GEMINI_API_KEY
    } catch {
      apiKey = undefined
    }
  }

  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured.',
    })
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    const prompt = `
You are a resume and job-description matching assistant.

Analyze the resume against the job description.
Use only evidence from the supplied text. Do not invent skills,
experience, qualifications, or achievements.

Return only valid JSON with exactly this structure:
{
  "matchScore": 0,
  "matchedSkills": [],
  "missingSkills": [],
  "strengths": [],
  "improvements": [],
  "summary": ""
}

Rules:
- matchScore must be an integer from 0 to 100.
- matchedSkills are relevant skills supported by the resume.
- missingSkills are relevant job requirements not clearly evidenced in the resume.
- strengths are specific ways the resume fits the role.
- improvements are actionable suggestions to improve the resume for this role.
- Keep each list concise and useful.
- summary should be a short explanation of the overall fit.
- Do not treat a missing keyword alone as proof that the person lacks a skill.
- Return JSON only.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}
`

    const result = await model.generateContent(prompt)

    const data = JSON.parse(result.response.text())

    const validScore =
      typeof data.matchScore === 'number' &&
      Number.isFinite(data.matchScore) &&
      data.matchScore >= 0 &&
      data.matchScore <= 100

    if (
      !validScore ||
      !Array.isArray(data.matchedSkills) ||
      !Array.isArray(data.missingSkills) ||
      !Array.isArray(data.strengths) ||
      !Array.isArray(data.improvements) ||
      typeof data.summary !== 'string'
    ) {
      throw new Error('AI returned an invalid matching response.')
    }

    return res.status(200).json({
      data: {
        matchScore: Math.round(data.matchScore),
        matchedSkills: data.matchedSkills,
        missingSkills: data.missingSkills,
        strengths: data.strengths,
        improvements: data.improvements,
        summary: data.summary,
      },
    })
  } catch (error) {
    console.error('Resume matching error:', error)

    const details =
      error instanceof Error
        ? error.message
        : 'Unknown Gemini API error'
    const safeDetails = details.replaceAll(apiKey, '[redacted]')

    return res.status(500).json({
      error:
        process.env.NODE_ENV === 'production'
          ? 'Failed to analyze resume. Please try again.'
          : `Resume matching failed: ${safeDetails}`,
    })
  }
}