-- ============================================================================
-- Migration 0005: Guild Confessional Booth
-- "Where TCG sinners seek absolution"
-- ============================================================================

-- Confessions table - anonymous confessions from guild members
CREATE TABLE IF NOT EXISTS confessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  confession_text TEXT NOT NULL,
  sin_category TEXT NOT NULL DEFAULT 'shame',
  -- Categories: greed, addiction, betrayal, stupidity, salt, shame
  priest_response TEXT,
  prayers INTEGER DEFAULT 0,
  sames INTEGER DEFAULT 0,
  reported INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Prayer log - track who prayed (by device ID to prevent spam)
CREATE TABLE IF NOT EXISTS confession_prayers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  confession_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  reaction_type TEXT DEFAULT 'pray', -- pray, same, report
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (confession_id) REFERENCES confessions(id),
  UNIQUE(confession_id, device_id, reaction_type)
);

-- Sinner of the Week tracking
CREATE TABLE IF NOT EXISTS sinner_of_week (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  confession_id INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_prayers INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (confession_id) REFERENCES confessions(id),
  UNIQUE(week_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_confessions_created ON confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_prayers ON confessions(prayers DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_category ON confessions(sin_category);
CREATE INDEX IF NOT EXISTS idx_prayers_confession ON confession_prayers(confession_id);
CREATE INDEX IF NOT EXISTS idx_prayers_device ON confession_prayers(device_id);

-- Insert some seed confessions to get the party started
INSERT INTO confessions (confession_text, sin_category, priest_response, prayers, sames) VALUES
('I spent 500 logs chasing a mythic and got 47 copies of the same common', 'addiction', 'Your dedication to disappointment is noted. Say 5 "May the pulls be ever in your favor" and touch grass for 10 minutes.', 127, 89),
('I told my wife the $200 charge was for "work software"', 'greed', 'Regina forgives you. Your bank account does not. Your penance: F2P for one week.', 256, 142),
('I accidentally fed my only mythic to the forge because I was pulling while half asleep at 3am', 'stupidity', 'The forge thanks you for your generous sacrifice. Your mythic is in a better place now (someone else''s collection).', 89, 34),
('I mass-sold my legendaries for 1 NWG each because I didn''t read the confirmation popup', 'stupidity', 'Reading is fundamental, my child. Your penance: Actually read the Terms of Service. All of it.', 312, 201),
('I set a 4am alarm every day to catch the daily reset', 'addiction', 'The gacha gods appreciate your devotion. Your sleep schedule does not.', 178, 156),
('I have 47 copies of the same card because "what if they buff it"', 'greed', 'Hope is a beautiful thing. So is inventory management. Delete 46 of them.', 145, 88),
('I pretend to understand the meta but I just use whatever looks cool', 'shame', 'Aesthetics > Statistics. You are forgiven, fashion icon.', 234, 198),
('I spent my rent money on the limited banner and told myself I''d win it back somehow', 'addiction', 'This confession has been escalated to actual professional help. Please call a financial advisor.', 67, 23),
('I reported someone for "cheating" when they just had better cards than me', 'salt', 'The salt flows through you. Your penance: Send them a "GG" and mean it.', 156, 112),
('I created 5 alt accounts to trade cards to myself', 'betrayal', 'Multi-accounting is a path to the dark side. Your alts will haunt your dreams.', 201, 89);
