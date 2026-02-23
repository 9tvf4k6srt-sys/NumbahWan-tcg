// ════════════════════════════════════════════════════════════════
//  NWGE SIGNAL — Real-time Analytics & Feedback System
// ════════════════════════════════════════════════════════════════
import Database from 'better-sqlite3';
import path from 'path';

export function createSignalDB(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // ─── Schema ─────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS generations (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL,
      prompt        TEXT NOT NULL,
      genre         TEXT,
      render_mode   TEXT,
      method        TEXT,
      game_name     TEXT,
      tokens        INTEGER DEFAULT 0,
      image_count   INTEGER DEFAULT 0,
      fill_rate     REAL,
      render_time   REAL,
      resolution    TEXT,
      triangles     INTEGER,
      vertices      INTEGER,
      success       INTEGER DEFAULT 1,
      error         TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      yaml_size     INTEGER DEFAULT 0,
      keyword_hits  TEXT
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id      TEXT NOT NULL,
      session_id  TEXT NOT NULL,
      rating      INTEGER NOT NULL CHECK(rating BETWEEN -1 AND 5),
      comment     TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES generations(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT PRIMARY KEY,
      fingerprint   TEXT,
      first_seen    TEXT DEFAULT (datetime('now')),
      last_seen     TEXT DEFAULT (datetime('now')),
      generation_count INTEGER DEFAULT 0,
      feedback_count   INTEGER DEFAULT 0,
      total_time_ms    INTEGER DEFAULT 0,
      user_agent    TEXT,
      screen_size   TEXT,
      referrer      TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  TEXT NOT NULL,
      event_type  TEXT NOT NULL,
      event_data  TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_gen_session ON generations(session_id);
    CREATE INDEX IF NOT EXISTS idx_gen_created ON generations(created_at);
    CREATE INDEX IF NOT EXISTS idx_gen_genre ON generations(genre);
    CREATE INDEX IF NOT EXISTS idx_gen_mode ON generations(render_mode);
    CREATE INDEX IF NOT EXISTS idx_gen_success ON generations(success);
    CREATE INDEX IF NOT EXISTS idx_fb_job ON feedback(job_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  `);

  // ─── Prepared Statements ────────────────────────────────────
  const stmts = {
    insertGeneration: db.prepare(`
      INSERT INTO generations (id, session_id, prompt, genre, render_mode, method, game_name, tokens,
        image_count, fill_rate, render_time, resolution, triangles, vertices, success, error, yaml_size, keyword_hits)
      VALUES (@id, @sessionId, @prompt, @genre, @renderMode, @method, @gameName, @tokens,
        @imageCount, @fillRate, @renderTime, @resolution, @triangles, @vertices, @success, @error, @yamlSize, @keywordHits)
    `),

    insertFeedback: db.prepare(`
      INSERT INTO feedback (job_id, session_id, rating, comment)
      VALUES (@jobId, @sessionId, @rating, @comment)
    `),

    upsertSession: db.prepare(`
      INSERT INTO sessions (id, fingerprint, user_agent, screen_size, referrer)
      VALUES (@id, @fingerprint, @userAgent, @screenSize, @referrer)
      ON CONFLICT(id) DO UPDATE SET
        last_seen = datetime('now'),
        user_agent = COALESCE(@userAgent, user_agent),
        screen_size = COALESCE(@screenSize, screen_size)
    `),

    incrementSessionGen: db.prepare(`
      UPDATE sessions SET generation_count = generation_count + 1, last_seen = datetime('now') WHERE id = ?
    `),

    incrementSessionFb: db.prepare(`
      UPDATE sessions SET feedback_count = feedback_count + 1, last_seen = datetime('now') WHERE id = ?
    `),

    insertEvent: db.prepare(`
      INSERT INTO events (session_id, event_type, event_data) VALUES (?, ?, ?)
    `),

    // ─── Analytics Queries ──────────────────────────────────
    totalGenerations: db.prepare(`SELECT COUNT(*) as count FROM generations`),
    totalSessions: db.prepare(`SELECT COUNT(*) as count FROM sessions`),
    totalFeedback: db.prepare(`SELECT COUNT(*) as count FROM feedback`),

    generationsToday: db.prepare(`
      SELECT COUNT(*) as count FROM generations WHERE created_at >= date('now')
    `),

    avgFillRate: db.prepare(`
      SELECT AVG(fill_rate) as avg, MIN(fill_rate) as min, MAX(fill_rate) as max
      FROM generations WHERE fill_rate IS NOT NULL AND success = 1
    `),

    avgRating: db.prepare(`
      SELECT AVG(rating) as avg, COUNT(*) as count FROM feedback WHERE rating > 0
    `),

    failRate: db.prepare(`
      SELECT
        COUNT(CASE WHEN success = 0 THEN 1 END) as failures,
        COUNT(*) as total,
        ROUND(100.0 * COUNT(CASE WHEN success = 0 THEN 1 END) / MAX(COUNT(*), 1), 1) as rate
      FROM generations
    `),

    genreDistribution: db.prepare(`
      SELECT genre, COUNT(*) as count, AVG(fill_rate) as avg_fill,
        ROUND(100.0 * COUNT(CASE WHEN success = 0 THEN 1 END) / MAX(COUNT(*), 1), 1) as fail_rate
      FROM generations GROUP BY genre ORDER BY count DESC
    `),

    modeDistribution: db.prepare(`
      SELECT render_mode, COUNT(*) as count, AVG(fill_rate) as avg_fill
      FROM generations GROUP BY render_mode ORDER BY count DESC
    `),

    methodDistribution: db.prepare(`
      SELECT method, COUNT(*) as count FROM generations GROUP BY method ORDER BY count DESC
    `),

    topKeywords: db.prepare(`
      SELECT keyword_hits FROM generations WHERE keyword_hits IS NOT NULL
    `),

    recentGenerations: db.prepare(`
      SELECT g.*, f.rating as user_rating, f.comment as user_comment
      FROM generations g
      LEFT JOIN feedback f ON f.job_id = g.id
      ORDER BY g.created_at DESC LIMIT ?
    `),

    lowQualityRenders: db.prepare(`
      SELECT * FROM generations
      WHERE (fill_rate IS NOT NULL AND fill_rate < 50) OR success = 0
      ORDER BY created_at DESC LIMIT ?
    `),

    recentFeedback: db.prepare(`
      SELECT f.*, g.prompt, g.genre, g.render_mode, g.fill_rate
      FROM feedback f
      JOIN generations g ON g.id = f.job_id
      ORDER BY f.created_at DESC LIMIT ?
    `),

    hourlyActivity: db.prepare(`
      SELECT strftime('%Y-%m-%d %H:00', created_at) as hour,
        COUNT(*) as count,
        AVG(fill_rate) as avg_fill,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures
      FROM generations
      WHERE created_at >= datetime('now', '-24 hours')
      GROUP BY hour ORDER BY hour
    `),

    promptLengthStats: db.prepare(`
      SELECT
        CASE
          WHEN LENGTH(prompt) < 20 THEN 'short (<20)'
          WHEN LENGTH(prompt) < 50 THEN 'medium (20-50)'
          WHEN LENGTH(prompt) < 100 THEN 'long (50-100)'
          ELSE 'very long (100+)'
        END as bucket,
        COUNT(*) as count,
        AVG(fill_rate) as avg_fill,
        AVG(CASE WHEN rating > 0 THEN rating END) as avg_rating
      FROM generations g
      LEFT JOIN feedback f ON f.job_id = g.id
      GROUP BY bucket ORDER BY count DESC
    `),

    returningSessions: db.prepare(`
      SELECT COUNT(*) as returning_users FROM sessions WHERE generation_count > 1
    `),

    sessionStats: db.prepare(`
      SELECT
        AVG(generation_count) as avg_gens,
        MAX(generation_count) as max_gens,
        AVG(feedback_count) as avg_feedback,
        COUNT(CASE WHEN feedback_count > 0 THEN 1 END) as sessions_with_feedback
      FROM sessions
    `),

    thumbsDistribution: db.prepare(`
      SELECT
        SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
        SUM(CASE WHEN rating >= 2 THEN 1 ELSE 0 END) as starred,
        COUNT(*) as total
      FROM feedback
    `),
  };

  // ─── API ────────────────────────────────────────────────────
  return {
    db,

    logGeneration(data) {
      try {
        stmts.insertGeneration.run(data);
        stmts.incrementSessionGen.run(data.sessionId);
      } catch (e) { console.error('[SIGNAL] logGeneration error:', e.message); }
    },

    logFeedback(data) {
      try {
        stmts.insertFeedback.run(data);
        stmts.incrementSessionFb.run(data.sessionId);
      } catch (e) { console.error('[SIGNAL] logFeedback error:', e.message); }
    },

    touchSession(data) {
      try { stmts.upsertSession.run(data); }
      catch (e) { console.error('[SIGNAL] touchSession error:', e.message); }
    },

    logEvent(sessionId, type, data) {
      try { stmts.insertEvent.run(sessionId, type, typeof data === 'string' ? data : JSON.stringify(data)); }
      catch (e) { console.error('[SIGNAL] logEvent error:', e.message); }
    },

    getOverview() {
      return {
        totals: {
          generations: stmts.totalGenerations.get().count,
          sessions: stmts.totalSessions.get().count,
          feedback: stmts.totalFeedback.get().count,
          today: stmts.generationsToday.get().count,
        },
        fillRate: stmts.avgFillRate.get(),
        rating: stmts.avgRating.get(),
        failRate: stmts.failRate.get(),
        returning: stmts.returningSessions.get().returning_users,
        sessionStats: stmts.sessionStats.get(),
        thumbs: stmts.thumbsDistribution.get(),
      };
    },

    getDistributions() {
      // Compute keyword frequency from stored keyword_hits JSON arrays
      const kwRows = stmts.topKeywords.all();
      const kwMap = {};
      for (const row of kwRows) {
        try {
          const arr = JSON.parse(row.keyword_hits);
          for (const kw of arr) { kwMap[kw] = (kwMap[kw] || 0) + 1; }
        } catch {}
      }
      const topKeywords = Object.entries(kwMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([keyword, count]) => ({ keyword, count }));

      return {
        genres: stmts.genreDistribution.all(),
        modes: stmts.modeDistribution.all(),
        methods: stmts.methodDistribution.all(),
        topKeywords,
        promptLength: stmts.promptLengthStats.all(),
      };
    },

    getRecent(limit = 50) {
      return {
        generations: stmts.recentGenerations.all(limit),
        lowQuality: stmts.lowQualityRenders.all(limit),
        feedback: stmts.recentFeedback.all(limit),
      };
    },

    getTimeline() {
      return { hourly: stmts.hourlyActivity.all() };
    },
  };
}

// ─── Extract metrics from render output ─────────────────────
export function extractRenderMetrics(renderOutput) {
  const metrics = {};
  const fillMatch = renderOutput?.match(/(\d+\.?\d*)%\s*fill/);
  if (fillMatch) metrics.fillRate = parseFloat(fillMatch[1]);
  const timeMatch = renderOutput?.match(/Render time:\s*(\d+\.?\d*)s/);
  if (timeMatch) metrics.renderTime = parseFloat(timeMatch[1]);
  const resMatch = renderOutput?.match(/(\d+)x(\d+)/);
  if (resMatch) metrics.resolution = `${resMatch[1]}x${resMatch[2]}`;
  const triMatch = renderOutput?.match(/Triangles:\s*(\d+)/);
  if (triMatch) metrics.triangles = parseInt(triMatch[1]);
  const vertMatch = renderOutput?.match(/Vertices:\s*(\d+)/);
  if (vertMatch) metrics.vertices = parseInt(vertMatch[1]);
  return metrics;
}

// ─── Extract keyword hits from prompt ───────────────────────
export function extractKeywords(prompt) {
  const kw = [];
  const tests = {
    crystal: /crystal|gem|amethyst|quartz|diamond/i,
    forest: /forest|wood|grove|jungle|tree/i,
    mountain: /mountain|peak|cliff|alpine|summit/i,
    ocean: /ocean|beach|sea|coast|island|tropical/i,
    snow: /snow|ice|frozen|winter|arctic/i,
    desert: /desert|sand|dune|canyon/i,
    cave: /cave|underground|cavern|mine|grotto/i,
    sunset: /sunset|dusk|evening|twilight|golden/i,
    ruins: /ruin|ancient|temple|pillar|column/i,
    castle: /castle|fortress|tower|turret/i,
    volcano: /volcano|lava|magma|eruption/i,
    magic: /magic|mystic|enchanted|fairy|fantasy|wizard/i,
    portal: /portal|gate|gateway|rift/i,
    mushroom: /mushroom|fungi|toadstool/i,
    floating: /float|hover|suspended|flying/i,
    lighthouse: /lighthouse|beacon/i,
    waterfall: /waterfall|cascade/i,
    farm: /farm|crop|plant|harvest|chicken/i,
    combat: /monster|enemy|combat|fight|battle|zombie|dragon/i,
    town: /shop|store|merchant|village|town/i,
    fire: /fire|lava|ember|flame/i,
    metal: /metal|robot|mech|steel|iron/i,
    swamp: /swamp|marsh|bog/i,
    space: /space|planet|star|galaxy|nebula/i,
  };
  for (const [name, re] of Object.entries(tests)) {
    if (re.test(prompt)) kw.push(name);
  }
  return kw;
}
