import type { Bindings } from '../types'
import { Hono } from 'hono'

import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import * as os from 'os'

let llmConfig: { openai?: { api_key?: string; base_url?: string } } = {};
try {
  const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
  if (fs.existsSync(configPath)) {
    let fileContents = fs.readFileSync(configPath, 'utf8');
    fileContents = fileContents.replace(/\$\{(\w+)\}/g, (_, varName) => process.env[varName] || '');
    llmConfig = yaml.load(fileContents) as typeof llmConfig;
  }
} catch (e) {}


const router = new Hono<{ Bindings: Bindings }>()

function buildSystemPrompt(lang: string): string {
  const langInstructions: Record<string, string> = {
    en: 'Respond ENTIRELY in English.',
    zh: 'Respond ENTIRELY in Traditional Chinese (繁體中文). All text, headings, humor, examples, and the Oracle Seal MUST be in Chinese. Only scripture names may remain in their original language.',
    th: 'Respond ENTIRELY in Thai (ภาษาไทย). All text, headings, humor, examples, and the Oracle Seal MUST be in Thai. Only scripture names may remain in their original language.'
  };

  return `You are the NumbahWan Oracle — an ancient, wise, and surprisingly funny spiritual advisor who has studied ALL major wisdom traditions deeply. You synthesize teachings from:

- Buddhist Sutras (Heart Sutra, Diamond Sutra, Dhammapada)
- Tao Te Ching (Laozi's philosophy of flow, wu wei, balance)
- The Bible (Proverbs, Ecclesiastes, Psalms, Jesus's parables)
- The Quran (mercy, patience, surrender, trust in the divine plan)

LANGUAGE INSTRUCTION: ${langInstructions[lang] || langInstructions.en}

YOUR RESPONSE FORMAT (follow this EXACTLY):

1. **Open with empathy** — Show you understand their pain in 1-2 sentences. Be real, not generic.

2. **The Ancient Consensus** — What do these traditions AGREE on about this problem? Cite specific concepts:
   - Buddhism: relevant concept (e.g., attachment, impermanence, middle way)
   - Taoism: relevant concept (e.g., wu wei, yin-yang, water's nature)
   - Bible: relevant verse or parable (keep it short)
   - Quran: relevant teaching (mercy, sabr/patience, tawakkul/trust)

3. **The Funny Truth** — A humorous analogy or modern example that makes the wisdom click. This is the KEY part. Make them laugh while realizing the truth. Use pop culture, everyday situations, memes-level humor.

4. **The Actionable Step** — ONE specific thing they can do TODAY. Not vague advice. Concrete.

5. **The Oracle's Seal** — End with a short, profound one-liner that combines humor and wisdom. Like a fortune cookie written by a comedian who meditated for 40 years.

RULES:
- NEVER be preachy or condescending
- NEVER give generic motivational poster quotes
- Treat ALL four traditions with genuine respect while being funny ABOUT life, not about the traditions
- Keep responses under 400 words — dense wisdom, no filler
- If someone is in genuine crisis (suicidal, abuse, etc.), drop the humor, be compassionate, and suggest professional help resources
- You are NOT a therapist — you're a wise friend who reads too much ancient scripture and watches too much comedy`;
}

// ══════════════════════════════════════════════
// WISDOM POOL — loaded lazily from static JSON
// Extracted from inline code to cut worker bundle by ~70KB
// Data lives at: /static/data/oracle-wisdom.json
// ══════════════════════════════════════════════

interface WisdomEntry {
  tags: string[];
  tagsZh?: string[];
  tagsTh?: string[];
  text: string;
  zh?: string;
  th?: string;
}

// Lazy-loaded cache — fetched once on first request
let _wisdomCache: WisdomEntry[] | null = null;

async function loadWisdomPool(origin: string): Promise<WisdomEntry[]> {
  if (_wisdomCache) return _wisdomCache;
  try {
    // In Cloudflare Workers, fetch from origin to get static asset
    const url = `${origin}/static/data/oracle-wisdom.json`;
    const resp = await fetch(url);
    if (resp.ok) {
      _wisdomCache = await resp.json() as WisdomEntry[];
      return _wisdomCache;
    }
  } catch (e) {
    // Fallback: return a minimal default
  }
  // Minimal fallback if static file unavailable
  _wisdomCache = [{
    tags: ['life', 'general', 'purpose', 'meaning'],
    text: `**I hear you.** The big questions hit different at 3am.

**The Ancient Consensus:**
- **Buddhism**: Life's purpose isn't a destination — it's awareness itself. The Dhammapada says "Your work is to discover your work, and then give your heart to it."
- **Taoism**: "The Tao that can be told is not the eternal Tao." Stop trying to name your purpose — live it.
- **Bible** (Micah 6:8): "Act justly, love mercy, walk humbly." That's the whole assignment.
- **Quran** (51:56): "I created humans to know Me." Purpose is connection, not achievement.

**The Funny Truth:** You're googling "what's my purpose" on a device that connects you to all human knowledge while sitting on a toilet. Maybe purpose isn't something you find — it's something you notice.

**Do This Today:** Help one person with zero expectation of return. Notice how it feels. That feeling is the GPS signal.

*The Oracle's Seal: Your purpose isn't hiding from you. You're hiding from it — behind productivity apps.*`
  }];
  return _wisdomCache;
}

// Keyword matching for relevant fallback selection — supports EN/ZH/TH tags
function getRelevantWisdom(pool: WisdomEntry[], question: string, lang: string = 'en'): string {
  const q = question.toLowerCase();
  
  // Score each wisdom by tag matches across ALL language tags
  const scored = pool.map((w, i) => {
    let score = 0;
    for (const tag of w.tags) {
      if (q.includes(tag)) score += tag.length;
    }
    if (w.tagsZh) {
      for (const tag of w.tagsZh) {
        if (q.includes(tag)) score += tag.length * 2;
      }
    }
    if (w.tagsTh) {
      for (const tag of w.tagsTh) {
        if (q.includes(tag)) score += tag.length * 2;
      }
    }
    return { index: i, score };
  });

  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  if (matched.length > 0) {
    if (lang !== 'en') {
      const withTranslation = matched.filter(m => {
        const w = pool[m.index];
        return (lang === 'zh' && w.zh) || (lang === 'th' && w.th);
      });
      if (withTranslation.length > 0) {
        const top = withTranslation.slice(0, 3);
        const pick = top[Math.floor(Math.random() * top.length)];
        const w = pool[pick.index];
        return (lang === 'zh' ? w.zh : w.th) || w.text;
      }
    }
    const top = matched.slice(0, 3);
    const pick = top[Math.floor(Math.random() * top.length)];
    return getLocalizedText(pool[pick.index], lang);
  }

  const generalPool = pool.filter(w => w.tags.includes('general') || w.tags.includes('life'));
  if (generalPool.length > 0) {
    const w = generalPool[Math.floor(Math.random() * generalPool.length)];
    return getLocalizedText(w, lang);
  }

  const w = pool[Math.floor(Math.random() * pool.length)];
  return getLocalizedText(w, lang);
}

function getLocalizedText(w: WisdomEntry, lang: string): string {
  if (lang === 'zh' && w.zh) return w.zh;
  if (lang === 'th' && w.th) return w.th;
  return w.text;
}

// POST /api/oracle/ask
router.post('/ask', async (c) => {
  try {
    const body = await c.req.json() as { question: string; history?: Array<{role: string; content: string}>; language?: string }
    const { question, history, language } = body

    if (!question || question.trim().length === 0) {
      return c.json({ success: false, error: 'Ask the Oracle something' }, 400)
    }

    if (question.trim().length > 1000) {
      return c.json({ success: false, error: 'Keep it under 1000 characters — even Buddha kept it concise' }, 400)
    }

    const apiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || llmConfig?.openai?.api_key
    const baseUrl = c.env?.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || llmConfig?.openai?.base_url || 'https://www.genspark.ai/api/llm_proxy/v1'

    // Try LLM first
    if (apiKey) {
      try {
        const messages: Array<{role: string; content: string}> = [
          { role: 'system', content: buildSystemPrompt(language || 'en') }
        ]

        if (history && Array.isArray(history)) {
          const recent = history.slice(-6)
          for (const msg of recent) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              messages.push({ role: msg.role, content: msg.content })
            }
          }
        }

        messages.push({ role: 'user', content: question })

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages,
            max_tokens: 800,
            temperature: 0.85,
          })
        })

        if (response.ok) {
          const data = await response.json() as any
          const reply = data.choices?.[0]?.message?.content
          if (reply) {
            return c.json({ success: true, message: reply, source: 'oracle' })
          }
        }
      } catch (err) {
        // Fall through to curated wisdom
      }
    }

    // Curated wisdom — keyword-matched to question
    const origin = new URL(c.req.url).origin
    const pool = await loadWisdomPool(origin)
    return c.json({
      success: true,
      message: getRelevantWisdom(pool, question, language || 'en'),
      source: 'curated'
    })

  } catch (err: any) {
    console.error('[Oracle] Error:', err.message)
    const origin = new URL(c.req.url).origin
    const pool = await loadWisdomPool(origin)
    return c.json({
      success: true,
      message: getRelevantWisdom(pool, 'life', 'en'),
      source: 'curated'
    })
  }
})

// GET /api/oracle/random — for daily oracle feature
router.get('/random', async (c) => {
  const lang = c.req.query('lang') || 'en'
  const origin = new URL(c.req.url).origin
  const pool = await loadWisdomPool(origin)
  const wisdom = pool[Math.floor(Math.random() * pool.length)]
  return c.json({
    success: true,
    message: getLocalizedText(wisdom, lang),
    tags: wisdom.tags,
    source: 'curated'
  })
})

export default router
