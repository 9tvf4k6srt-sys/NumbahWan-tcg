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


// Route helpers - reduce repetitive error handling patterns
function jsonError(c: any, msg: string, status = 400) {
  return c.json({ success: false, error: msg }, status);
}

function jsonSuccess(c: any, data: any) {
  return c.json({ success: true, ...data });
}

function parseIntParam(val: string | undefined, fallback: number): number {
  const n = parseInt(val || '');
  return isNaN(n) ? fallback : n;
}

function requireFields(body: any, fields: string[]): string | null {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') return f;
  }
  return null;
}

function safeString(val: any, maxLen = 200): string {
  return String(val || '').trim().slice(0, maxLen);
}

const router = new Hono<{ Bindings: Bindings }>()

// AI GUIDE API - LLM-Powered Assistant
//
// Key concepts:
// 1. System prompts define AI personality and knowledge
// 2. Streaming provides real-time response delivery
// 3. Conversation history enables context-aware responses
// 4. Error handling with graceful fallbacks

import AIGuide, { chat as aiChat, chatStream, getQuickResponse, parseActionsFromResponse, type GuideRequest, type Message, type GuideAction } from '../services/ai-guide';

// Environment variables for AI (set in wrangler.toml or Cloudflare dashboard)
// OPENAI_API_KEY and OPENAI_BASE_URL

// POST /api/guide/chat - Chat with AI Guide (non-streaming)
router.post('/chat', async (c) => {
  try {
    const body = await c.req.json() as GuideRequest;
    const { message, conversationHistory, language, currentPage, userContext } = body;

    if (!message || message.trim().length === 0) {
      return c.json({
        success: false,
        error: 'Message is required'
      }, 400);
    }

    // Get API credentials from config file or environment
    const apiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || llmConfig?.openai?.api_key;
    const baseUrl = c.env?.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || llmConfig?.openai?.base_url || 'https://www.genspark.ai/api/llm_proxy/v1';

    if (!apiKey) {
      // Return fallback response if no API key
      console.warn('[AI Guide] No API key configured, using fallback');
      return c.json({
        success: true,
        message: getQuickResponse('fallback', language || 'en'),
        source: 'fallback',
        note: 'AI service not configured'
      });
    }

    // Call AI
    const response = await aiChat(
      { message, conversationHistory, language, currentPage, userContext },
      apiKey,
      baseUrl
    );

    if (!response.success) {
      return c.json({
        success: true,
        message: getQuickResponse('error', language || 'en'),
        source: 'fallback',
        error: response.error
      });
    }

    return c.json({
      success: true,
      message: response.message,
      usage: response.usage,
      source: 'ai'
    });

  } catch (e) {
    console.error('[AI Guide] Error:', e);
    return c.json({
      success: true,
      message: getQuickResponse('error', 'en'),
      source: 'fallback',
      error: String(e)
    });
  }
});

// POST /api/guide/stream - Chat with AI Guide (streaming)
//
// Instead of waiting for the full response, we send chunks as they arrive.
// This creates a "typing" effect and feels more responsive.
router.post('/stream', async (c) => {
  try {
    const body = await c.req.json() as GuideRequest;
    const { message, conversationHistory, language, currentPage, userContext } = body;

    if (!message || message.trim().length === 0) {
      return c.json({ success: false, error: 'Message is required' }, 400);
    }

    const apiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || llmConfig?.openai?.api_key;
    const baseUrl = c.env?.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || llmConfig?.openai?.base_url || 'https://www.genspark.ai/api/llm_proxy/v1';

    if (!apiKey) {
      // Return fallback as stream-like response
      const fallbackMessage = getQuickResponse('fallback', language || 'en');
      return new Response(
        `data: ${JSON.stringify({ content: fallbackMessage, done: true })}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        }
      );
    }

    const stream = await chatStream(
      { message, conversationHistory, language, currentPage, userContext },
      apiKey,
      baseUrl
    );

    if (!stream) {
      const errorMessage = getQuickResponse('error', language || 'en');
      return new Response(
        `data: ${JSON.stringify({ content: errorMessage, done: true })}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
          }
        }
      );
    }

    // Transform the OpenAI stream to our format
    // PHASE 4: Also collect full response to parse actions at the end
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let fullResponse = ''; // Collect full response for action parsing

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // PHASE 4: Parse actions from the full response and send them
              const { actions } = parseActionsFromResponse(fullResponse);
              if (actions && actions.length > 0) {
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ actions, done: false })}\n\n`)
                );
                console.log('[AI Guide] Actions found:', actions);
              }
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              controller.close();
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
              const data = line.slice(6); // Remove 'data: ' prefix
              if (data === '[DONE]') {
                // PHASE 4: Parse actions before sending done
                const { actions } = parseActionsFromResponse(fullResponse);
                if (actions && actions.length > 0) {
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ actions, done: false })}\n\n`)
                  );
                }
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content; // Accumulate response
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        } catch (error) {
          console.error('[AI Guide] Stream error:', error);
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: String(error), done: true })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (e) {
    console.error('[AI Guide] Stream Error:', e);
    return new Response(
      `data: ${JSON.stringify({ error: String(e), done: true })}\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
});

// GET /api/guide/health - Check if AI Guide is available
router.get('/health', (c) => {
  const apiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || llmConfig?.openai?.api_key;

  return c.json({
    success: true,
    status: apiKey ? 'ready' : 'fallback_only',
    features: {
      chat: true,
      streaming: true,
      conversationMemory: true,
      multiLanguage: ['en', 'zh', 'th'],
      // PHASE 4: Action system!
      actions: true,
      supportedActions: [
        'navigate',    // Go to a page
        'showBalance', // Display wallet popup
        'claimDaily',  // Claim daily reward
        'openForge',   // Open card forge
        'showCards',   // Show card collection
        'playSound',   // Play a sound effect
        'showToast',   // Show a notification
        'toggleTheme', // Toggle dark/light mode
        'shareDiscord',// Share to Discord
        'copyText'     // Copy text to clipboard
      ]
    },
    version: '2.0.0'
  });
});
export default router
