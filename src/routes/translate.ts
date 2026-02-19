import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { Hono } from 'hono'
import * as yaml from 'js-yaml'
import type { Bindings } from '../types'

let llmConfig: { openai?: { api_key?: string; base_url?: string } } = {}
try {
  const configPath = path.join(os.homedir(), '.genspark_llm.yaml')
  if (fs.existsSync(configPath)) {
    let fileContents = fs.readFileSync(configPath, 'utf8')
    fileContents = fileContents.replace(/\$\{(\w+)\}/g, (_, varName) => process.env[varName] || '')
    llmConfig = yaml.load(fileContents) as typeof llmConfig
  }
} catch (_e) {}

const router = new Hono<{ Bindings: Bindings }>()

// ============================================================================
// TRANSLATION API - On-Demand Translation for Research Papers
// ============================================================================
// This API translates content on-demand using OpenAI's GPT models.
// It's designed for the Research Library to translate papers to ZH/TH.
// ============================================================================

router.post('/translate', async (c) => {
  try {
    const body = await c.req.json()
    const { content, targetLang, sourceLang = 'English' } = body

    if (!content || !targetLang) {
      return c.json(
        {
          success: false,
          error: 'Content and targetLang are required',
        },
        400,
      )
    }

    // Get API credentials
    const apiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || llmConfig?.openai?.api_key
    const baseUrl =
      c.env?.OPENAI_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      llmConfig?.openai?.base_url ||
      'https://www.genspark.ai/api/llm_proxy/v1'

    if (!apiKey) {
      return c.json(
        {
          success: false,
          error: 'Translation service not configured',
        },
        503,
      )
    }

    // Construct translation prompt
    const systemPrompt = `You are a professional translator specializing in academic and gaming-related content. 
Translate the following ${sourceLang} text to ${targetLang}.
IMPORTANT:
- Preserve all markdown formatting (headers with ##, bold with **, etc.)
- Preserve all proper nouns and game-specific terms where appropriate
- Maintain the academic tone and structure
- Do not add any commentary or notes
- Only output the translated text`

    // Call OpenAI API
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content },
        ],
        temperature: 0.3,
        max_tokens: 16000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Translation] API Error:', errorText)
      return c.json(
        {
          success: false,
          error: 'Translation API error',
        },
        500,
      )
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const translated = data.choices?.[0]?.message?.content

    if (!translated) {
      return c.json(
        {
          success: false,
          error: 'No translation received',
        },
        500,
      )
    }

    return c.json({
      success: true,
      translated,
      sourceLang,
      targetLang,
      wordCount: content.split(/\s+/).length,
      translatedWordCount: translated.split(/\s+/).length,
    })
  } catch (e) {
    console.error('[Translation] Error:', e)
    return c.json(
      {
        success: false,
        error: String(e),
      },
      500,
    )
  }
})

// ============================================================================
// FREE TRANSLATION API - Google Translate Proxy (No API Key Required)
// ============================================================================
// This proxies requests to Google Translate to avoid CORS issues in browser
// ============================================================================

router.post('/translate/free', async (c) => {
  try {
    const body = await c.req.json()
    const { text, targetLang } = body

    if (!text || !targetLang) {
      return c.json(
        {
          success: false,
          error: 'text and targetLang are required',
        },
        400,
      )
    }

    // Map our lang codes to Google's
    const langMap: Record<string, string> = { zh: 'zh-TW', th: 'th' }
    const googleLang = langMap[targetLang] || targetLang

    // Google Translate free API
    const encodedText = encodeURIComponent(text)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${googleLang}&dt=t&q=${encodedText}`

    const response = await fetch(url)

    if (!response.ok) {
      return c.json(
        {
          success: false,
          error: 'Translation service error',
        },
        500,
      )
    }

    const data = (await response.json()) as Array<Array<Array<string>>>
    // Google returns array of [translated, original] pairs
    const translated = data[0].map((item) => item[0]).join('')

    return c.json({
      success: true,
      translated,
      original: text,
      targetLang,
    })
  } catch (e) {
    console.error('[FreeTranslate] Error:', e)
    return c.json(
      {
        success: false,
        error: String(e),
      },
      500,
    )
  }
})
export default router
