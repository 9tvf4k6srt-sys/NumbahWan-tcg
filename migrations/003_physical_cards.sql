-- Physical Card Claim System for NumbahWan TCG
-- Migration: 003_physical_cards.sql
-- Date: 2026-02-05

-- =====================================================
-- Table: physical_claim_codes
-- Stores unique QR codes printed on physical cards
-- =====================================================
CREATE TABLE IF NOT EXISTS physical_claim_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Unique claim code (printed as QR)
    code TEXT UNIQUE NOT NULL,
    
    -- Card reference
    set_id TEXT NOT NULL DEFAULT 'origins-v1',
    set_number TEXT NOT NULL,  -- e.g., "OG-001"
    card_id INTEGER NOT NULL,
    rarity TEXT NOT NULL,
    
    -- Print info
    print_number INTEGER NOT NULL,  -- Which print (1 of 250 for mythics)
    total_print INTEGER NOT NULL,   -- Total prints of this card
    is_first_edition BOOLEAN DEFAULT TRUE,
    is_holographic BOOLEAN DEFAULT FALSE,
    
    -- Claim status
    claimed_by TEXT,              -- Device UUID or user ID
    claimed_at DATETIME,
    claim_ip TEXT,
    
    -- Rewards granted
    nwg_granted INTEGER DEFAULT 0,
    bonus_multiplier REAL DEFAULT 1.0,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,  -- Optional expiration
    
    -- Anti-fraud
    claim_attempts INTEGER DEFAULT 0,
    last_attempt_at DATETIME,
    is_blocked BOOLEAN DEFAULT FALSE
);

-- Index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_claim_codes_code ON physical_claim_codes(code);
CREATE INDEX IF NOT EXISTS idx_claim_codes_claimed_by ON physical_claim_codes(claimed_by);
CREATE INDEX IF NOT EXISTS idx_claim_codes_set_number ON physical_claim_codes(set_number);

-- =====================================================
-- Table: physical_card_ownership
-- Tracks who owns which physical cards (after claim)
-- =====================================================
CREATE TABLE IF NOT EXISTS physical_card_ownership (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Owner info
    owner_id TEXT NOT NULL,  -- Device UUID or user ID
    
    -- Card info
    claim_code_id INTEGER NOT NULL,
    set_id TEXT NOT NULL,
    set_number TEXT NOT NULL,
    card_id INTEGER NOT NULL,
    rarity TEXT NOT NULL,
    print_number INTEGER NOT NULL,
    is_first_edition BOOLEAN DEFAULT TRUE,
    is_holographic BOOLEAN DEFAULT FALSE,
    
    -- Staking info
    is_staked BOOLEAN DEFAULT FALSE,
    staked_at DATETIME,
    last_yield_claim DATETIME,
    total_yield_earned REAL DEFAULT 0,
    
    -- Metadata
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (claim_code_id) REFERENCES physical_claim_codes(id)
);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_ownership_owner ON physical_card_ownership(owner_id);
CREATE INDEX IF NOT EXISTS idx_ownership_staked ON physical_card_ownership(is_staked);

-- =====================================================
-- Table: claim_transactions
-- Audit log of all claim attempts
-- =====================================================
CREATE TABLE IF NOT EXISTS claim_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    code TEXT NOT NULL,
    device_uuid TEXT,
    ip_address TEXT,
    user_agent TEXT,
    
    -- Result
    success BOOLEAN NOT NULL,
    error_code TEXT,
    error_message TEXT,
    
    -- Rewards if successful
    nwg_granted INTEGER DEFAULT 0,
    card_granted TEXT,  -- JSON of card info
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_code ON claim_transactions(code);
CREATE INDEX IF NOT EXISTS idx_transactions_device ON claim_transactions(device_uuid);

-- =====================================================
-- View: claim_stats
-- Quick stats for admin dashboard
-- =====================================================
CREATE VIEW IF NOT EXISTS claim_stats AS
SELECT 
    set_id,
    rarity,
    COUNT(*) as total_codes,
    SUM(CASE WHEN claimed_by IS NOT NULL THEN 1 ELSE 0 END) as claimed_count,
    SUM(CASE WHEN claimed_by IS NULL THEN 1 ELSE 0 END) as unclaimed_count,
    ROUND(100.0 * SUM(CASE WHEN claimed_by IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as claim_rate
FROM physical_claim_codes
GROUP BY set_id, rarity;
