// Real player vs player battles with queue-based matchmaking

import { Hono } from 'hono';

const pvp = new Hono();

// IN-MEMORY STORAGE (For demo - production should use D1/KV)

interface QueueEntry {
  odenom: string;           // Player wallet ID
  odename: string;          // Player display name
  cards: CardSelection[];   // Selected cards
  betAmount: number;        // NWG bet amount
  luck: number;             // Calculated luck
  joinedAt: number;         // Timestamp
  status: 'waiting' | 'matched' | 'battling' | 'completed';
  matchId?: string;         // Assigned when matched
}

interface CardSelection {
  id: number;
  name: string;
  rarity: string;
}

interface Match {
  id: string;
  player1: QueueEntry;
  player2: QueueEntry;
  status: 'pending' | 'countdown' | 'battling' | 'resolved';
  betPool: number;          // Total NWG in pot
  createdAt: number;
  resolvedAt?: number;
  winner?: string;          // Winner's odenom
  result?: BattleResult;
}

interface BattleResult {
  player1Roll: number;
  player2Roll: number;
  player1Luck: number;
  player2Luck: number;
  winnerOdenom: string;
  winnerName: string;
  loserOdenom: string;
  loserName: string;
  payout: number;
  houseFee: number;
}

// In-memory stores
const matchQueue: Map<string, QueueEntry> = new Map();
const activeMatches: Map<string, Match> = new Map();
const playerMatches: Map<string, string> = new Map(); // odenom -> matchId
const CONFIG = {
  // Match players within this bet range (±50%)
  BET_TOLERANCE: 0.5,
  
  // Maximum time in queue before timeout (2 minutes)
  QUEUE_TIMEOUT_MS: 120000,
  
  // Countdown before battle starts (5 seconds)
  COUNTDOWN_SECONDS: 5,
  
  // House fee percentage (5% goes to NWG treasury)
  HOUSE_FEE_PERCENT: 0.05,
  
  // Minimum bet
  MIN_BET: 50,
  
  // Maximum bet
  MAX_BET: 100000,
};
function calculateLuck(cards: CardSelection[]): number {
  let luck = 50; // Base luck
  
  const rarityLuck: Record<string, number> = {
    common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 8, mythic: 15
  };
  
  let cardBonus = 0;
  cards.forEach(card => {
    cardBonus += rarityLuck[card.rarity] || 1;
  });
  
  luck += Math.min(cardBonus, 25);
  
  return Math.min(luck, 85);
}
function findMatch(entry: QueueEntry): QueueEntry | null {
  const minBet = entry.betAmount * (1 - CONFIG.BET_TOLERANCE);
  const maxBet = entry.betAmount * (1 + CONFIG.BET_TOLERANCE);
  
  for (const [odenom, candidate] of matchQueue) {
    // Skip self
    if (odenom === entry.odenom) continue;
    
    // Skip if not waiting
    if (candidate.status !== 'waiting') continue;
    
    // Check bet range
    if (candidate.betAmount >= minBet && candidate.betAmount <= maxBet) {
      return candidate;
    }
  }
  
  return null;
}

function createMatch(player1: QueueEntry, player2: QueueEntry): Match {
  const matchId = `PVP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  // Use the lower bet amount (fair for both)
  const betAmount = Math.min(player1.betAmount, player2.betAmount);
  const betPool = betAmount * 2;
  
  const match: Match = {
    id: matchId,
    player1: { ...player1, betAmount, status: 'matched', matchId },
    player2: { ...player2, betAmount, status: 'matched', matchId },
    status: 'countdown',
    betPool,
    createdAt: Date.now(),
  };
  
  // Update queue entries
  player1.status = 'matched';
  player1.matchId = matchId;
  player2.status = 'matched';
  player2.matchId = matchId;
  
  // Store match
  activeMatches.set(matchId, match);
  playerMatches.set(player1.odenom, matchId);
  playerMatches.set(player2.odenom, matchId);
  
  // NOTE: No setTimeout in Cloudflare Workers
  // Battle will be resolved when client polls for status after countdown
  // Mark when battle should auto-resolve
  (match as any).resolveAfter = Date.now() + (CONFIG.COUNTDOWN_SECONDS * 1000);
  
  return match;
}

function resolveBattle(matchId: string): void {
  const match = activeMatches.get(matchId);
  if (!match || match.status === 'resolved') return;
  
  match.status = 'battling';
  
  // Calculate battle (luck-based)
  const p1Luck = match.player1.luck;
  const p2Luck = match.player2.luck;
  
  // Roll for each player (higher luck = better roll range)
  const p1Roll = Math.random() * p1Luck;
  const p2Roll = Math.random() * p2Luck;
  
  // Add some randomness (±10%)
  const p1Final = p1Roll * (0.9 + Math.random() * 0.2);
  const p2Final = p2Roll * (0.9 + Math.random() * 0.2);
  
  const player1Wins = p1Final > p2Final;
  
  // Calculate payout
  const houseFee = Math.floor(match.betPool * CONFIG.HOUSE_FEE_PERCENT);
  const payout = match.betPool - houseFee;
  
  const winner = player1Wins ? match.player1 : match.player2;
  const loser = player1Wins ? match.player2 : match.player1;
  
  match.result = {
    player1Roll: Math.round(p1Final * 100) / 100,
    player2Roll: Math.round(p2Final * 100) / 100,
    player1Luck: p1Luck,
    player2Luck: p2Luck,
    winnerOdenom: winner.odenom,
    winnerName: winner.odename,
    loserOdenom: loser.odenom,
    loserName: loser.odename,
    payout,
    houseFee,
  };
  
  match.winner = winner.odenom;
  match.status = 'resolved';
  match.resolvedAt = Date.now();
  
  // Clean up queue
  matchQueue.delete(match.player1.odenom);
  matchQueue.delete(match.player2.odenom);
  
  console.log(`[PVP] Match ${matchId} resolved: ${winner.odename} wins ${payout} NWG!`);
}

function cleanupStaleEntries(): void {
  const now = Date.now();
  
  for (const [odenom, entry] of matchQueue) {
    if (entry.status === 'waiting' && now - entry.joinedAt > CONFIG.QUEUE_TIMEOUT_MS) {
      matchQueue.delete(odenom);
      console.log(`[PVP] Removed stale queue entry: ${odenom}`);
    }
  }
}

// NOTE: No setInterval in Cloudflare Workers global scope
// Cleanup will be triggered on each request instead

// API ENDPOINTS

// GET /api/pvp/info - System info
pvp.get('/info', (c) => {
  return c.json({
    system: 'NWG PvP Matchmaking',
    version: '1.0.0',
    config: {
      minBet: CONFIG.MIN_BET,
      maxBet: CONFIG.MAX_BET,
      houseFee: `${CONFIG.HOUSE_FEE_PERCENT * 100}%`,
      queueTimeout: `${CONFIG.QUEUE_TIMEOUT_MS / 1000}s`,
      countdownSeconds: CONFIG.COUNTDOWN_SECONDS,
    },
    stats: {
      playersInQueue: [...matchQueue.values()].filter(e => e.status === 'waiting').length,
      activeMatches: [...activeMatches.values()].filter(m => m.status !== 'resolved').length,
      totalMatches: activeMatches.size,
    }
  });
});

// GET /api/pvp/queue - Get queue status
pvp.get('/queue', (c) => {
  const waiting = [...matchQueue.values()]
    .filter(e => e.status === 'waiting')
    .map(e => ({
      odename: e.odename,
      betAmount: e.betAmount,
      cardCount: e.cards.length,
      luck: e.luck,
      waitingSeconds: Math.floor((Date.now() - e.joinedAt) / 1000),
    }));
  
  return c.json({
    count: waiting.length,
    players: waiting,
  });
});

// POST /api/pvp/join - Join matchmaking queue
pvp.post('/join', async (c) => {
  try {
    const body = await c.req.json();
    const { odenom, odename, cards, betAmount } = body;
    
    // Validation
    if (!odenom || !odename) {
      return c.json({ success: false, error: 'Missing odenom or odename' }, 400);
    }
    
    if (!cards || !Array.isArray(cards) || cards.length < 3) {
      return c.json({ success: false, error: 'Select at least 3 cards' }, 400);
    }
    
    if (!betAmount || betAmount < CONFIG.MIN_BET) {
      return c.json({ success: false, error: `Minimum bet is ${CONFIG.MIN_BET} NWG` }, 400);
    }
    
    if (betAmount > CONFIG.MAX_BET) {
      return c.json({ success: false, error: `Maximum bet is ${CONFIG.MAX_BET} NWG` }, 400);
    }
    
    // Check if already in queue or match
    if (matchQueue.has(odenom)) {
      const existing = matchQueue.get(odenom)!;
      if (existing.status === 'matched' && existing.matchId) {
        return c.json({ 
          success: true, 
          status: 'already_matched',
          matchId: existing.matchId,
        });
      }
      return c.json({ 
        success: true, 
        status: 'already_in_queue',
        position: getQueuePosition(odenom),
      });
    }
    
    // Calculate luck
    const luck = calculateLuck(cards);
    
    // Create queue entry
    const entry: QueueEntry = {
      odenom,
      odename,
      cards,
      betAmount,
      luck,
      joinedAt: Date.now(),
      status: 'waiting',
    };
    
    // Add to queue
    matchQueue.set(odenom, entry);
    
    // Try to find a match immediately
    const opponent = findMatch(entry);
    
    if (opponent) {
      // Match found!
      const match = createMatch(entry, opponent);
      
      return c.json({
        success: true,
        status: 'matched',
        matchId: match.id,
        opponent: {
          odename: opponent.odename,
          cardCount: opponent.cards.length,
          luck: opponent.luck,
        },
        betAmount: match.player1.betAmount,
        betPool: match.betPool,
        countdownSeconds: CONFIG.COUNTDOWN_SECONDS,
      });
    }
    
    // No match yet, waiting in queue
    return c.json({
      success: true,
      status: 'waiting',
      position: getQueuePosition(odenom),
      message: 'Searching for opponent...',
    });
    
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/pvp/status/:odenom - Check player's status
pvp.get('/status/:odenom', (c) => {
  const odenom = c.req.param('odenom');
  
  // Run cleanup on each request (since no setInterval in Workers)
  cleanupStaleEntries();
  
  // Check if in queue
  const queueEntry = matchQueue.get(odenom);
  
  if (!queueEntry) {
    // Check if has a match
    const matchId = playerMatches.get(odenom);
    if (matchId) {
      const match = activeMatches.get(matchId);
      if (match) {
        // Auto-resolve if countdown passed (since no setTimeout in Workers)
        if (match.status === 'countdown' && (match as any).resolveAfter && Date.now() >= (match as any).resolveAfter) {
          resolveBattle(matchId);
        }
        
        return c.json({
          status: match.status,
          matchId,
          match: formatMatchForPlayer(match, odenom),
        });
      }
    }
    
    return c.json({ status: 'not_in_queue' });
  }
  
  if (queueEntry.status === 'matched' && queueEntry.matchId) {
    const match = activeMatches.get(queueEntry.matchId);
    if (match) {
      // Auto-resolve if countdown passed
      if (match.status === 'countdown' && (match as any).resolveAfter && Date.now() >= (match as any).resolveAfter) {
        resolveBattle(queueEntry.matchId);
      }
      
      return c.json({
        status: match.status,
        matchId: queueEntry.matchId,
        match: formatMatchForPlayer(match, odenom),
      });
    }
  }
  
  return c.json({
    status: 'waiting',
    position: getQueuePosition(odenom),
    waitingSeconds: Math.floor((Date.now() - queueEntry.joinedAt) / 1000),
    betAmount: queueEntry.betAmount,
    luck: queueEntry.luck,
  });
});

// GET /api/pvp/match/:matchId - Get match details
pvp.get('/match/:matchId', (c) => {
  const matchId = c.req.param('matchId');
  const match = activeMatches.get(matchId);
  
  if (!match) {
    return c.json({ error: 'Match not found' }, 404);
  }
  
  return c.json({
    id: match.id,
    status: match.status,
    betPool: match.betPool,
    player1: {
      odename: match.player1.odename,
      cardCount: match.player1.cards.length,
      luck: match.player1.luck,
    },
    player2: {
      odename: match.player2.odename,
      cardCount: match.player2.cards.length,
      luck: match.player2.luck,
    },
    createdAt: match.createdAt,
    resolvedAt: match.resolvedAt,
    result: match.result,
  });
});

// POST /api/pvp/leave - Leave queue
pvp.post('/leave', async (c) => {
  try {
    const { odenom } = await c.req.json();
    
    const entry = matchQueue.get(odenom);
    if (!entry) {
      return c.json({ success: false, error: 'Not in queue' });
    }
    
    if (entry.status === 'matched') {
      return c.json({ success: false, error: 'Cannot leave after being matched' });
    }
    
    matchQueue.delete(odenom);
    
    return c.json({ success: true, message: 'Left queue' });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// HELPER FUNCTIONS

function getQueuePosition(odenom: string): number {
  const waiting = [...matchQueue.entries()]
    .filter(([_, e]) => e.status === 'waiting')
    .sort((a, b) => a[1].joinedAt - b[1].joinedAt);
  
  const idx = waiting.findIndex(([o]) => o === odenom);
  return idx + 1;
}

function formatMatchForPlayer(match: Match, odenom: string) {
  const isPlayer1 = match.player1.odenom === odenom;
  const you = isPlayer1 ? match.player1 : match.player2;
  const opponent = isPlayer1 ? match.player2 : match.player1;
  
  const formatted: any = {
    id: match.id,
    status: match.status,
    betPool: match.betPool,
    you: {
      odename: you.odename,
      cards: you.cards,
      luck: you.luck,
      betAmount: you.betAmount,
    },
    opponent: {
      odename: opponent.odename,
      cardCount: opponent.cards.length,
      luck: opponent.luck,
    },
    createdAt: match.createdAt,
  };
  
  if (match.status === 'resolved' && match.result) {
    const youWon = match.result.winnerOdenom === odenom;
    formatted.result = {
      youWon,
      yourRoll: isPlayer1 ? match.result.player1Roll : match.result.player2Roll,
      opponentRoll: isPlayer1 ? match.result.player2Roll : match.result.player1Roll,
      payout: youWon ? match.result.payout : 0,
      lost: youWon ? 0 : you.betAmount,
    };
  }
  
  return formatted;
}

export default pvp;
export { matchQueue, activeMatches, CONFIG };
