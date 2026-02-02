-- ============================================
-- NumbahWan Wallet & Economy System
-- Created: 2026-02-02
-- Phase 2: Server-side persistent wallets
-- ============================================

-- Citizens table - Identity verification linked to wallets
CREATE TABLE IF NOT EXISTS citizens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_uuid TEXT NOT NULL UNIQUE,              -- NW-XXXX-XXXX-XXXX-XXXX format
    device_hash TEXT NOT NULL,                      -- Full SHA-256 hash for verification
    trust_score INTEGER DEFAULT 50,                 -- 0-100 trust score
    clearance_level INTEGER DEFAULT 1,              -- 1-5 security clearance
    
    -- Identity metadata
    display_name TEXT,                              -- Optional display name
    avatar TEXT,                                    -- Avatar URL
    member_id INTEGER,                              -- FK to members table (if linked to guild member)
    
    -- Device tracking
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    visit_count INTEGER DEFAULT 1,
    
    -- Security flags
    is_verified INTEGER DEFAULT 0,                  -- Manual verification flag
    is_banned INTEGER DEFAULT 0,                    -- Banned status
    spoof_flags TEXT,                               -- JSON array of detected spoof flags
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Wallets table - Main wallet storage
CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id INTEGER NOT NULL UNIQUE,             -- One wallet per citizen
    wallet_address TEXT NOT NULL UNIQUE,            -- NW-W-XXXX-XXXX format
    
    -- Currency balances (NWG = Gold, limited supply; NWX = Gems, utility)
    balance_nwg REAL DEFAULT 100.00,                -- NumbahWan Gold (scarce, 100 signup bonus)
    balance_nwx INTEGER DEFAULT 500,                -- NumbahWan Gems (utility, 500 signup bonus)
    
    -- Legacy currency support (from existing system)
    balance_diamond INTEGER DEFAULT 50,
    balance_gold INTEGER DEFAULT 25,
    balance_iron INTEGER DEFAULT 10,
    balance_stone INTEGER DEFAULT 5,
    balance_wood INTEGER DEFAULT 0,
    
    -- Stats
    total_earned_nwg REAL DEFAULT 100.00,
    total_earned_nwx INTEGER DEFAULT 500,
    total_spent_nwg REAL DEFAULT 0.00,
    total_spent_nwx INTEGER DEFAULT 0,
    
    -- Security
    daily_nwg_earned REAL DEFAULT 0.00,             -- Daily earning cap tracking
    daily_nwx_earned INTEGER DEFAULT 0,
    last_daily_reset DATETIME,
    withdrawal_cooldown_until DATETIME,             -- 24h cooldown for large transactions
    
    -- Metadata
    checksum TEXT,                                  -- Integrity verification
    last_sync DATETIME,                             -- Last client-server sync
    version INTEGER DEFAULT 1,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (citizen_id) REFERENCES citizens(id)
);

-- Transactions table - Full transaction history (immutable ledger)
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT NOT NULL UNIQUE,                   -- Transaction hash for verification
    
    wallet_id INTEGER NOT NULL,
    citizen_id INTEGER NOT NULL,
    
    -- Transaction details
    tx_type TEXT NOT NULL,                          -- EARN, SPEND, TRANSFER, CONVERT, SIGNUP_BONUS, DAILY_LOGIN, etc.
    currency TEXT NOT NULL,                         -- NWG, NWX, DIAMOND, GOLD, IRON, STONE, WOOD
    amount REAL NOT NULL,
    
    -- Balance tracking
    balance_before REAL NOT NULL,
    balance_after REAL NOT NULL,
    
    -- Context
    description TEXT,                               -- Human-readable description
    source TEXT,                                    -- Source of transaction (GAME, MARKET, TRANSFER, SYSTEM, etc.)
    reference_id TEXT,                              -- External reference (game ID, trade ID, etc.)
    
    -- For transfers
    recipient_wallet_id INTEGER,
    recipient_citizen_id INTEGER,
    
    -- Security
    device_uuid TEXT,                               -- Device that initiated transaction
    ip_address TEXT,                                -- IP address (hashed)
    signed_by TEXT,                                 -- Signature for verification
    
    -- Status
    status TEXT DEFAULT 'COMPLETED',                -- PENDING, COMPLETED, FAILED, REVERSED
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (wallet_id) REFERENCES wallets(id),
    FOREIGN KEY (citizen_id) REFERENCES citizens(id),
    FOREIGN KEY (recipient_wallet_id) REFERENCES wallets(id)
);

-- Treasury table - Track global money supply
CREATE TABLE IF NOT EXISTS treasury (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Total supply (fixed for NWG)
    total_supply_nwg REAL DEFAULT 1000000000.00,    -- 1 billion NWG total
    total_supply_nwx INTEGER DEFAULT 0,             -- Unlimited, tracks issued amount
    
    -- Circulating supply
    circulating_nwg REAL DEFAULT 0.00,
    circulating_nwx INTEGER DEFAULT 0,
    
    -- Reserve (guild treasury)
    reserve_nwg REAL DEFAULT 500000000.00,          -- 50% held in reserve
    reserve_nwx INTEGER DEFAULT 0,
    
    -- Rewards pool
    rewards_pool_nwg REAL DEFAULT 300000000.00,     -- 30% for rewards
    
    -- Burned (permanently removed)
    burned_nwg REAL DEFAULT 0.00,
    burned_nwx INTEGER DEFAULT 0,
    
    -- Stats
    total_citizens INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    total_volume_nwg REAL DEFAULT 0.00,
    total_volume_nwx INTEGER DEFAULT 0,
    
    -- Last update
    snapshot_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily rewards tracking
CREATE TABLE IF NOT EXISTS daily_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id INTEGER NOT NULL,
    reward_date DATE NOT NULL,
    streak_day INTEGER DEFAULT 1,
    reward_nwg REAL DEFAULT 0.00,
    reward_nwx INTEGER DEFAULT 0,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(citizen_id, reward_date),
    FOREIGN KEY (citizen_id) REFERENCES citizens(id)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_citizens_device_uuid ON citizens(device_uuid);
CREATE INDEX IF NOT EXISTS idx_citizens_member_id ON citizens(member_id);
CREATE INDEX IF NOT EXISTS idx_wallets_citizen_id ON wallets(citizen_id);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_citizen ON transactions(citizen_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_citizen ON daily_rewards(citizen_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_date ON daily_rewards(reward_date);

-- Insert initial treasury record
INSERT INTO treasury (id) VALUES (1);
