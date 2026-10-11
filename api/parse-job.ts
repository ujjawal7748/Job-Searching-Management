import { GoogleGenerativeAI } from '@google/generative-ai'

const MAX_IMAGE_BYTES = 3 * 1024 * 1024
const MAX_BASE64_LENGTH = 4 * Math.ceil(MAX_IMAGE_BYTES / 3)
const MAX_DATA_URL_PREFIX_LENGTH = 'data:image/jpeg;base64,'.length

declare const process: {
  env: Record<string, string | undefined>
  loadEnvFile?: (path?: string) => void
}

type ApiRequest = {
  method?: string
  body?: { image?: unknown }
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (payload: { error?: string; data?: unknown }) => void
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  const image = req.body?.image

  if (
    typeof image === 'string' &&
    image.length > MAX_BASE64_LENGTH + MAX_DATA_URL_PREFIX_LENGTH
  ) {
    return res.status(413).json({
      error: 'Image must be 3 MB or smaller.',
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
      error: 'GEMINI_API_KEY is not configured',
    })
  }

  const imageMatch =
    typeof image === 'string'
      ? /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
          image,
        )
      : null

  if (!imageMatch) {
    return res.status(400).json({
      error:
        'Invalid image format. Please upload PNG, JPG, JPEG or WEBP.',
    })
  }

  const paddingLength = imageMatch[2].endsWith('==')
    ? 2
    : imageMatch[2].endsWith('=')
      ? 1
      : 0
  const imageBytes = Math.floor(imageMatch[2].length * 3 / 4) - paddingLength

  if (imageBytes > MAX_IMAGE_BYTES) {
    return res.status(413).json({
      error: 'Image must be 3 MB or smaller.',
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

    const mimeType =
      imageMatch[1] === 'image/jpg'
        ? 'image/jpeg'
        : imageMatch[1]

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageMatch[2],
          mimeType,
        },
      },
      `Analyze this job posting screenshot carefully and extract ALL visible job information.

Return ONLY valid JSON with exactly this structure:

{
  "company": "",
  "position": "",
  "location": "",
  "status": "applied",
  "appliedDate": "",
  "jobUrl": "",
  "skills": [],
  "salary": "",
  "description": ""
}

Extraction rules:

1. company:
   Extract the company name exactly as shown.

2. position:
   Extract the job title or position exactly as shown.

3. location:
   Extract the job location exactly as shown.

4. status:
   If the screenshot clearly indicates an application status, extract it.
   Status must be one of:
   "applied", "interview", "offer", "rejected".

   If no status is visible, use "applied".

5. appliedDate:
   Extract the application date if visible.
   Use YYYY-MM-DD format.
   If it is not visible, return an empty string.

6. jobUrl:
   Extract the job URL if visible.
   If it is not visible, return an empty string.

7. skills:
   Extract ALL visible skills, technologies, programming languages,
   frameworks, databases, cloud platforms, and tools.

   Return skills as an array of strings.

   Example:
   ["Java", "Spring Boot", "SQL", "AWS"]

   If skills are clearly visible, DO NOT return an empty array.

8. salary:
   Extract the salary or compensation exactly as shown.

   Example:
   "₹25–35 LPA"

   If salary is visible, return it exactly.
   If salary is not visible, return an empty string.

9. description:
   Extract the visible job description or job summary.

   Preserve the meaning of the visible text.
   If the description is clearly visible, return it.
   If no description is visible, return an empty string.

IMPORTANT:
- Carefully inspect the ENTIRE screenshot.
- Check every column and every row.
- Do NOT ignore the right-side columns.
- Skills, Salary, and Description may appear in columns on the right side of the screenshot.
- Extract information even if the text is inside a table.
- Do not invent information.
- Use empty values only when the information is genuinely not visible.
- Return ONLY valid JSON.
- Do not return markdown.
- Do not return explanations.`,
    ])

    const responseText = result.response.text()

    const data = JSON.parse(responseText)

    return res.status(200).json({
      data,
    })
  } catch (error) {
    console.error('Gemini extraction error:', error)

    const details =
      error instanceof Error
        ? error.message
        : 'Unknown Gemini API error'

    const safeDetails = details.replaceAll(
      apiKey,
      '[redacted]',
    )

    return res.status(500).json({
      error:
        process.env.NODE_ENV === 'production'
          ? 'Failed to extract job details'
          : `Gemini extraction failed: ${safeDetails}`,
    })
  }
}