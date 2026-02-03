/**
 * NWG Gamification System
 * 
 * Features:
 * - Price Prediction Game (bet on price direction)
 * - Achievement System with badges
 * - Daily/Weekly Quests
 * - Leaderboards
 * - Whale Tracker
 * - Fear & Greed Index
 * - AI Market Analyst
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Prediction {
  id: string;
  odenom: string; // wallet address
  direction: 'up' | 'down';
  targetPrice?: number;
  betAmount: number;
  timeframe: '1h' | '24h' | '7d';
  startPrice: number;
  startTime: number;
  endTime: number;
  status: 'active' | 'won' | 'lost' | 'expired';
  payout?: number;
  actualPrice?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'trading' | 'holding' | 'social' | 'explorer' | 'whale';
  requirement: {
    type: string;
    value: number;
  };
  reward: {
    nwg?: number;
    nwx?: number;
    badge?: string;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
}

export interface UserAchievement {
  odenom: string;
  achievementId: string;
  unlockedAt: number;
  progress: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  requirement: {
    action: string;
    count: number;
  };
  reward: {
    nwg?: number;
    nwx?: number;
    xp?: number;
  };
  expiresAt: number;
}

export interface LeaderboardEntry {
  odenom: string;
  displayName: string;
  score: number;
  wins: number;
  totalBets: number;
  winRate: number;
  totalProfit: number;
  rank?: number;
}

export interface WhaleAlert {
  id: string;
  type: 'buy' | 'sell' | 'transfer';
  asset: string;
  amount: number;
  usdValue: number;
  timestamp: number;
  from?: string;
  to?: string;
}

export interface FearGreedData {
  value: number; // 0-100
  label: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  factors: {
    volatility: number;
    momentum: number;
    volume: number;
    socialSentiment: number;
  };
  history: { timestamp: number; value: number }[];
}

export interface MarketAnalysis {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyFactors: string[];
  topMover: { asset: string; change: number; reason: string };
  recommendation: string;
  confidence: number;
}

// ============================================================================
// CACHE KEYS
// ============================================================================

export const GAME_CACHE_KEYS = {
  PREDICTIONS: 'game:predictions',
  LEADERBOARD: 'game:leaderboard',
  ACHIEVEMENTS: 'game:achievements',
  USER_ACHIEVEMENTS: 'game:user_achievements:',
  QUESTS: 'game:quests',
  USER_QUESTS: 'game:user_quests:',
  WHALE_ALERTS: 'game:whales',
  FEAR_GREED: 'game:feargreed',
  PREDICTION_POOL: 'game:pool',
} as const;

// ============================================================================
// ACHIEVEMENTS DEFINITIONS
// ============================================================================

export const ACHIEVEMENTS: Achievement[] = [
  // Trading Achievements
  {
    id: 'first-prediction',
    name: 'Fortune Teller',
    description: 'Make your first price prediction',
    icon: '🔮',
    category: 'trading',
    requirement: { type: 'predictions', value: 1 },
    reward: { nwg: 10, badge: 'fortune-teller' },
    rarity: 'common'
  },
  {
    id: 'winning-streak-3',
    name: 'Hot Hand',
    description: 'Win 3 predictions in a row',
    icon: '🔥',
    category: 'trading',
    requirement: { type: 'win_streak', value: 3 },
    reward: { nwg: 50, badge: 'hot-hand' },
    rarity: 'rare'
  },
  {
    id: 'winning-streak-10',
    name: 'Oracle',
    description: 'Win 10 predictions in a row',
    icon: '👁️',
    category: 'trading',
    requirement: { type: 'win_streak', value: 10 },
    reward: { nwg: 500, badge: 'oracle' },
    rarity: 'legendary'
  },
  {
    id: 'total-wins-50',
    name: 'Market Master',
    description: 'Win 50 total predictions',
    icon: '📈',
    category: 'trading',
    requirement: { type: 'total_wins', value: 50 },
    reward: { nwg: 200, badge: 'market-master' },
    rarity: 'epic'
  },
  
  // Holding Achievements
  {
    id: 'diamond-hands-7',
    name: 'Paper Hands? Never!',
    description: 'Hold NWG for 7 days straight',
    icon: '💎',
    category: 'holding',
    requirement: { type: 'hold_days', value: 7 },
    reward: { nwg: 25, badge: 'paper-never' },
    rarity: 'common'
  },
  {
    id: 'diamond-hands-30',
    name: 'Diamond Hands',
    description: 'Hold NWG for 30 days straight',
    icon: '💎',
    category: 'holding',
    requirement: { type: 'hold_days', value: 30 },
    reward: { nwg: 100, badge: 'diamond-hands' },
    rarity: 'rare'
  },
  {
    id: 'diamond-hands-365',
    name: 'True Believer',
    description: 'Hold NWG for 1 year',
    icon: '🙏',
    category: 'holding',
    requirement: { type: 'hold_days', value: 365 },
    reward: { nwg: 1000, badge: 'true-believer' },
    rarity: 'mythic'
  },
  
  // Whale Achievements
  {
    id: 'whale-100',
    name: 'Baby Whale',
    description: 'Own 100+ NWG',
    icon: '🐋',
    category: 'whale',
    requirement: { type: 'balance', value: 100 },
    reward: { badge: 'baby-whale' },
    rarity: 'common'
  },
  {
    id: 'whale-10000',
    name: 'Whale',
    description: 'Own 10,000+ NWG',
    icon: '🐳',
    category: 'whale',
    requirement: { type: 'balance', value: 10000 },
    reward: { nwg: 100, badge: 'whale' },
    rarity: 'epic'
  },
  {
    id: 'whale-1000000',
    name: 'Mega Whale',
    description: 'Own 1,000,000+ NWG',
    icon: '🌊',
    category: 'whale',
    requirement: { type: 'balance', value: 1000000 },
    reward: { nwg: 10000, badge: 'mega-whale' },
    rarity: 'mythic'
  },
  
  // Explorer Achievements
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Login for 7 consecutive days',
    icon: '🐦',
    category: 'explorer',
    requirement: { type: 'login_streak', value: 7 },
    reward: { nwg: 50, badge: 'early-bird' },
    rarity: 'rare'
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Make a prediction between 2-4 AM',
    icon: '🦉',
    category: 'explorer',
    requirement: { type: 'night_prediction', value: 1 },
    reward: { nwg: 25, badge: 'night-owl' },
    rarity: 'rare'
  },
  {
    id: 'explorer-all-pages',
    name: 'Explorer',
    description: 'Visit every page in NWG',
    icon: '🧭',
    category: 'explorer',
    requirement: { type: 'pages_visited', value: 20 },
    reward: { nwg: 30, badge: 'explorer' },
    rarity: 'common'
  },
  
  // Social Achievements  
  {
    id: 'social-share',
    name: 'Influencer',
    description: 'Share your portfolio 5 times',
    icon: '📱',
    category: 'social',
    requirement: { type: 'shares', value: 5 },
    reward: { nwg: 25, badge: 'influencer' },
    rarity: 'common'
  },
  {
    id: 'top-10',
    name: 'Elite Trader',
    description: 'Reach top 10 on the leaderboard',
    icon: '🏆',
    category: 'social',
    requirement: { type: 'leaderboard_rank', value: 10 },
    reward: { nwg: 500, badge: 'elite-trader' },
    rarity: 'legendary'
  },
];

// ============================================================================
// QUEST GENERATORS
// ============================================================================

export function generateDailyQuests(): Quest[] {
  const now = Date.now();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  return [
    {
      id: `daily-predict-${now}`,
      title: 'Crystal Ball',
      description: 'Make 3 price predictions today',
      type: 'daily',
      requirement: { action: 'prediction', count: 3 },
      reward: { nwg: 15, xp: 50 },
      expiresAt: endOfDay.getTime()
    },
    {
      id: `daily-check-${now}`,
      title: 'Market Watcher',
      description: 'Check market prices 5 times',
      type: 'daily',
      requirement: { action: 'check_prices', count: 5 },
      reward: { nwg: 10, xp: 30 },
      expiresAt: endOfDay.getTime()
    },
    {
      id: `daily-win-${now}`,
      title: 'Winner Winner',
      description: 'Win at least 1 prediction',
      type: 'daily',
      requirement: { action: 'win_prediction', count: 1 },
      reward: { nwg: 25, xp: 75 },
      expiresAt: endOfDay.getTime()
    }
  ];
}

export function generateWeeklyQuests(): Quest[] {
  const now = Date.now();
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);
  
  return [
    {
      id: `weekly-streak-${now}`,
      title: 'Consistency King',
      description: 'Login every day this week',
      type: 'weekly',
      requirement: { action: 'daily_login', count: 7 },
      reward: { nwg: 100, xp: 200 },
      expiresAt: endOfWeek.getTime()
    },
    {
      id: `weekly-profit-${now}`,
      title: 'Profit Hunter',
      description: 'Earn 50 NWG from predictions',
      type: 'weekly',
      requirement: { action: 'prediction_profit', count: 50 },
      reward: { nwg: 75, xp: 150 },
      expiresAt: endOfWeek.getTime()
    },
    {
      id: `weekly-accuracy-${now}`,
      title: 'Sharpshooter',
      description: 'Achieve 70% win rate (min 10 bets)',
      type: 'weekly',
      requirement: { action: 'win_rate_70', count: 10 },
      reward: { nwg: 150, xp: 300 },
      expiresAt: endOfWeek.getTime()
    }
  ];
}

// ============================================================================
// PREDICTION GAME
// ============================================================================

export async function createPrediction(
  cache: KVNamespace,
  odenom: string,
  direction: 'up' | 'down',
  betAmount: number,
  timeframe: '1h' | '24h' | '7d',
  currentPrice: number
): Promise<Prediction> {
  const now = Date.now();
  const durations = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  const prediction: Prediction = {
    id: `pred_${now}_${Math.random().toString(36).substr(2, 9)}`,
    odenom,
    direction,
    betAmount,
    timeframe,
    startPrice: currentPrice,
    startTime: now,
    endTime: now + durations[timeframe],
    status: 'active'
  };
  
  // Store prediction
  const existing = await cache.get(GAME_CACHE_KEYS.PREDICTIONS);
  const predictions: Prediction[] = existing ? JSON.parse(existing) : [];
  predictions.push(prediction);
  await cache.put(GAME_CACHE_KEYS.PREDICTIONS, JSON.stringify(predictions));
  
  // Update pool
  const poolKey = GAME_CACHE_KEYS.PREDICTION_POOL;
  const poolData = await cache.get(poolKey);
  const pool = poolData ? JSON.parse(poolData) : { up: 0, down: 0, total: 0 };
  pool[direction] += betAmount;
  pool.total += betAmount;
  await cache.put(poolKey, JSON.stringify(pool));
  
  return prediction;
}

export async function resolvePredictions(
  cache: KVNamespace,
  currentPrice: number
): Promise<{ resolved: number; winners: string[] }> {
  const now = Date.now();
  const existing = await cache.get(GAME_CACHE_KEYS.PREDICTIONS);
  const predictions: Prediction[] = existing ? JSON.parse(existing) : [];
  
  const winners: string[] = [];
  let resolved = 0;
  
  for (const pred of predictions) {
    if (pred.status !== 'active') continue;
    if (now < pred.endTime) continue;
    
    resolved++;
    pred.actualPrice = currentPrice;
    
    const priceWentUp = currentPrice > pred.startPrice;
    const won = (pred.direction === 'up' && priceWentUp) || 
                (pred.direction === 'down' && !priceWentUp);
    
    if (won) {
      pred.status = 'won';
      pred.payout = pred.betAmount * 1.9; // 90% profit (10% house edge)
      winners.push(pred.odenom);
    } else {
      pred.status = 'lost';
      pred.payout = 0;
    }
  }
  
  await cache.put(GAME_CACHE_KEYS.PREDICTIONS, JSON.stringify(predictions));
  
  // Update leaderboard
  await updateLeaderboard(cache, predictions);
  
  return { resolved, winners };
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export async function updateLeaderboard(
  cache: KVNamespace,
  predictions: Prediction[]
): Promise<void> {
  const stats: Record<string, LeaderboardEntry> = {};
  
  for (const pred of predictions) {
    if (pred.status === 'active') continue;
    
    if (!stats[pred.odenom]) {
      stats[pred.odenom] = {
        odenom: pred.odenom,
        displayName: pred.odenom.slice(0, 8) + '...',
        score: 0,
        wins: 0,
        totalBets: 0,
        winRate: 0,
        totalProfit: 0
      };
    }
    
    const entry = stats[pred.odenom];
    entry.totalBets++;
    
    if (pred.status === 'won') {
      entry.wins++;
      entry.totalProfit += (pred.payout || 0) - pred.betAmount;
      entry.score += 10 + Math.floor((pred.payout || 0) / 10);
    } else {
      entry.totalProfit -= pred.betAmount;
    }
    
    entry.winRate = Math.round((entry.wins / entry.totalBets) * 100);
  }
  
  const leaderboard = Object.values(stats)
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  
  await cache.put(GAME_CACHE_KEYS.LEADERBOARD, JSON.stringify(leaderboard));
}

export async function getLeaderboard(cache: KVNamespace): Promise<LeaderboardEntry[]> {
  const data = await cache.get(GAME_CACHE_KEYS.LEADERBOARD);
  return data ? JSON.parse(data) : [];
}

// ============================================================================
// FEAR & GREED INDEX
// ============================================================================

export function calculateFearGreed(marketData: any): FearGreedData {
  // Calculate based on price changes and volatility
  const changes = [
    marketData.assets.btc.change,
    marketData.assets.gold.change,
    marketData.assets.silver.change,
    marketData.assets.pltr.change,
    marketData.assets.avgo.change
  ];
  
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
  const volatility = Math.sqrt(
    changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length
  );
  
  // Factors (0-100)
  const momentum = Math.min(100, Math.max(0, 50 + avgChange * 10));
  const volatilityScore = Math.min(100, Math.max(0, 100 - volatility * 20));
  const volume = 50 + Math.random() * 20; // Simulated
  const socialSentiment = 50 + avgChange * 5 + Math.random() * 10;
  
  // Weighted average
  const value = Math.round(
    momentum * 0.35 +
    volatilityScore * 0.25 +
    volume * 0.20 +
    socialSentiment * 0.20
  );
  
  let label: FearGreedData['label'];
  if (value <= 20) label = 'Extreme Fear';
  else if (value <= 40) label = 'Fear';
  else if (value <= 60) label = 'Neutral';
  else if (value <= 80) label = 'Greed';
  else label = 'Extreme Greed';
  
  return {
    value,
    label,
    factors: {
      volatility: Math.round(volatilityScore),
      momentum: Math.round(momentum),
      volume: Math.round(volume),
      socialSentiment: Math.round(socialSentiment)
    },
    history: [] // Would be populated from cache
  };
}

// ============================================================================
// WHALE TRACKER
// ============================================================================

export function generateWhaleAlerts(marketData: any): WhaleAlert[] {
  const alerts: WhaleAlert[] = [];
  const now = Date.now();
  
  // Generate simulated whale activity based on price movements
  for (const [asset, data] of Object.entries(marketData.assets) as [string, any][]) {
    if (Math.abs(data.change) > 2) {
      // Big move = whale activity
      const isBuy = data.change > 0;
      const amount = Math.floor(Math.random() * 1000000) + 100000;
      
      alerts.push({
        id: `whale_${now}_${asset}`,
        type: isBuy ? 'buy' : 'sell',
        asset: asset.toUpperCase(),
        amount,
        usdValue: amount * (asset === 'btc' ? data.price / 100000 : data.price / 100),
        timestamp: now - Math.floor(Math.random() * 3600000), // Within last hour
      });
    }
  }
  
  return alerts.sort((a, b) => b.timestamp - a.timestamp);
}

// ============================================================================
// AI MARKET ANALYST
// ============================================================================

export function generateMarketAnalysis(marketData: any, fearGreed: FearGreedData): MarketAnalysis {
  const assets = marketData.assets;
  const nwg = marketData.nwg;
  
  // Find top mover
  let topMover = { asset: 'BTC', change: 0, reason: '' };
  for (const [asset, data] of Object.entries(assets) as [string, any][]) {
    if (Math.abs(data.change) > Math.abs(topMover.change)) {
      topMover = {
        asset: asset.toUpperCase(),
        change: data.change,
        reason: data.change > 0 
          ? `Strong buying pressure in ${asset.toUpperCase()}`
          : `Selling pressure in ${asset.toUpperCase()}`
      };
    }
  }
  
  // Determine overall sentiment
  const avgChange = nwg.change24h;
  let sentiment: 'bullish' | 'bearish' | 'neutral';
  if (avgChange > 1.5) sentiment = 'bullish';
  else if (avgChange < -1.5) sentiment = 'bearish';
  else sentiment = 'neutral';
  
  // Generate key factors
  const keyFactors: string[] = [];
  
  if (assets.btc.change > 2) keyFactors.push('🚀 Bitcoin leading the charge');
  if (assets.btc.change < -2) keyFactors.push('📉 Bitcoin weakness dragging market');
  if (assets.gold.change > 1) keyFactors.push('🥇 Gold showing safe-haven demand');
  if (assets.pltr.change > 3) keyFactors.push('🤖 AI stocks (PLTR) surging');
  if (assets.avgo.change > 2) keyFactors.push('💾 Semiconductor strength (AVGO)');
  if (fearGreed.value < 30) keyFactors.push('😱 Fear in the market - potential opportunity');
  if (fearGreed.value > 70) keyFactors.push('🎉 Greed rising - consider taking profits');
  
  if (keyFactors.length === 0) {
    keyFactors.push('📊 Markets consolidating');
  }
  
  // Generate recommendation
  let recommendation: string;
  let confidence: number;
  
  if (sentiment === 'bullish' && fearGreed.value < 70) {
    recommendation = 'Consider adding to positions. Momentum is positive without excessive greed.';
    confidence = 75;
  } else if (sentiment === 'bearish' && fearGreed.value < 30) {
    recommendation = 'Potential buying opportunity. Fear is elevated but fundamentals remain strong.';
    confidence = 65;
  } else if (sentiment === 'bullish' && fearGreed.value > 70) {
    recommendation = 'Caution advised. Markets are greedy - consider taking some profits.';
    confidence = 60;
  } else if (sentiment === 'bearish' && fearGreed.value > 50) {
    recommendation = 'Hold current positions. Wait for clearer signals before acting.';
    confidence = 55;
  } else {
    recommendation = 'Market is neutral. DCA (Dollar Cost Average) approach recommended.';
    confidence = 70;
  }
  
  // Generate summary
  const summary = `NWG is ${sentiment === 'bullish' ? 'up' : sentiment === 'bearish' ? 'down' : 'flat'} ${Math.abs(nwg.change24h).toFixed(2)}% in the last 24 hours. ${topMover.asset} is the top mover at ${topMover.change > 0 ? '+' : ''}${topMover.change.toFixed(2)}%. The Fear & Greed Index shows "${fearGreed.label}" at ${fearGreed.value}/100.`;
  
  return {
    summary,
    sentiment,
    keyFactors,
    topMover,
    recommendation,
    confidence
  };
}

// ============================================================================
// PORTFOLIO CARD GENERATOR
// ============================================================================

export interface PortfolioCard {
  id: string;
  odenom: string;
  balance: number;
  value: number;
  rank: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  mood: 'bear' | 'neutral' | 'bull' | 'moon';
  achievements: string[];
  generatedAt: number;
  shareUrl: string;
}

export function generatePortfolioCard(
  odenom: string,
  balance: number,
  nwgPrice: number,
  change24h: number,
  achievements: string[]
): PortfolioCard {
  const value = balance * nwgPrice;
  
  // Determine rarity based on value
  let rarity: PortfolioCard['rarity'];
  let rank: string;
  
  if (value >= 100000) { rarity = 'diamond'; rank = 'Diamond Holder'; }
  else if (value >= 10000) { rarity = 'platinum'; rank = 'Platinum Holder'; }
  else if (value >= 1000) { rarity = 'gold'; rank = 'Gold Holder'; }
  else if (value >= 100) { rarity = 'silver'; rank = 'Silver Holder'; }
  else { rarity = 'bronze'; rank = 'Bronze Holder'; }
  
  // Determine mood based on 24h change
  let mood: PortfolioCard['mood'];
  if (change24h > 5) mood = 'moon';
  else if (change24h > 1) mood = 'bull';
  else if (change24h < -1) mood = 'bear';
  else mood = 'neutral';
  
  const card: PortfolioCard = {
    id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    odenom,
    balance,
    value,
    rank,
    rarity,
    mood,
    achievements: achievements.slice(0, 5),
    generatedAt: Date.now(),
    shareUrl: '' // Would be generated
  };
  
  return card;
}

// ============================================================================
// AI CHATBOT - Interactive Market Analyst
// ============================================================================

const MARKET_INSIGHTS = {
  btc: {
    up: [
      'Bitcoin is pumping! Institutional buying pressure increasing.',
      'BTC breaking resistance levels - bulls are in control!',
      'Whale accumulation detected - smart money is buying.',
      'Bitcoin ETF inflows hitting record highs today.',
    ],
    down: [
      'Bitcoin taking a breather - healthy consolidation.',
      'BTC profit-taking after recent highs - normal market behavior.',
      'Miners selling pressure - temporary dip opportunity.',
      'Bitcoin cooling off - RSI was overheated anyway.',
    ],
  },
  gold: {
    up: [
      'Gold shining bright! Central banks still accumulating.',
      'Safe-haven demand rising - gold is the OG store of value.',
      'Inflation fears pushing gold higher - classic hedge working.',
      'Geopolitical tensions boosting precious metals.',
    ],
    down: [
      'Gold dipping as dollar strengthens temporarily.',
      'Risk-on sentiment - money rotating to stocks.',
      'Gold consolidating after strong run - buying opportunity.',
      'Short-term pullback in precious metals sector.',
    ],
  },
  silver: {
    up: [
      'Silver surging! Industrial + monetary demand combo.',
      'Silver outperforming gold - bullish signal for metals.',
      'EV and solar demand driving silver higher.',
      'Silver squeeze incoming? Supply getting tight.',
    ],
    down: [
      'Silver more volatile than gold - normal fluctuation.',
      'Industrial slowdown fears hitting silver temporarily.',
      'Silver taking a breather - still long-term bullish.',
      'Precious metals sector cooling off together.',
    ],
  },
  pltr: {
    up: [
      'Palantir crushing it! Another government contract win.',
      'PLTR AI platform adoption accelerating.',
      'Palantir commercial revenue growing exponentially.',
      'Defense spending up = Palantir profits up.',
    ],
    down: [
      'PLTR taking profits after massive run-up.',
      'Tech sector rotation - temporary weakness.',
      'Palantir consolidating before next leg up.',
      'Growth stocks under pressure - buying opportunity.',
    ],
  },
  avgo: {
    up: [
      'Broadcom AI chips in high demand!',
      'AVGO riding the AI infrastructure wave.',
      'Semiconductor sector leading the market.',
      'Broadcom custom AI chips gaining market share.',
    ],
    down: [
      'Chip stocks cooling after huge gains.',
      'AVGO profit-taking - still fundamentally strong.',
      'Semiconductor cycle concerns - temporary.',
      'Tech rotation hitting chip stocks.',
    ],
  },
};

const FUN_FACTS = [
  '💡 NWG combines 5 of the hottest assets of 2025 in one token!',
  '🏆 The NWG formula was designed for maximum diversification.',
  '🌍 Silver is used in every smartphone, EV, and solar panel.',
  '🏦 Central banks bought more gold in 2025 than any year since 1967.',
  '🤖 Palantir\'s AI platform is used by 50+ government agencies.',
  '💾 Broadcom chips power the AI revolution behind the scenes.',
  '₿ Bitcoin is now a $2 trillion asset class - bigger than most countries\' GDP.',
  '🪙 NWG has a fixed supply of 1 billion - deflationary by design.',
  '📈 The NWG portfolio returned 85%+ in 2025 backtesting.',
  '🎯 $1 = 100 NWG - simple, transparent, no-brainer.',
];

export interface ChatResponse {
  message: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  emoji: string;
  funFact?: string;
}

export function chatWithAnalyst(question: string, marketData: any, fearGreed: FearGreedData): ChatResponse {
  const questionLower = question.toLowerCase();
  const assets = marketData.assets;
  const nwg = marketData.nwg;
  
  // Determine overall sentiment
  const avgChange = nwg.change24h;
  const sentiment = avgChange > 1 ? 'bullish' : avgChange < -1 ? 'bearish' : 'neutral';
  const emoji = sentiment === 'bullish' ? '🚀🔥' : sentiment === 'bearish' ? '🐻📉' : '😐📊';
  
  let message = '';
  
  // Pattern matching for common questions
  if (questionLower.includes('why') && (questionLower.includes('up') || questionLower.includes('down') || questionLower.includes('move'))) {
    // Find top mover
    let topMover = { asset: 'BTC', change: 0 };
    for (const [asset, data] of Object.entries(assets) as [string, any][]) {
      if (Math.abs(data.change) > Math.abs(topMover.change)) {
        topMover = { asset: asset.toUpperCase(), change: data.change };
      }
    }
    
    const assetKey = topMover.asset.toLowerCase() as keyof typeof MARKET_INSIGHTS;
    const insights = MARKET_INSIGHTS[assetKey] || MARKET_INSIGHTS.btc;
    const insight = topMover.change > 0 
      ? insights.up[Math.floor(Math.random() * insights.up.length)]
      : insights.down[Math.floor(Math.random() * insights.down.length)];
    
    message = `Great question! NWG is ${avgChange > 0 ? 'up' : 'down'} ${Math.abs(avgChange).toFixed(2)}% today.\n\n` +
      `📈 Top performer: ${topMover.asset} (${topMover.change > 0 ? '+' : ''}${topMover.change.toFixed(2)}%)\n` +
      `${insight}`;
  }
  else if (questionLower.includes('buy') || questionLower.includes('sell') || questionLower.includes('should i')) {
    const analysis = generateMarketAnalysis(marketData, fearGreed);
    message = `I can't give financial advice, but here's the data:\n\n` +
      `📊 NWG Price: $${nwg.price.toFixed(6)}\n` +
      `📈 24h Change: ${nwg.change24h > 0 ? '+' : ''}${nwg.change24h.toFixed(2)}%\n` +
      `😱 Fear & Greed: ${fearGreed.value}/100 (${fearGreed.label})\n\n` +
      `💡 ${analysis.recommendation}\n\n` +
      `Remember: DYOR and never invest more than you can afford to lose! 🎯`;
  }
  else if (questionLower.includes('price') || questionLower.includes('worth') || questionLower.includes('value')) {
    message = `📊 Current NWG Portfolio:\n\n` +
      `💰 NWG Price: $${nwg.price.toFixed(6)}\n` +
      `📈 24h Change: ${nwg.change24h > 0 ? '+' : ''}${nwg.change24h.toFixed(2)}%\n` +
      `🏦 Market Cap: $${(nwg.marketCap / 1000000).toFixed(2)}M\n\n` +
      `Asset Breakdown:\n` +
      Object.entries(assets).map(([name, info]: [string, any]) => 
        `• ${name.toUpperCase()}: $${info.price.toLocaleString()} (${info.change > 0 ? '+' : ''}${info.change.toFixed(2)}%)`
      ).join('\n');
  }
  else if (questionLower.includes('btc') || questionLower.includes('bitcoin')) {
    const btc = assets.btc;
    const insights = btc.change > 0 ? MARKET_INSIGHTS.btc.up : MARKET_INSIGHTS.btc.down;
    message = `₿ Bitcoin Analysis:\n\n` +
      `Price: $${btc.price.toLocaleString()}\n` +
      `24h Change: ${btc.change > 0 ? '+' : ''}${btc.change.toFixed(2)}%\n` +
      `24h Range: $${btc.low24h.toLocaleString()} - $${btc.high24h.toLocaleString()}\n\n` +
      `${insights[Math.floor(Math.random() * insights.length)]}\n\n` +
      `BTC makes up 20% of NWG - the digital gold component! 🪙`;
  }
  else if (questionLower.includes('gold') || questionLower.includes('silver') || questionLower.includes('metal')) {
    const gold = assets.gold;
    const silver = assets.silver;
    message = `🥇 Precious Metals Analysis:\n\n` +
      `Gold: $${gold.price.toLocaleString()}/oz (${gold.change > 0 ? '+' : ''}${gold.change.toFixed(2)}%)\n` +
      `Silver: $${silver.price.toFixed(2)}/oz (${silver.change > 0 ? '+' : ''}${silver.change.toFixed(2)}%)\n\n` +
      `Gold/Silver Ratio: ${(gold.price / silver.price).toFixed(1)}:1\n\n` +
      `Combined weight in NWG: 45% (25% Silver + 20% Gold)\n` +
      `These are your inflation hedges and safe-haven assets! 🛡️`;
  }
  else if (questionLower.includes('pltr') || questionLower.includes('palantir') || questionLower.includes('avgo') || questionLower.includes('broadcom') || questionLower.includes('tech') || questionLower.includes('ai')) {
    const pltr = assets.pltr;
    const avgo = assets.avgo;
    message = `🤖 AI/Tech Holdings:\n\n` +
      `Palantir (PLTR): $${pltr.price.toFixed(2)} (${pltr.change > 0 ? '+' : ''}${pltr.change.toFixed(2)}%)\n` +
      `Broadcom (AVGO): $${avgo.price.toFixed(2)} (${avgo.change > 0 ? '+' : ''}${avgo.change.toFixed(2)}%)\n\n` +
      `Combined weight in NWG: 35%\n\n` +
      `These are your AI revolution plays! 🚀\n` +
      `PLTR = AI software | AVGO = AI hardware`;
  }
  else if (questionLower.includes('predict') || questionLower.includes('future') || questionLower.includes('moon') || questionLower.includes('when')) {
    message = `🔮 Prediction time? Let's be real:\n\n` +
      `Nobody can predict the future with certainty!\n\n` +
      `But here's what we know:\n` +
      `• NWG is backed by 5 explosive growth assets\n` +
      `• Silver & Gold: Inflation hedges ✓\n` +
      `• BTC: Digital gold ✓\n` +
      `• PLTR & AVGO: AI revolution ✓\n\n` +
      `Want to test your prediction skills? Try our Price Prediction Game! 🎰`;
  }
  else if (questionLower.includes('fear') || questionLower.includes('greed') || questionLower.includes('sentiment')) {
    message = `😱 Fear & Greed Index: ${fearGreed.value}/100\n\n` +
      `Current Sentiment: ${fearGreed.label} ${fearGreed.value < 40 ? '😰' : fearGreed.value > 60 ? '🤑' : '😐'}\n\n` +
      `Factors:\n` +
      `• Momentum: ${fearGreed.factors.momentum}/100\n` +
      `• Volatility: ${fearGreed.factors.volatility}/100\n` +
      `• Volume: ${fearGreed.factors.volume}/100\n` +
      `• Social: ${fearGreed.factors.socialSentiment}/100\n\n` +
      `${fearGreed.value < 30 ? '💡 Low fear = potential buying opportunity!' : fearGreed.value > 70 ? '⚠️ High greed = be cautious!' : '📊 Balanced market conditions.'}`;
  }
  else if (questionLower.includes('hello') || questionLower.includes('hi') || questionLower.includes('hey')) {
    message = `Hey there! 👋 I'm your NWG AI Analyst!\n\n` +
      `I can help you understand:\n` +
      `• Why prices are moving 📈📉\n` +
      `• Individual asset analysis (BTC, Gold, PLTR...)\n` +
      `• Fear & Greed sentiment 😱🤑\n` +
      `• Current NWG portfolio value 💰\n\n` +
      `Just ask me anything about the markets!`;
  }
  else {
    // Default response with overview
    const analysis = generateMarketAnalysis(marketData, fearGreed);
    message = `${emoji} Here's your market briefing:\n\n` +
      `${analysis.summary}\n\n` +
      `💡 ${analysis.recommendation}\n\n` +
      `Ask me about specific assets (BTC, Gold, PLTR) or "Why is NWG up/down?" 💬`;
  }
  
  // Add fun fact sometimes
  const funFact = Math.random() > 0.7 
    ? FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]
    : undefined;
  
  return {
    message,
    sentiment,
    emoji,
    funFact
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Predictions
  createPrediction,
  resolvePredictions,
  
  // Leaderboard
  getLeaderboard,
  updateLeaderboard,
  
  // Achievements & Quests
  ACHIEVEMENTS,
  generateDailyQuests,
  generateWeeklyQuests,
  
  // Analysis
  calculateFearGreed,
  generateMarketAnalysis,
  generateWhaleAlerts,
  chatWithAnalyst,
  
  // Cards
  generatePortfolioCard,
  
  // Constants
  GAME_CACHE_KEYS,
  MARKET_INSIGHTS,
  FUN_FACTS
};
