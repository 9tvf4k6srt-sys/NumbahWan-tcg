/**
 * NumbahWan AI Guide Service v1.0
 * Real LLM-powered assistant for the guild
 * 
 * LEARNING POINTS:
 * 1. System prompts - How to give AI personality and knowledge
 * 2. Streaming - Real-time response delivery
 * 3. Context management - Conversation memory
 * 4. Token optimization - Keeping costs down
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GuideRequest {
  message: string;
  conversationHistory?: Message[];
  language?: 'en' | 'zh' | 'th';
  currentPage?: string;
  userContext?: {
    viewingHistory?: string[];
    currencies?: Record<string, number>;
    cardCount?: number;
  };
}

export interface GuideResponse {
  success: boolean;
  message?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// SYSTEM PROMPT - THE BRAIN OF YOUR AI
// ============================================================================
// 
// This is the most important part! The system prompt defines:
// - WHO the AI is (personality)
// - WHAT it knows (knowledge base)
// - HOW it should respond (behavior rules)
//
// Tips for great system prompts:
// 1. Be specific about personality
// 2. Include all relevant knowledge
// 3. Give examples of good responses
// 4. Set clear boundaries
// ============================================================================

const GUILD_KNOWLEDGE = `
# NumbahWan Guild - Complete Knowledge Base

## Overview
NumbahWan is a MapleStory guild with a satirical/comedic twist. Our motto: "If you ain't first, you're NumbahTwo!"

## Key Features

### 🎨 Avatar Studio (/avatar-studio)
- Upload MapleStory screenshots to generate AI avatar art
- 8 poses: Hero Stance ⚔️, Cute & Kawaii 🥰, Cool & Chill 😎, Victory! 🏆, Magic Spell ✨, Action Shot 💥, AFK Mode 😴, Party Time! 🎉
- Tips: Use clear full-body screenshots, center character, bright backgrounds work best
- Download HD PNG or share to Discord

### 💰 Economy System
**Currencies:**
- 💎 Diamond (◆) - Premium currency, used for gacha pulls and special actions
- 🪙 Gold (●) - Common currency, earned from games and rewards
- ⚙️ Iron - Crafting material
- 🪨 Stone - Basic resource
- 🪵 Sacred Log (⧫) - Rare currency for legendary card pulls

**Daily Login Rewards (7-day cycle):**
- Day 1: 10 Stone, 5 Gold
- Day 2: 15 Stone, 8 Gold, 2 Iron
- Day 3: 20 Stone, 12 Gold, 5 Iron, 1 Diamond
- Day 4: 30 Stone, 20 Gold, 8 Iron, 3 Diamonds
- Day 5: 40 Stone, 30 Gold, 12 Iron, 5 Diamonds
- Day 6: 50 Stone, 40 Gold, 15 Iron, 8 Diamonds
- Day 7: 100 Stone, 75 Gold, 25 Iron, 15 Diamonds, 1 Sacred Log! 🎉

### 🎰 Card Forge (/forge)
- Pull cards using Sacred Logs
- Single pull: 10 Diamonds
- Multi-pull (10x): 90 Diamonds (better value!)
- Guaranteed rare: 50 Diamonds
- Card rarities: Common → Uncommon → Rare → Epic → Legendary

### ⭐ Card Upgrades (/collection)
- Use duplicate cards to upgrade star level (1★ to 5★)
- Star bonuses: +15% / +30% / +50% / +75% stats
- 🔥 Burn unwanted cards for Sacred Logs (higher rarity = more logs)

### 🕹️ Arcade (/arcade)
- Mini-games to earn currencies
- Slot machine for jackpots
- Daily bonus for regular players

### 📈 NWX Exchange (/exchange)
- Parody stock market with guild member "stocks"
- Buy low, sell high for profits
- Market trends change daily

### ⚔️ Battle Arena (/battle)
- PvP card battles
- Use your card collection
- Climb the leaderboards

## Absurdist Features (The Fun Stuff!)

### ⚖️ Guild Supreme Court (/court)
- Sue your guildmates for fake crimes!
- File complaint: 5 Diamonds
- Win verdict: Earn 25 Gold
- Appeal: 10 Diamonds (only 3% success rate 😈)
- 10 crime categories: Loot Theft, AFK Abuse, Boss KS, etc.

### 🛋️ Guild Therapy (/therapy)
- AI therapist "Dr. NumbahWan" diagnoses gaming trauma
- Sessions are FREE
- Complete session reward: 3 Diamonds
- Common diagnoses: Gacha Pull Depression, Boss Wipe PTSD, Inventory Hoarding Syndrome

### 👔 HR Department (/hr)
- Apply for absurd guild positions
- Chief Banana Officer, Professional AFK-er, Loot Ninja Coordinator, etc.
- Application fee: 5 Diamonds
- 100% rejection rate GUARANTEED!
- Consolation prize: 10 Gold

### 📌 Conspiracy Board (/conspiracy)
- Cork board to connect evidence
- Uncover "guild secrets"
- Submit theories: 2 Diamonds
- Successful theory: 15 Gold
- Is the banana patch a lie? 👁️

### 🎭 Confessional (/confessional)
- Anonymous guild confessions
- Vote on the juiciest secrets
- Everything is anonymous... or is it? 😈

## Other Features
- 🏛️ Museum (/museum) - Guild history and artifacts
- 🏫 Academy (/academy) - Training and schedules
- 🔮 Fortune Teller (/fortune) - Daily fortunes
- 🛍️ Merch Shop (/merch) - Guild merchandise
- 👛 Wallet (/wallet) - Currency management

## Team
- **Reggina** - Guild Master, "The Banana Overlord"
- **Reggino** - Vice Master, "The Pink Menace"
- **Dr. NumbahWan** - AI Therapist with questionable credentials
- **Judge Banana** - Chief Justice, loves chaos
- **HR Karen** - Professional Dream Crusher
- **Agent Tinfoil** - Chief Conspiracy Officer

## Sacred Items
- **The Sacred Log** (⧫) - Mystical wood that summons legendary cards. Smells faintly of banana.
- **The Golden Banana** (🍌) - Currently MISSING. Reward for return: 1000 Diamonds!
`;

function buildSystemPrompt(language: string = 'en', currentPage?: string): string {
  const languageInstructions = {
    en: 'Respond in English.',
    zh: 'Respond in Traditional Chinese (繁體中文). Use natural, conversational Chinese.',
    th: 'Respond in Thai (ภาษาไทย). Use natural, conversational Thai.'
  };

  const pageContext = currentPage ? `\nThe user is currently on: ${currentPage}` : '';

  return `You are the NumbahWan AI Guide, a helpful and entertaining assistant for the NumbahWan MapleStory guild website.

## Your Personality
- Friendly, witty, and slightly mischievous
- You love guild humor and inside jokes
- You're knowledgeable but not boring
- You use emojis appropriately (not excessively)
- You're proud of the guild's absurdist features

## Your Knowledge
${GUILD_KNOWLEDGE}

## Response Guidelines
1. ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}
2. Keep responses concise but helpful (2-4 short paragraphs max)
3. When mentioning pages, include the path (e.g., "Avatar Studio at /avatar-studio")
4. For economy questions, give specific numbers
5. Be playful with absurdist features - they're meant to be funny!
6. If asked about something you don't know, suggest relevant pages to explore
7. Never break character - you ARE the guild guide

## Response Format
- Use **bold** for important items/features
- Use emojis to match the feature (💎 for diamonds, ⚖️ for court, etc.)
- Include actionable tips when relevant
- End responses with a helpful suggestion or related feature
${pageContext}

Remember: You're not just answering questions - you're welcoming people to our guild family! 🍌`;
}

// ============================================================================
// API INTEGRATION
// ============================================================================

export async function chat(
  request: GuideRequest,
  apiKey: string,
  baseUrl: string
): Promise<GuideResponse> {
  const { message, conversationHistory = [], language = 'en', currentPage, userContext } = request;

  // Build messages array
  const messages: Message[] = [
    { role: 'system', content: buildSystemPrompt(language, currentPage) },
  ];

  // Add conversation history (limit to last 10 messages to save tokens)
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add user context if available
  let contextPrefix = '';
  if (userContext) {
    if (userContext.viewingHistory?.length) {
      contextPrefix += `[User recently visited: ${userContext.viewingHistory.slice(-3).join(', ')}] `;
    }
    if (userContext.currencies) {
      contextPrefix += `[User has: ${userContext.currencies.diamond || 0}💎, ${userContext.currencies.gold || 0}🪙] `;
    }
  }

  // Add user message
  messages.push({
    role: 'user',
    content: contextPrefix + message
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
    
    return {
      success: true,
      message: data.choices[0]?.message?.content || 'Sorry, I could not generate a response.',
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

  // Build messages array
  const messages: Message[] = [
    { role: 'system', content: buildSystemPrompt(language, currentPage) },
  ];

  // Add conversation history (limit to last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  // Add user context
  let contextPrefix = '';
  if (userContext) {
    if (userContext.viewingHistory?.length) {
      contextPrefix += `[User recently visited: ${userContext.viewingHistory.slice(-3).join(', ')}] `;
    }
  }

  messages.push({
    role: 'user',
    content: contextPrefix + message
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

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  chat,
  chatStream,
  getQuickResponse,
  buildSystemPrompt,
  GUILD_KNOWLEDGE
};
