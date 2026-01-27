-- ============================================
-- NumbahWan Guild Database Schema
-- Created: 2026-01-27
-- ============================================

-- Members table - Guild roster
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    level INTEGER DEFAULT 1,
    cp TEXT DEFAULT '0',
    cp_value INTEGER DEFAULT 0,
    previous_cp INTEGER DEFAULT 0,
    contribution INTEGER DEFAULT 0,
    upgrade INTEGER DEFAULT 0,
    role TEXT DEFAULT 'Guild Member',
    online INTEGER DEFAULT 0,
    days_ago TEXT,
    avatar TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Photos table - Guild gallery
CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_en TEXT NOT NULL,
    title_zh TEXT,
    title_th TEXT,
    description_en TEXT,
    description_zh TEXT,
    description_th TEXT,
    image TEXT NOT NULL,
    uploaded_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Guild stats table - Overall guild info
CREATE TABLE IF NOT EXISTS guild_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stat_key TEXT NOT NULL UNIQUE,
    stat_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CP History table - Track CP changes over time
CREATE TABLE IF NOT EXISTS cp_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_name TEXT NOT NULL,
    cp_value INTEGER NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_members_cp_value ON members(cp_value DESC);
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cp_history_member ON cp_history(member_name);
CREATE INDEX IF NOT EXISTS idx_cp_history_date ON cp_history(recorded_at);
