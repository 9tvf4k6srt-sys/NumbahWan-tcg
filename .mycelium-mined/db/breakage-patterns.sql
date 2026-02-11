-- Mycelium Breakage Pattern Database
-- Generated: 2026-02-10T16:09:34.260Z
-- Repo: webapp
-- Schema version: 2.0

PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS repos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_commits INTEGER DEFAULT 0,
  analyzed_commits INTEGER DEFAULT 0,
  first_date TEXT,
  last_date TEXT,
  mined_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL,
  name TEXT NOT NULL,
  frequency INTEGER NOT NULL,
  category TEXT NOT NULL,
  technology TEXT,
  severity TEXT CHECK(severity IN ('low','medium','high','critical')),
  rule TEXT NOT NULL,
  root_cause TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

CREATE TABLE IF NOT EXISTS pattern_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id TEXT NOT NULL,
  commit_hash TEXT,
  commit_message TEXT,
  commit_date TEXT,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id)
);

CREATE TABLE IF NOT EXISTS hotspots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  total_changes INTEGER NOT NULL,
  fix_count INTEGER NOT NULL,
  fix_rate REAL NOT NULL,
  risk_level TEXT CHECK(risk_level IN ('low','medium','high','critical')),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

CREATE TABLE IF NOT EXISTS coupling (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL,
  file_a TEXT NOT NULL,
  file_b TEXT NOT NULL,
  co_change_count INTEGER NOT NULL,
  strength TEXT CHECK(strength IN ('weak','moderate','strong')),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

CREATE TABLE IF NOT EXISTS fix_commits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  commit_date TEXT,
  author TEXT,
  message TEXT,
  category TEXT,
  pattern TEXT,
  severity TEXT,
  root_cause TEXT,
  file_count INTEGER,
  confidence REAL,
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

CREATE TABLE IF NOT EXISTS fix_chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id TEXT NOT NULL,
  break_hash TEXT,
  break_message TEXT,
  fix_hash TEXT,
  fix_message TEXT,
  hours_to_fix REAL,
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);

CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);
CREATE INDEX IF NOT EXISTS idx_patterns_severity ON patterns(severity);
CREATE INDEX IF NOT EXISTS idx_patterns_frequency ON patterns(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_hotspots_fix_rate ON hotspots(fix_rate DESC);
CREATE INDEX IF NOT EXISTS idx_coupling_count ON coupling(co_change_count DESC);
CREATE INDEX IF NOT EXISTS idx_fix_commits_category ON fix_commits(category);

INSERT OR REPLACE INTO repos VALUES ('webapp', 'webapp', 579, 300, '2026-01-23', '2026-02-10', '2026-02-10T16:09:34.260Z');

INSERT OR REPLACE INTO patterns VALUES ('MCL-I18N-MISSING-TRANSLATION', 'webapp', 'i18n-missing-translation', 9, 'i18n', 'html', 'medium', 'feat(regression): 12 real regression tests targeting actual breakage patterns — caught and fixed digit-starting i18n key bug in index.html. RULE: Ensure all user-visible strings go through the translation system.', 'feat(regression): 12 real regression tests targeting actual breakage patterns — caught and fixed digit-starting i18n key bug in index.html', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-I18N-MISSING-TRANSLATION', '1998cc92', 'feat(regression): 12 real regression tests targeting actual breakage patterns — caught and fixed dig', '2026-02-09');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-I18N-MISSING-TRANSLATION', '98b541bd', 'feat(sentinel): Upgrade to v2.5 — 10-module health platform with trend tracking & auto-fix engine', '2026-02-07');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-I18N-MISSING-TRANSLATION', 'a3046c00', 'Fix: use data-i18n-html for HTML content in wyckoff intro', '2026-02-05');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-I18N-MISSING-TRANSLATION', '7b4ab8d3', 'Embassy: fix language toggle + add hero banner', '2026-02-04');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-I18N-MISSING-TRANSLATION', 'b86f9492', 'fix: Complete i18n translations for Wyckoff page - all 113 keys', '2026-02-03');
INSERT OR REPLACE INTO patterns VALUES ('MCL-WRONG-CSS-VALUE', 'webapp', 'wrong-css-value', 9, 'css-layout', 'html', 'low', 'CSS value changes should be tested at multiple screen sizes. Check for inherited properties and specificity conflicts.', 'Changed height: 120px → 100%. Also: Changed background: linear-gradient(180deg,#ffcc70 0%,#ff9500 30%,#ff6b00 60%,#cc4400 100%) → radial-gradient(ellipse at 20% 20%,rgba(255,107,0,.2) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(255,157,77,.15) 0%,transparent 50%); Changed height: 100', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-WRONG-CSS-VALUE', '652f3af8', 'fix(ship): sync-back handles stash + CLAUDE.md documents ship as mandatory deploy method', '2026-02-09');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-WRONG-CSS-VALUE', '5111c6a4', 'fix(ui): Move card counter to LEFT side - no more overlap', '2026-02-06');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-WRONG-CSS-VALUE', '406af4d9', 'fix(ui): Larger filter buttons and fix card counter overlap', '2026-02-06');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-WRONG-CSS-VALUE', '4e5dd99c', 'fix(ui): Moderate font size increase without overlapping', '2026-02-06');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-WRONG-CSS-VALUE', '901f9be7', 'FIX: Loading screen animations restored', '2026-02-04');
INSERT OR REPLACE INTO patterns VALUES ('MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN', 'webapp', 'overflow-hidden-clips-children', 6, 'css-layout', 'css', 'high', 'overflow:hidden on a parent silently clips children that extend beyond bounds. Check all child elements before adding it.', 'Added overflow:hidden — may clip child elements. Also: Changed cards: fill width with 4px gaps, minimum 64px */
--board-card-width: clamp(64px, calc((100vw - 40px) / 5), 80px) → compact to leave room for hand */
--board-card-width: clamp(56px, calc((100vw - 40px) / 5), 72px); Changed board-card-heig', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN', '46cec269', 'fix(battle): Mobile hand cards visibility + fix Illegal return statement', '2026-02-08');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN', '1c919aa6', 'fix(battle): Fix mobile hand cards not visible — arena overflow + flex layout', '2026-02-08');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN', '420f4e6f', 'fix(avatar-studio): Improve mobile touch interactions', '2026-02-06');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN', 'ef1dbc62', 'fix: Unify card templates + remove ART COMING badge', '2026-02-03');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN', 'e0240e01', 'fix: 📱 Mobile-optimized Battle Arena v3.0', '2026-02-03');
INSERT OR REPLACE INTO patterns VALUES ('MCL-MISSING-NULL-GUARD', 'webapp', 'missing-null-guard', 6, 'null-reference', 'html', 'medium', 'Check for null/undefined before accessing properties. Common sources: DOM queries returning null, missing API fields, uninitialized state.', 'Added 1 optional chaining operator(s) — null reference fix. Also: Added && guard — was executing without prerequisite check; Modified conditional logic', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-NULL-GUARD', 'ec3364d0', 'fix(cards): Fix language toggle not working', '2026-02-06');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-NULL-GUARD', 'fcb85258', 'Fix merch.html: null element error crashing product grid render', '2026-02-04');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-NULL-GUARD', '019988ea', 'fix: Use unified nw-nav i18n system for Wyckoff page', '2026-02-03');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-NULL-GUARD', '08b88851', 'v2.1.5: Fix AI chat position + GM ID display', '2026-02-02');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-NULL-GUARD', '90e09abc', 'Fix battle: improved deck creation with fallbacks, better error handling and logging', '2026-02-01');
INSERT OR REPLACE INTO patterns VALUES ('MCL-MISSING-PRECONDITION-CHECK', 'webapp', 'missing-precondition-check', 5, 'null-reference', 'javascript', 'medium', 'Validate prerequisites before executing logic. Check that DOM elements exist, APIs are loaded, and data is present before using them.', 'selfHeal gated at 10 commits, but squash workflow compresses 4-5→1,', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-PRECONDITION-CHECK', '40f1d812', 'fix(showcase): NaN scores, mobile charts 2x, fonts doubled, README rewrite for Mycelium', '2026-02-09');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-PRECONDITION-CHECK', 'dd67dac1', 'fix(automation): make learning system fully automatic — no manual heal/eval needed (#13)', '2026-02-09');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-PRECONDITION-CHECK', '76de3af6', 'fix(battle): Move deck building + hand dealing to START button click', '2026-02-08');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-PRECONDITION-CHECK', '4573bc73', 'Fix guide: translation keys now resolve properly (ui.title, ui.newBadge)', '2026-02-02');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-PRECONDITION-CHECK', '8490b7f4', 'Optimize images and fix sound lag', '2026-02-02');
INSERT OR REPLACE INTO patterns VALUES ('MCL-SCRIPT-ORDER-DEPENDENCY', 'webapp', 'script-order-dependency', 4, 'load-order', 'html', 'high', 'Scripts that call each other''s globals must load in dependency order. Document the dependency chain in a comment.', 'showed overlay never appears on iOS mobile — user goes straight to', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-SCRIPT-ORDER-DEPENDENCY', '3affe035', 'fix(battle): Auto-start game when overlay isn''t visible on iOS', '2026-02-08');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-SCRIPT-ORDER-DEPENDENCY', 'e25565d5', 'fix(battle): Don''t block init on Audio.init() - fixes iOS hand empty bug', '2026-02-08');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-SCRIPT-ORDER-DEPENDENCY', 'a64bf8da', 'fix(battle): Add mobile debug overlay + cache busting v5.1', '2026-02-08');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-SCRIPT-ORDER-DEPENDENCY', 'e0cce52b', 'fix: Remove BGM button, fix back-to-top position, add i18n to guild homepage', '2026-02-01');
INSERT OR REPLACE INTO patterns VALUES ('MCL-TEST-ISSUE', 'webapp', 'test-issue', 3, 'test-failure', 'config', 'critical', 'make mycelium work on any repo — fix --init crash, strip NumbahWan refs, fix watch.cjs syntax errors, rename .nw-* to .mycelium-*, tested end-to-end o. RULE: Review carefully before committing.', 'make mycelium work on any repo — fix --init crash, strip NumbahWan refs, fix watch.cjs syntax errors, rename .nw-* to .mycelium-*, tested end-to-end on fresh repo', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-TEST-ISSUE', 'f965e84e', 'fix(portable): make mycelium work on any repo — fix --init crash, strip NumbahWan refs, fix watch.cj', '2026-02-09');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-TEST-ISSUE', '847fe089', 'fix(honesty): record underselling breakage + add HONESTY GATE to CLAUDE.md — never claim something d', '2026-02-09');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-TEST-ISSUE', 'adf49f14', 'fix(showcase): strip fake impact metrics (hours/money/pts saved) — replace with provable numbers onl', '2026-02-09');
INSERT OR REPLACE INTO patterns VALUES ('MCL-MISSING-RESPONSIVE-BREAKPOINT', 'webapp', 'missing-responsive-breakpoint', 3, 'mobile-compat', 'html', 'medium', 'Test every UI change at 320px, 768px, and 1024px. Add @media breakpoints for layouts that break at different screen sizes.', 'Added responsive breakpoint — was broken on different screen sizes. Also: Added scroll handling — content was not scrollable or jumping; Added scroll handling — content was not scrollable or jumping', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-RESPONSIVE-BREAKPOINT', 'e231b1af', 'Fix iOS mobile overlap on Profile Card', '2026-02-04');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-RESPONSIVE-BREAKPOINT', 'd8f57156', 'Fix UX: Remove blocking back buttons, add NW_NAV integration, improve scroll behavior', '2026-02-02');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-RESPONSIVE-BREAKPOINT', '0efeaa30', 'Fix mobile layout - horizontal scroll watchlist, proper sizing', '2026-02-01');
INSERT OR REPLACE INTO patterns VALUES ('MCL-API-CONTRACT-ISSUE', 'webapp', 'api-contract-issue', 3, 'api-contract', 'html', 'medium', 'images: Download and convert to local webp files. RULE: Validate API response shape before accessing fields.', 'images: Download and convert to local webp files', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-API-CONTRACT-ISSUE', '397c3322', 'fix: Update cards.json to use .webp extensions', '2026-02-03');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-API-CONTRACT-ISSUE', 'dfa41bc3', 'fix: Make live ticker actually tick every 2 seconds', '2026-02-03');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-API-CONTRACT-ISSUE', '7ab85001', 'Fix images: Download and convert to local webp files', '2026-02-01');
INSERT OR REPLACE INTO patterns VALUES ('MCL-CSS-LAYOUT-ISSUE', 'webapp', 'css-layout-issue', 3, 'css-layout', 'html', 'medium', 'JS errors: add missing helper scripts and resolve currentLang redeclaration. RULE: Test layout at 320px, 768px, 1024px after CSS changes.', 'JS errors: add missing helper scripts and resolve currentLang redeclaration', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-CSS-LAYOUT-ISSUE', 'fad1a83f', 'Fix: Regina (one g) in nav as guild ship', '2026-02-02');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-CSS-LAYOUT-ISSUE', 'cc75d631', 'Fix JS errors: add missing helper scripts and resolve currentLang redeclaration', '2026-02-02');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-CSS-LAYOUT-ISSUE', 'b59c97f0', 'Fix: setupDevModeUI error, add GM mode event listeners for UI updates', '2026-02-01');
INSERT OR REPLACE INTO patterns VALUES ('MCL-UNHANDLED-EXCEPTION', 'webapp', 'unhandled-exception', 2, 'error-handling', 'config', 'medium', 'Wrap external calls (DOM, fetch, JSON.parse, localStorage) in try-catch. Unhandled exceptions crash the entire function.', 'Wrapped code in try-catch — was crashing on error. Also: Added storage access safety — was crashing on parse error or missing key; Wrapped code in try-catch — was crashing on error', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-UNHANDLED-EXCEPTION', 'd9865b53', 'feat(self-heal): auto-eval + auto-fix learning system on every snapshot (#10)', '2026-02-09');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-UNHANDLED-EXCEPTION', '7db8899a', 'fix: iOS language toggle on markets page - improved touch handling', '2026-02-03');
INSERT OR REPLACE INTO patterns VALUES ('MCL-MISSING-RETURN-STATEMENT', 'webapp', 'missing-return-statement', 2, 'logic-error', 'html', 'high', 'Functions that compute values must return them. Missing return causes undefined results and silent failures.', 'Added missing return statement — function was returning undefined', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-RETURN-STATEMENT', 'd68c5168', 'Fix Events page JS variable conflicts with i18n.js', '2026-02-05');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-MISSING-RETURN-STATEMENT', '776a6756', 'Fix: GM mode persistence - call setupModeUI after wallet init, explicit GM check in spendLogs', '2026-02-01');
INSERT OR REPLACE INTO patterns VALUES ('MCL-USE-BEFORE-DEFINE', 'webapp', 'use-before-define', 2, 'null-reference', 'html', 'high', 'Use typeof check before accessing globals that may not be loaded yet. This often indicates a load-order dependency.', 'Added typeof !== undefined guard — variable was used before definition. Also: Added missing return statement — function was returning undefined; Added || [] fallback — was calling array method on undefined', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-USE-BEFORE-DEFINE', 'ea47b53c', 'FIX: Wallet ID loading + currency display', '2026-02-04');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-USE-BEFORE-DEFINE', 'd349facd', 'Fix FAB visibility on museum/vault pages and add inline icons to all nw-ux.js pages', '2026-02-01');
INSERT OR REPLACE INTO patterns VALUES ('MCL-OBJECT-FIT-CROPS-CONTENT', 'webapp', 'object-fit-crops-content', 2, 'css-layout', 'html', 'high', 'object-fit:cover crops images to fill container. Use contain if the full image must be visible (e.g., card art, logos).', 'Changed object-fit: cover → contain — image was being cropped. Also: Changed width: calc(100% - 16px) → calc(100% - 12px); Changed height: 180px → 200px', '2026-02-10T16:09:34.260Z');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-OBJECT-FIT-CROPS-CONTENT', 'f2d6ceac', 'fix: Show FULL card art - no cropping sword/feet', '2026-02-03');
INSERT INTO pattern_examples (pattern_id, commit_hash, commit_message, commit_date) VALUES ('MCL-OBJECT-FIT-CROPS-CONTENT', 'd48306d7', 'fix: Show full card art without cropping', '2026-02-03');

INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', '.ai-files-auto.txt', 68, 20, 0.294, 'high');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'src/index.tsx', 52, 2, 0.038, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/static/nw-nav.js', 44, 8, 0.182, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/static/data/sentinel-report.json', 33, 9, 0.273, 'high');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/wallet.html', 32, 6, 0.188, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/static/data/sentinel-history.json', 31, 9, 0.29, 'high');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/battle.html', 29, 8, 0.276, 'high');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/forge.html', 26, 5, 0.192, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/index.html', 25, 7, 0.28, 'high');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'memory.json', 21, 3, 0.143, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/cards.html', 21, 8, 0.381, 'high');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/merch.html', 21, 3, 0.143, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/markets.html', 20, 4, 0.2, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/arcade.html', 20, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/static/data/showcase-live.json', 19, 4, 0.211, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/collection.html', 18, 1, 0.056, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/wyckoff.html', 18, 3, 0.167, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/static/nw-guide.js', 18, 5, 0.278, 'high');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/academy.html', 17, 2, 0.118, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', '.ai-context.md', 16, 2, 0.125, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/market.html', 14, 1, 0.071, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/static/nw-wallet.js', 14, 1, 0.071, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/guide.html', 14, 1, 0.071, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/therapy.html', 14, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'CLAUDE.md', 13, 6, 0.462, 'critical');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'package.json', 13, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/citizenship.html', 13, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/embassy.html', 13, 1, 0.077, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/events.html', 13, 2, 0.154, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/pvp-battle.html', 13, 2, 0.154, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/tabletop.html', 13, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/regina.html', 13, 2, 0.154, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', '.mycelium/eval.json', 12, 6, 0.5, 'critical');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', '.mycelium/memory.json', 12, 6, 0.5, 'critical');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/deckbuilder.html', 12, 1, 0.083, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/claim.html', 12, 1, 0.083, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/conspiracy.html', 12, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/court.html', 12, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/historical-society.html', 12, 2, 0.167, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/hr.html', 12, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/invest.html', 12, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', '.husky/pre-commit', 11, 2, 0.182, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/tcg.html', 11, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/basement.html', 11, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/business.html', 11, 1, 0.091, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/buy.html', 11, 0, 0, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/crafts.html', 11, 1, 0.091, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/my-business.html', 11, 2, 0.182, 'medium');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/profile-card.html', 11, 1, 0.091, 'low');
INSERT INTO hotspots (repo_id, file_path, total_changes, fix_count, fix_rate, risk_level) VALUES ('webapp', 'public/vault.html', 11, 2, 0.182, 'medium');

INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/data/sentinel-history.json', 'public/static/data/sentinel-report.json', 22, 'strong');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/nw-nav.js', 'src/index.tsx', 15, 'strong');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.ai-files-auto.txt', 'src/index.tsx', 15, 'strong');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval.json', '.mycelium/memory.json', 10, 'moderate');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'memory.json', 'public/static/data/sentinel-history.json', 10, 'moderate');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'memory.json', 'public/static/data/sentinel-report.json', 10, 'moderate');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/arcade.html', 'public/forge.html', 9, 'moderate');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.ai-files-auto.txt', 'public/static/nw-nav.js', 9, 'moderate');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval-history.json', '.mycelium/eval.json', 8, 'moderate');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval-history.json', '.mycelium/memory.json', 8, 'moderate');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/arcade.html', 'public/wallet.html', 8, 'moderate');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/data/sentinel-history.json', 'public/static/data/showcase-live.json', 7, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval.json', 'public/static/data/showcase-live.json', 7, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/memory.json', 'public/static/data/showcase-live.json', 7, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/data/showcase-live.json', 'scripts/generate-showcase-data.cjs', 7, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/battle.html', 'public/static/data/sentinel-history.json', 7, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/battle.html', 'public/static/data/sentinel-report.json', 7, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/data/sentinel-report.json', 'public/static/data/showcase-live.json', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval-history.json', 'public/static/data/showcase-live.json', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'memory.json', 'public/static/data/showcase-live.json', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'gitwise.cjs', 'memory.json', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'memory.json', 'nw-memory.cjs', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/data/sentinel-history.json', 'public/static/nw-battle-engine.js', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/data/sentinel-report.json', 'public/static/nw-battle-engine.js', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/arcade.html', 'public/battle.html', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/battle.html', 'public/forge.html', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.ai-files-auto.txt', 'public/battle.html', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/forge.html', 'public/wallet.html', 6, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval.json', 'CLAUDE.md', 5, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/memory.json', 'CLAUDE.md', 5, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/data/sentinel-history.json', 'scripts/generate-showcase-data.cjs', 5, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.husky/post-commit', 'memory.json', 5, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/markets.html', 'src/index.tsx', 5, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/battle.html', 'public/static/nw-battle-engine.js', 5, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/arcade.html', 'public/collection.html', 5, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/battle.html', 'public/collection.html', 5, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.ai-context.md', '.ai-files-auto.txt', 5, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/nw-wallet.js', 'public/wallet.html', 5, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/showcase.html', 'public/static/data/showcase-live.json', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval-history.json', 'CLAUDE.md', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval.json', '.mycelium/fix-log.json', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/fix-log.json', '.mycelium/memory.json', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.nw-eval-result.json', 'memory.json', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.nw-eval-result.json', 'public/static/data/showcase-live.json', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'memory.json', 'nw-fixer.cjs', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'memory.json', 'scripts/generate-showcase-data.cjs', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/data/sentinel-report.json', 'scripts/generate-showcase-data.cjs', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.husky/post-commit', 'nw-memory.cjs', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'gitwise.cjs', 'nw-memory.cjs', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'CLAUDE.md', 'memory.json', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/claim.html', 'public/events.html', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/collection.html', 'public/wallet.html', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.ai-files-auto.txt', 'public/tabletop.html', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.ai-files-auto.txt', 'public/wallet.html', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/arcade.html', 'public/market.html', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/collection.html', 'public/forge.html', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/collection.html', 'public/market.html', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/battle.html', 'public/pvp-battle.html', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/arcade.html', 'public/static/nw-wallet.js', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.ai-files-auto.txt', 'public/static/nw-wallet.js', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/invest.html', 'src/index.tsx', 4, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/markets.html', 'public/static/data/sentinel-history.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/markets.html', 'public/static/data/sentinel-report.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.husky/pre-commit', 'CLAUDE.md', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval.json', 'scripts/generate-showcase-data.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/memory.json', 'scripts/generate-showcase-data.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/showcase.html', 'scripts/generate-showcase-data.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval-history.json', '.mycelium/fix-log.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval-history.json', 'mycelium-eval.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval.json', 'mycelium-eval.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/fix-log.json', 'public/static/data/showcase-live.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/memory.json', 'mycelium-eval.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'mycelium-eval.cjs', 'public/static/data/showcase-live.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/historical-society.html', 'public/index.html', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/eval.json', 'bin/mycelium.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/fix-log.json', 'bin/mycelium.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.mycelium/memory.json', 'bin/mycelium.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/data/sentinel-history.json', 'tests/regression-from-breakages.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.nw-eval-history.json', '.nw-eval-result.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.nw-eval-history.json', 'memory.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.nw-eval-history.json', 'public/static/data/showcase-live.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.nw-eval-result.json', 'nw-fixer.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'nw-fixer.cjs', 'public/static/data/showcase-live.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.nw-eval-result.json', 'public/static/data/sentinel-history.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.nw-eval-result.json', 'public/static/data/sentinel-report.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'nw-fixer.cjs', 'public/static/data/sentinel-history.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'nw-fixer.cjs', 'public/static/data/sentinel-report.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/static/data/sentinel-report.json', 'src/index.tsx', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.husky/post-commit', 'gitwise.cjs', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.husky/post-commit', 'public/static/data/sentinel-history.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', '.husky/post-commit', 'public/static/data/sentinel-report.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'gitwise.cjs', 'public/static/data/sentinel-history.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'gitwise.cjs', 'public/static/data/sentinel-report.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'nw-memory.cjs', 'public/static/data/sentinel-history.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'nw-memory.cjs', 'public/static/data/sentinel-report.json', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/battle.html', 'public/cards.html', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/battle.html', 'public/wallet.html', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/battle.html', 'src/index.tsx', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'public/cards.html', 'public/static/nw-nav.js', 3, 'weak');
INSERT INTO coupling (repo_id, file_a, file_b, co_change_count, strength) VALUES ('webapp', 'CLAUDE.md', 'nw-memory.cjs', 3, 'weak');

INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '35139459', 'feat(market+mobile+workflow): free trading, collection fix, live feed, image speed, checkpoint syste', '16c62641', 'refactor: fix stale identifiers, harden init, clean dead code, optimize perf', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'f965e84e', 'fix(portable): make mycelium work on any repo — fix --init crash, strip NumbahWan refs, fix watch.cj', '847fe089', 'fix(honesty): record underselling breakage + add HONESTY GATE to CLAUDE.md — never claim something d', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '847fe089', 'fix(honesty): record underselling breakage + add HONESTY GATE to CLAUDE.md — never claim something d', 'adf49f14', 'fix(showcase): strip fake impact metrics (hours/money/pts saved) — replace with provable numbers onl', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'adf49f14', 'fix(showcase): strip fake impact metrics (hours/money/pts saved) — replace with provable numbers onl', '1998cc92', 'feat(regression): 12 real regression tests targeting actual breakage patterns — caught and fixed dig', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'c2bd51e6', 'feat(hardening): add data-testid to 6 repeat-offender pages (events, pvp, embassy, index, historical', '8f81ad8e', 'revert(refactor): undo cosmetic file moves + add VALUE GATE constraint — no busywork without measura', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'b895bc58', 'feat(eval-v3): honest momentum-aware scoring — sliding window, hardening credit, no gaming', '652f3af8', 'fix(ship): sync-back handles stash + CLAUDE.md documents ship as mandatory deploy method', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '373840d4', 'feat(automation): three-role architecture — Learner + Evaluator + Fixer (#14)', 'dd67dac1', 'fix(automation): make learning system fully automatic — no manual heal/eval needed (#13)', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'fa172e0f', 'feat(battle): add battle history stats + match log module (#11)', 'd9865b53', 'feat(self-heal): auto-eval + auto-fix learning system on every snapshot (#10)', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '3aab4d9e', 'feat(eval): learning system evaluation — is it getting better or not? (#9)', '48ba4e3b', 'fix(hooks): wire gitwise into git hooks + update CLAUDE.md (#8)', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'bb1037f9', 'feat(battle): Complete Battle Arena v6.0 rewrite — mobile-first, tap-to-play', '3affe035', 'fix(battle): Auto-start game when overlay isn''t visible on iOS', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '3affe035', 'fix(battle): Auto-start game when overlay isn''t visible on iOS', 'e25565d5', 'fix(battle): Don''t block init on Audio.init() - fixes iOS hand empty bug', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'e25565d5', 'fix(battle): Don''t block init on Audio.init() - fixes iOS hand empty bug', 'a64bf8da', 'fix(battle): Add mobile debug overlay + cache busting v5.1', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'a64bf8da', 'fix(battle): Add mobile debug overlay + cache busting v5.1', '76de3af6', 'fix(battle): Move deck building + hand dealing to START button click', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '76de3af6', 'fix(battle): Move deck building + hand dealing to START button click', '46cec269', 'fix(battle): Mobile hand cards visibility + fix Illegal return statement', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '46cec269', 'fix(battle): Mobile hand cards visibility + fix Illegal return statement', '1c919aa6', 'fix(battle): Fix mobile hand cards not visible — arena overflow + flex layout', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'e4587940', 'feat(battle): Upgrade to v5.0 — The Funnest Card Game Ever', 'bffff458', 'fix: Restore homepage — remove GSAP defer, fix digit-starting i18n keys', 24);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'bffff458', 'fix: Restore homepage — remove GSAP defer, fix digit-starting i18n keys', 'd0d20984', 'perf: Score 75->82 (B+) — tiered architecture thresholds, API surface dedup fix, 309 scripts deferre', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'f78ac6bf', 'perf: Quick wins batch — score 67 -> 75 (B), 100MB bandwidth saved', '98b541bd', 'feat(sentinel): Upgrade to v2.5 — 10-module health platform with trend tracking & auto-fix engine', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '98b541bd', 'feat(sentinel): Upgrade to v2.5 — 10-module health platform with trend tracking & auto-fix engine', '0abd8031', 'feat(i18n): Auto-fix 70 pages with NW-I18N Auto-Fixer v1.0', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '7c3975b2', 'feat(tooling): Add automatic UI overlap detection system', 'a8311f88', 'feat(ui): Add UI Guardian v2.0 - automatic overlap detection and fix system', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'a8311f88', 'feat(ui): Add UI Guardian v2.0 - automatic overlap detection and fix system', '5111c6a4', 'fix(ui): Move card counter to LEFT side - no more overlap', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '5111c6a4', 'fix(ui): Move card counter to LEFT side - no more overlap', '406af4d9', 'fix(ui): Larger filter buttons and fix card counter overlap', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '406af4d9', 'fix(ui): Larger filter buttons and fix card counter overlap', '4e5dd99c', 'fix(ui): Moderate font size increase without overlapping', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '54d0be08', 'Card #624: Amber Soprano hair now flows heavily down one side like reference', '082b7a66', 'Card #624: Fixed shutter shades (horizontal slats) + asymmetrical hair - workflow learning', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '474e946a', 'COMPLETE: Migrate all 87 pages to unified i18n system', 'ad1c5d29', 'FIX: Unified i18n system - single source of truth', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '3a81ac8f', 'UPGRADE: Premium currency icons v2.0 (256px)', '101f6578', 'FIX: Optimized currency icons + market page fixes', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'c2ba641c', 'UPGRADE: Premium PNG currency icons (NanoBanana generated)', 'ea47b53c', 'FIX: Wallet ID loading + currency display', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'fcb85258', 'Fix merch.html: null element error crashing product grid render', '717792e9', 'Fix merch.html: diamond -> nwg (3-tier currency)', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'c12c7366', 'HARD RULE #7: 3-Tier Currency System Audit', 'e231b1af', 'Fix iOS mobile overlap on Profile Card', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'a7d85729', 'Embassy: use single lang event listener', '7b4ab8d3', 'Embassy: fix language toggle + add hero banner', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '18296c47', 'feat: Add 3-Step Fool-Proof Wyckoff Guide with TSMC example', '019988ea', 'fix: Use unified nw-nav i18n system for Wyckoff page', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '5e91c3b8', 'fix: Show full card names - no truncation', 'ef1dbc62', 'fix: Unify card templates + remove ART COMING badge', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'ef1dbc62', 'fix: Unify card templates + remove ART COMING badge', 'f2d6ceac', 'fix: Show FULL card art - no cropping sword/feet', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '535093e7', 'fix: Art fills frame completely (Pokemon/MTG style)', 'd48306d7', 'fix: Show full card art without cropping', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '44b9e895', 'fix: 🖼️ Battle page images now load properly on iOS', 'c7444a4c', 'fix: 🖼️ Consolidate battle pages + cache-bust images', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '44515c26', 'fix: 🖼️ Card images now loading - convert .png/.jpg to .webp', 'e0240e01', 'fix: 📱 Mobile-optimized Battle Arena v3.0', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '98bccb01', 'feat: Real-time prices from Coinbase API', 'dfa41bc3', 'fix: Make live ticker actually tick every 2 seconds', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'dfa41bc3', 'fix: Make live ticker actually tick every 2 seconds', '7db8899a', 'fix: iOS language toggle on markets page - improved touch handling', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'f5b48bd1', 'Guide v3.2: Add fallback page data, works without NW_CONFIG', '4573bc73', 'Fix guide: translation keys now resolve properly (ui.title, ui.newBadge)', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'dc63a17f', 'Modularize giant HTML files: extract CSS/JS to separate files', '1e37554d', 'Major refactor: NW_USER system, extracted modules, route files, nav fixes', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '1e37554d', 'Major refactor: NW_USER system, extracted modules, route files, nav fixes', 'd8f57156', 'Fix UX: Remove blocking back buttons, add NW_NAV integration, improve scroll behavior', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '713b1875', 'Add nation-state features: Supreme Court, Treasury, Intelligence Agency, Citizen ID System', 'fad1a83f', 'Fix: Regina (one g) in nav as guild ship', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'fd461951', 'Add unified currency economy + merch dual pricing + AI guide enhancements', 'e1f09c9e', 'Fix wallet currencies to match unified system', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '65b76088', 'feat: Add alumni photos with tech figures wearing NumbahWan merch', '2f9271df', 'fix: Update Chinese name for Parry Hotter to 巴利·霍特', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '51fa6185', 'feat: Dynamic CP Race from JSON API - easy updates!', 'e0cce52b', 'fix: Remove BGM button, fix back-to-top position, add i18n to guild homepage', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'caf8babe', 'feat: add NW_UX Super Intuitive UX System', '2599626f', 'perf: fix animated icons to be static for faster FPS', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'b59c97f0', 'Fix: setupDevModeUI error, add GM mode event listeners for UI updates', 'f32596e5', 'Fix: pack opening animation - remove duplicate overlay hide that was skipping swipe', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'f32596e5', 'Fix: pack opening animation - remove duplicate overlay hide that was skipping swipe', 'dc5a24f4', 'Fix: move nav to top-RIGHT, fix lastLogBalance initialization error in forge', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', 'dc5a24f4', 'Fix: move nav to top-RIGHT, fix lastLogBalance initialization error in forge', '776a6756', 'Fix: GM mode persistence - call setupModeUI after wallet init, explicit GM check in spendLogs', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '776a6756', 'Fix: GM mode persistence - call setupModeUI after wallet init, explicit GM check in spendLogs', '379f2225', 'Fix: DEV_MODE undefined in forge, auto-start battle for testing', 0);
INSERT INTO fix_chains (repo_id, break_hash, break_message, fix_hash, fix_message, hours_to_fix) VALUES ('webapp', '379f2225', 'Fix: DEV_MODE undefined in forge, auto-start battle for testing', '90e09abc', 'Fix battle: improved deck creation with fallbacks, better error handling and logging', 0);
