import type { Message, ActionType, GuideAction, GuideRequest, GuideResponse } from './ai-guide-types';
import { AVAILABLE_ACTIONS } from './ai-guide-types';
export type { Message, ActionType, GuideAction, GuideRequest, GuideResponse };
export { AVAILABLE_ACTIONS };

export function parseActionsFromResponse(text: string): { cleanText: string; actions: GuideAction[] } {
  const actions: GuideAction[] = [];
  const actionRegex = /<<<ACTION:(\{[^>]+\})>>>/g;
  
  let cleanText = text;
  let match;
  
  while ((match = actionRegex.exec(text)) !== null) {
    try {
      const actionData = JSON.parse(match[1]);
      if (actionData.type && AVAILABLE_ACTIONS[actionData.type as keyof typeof AVAILABLE_ACTIONS]) {
        actions.push({
          type: actionData.type,
          target: actionData.target,
          data: actionData.data,
          message: actionData.message
        });
      }
    } catch (e) {
      console.error('[AI Guide] Failed to parse action:', match[1], e);
    }
  }
  
  // Remove action tags from the clean text
  cleanText = cleanText.replace(actionRegex, '').trim();
  
  return { cleanText, actions };
}

export async function chat(
  request: GuideRequest,
  apiKey: string,
  baseUrl: string
): Promise<GuideResponse> {
  const { message, conversationHistory = [], language = 'en', currentPage, userContext } = request;

  // Build messages array with full context
  const messages: Message[] = [
    { role: 'system', content: buildSystemPrompt(language, currentPage, userContext) },
  ];

  // Add conversation history (limit to last 10 messages to save tokens)
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add user message (context is now in system prompt)
  messages.push({
    role: 'user',
    content: message
  });

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini', // Fast and cost-effective
        messages,
        max_tokens: 500, // Keep responses concise
        temperature: 0.7, // Some creativity but not too wild
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI Guide] API Error:', error);
      return {
        success: false,
        error: `API Error: ${response.status}`
      };
    }

    const data = await response.json();
    const rawMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    
    // Parse actions from response
    const { cleanText, actions } = parseActionsFromResponse(rawMessage);
    
    return {
      success: true,
      message: cleanText,
      actions: actions.length > 0 ? actions : undefined,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  } catch (error) {
    console.error('[AI Guide] Request Error:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

// ============================================================================
// STREAMING VERSION (for real-time responses)
// ============================================================================
// 
// Streaming is important for UX because:
// 1. Users see response immediately (not waiting 2-3 seconds)
// 2. Feels more "alive" and conversational
// 3. Better perceived performance
// ============================================================================

export async function chatStream(
  request: GuideRequest,
  apiKey: string,
  baseUrl: string
): Promise<ReadableStream | null> {
  const { message, conversationHistory = [], language = 'en', currentPage, userContext } = request;

  // Build messages array with full context
  const messages: Message[] = [
    { role: 'system', content: buildSystemPrompt(language, currentPage, userContext) },
  ];

  // Add conversation history (limit to last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add user message (context is now in system prompt)
  messages.push({
    role: 'user',
    content: message
  });

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
        stream: true // Enable streaming!
      })
    });

    if (!response.ok) {
      console.error('[AI Guide] Stream Error:', response.status);
      return null;
    }

    return response.body;
  } catch (error) {
    console.error('[AI Guide] Stream Request Error:', error);
    return null;
  }
}

// ============================================================================
// QUICK RESPONSES (Fallback when AI is unavailable)
// ============================================================================

const QUICK_RESPONSES: Record<string, Record<string, string>> = {
  greeting: {
    en: "Hey there, adventurer! 👋 I'm the NumbahWan AI Guide. Ask me anything about the guild!",
    zh: "嘿，冒險者！👋 我是NumbahWan AI嚮導。問我任何關於公會的問題！",
    th: "สวัสดี นักผจญภัย! 👋 ฉันคือ NumbahWan AI Guide ถามอะไรก็ได้เกี่ยวกับกิลด์!"
  },
  error: {
    en: "Oops! My brain got disconnected. Try asking me again! 🔌",
    zh: "哎呀！我的大腦斷線了。請再問我一次！🔌",
    th: "อุ๊ปส์! สมองฉันขาดการเชื่อมต่อ ลองถามใหม่นะ! 🔌"
  },
  fallback: {
    en: "I'm having trouble thinking right now. Try checking out the **Avatar Studio** at /avatar-studio or the **Arcade** at /arcade while I reboot! 🔄",
    zh: "我現在思考有點困難。我重啟時，試試 **/avatar-studio** 的頭像工作室或 **/arcade** 的遊戲廳！🔄",
    th: "ฉันคิดไม่ออกตอนนี้ ลอง **Avatar Studio** ที่ /avatar-studio หรือ **Arcade** ที่ /arcade ระหว่างฉันรีบูต! 🔄"
  }
};

export function getQuickResponse(type: keyof typeof QUICK_RESPONSES, language: string = 'en'): string {
  return QUICK_RESPONSES[type]?.[language] || QUICK_RESPONSES[type]?.en || QUICK_RESPONSES.error.en;
}


