/**
 * NumbahWan AI Guide Service v3.0 - FULL ACTION SUPPORT!
 * Real LLM-powered assistant that can DO things, not just talk
 *
 * LEARNING POINTS:
 * 1. System prompts - How to give AI personality and knowledge
 * 2. Streaming - Real-time response delivery
 * 3. Context management - Conversation memory
 * 4. Token optimization - Keeping costs down
 * 5. AI ACTIONS - Making AI execute real functions!
 *
 * HOW ACTIONS WORK:
 * The AI returns a special JSON block in its response when it wants to perform an action.
 * Format: <<<ACTION:{"type":"navigate","target":"/forge"}>>>
 *
 * The frontend parses these action tags and executes them.
 * Multiple actions can be included in a single response.
 *
 * SUPPORTED ACTIONS:
 * - navigate: Go to a page (target: path)
 * - showBalance: Display wallet popup
 * - claimDaily: Claim daily login reward
 * - openForge: Open card forge modal
 * - showCards: Show card collection
 * - playSound: Play a sound effect (target: sound name)
 * - showToast: Show a notification (data: message, type)
 * - toggleTheme: Toggle dark/light mode
 * - shareDiscord: Open Discord share dialog
 * - copyText: Copy text to clipboard (data: text)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ============================================================================
// ACTION TYPES - What the AI can DO
// ============================================================================
//
// LEARNING: This is like giving your AI superpowers!
// Each action type defines what the AI can make happen in the real world.
// ============================================================================

export type ActionType =
  | 'navigate' // Go to a page
  | 'showBalance' // Display wallet popup
  | 'claimDaily' // Claim daily reward
  | 'openForge' // Open card forge
  | 'showCards' // Show card collection
  | 'playSound' // Play a sound effect
  | 'showToast' // Show a notification
  | 'toggleTheme' // Toggle dark/light mode
  | 'shareDiscord' // Share to Discord
  | 'copyText' // Copy text to clipboard

export interface GuideAction {
  type: ActionType
  target?: string // For navigate: the path. For playSound: sound name
  data?: any // Additional data for the action
  message?: string // Optional message to show with action
}

export interface GuideRequest {
  message: string
  conversationHistory?: Message[]
  language?: 'en' | 'zh' | 'th'
  currentPage?: string
  userContext?: {
    viewingHistory?: string[]
    currencies?: Record<string, number>
    cardCount?: number
    cards?: { name: string; rarity: string; stars: number }[]
  }
}

export interface GuideResponse {
  success: boolean
  message?: string
  actions?: GuideAction[] // NEW: Actions to execute!
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// ============================================================================
// ACTION DEFINITIONS - Teach AI what actions are available
// ============================================================================

export const AVAILABLE_ACTIONS = {
  navigate: {
    description: 'Navigate to a page on the site',
    examples: ['go to forge', 'take me to arcade', 'open avatar studio'],
    targets: {
      '/': 'Home page',
      '/forge': 'Card Forge - pull cards with Sacred Logs',
      '/avatar-studio': 'Avatar Studio - generate AI avatars',
      '/arcade': 'Arcade - play mini-games',
      '/wallet': 'Wallet - manage currencies',
      '/collection': 'Collection - view and upgrade cards',
      '/battle': 'Battle Arena - PvP card battles',
      '/exchange': 'Exchange - trade currencies',
      '/market': 'Market - buy/sell cards',
      '/court': 'Guild Court - sue your guildmates',
      '/therapy': 'Guild Therapy - AI therapist',
      '/hr': 'HR Department - apply for jobs',
      '/conspiracy': 'Conspiracy Board - connect the dots',
      '/fortune': 'Fortune Teller - daily fortunes',
      '/museum': 'Museum - guild history',
      '/updates': 'Patch Notes - latest changes',
    },
  },
  showBalance: {
    description: 'Show the user their current currency balances',
    examples: ['how much gold do I have', 'check my balance', 'show my currencies'],
  },
  claimDaily: {
    description: 'Claim daily login reward',
    examples: ['claim my daily', 'get daily reward', 'claim login bonus'],
  },
  openForge: {
    description: 'Open the card forge to pull cards',
    examples: ['open a pack', 'pull cards', 'use my sacred logs'],
  },
  showCards: {
    description: 'Show cards from collection',
    examples: ['show my cards', 'what cards do I have', 'my collection'],
  },
  playSound: {
    description: 'Play a sound effect',
    examples: ['play a sound', 'make a noise'],
    sounds: ['click', 'success', 'error', 'coin', 'card', 'fanfare'],
  },
  showToast: {
    description: 'Show a notification message',
    examples: ['notify me', 'show alert'],
  },
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

export const GUILD_KNOWLEDGE = `
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
`

// ============================================================================
// ACTION INSTRUCTIONS - Teach AI how to trigger actions
// ============================================================================

export const ACTION_INSTRUCTIONS = `
## 🎮 ACTION SYSTEM - You Can DO Things!

You have the power to perform REAL actions on the website. When you want to help the user DO something (not just talk about it), include an action tag in your response.

### Action Format
Include this EXACT format anywhere in your response:
<<<ACTION:{"type":"actionType","target":"value","data":{}}>>>

### Available Actions

1. **navigate** - Take the user to a page
   <<<ACTION:{"type":"navigate","target":"/forge"}>>>
   Use when: user asks to go somewhere, see something, or you want to show them a feature
   Targets: /, /forge, /avatar-studio, /arcade, /wallet, /collection, /battle, /exchange, /market, /court, /therapy, /hr, /conspiracy, /fortune, /museum, /updates, /confessional

2. **showBalance** - Show their currency wallet popup
   <<<ACTION:{"type":"showBalance"}>>>
   Use when: user asks about their balance, currencies, how much they have

3. **claimDaily** - Claim daily login reward
   <<<ACTION:{"type":"claimDaily"}>>>
   Use when: user asks to claim daily, get rewards, mentions daily login

4. **openForge** - Open the card forge to pull cards
   <<<ACTION:{"type":"openForge"}>>>
   Use when: user wants to pull cards, open packs, use sacred logs

5. **showCards** - Display their card collection
   <<<ACTION:{"type":"showCards"}>>>
   Use when: user asks to see their cards, collection, or inventory

6. **playSound** - Play a fun sound effect
   <<<ACTION:{"type":"playSound","target":"fanfare"}>>>
   Sounds: click, success, error, coin, card, fanfare
   Use sparingly for celebrations or emphasis

7. **showToast** - Show a notification message
   <<<ACTION:{"type":"showToast","data":{"message":"Welcome to NumbahWan!","type":"success"}}>>>
   Types: success, error, info, warning
   Use for confirmations or important alerts

8. **copyText** - Copy text to user's clipboard
   <<<ACTION:{"type":"copyText","data":{"text":"NumbahWan #1!"}}>>>
   Use when: user asks for text to copy, sharing codes, etc.

### 🚨 ACTION RULES
1. ALWAYS explain what you're doing before the action
2. Include relevant context ("Taking you to the Forge!")
3. Don't spam actions - max 1-2 per response
4. For navigation, ALWAYS mention where you're going
5. Action tags can appear anywhere in your text response
6. The action will execute AFTER your message displays

### Examples

User: "Take me to the card forge"
You: "Let's pull some cards! 🎰 Taking you to the **Card Forge** where you can use your Sacred Logs for legendary pulls!
<<<ACTION:{"type":"navigate","target":"/forge"}>>>"

User: "How much gold do I have?"
You: "Let me check your wallet! 💰
<<<ACTION:{"type":"showBalance"}>>>
Your balance should pop up now - Diamonds 💎, Gold 🪙, and more!"

User: "I want to see my cards"
You: "Opening your card collection! 📚 Here you can upgrade stars, burn duplicates, and admire your pulls.
<<<ACTION:{"type":"navigate","target":"/collection"}>>><<<ACTION:{"type":"showCards"}>>>"
`

function getLanguageInstruction(lang: string): string {
  const instructions: Record<string, string> = {
    en: 'Respond in English.',
    zh: 'Respond in Traditional Chinese (繁體中文). Use natural, conversational Chinese.',
    th: 'Respond in Thai (ภาษาไทย). Use natural, conversational Thai.',
  }
  return instructions[lang] || instructions.en
}

function buildUserContext(userContext: any): string {
  if (!userContext) return ''
  let str = ''
  if (userContext.currencies) {
    str += `\nUser's currencies: ${userContext.currencies.diamond || 0}💎 Diamonds, ${userContext.currencies.gold || 0}🪙 Gold, ${userContext.currencies.iron || 0}⚙️ Iron, ${userContext.currencies.stone || 0}🪨 Stone, ${userContext.currencies.sacredLog || 0}⧫ Sacred Logs`
  }
  if (userContext.cardCount) {
    str += `\nUser has ${userContext.cardCount} cards in their collection.`
  }
  if (userContext.viewingHistory?.length) {
    str += `\nRecently visited: ${userContext.viewingHistory.slice(-3).join(', ')}`
  }
  return str
}

export function buildSystemPrompt(language: string = 'en', currentPage?: string, userContext?: any): string {
  const pageContext = currentPage ? `\nThe user is currently on: ${currentPage}` : ''
  const userContextStr = buildUserContext(userContext)

  return `You are the NumbahWan AI Guide, a helpful and entertaining assistant for the NumbahWan MapleStory guild website.

## Your Personality
- Friendly, witty, and slightly mischievous
- You love guild humor and inside jokes
- You're knowledgeable but not boring
- You use emojis appropriately (not excessively)
- You're proud of the guild's absurdist features
- You LOVE to help by DOING things, not just talking!

## Your Knowledge
${GUILD_KNOWLEDGE}

${ACTION_INSTRUCTIONS}

## Response Guidelines
1. ${getLanguageInstruction(language)}
2. Keep responses concise but helpful (2-4 short paragraphs max)
3. When mentioning pages, include the path (e.g., "Avatar Studio at /avatar-studio")
4. For economy questions, give specific numbers
5. Be playful with absurdist features - they're meant to be funny!
6. If asked about something you don't know, suggest relevant pages to explore
7. Never break character - you ARE the guild guide
8. **PROACTIVELY USE ACTIONS** - When user wants to DO something, include the action!
9. If user asks to "go to" or "show me" something, ALWAYS include a navigate action

## Response Format
- Use **bold** for important items/features
- Use emojis to match the feature (💎 for diamonds, ⚖️ for court, etc.)
- Include actionable tips when relevant
- End responses with a helpful suggestion or related feature
- Include <<<ACTION:...>>> tags when performing actions
${pageContext}
${userContextStr}

Remember: You're not just answering questions - you're welcoming people to our guild family! 🍌
And you can DO things to help them, not just talk about it!`
}

// ============================================================================
// API INTEGRATION
// ============================================================================

// ============================================================================
// ACTION PARSING - Extract actions from AI response
// ============================================================================
