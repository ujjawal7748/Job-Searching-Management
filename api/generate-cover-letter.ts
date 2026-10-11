import { GoogleGenerativeAI } from '@google/generative-ai'

declare const process: {
  env: Record<string, string | undefined>
  loadEnvFile?: (path?: string) => void
}

type ApiRequest = {
  method?: string
  body?: {
    company?: unknown
    position?: unknown
    location?: unknown
    jobDescription?: unknown
    skills?: unknown
    experience?: unknown
    tone?: unknown
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

  const {
    company,
    position,
    location,
    jobDescription,
    skills,
    experience,
    tone,
  } = req.body ?? {}

  if (
    typeof company !== 'string' ||
    typeof position !== 'string' ||
    typeof jobDescription !== 'string' ||
    !company.trim() ||
    !position.trim() ||
    !jobDescription.trim()
  ) {
    return res.status(400).json({
      error: 'Company, position, and job description are required.',
    })
  }

  if (
    company.length > 200 ||
    position.length > 200 ||
    (typeof location === 'string' && location.length > 200) ||
    jobDescription.length > 20000 ||
    (typeof skills === 'string' && skills.length > 5000) ||
    (typeof experience === 'string' && experience.length > 10000)
  ) {
    return res.status(400).json({
      error: 'One or more fields are too long.',
    })
  }

  const validTones = [
    'Professional',
    'Confident',
    'Enthusiastic',
    'Concise',
  ]

  const selectedTone =
    typeof tone === 'string' && validTones.includes(tone)
      ? tone
      : 'Professional'

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
      model: 'gemini-3.8-flash',
    })

    const result = await model.generateContent(`
You are a professional cover letter writing assistant.

Write a tailored cover letter for the candidate using the supplied details.

COMPANY:
${company.trim()}

JOB POSITION:
${position.trim()}

LOCATION:
${typeof location === 'string' && location.trim()
  ? location.trim()
  : 'Not provided'}

JOB DESCRIPTION:
${jobDescription.trim()}

CANDIDATE SKILLS:
${typeof skills === 'string' && skills.trim()
  ? skills.trim()
  : 'Not provided'}

CANDIDATE EXPERIENCE AND PROJECTS:
${typeof experience === 'string' && experience.trim()
  ? experience.trim()
  : 'Not provided'}

WRITING TONE:
${selectedTone}

INSTRUCTIONS:
- Write a complete, personalized cover letter.
- Connect relevant candidate skills and experience to the job requirements.
- Never invent employers, degrees, years of experience, achievements, or qualifications.
- If experience details are missing, do not make up a work history.
- Do not claim the candidate has a skill unless the supplied details support it.
- Use a clear opening, relevant body paragraphs, and a professional closing.
- Keep it concise, usually 250–400 words.
- Do not include fabricated contact details, dates, or addresses.
- Return only the cover letter text, without commentary or markdown code fences.
`)

    const coverLetter = result.response.text().trim()

    if (!coverLetter) {
      throw new Error('AI returned an empty cover letter.')
    }

    return res.status(200).json({ coverLetter })
  } catch (error) {
    console.error('Cover letter generation error:', error)

    const details =
      error instanceof Error
        ? error.message
        : 'Unknown Gemini API error'

    const safeDetails = details.replaceAll(apiKey, '[redacted]')

    return res.status(500).json({
      error:
        process.env.NODE_ENV === 'production'
          ? 'Failed to generate cover letter. Please try again.'
          : `Cover letter generation failed: ${safeDetails}`,
    })
  }
}