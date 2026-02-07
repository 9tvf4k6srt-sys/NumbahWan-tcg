import type { Prediction, Achievement, UserAchievement, Quest, LeaderboardEntry, WhaleAlert, FearGreedData, MarketAnalysis } from './gamification-types';
import { GAME_CACHE_KEYS, ACHIEVEMENTS } from './gamification-types';
export type { Prediction, Achievement, UserAchievement, Quest, LeaderboardEntry, WhaleAlert, FearGreedData, MarketAnalysis };
export { GAME_CACHE_KEYS, ACHIEVEMENTS };

// QUEST GENERATORS

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

// PREDICTION GAME

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

// LEADERBOARD

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

// FEAR & GREED INDEX

export { calculateFearGreed, generateWhaleAlerts, generateMarketAnalysis, generatePortfolioCard, chatWithAnalyst } from './gamification-analytics';
