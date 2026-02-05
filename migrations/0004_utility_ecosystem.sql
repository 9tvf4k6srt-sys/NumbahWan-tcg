-- ============================================================================
-- NumbahWan Utility Ecosystem - Card Staking, Fusion, Merch Claims, Events
-- Version: 1.0.0
-- Created: 2026-02-05
-- ============================================================================

-- ============================================================================
-- CARD INVENTORY - User owned cards
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id INTEGER NOT NULL,
    card_id TEXT NOT NULL,                      -- Card identifier (e.g., "S1-001")
    card_name TEXT NOT NULL,
    card_rarity TEXT NOT NULL,                  -- common, uncommon, rare, epic, legendary, mythic
    card_season INTEGER NOT NULL DEFAULT 1,
    
    -- Card state
    is_staked INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,                -- Locked for trade/fusion
    evolution_level INTEGER DEFAULT 0,          -- 0 = base, 1 = evolved, 2 = prismatic
    
    -- Metadata
    obtained_from TEXT,                         -- pull, fusion, claim, trade, reward
    obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (citizen_id) REFERENCES citizens(id)
);

-- ============================================================================
-- CARD STAKING - Stake cards for passive income
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_stakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id INTEGER NOT NULL,
    user_card_id INTEGER NOT NULL,              -- FK to user_cards
    
    -- Staking details
    staked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    unlock_at DATETIME NOT NULL,                -- Minimum lock period end
    last_claim DATETIME,                        -- Last time rewards were claimed
    
    -- Rewards tracking
    base_rate_gold INTEGER NOT NULL,            -- Gold per day based on rarity
    base_rate_logs INTEGER DEFAULT 0,           -- Logs per week (legendary+)
    bonus_multiplier REAL DEFAULT 1.0,          -- Event bonuses
    
    -- Accumulated rewards (unclaimed)
    pending_gold INTEGER DEFAULT 0,
    pending_logs INTEGER DEFAULT 0,
    
    -- Totals
    total_gold_earned INTEGER DEFAULT 0,
    total_logs_earned INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active',               -- active, unstaking, completed
    
    FOREIGN KEY (citizen_id) REFERENCES citizens(id),
    FOREIGN KEY (user_card_id) REFERENCES user_cards(id)
);

-- ============================================================================
-- CARD FUSIONS - Combine cards for upgrades
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_fusions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id INTEGER NOT NULL,
    
    -- Input cards (JSON array of user_card_ids)
    input_card_ids TEXT NOT NULL,               -- JSON: [1, 2, 3, 4, 5]
    input_rarity TEXT NOT NULL,
    input_count INTEGER NOT NULL,
    
    -- Output card
    output_card_id INTEGER,                     -- FK to user_cards (result)
    output_rarity TEXT NOT NULL,
    output_card_name TEXT,
    
    -- Cost
    gold_cost INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'completed',            -- pending, completed, failed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (citizen_id) REFERENCES citizens(id),
    FOREIGN KEY (output_card_id) REFERENCES user_cards(id)
);

-- ============================================================================
-- MERCH CODES - Physical merchandise redemption codes
-- ============================================================================
CREATE TABLE IF NOT EXISTS merch_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,                  -- 12-char alphanumeric: NWMR-XXXX-XXXX
    
    -- Product info
    tier TEXT NOT NULL,                         -- bronze, silver, gold, platinum
    product_name TEXT NOT NULL,
    product_sku TEXT,
    
    -- Rewards (JSON structure)
    rewards_json TEXT NOT NULL,                 -- {cards: [{rarity, name}], currency: {gold, logs}, badges: [], discount_percent: 5}
    
    -- Claim info
    claimed_by INTEGER,                         -- citizen_id
    claimed_at DATETIME,
    
    -- Metadata
    batch_id TEXT,                              -- For tracking batches of codes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,                        -- Optional expiration
    
    FOREIGN KEY (claimed_by) REFERENCES citizens(id)
);

-- ============================================================================
-- USER PERKS - Permanent unlocks from merch, achievements, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_perks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id INTEGER NOT NULL,
    
    perk_type TEXT NOT NULL,                    -- discount_tier, badge, title, profile_border, card_back, etc.
    perk_value TEXT NOT NULL,                   -- Depends on type (e.g., "0.05" for 5% discount)
    perk_display TEXT,                          -- Display name/description
    
    -- Source tracking
    source_type TEXT NOT NULL,                  -- merch_claim, achievement, event, purchase, etc.
    source_id TEXT,                             -- merch code, achievement ID, event ID
    
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,                        -- NULL = permanent
    
    FOREIGN KEY (citizen_id) REFERENCES citizens(id)
);

-- ============================================================================
-- CONTENT CALENDAR - Scheduled events and bonuses
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Event identity
    event_code TEXT UNIQUE NOT NULL,            -- machine readable: "market_monday_001"
    event_name TEXT NOT NULL,                   -- "Market Monday"
    event_type TEXT NOT NULL,                   -- daily_bonus, weekly_event, limited_time, season_launch
    
    -- Scheduling (supports recurring)
    schedule_type TEXT NOT NULL,                -- once, daily, weekly, monthly
    schedule_day INTEGER,                       -- 0-6 for weekly (Monday=0), 1-31 for monthly
    start_time TIME,                            -- HH:MM format
    end_time TIME,
    start_date DATE,                            -- For one-time or season start
    end_date DATE,                              -- For one-time or season end
    
    -- Bonuses (JSON)
    bonuses_json TEXT,                          -- {gold_multiplier: 1.5, log_multiplier: 2.0, pity_bonus: 0.1, rate_boost: {mythic: 0.0002}}
    
    -- Content
    description TEXT,
    banner_image TEXT,
    
    -- Status
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,                 -- Higher = shown first
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- EVENT PARTICIPATION - Track who participated in events
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_participation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    citizen_id INTEGER NOT NULL,
    
    participated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    rewards_claimed TEXT,                       -- JSON of rewards received
    
    UNIQUE(event_id, citizen_id),
    FOREIGN KEY (event_id) REFERENCES content_events(id),
    FOREIGN KEY (citizen_id) REFERENCES citizens(id)
);

-- ============================================================================
-- SET COMPLETION TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS set_completion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id INTEGER NOT NULL,
    season INTEGER NOT NULL,
    
    total_cards INTEGER NOT NULL,               -- Total cards in season
    owned_unique INTEGER DEFAULT 0,             -- Unique cards owned
    completion_percent REAL DEFAULT 0,
    
    -- Rewards claimed for milestones
    milestone_10_claimed INTEGER DEFAULT 0,
    milestone_25_claimed INTEGER DEFAULT 0,
    milestone_50_claimed INTEGER DEFAULT 0,
    milestone_100_claimed INTEGER DEFAULT 0,
    
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(citizen_id, season),
    FOREIGN KEY (citizen_id) REFERENCES citizens(id)
);

-- ============================================================================
-- STAKING RATES CONFIG (for easy adjustment)
-- ============================================================================
CREATE TABLE IF NOT EXISTS staking_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rarity TEXT UNIQUE NOT NULL,
    gold_per_day INTEGER NOT NULL,
    logs_per_week INTEGER DEFAULT 0,
    min_lock_days INTEGER DEFAULT 7,
    early_unstake_penalty REAL DEFAULT 0.1,     -- 10% penalty
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default staking rates
INSERT OR REPLACE INTO staking_rates (rarity, gold_per_day, logs_per_week, min_lock_days) VALUES
    ('common', 1, 0, 7),
    ('uncommon', 2, 0, 7),
    ('rare', 5, 0, 7),
    ('epic', 15, 0, 7),
    ('legendary', 50, 1, 7),
    ('mythic', 200, 5, 7);

-- ============================================================================
-- FUSION RECIPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS fusion_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    input_rarity TEXT NOT NULL,
    input_count INTEGER NOT NULL,
    output_rarity TEXT NOT NULL,
    gold_cost INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 1.0,              -- 1.0 = 100% success
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default fusion recipes
INSERT OR REPLACE INTO fusion_recipes (input_rarity, input_count, output_rarity, gold_cost) VALUES
    ('common', 5, 'uncommon', 50),
    ('uncommon', 5, 'rare', 200),
    ('rare', 3, 'epic', 500),
    ('epic', 3, 'legendary', 2000),
    ('legendary', 2, 'mythic', 10000);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_cards_citizen ON user_cards(citizen_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_rarity ON user_cards(card_rarity);
CREATE INDEX IF NOT EXISTS idx_user_cards_staked ON user_cards(is_staked);

CREATE INDEX IF NOT EXISTS idx_stakes_citizen ON card_stakes(citizen_id);
CREATE INDEX IF NOT EXISTS idx_stakes_status ON card_stakes(status);
CREATE INDEX IF NOT EXISTS idx_stakes_unlock ON card_stakes(unlock_at);

CREATE INDEX IF NOT EXISTS idx_fusions_citizen ON card_fusions(citizen_id);

CREATE INDEX IF NOT EXISTS idx_merch_code ON merch_codes(code);
CREATE INDEX IF NOT EXISTS idx_merch_claimed ON merch_codes(claimed_by);
CREATE INDEX IF NOT EXISTS idx_merch_tier ON merch_codes(tier);

CREATE INDEX IF NOT EXISTS idx_perks_citizen ON user_perks(citizen_id);
CREATE INDEX IF NOT EXISTS idx_perks_type ON user_perks(perk_type);

CREATE INDEX IF NOT EXISTS idx_events_type ON content_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_active ON content_events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_schedule ON content_events(schedule_type, schedule_day);

CREATE INDEX IF NOT EXISTS idx_participation_event ON event_participation(event_id);
CREATE INDEX IF NOT EXISTS idx_participation_citizen ON event_participation(citizen_id);

CREATE INDEX IF NOT EXISTS idx_set_completion_citizen ON set_completion(citizen_id);

-- ============================================================================
-- INSERT DEFAULT CONTENT CALENDAR EVENTS
-- ============================================================================
INSERT OR IGNORE INTO content_events (event_code, event_name, event_type, schedule_type, schedule_day, bonuses_json, description) VALUES
    ('market_monday', 'Market Monday', 'weekly_event', 'weekly', 0, 
     '{"trade_bonus": 0.1, "market_discount": 0.05}', 
     'Trading bonuses and market discounts every Monday'),
    
    ('training_tuesday', 'Training Tuesday', 'weekly_event', 'weekly', 1,
     '{"xp_multiplier": 1.5}',
     'Bonus XP from battles and challenges'),
    
    ('war_wednesday', 'War Wednesday', 'weekly_event', 'weekly', 2,
     '{"battle_rewards": 1.5, "tournament_entry": true}',
     'Battle tournaments with prize pools'),
    
    ('throwback_thursday', 'Throwback Thursday', 'weekly_event', 'weekly', 3,
     '{"legacy_cards_available": true}',
     'Limited-time access to previous season cards'),
    
    ('forge_friday', 'Forge Friday', 'weekly_event', 'weekly', 4,
     '{"pity_bonus": 0.5, "mythic_rate_boost": 2.0}',
     'Double pity progress and boosted mythic rates'),
    
    ('social_saturday', 'Social Saturday', 'weekly_event', 'weekly', 5,
     '{"coop_rewards": 2.0, "guild_bonus": 1.5}',
     'Community events and guild competitions'),
    
    ('stake_sunday', 'Stake Sunday', 'weekly_event', 'weekly', 6,
     '{"staking_multiplier": 2.0}',
     'Double staking rewards all day');
