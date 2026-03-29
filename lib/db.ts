import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'trends.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initTables(_db);
  }
  return _db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      url TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      source_id INTEGER REFERENCES sources(id),
      source_name TEXT,
      url TEXT,
      viral_score INTEGER DEFAULT 0,
      velocity REAL DEFAULT 0,
      category TEXT,
      region TEXT DEFAULT 'global',
      tags TEXT DEFAULT '[]',
      mentions INTEGER DEFAULT 0,
      sentiment REAL DEFAULT 0,
      lifecycle TEXT DEFAULT 'emerging',
      data_json TEXT DEFAULT '{}',
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trend_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trend_id INTEGER REFERENCES trends(id) ON DELETE CASCADE,
      viral_score INTEGER,
      velocity REAL,
      mentions INTEGER,
      snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cron_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      prompt TEXT NOT NULL,
      schedule TEXT NOT NULL,
      agent TEXT DEFAULT 'default',
      source_type TEXT,
      target_dashboard TEXT,
      enabled INTEGER DEFAULT 1,
      last_run DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cron_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cron_config_id INTEGER REFERENCES cron_configs(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      output TEXT,
      output_file TEXT,
      items_processed INTEGER DEFAULT 0,
      error TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      count INTEGER DEFAULT 0,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_trends_viral_score ON trends(viral_score DESC);
    CREATE INDEX IF NOT EXISTS idx_trends_category ON trends(category);
    CREATE INDEX IF NOT EXISTS idx_trends_region ON trends(region);
    CREATE INDEX IF NOT EXISTS idx_trends_lifecycle ON trends(lifecycle);
    CREATE INDEX IF NOT EXISTS idx_trends_detected_at ON trends(detected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_trend_snapshots_trend_id ON trend_snapshots(trend_id);
    CREATE INDEX IF NOT EXISTS idx_cron_runs_config_id ON cron_runs(cron_config_id);

    -- Word Trends tables
    CREATE TABLE IF NOT EXISTS word_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      source TEXT,
      category TEXT DEFAULT 'general',
      frequency INTEGER DEFAULT 1,
      score REAL DEFAULT 0,
      growth REAL DEFAULT 0,
      sentiment REAL DEFAULT 0,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      data_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(word, source)
    );

    CREATE TABLE IF NOT EXISTS word_frequencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER REFERENCES word_entries(id) ON DELETE CASCADE,
      frequency INTEGER DEFAULT 0,
      mentions INTEGER DEFAULT 0,
      period TEXT NOT NULL,
      period_type TEXT DEFAULT 'daily',
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS word_competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_a_id INTEGER REFERENCES word_entries(id) ON DELETE CASCADE,
      word_b_id INTEGER REFERENCES word_entries(id) ON DELETE CASCADE,
      overlap_score REAL DEFAULT 0,
      context TEXT,
      category TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS word_clusters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      words TEXT DEFAULT '[]',
      centroid_word TEXT,
      coherence_score REAL DEFAULT 0,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_word_entries_word ON word_entries(word);
    CREATE INDEX IF NOT EXISTS idx_word_entries_category ON word_entries(category);
    CREATE INDEX IF NOT EXISTS idx_word_entries_score ON word_entries(score DESC);
    CREATE INDEX IF NOT EXISTS idx_word_frequencies_word_id ON word_frequencies(word_id);
    CREATE INDEX IF NOT EXISTS idx_word_frequencies_period ON word_frequencies(period);
    CREATE INDEX IF NOT EXISTS idx_word_competitions_word_a ON word_competitions(word_a_id);
    CREATE INDEX IF NOT EXISTS idx_word_competitions_word_b ON word_competitions(word_b_id);
    CREATE INDEX IF NOT EXISTS idx_word_clusters_category ON word_clusters(category);

    -- Forum tables
    CREATE TABLE IF NOT EXISTS forum_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'forum',
      url TEXT,
      icon TEXT,
      description TEXT,
      enabled INTEGER DEFAULT 1,
      scrape_config TEXT DEFAULT '{}',
      last_scraped DATETIME,
      post_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forum_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      source TEXT NOT NULL,
      source_id INTEGER REFERENCES forum_sources(id),
      title TEXT NOT NULL,
      body TEXT,
      author TEXT,
      url TEXT,
      score INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      sentiment REAL DEFAULT 0,
      category TEXT DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      is_trending INTEGER DEFAULT 0,
      hot_words TEXT DEFAULT '[]',
      data_json TEXT DEFAULT '{}',
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(external_id, source)
    );

    CREATE TABLE IF NOT EXISTS forum_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      post_count INTEGER DEFAULT 0,
      avg_sentiment REAL DEFAULT 0,
      avg_score REAL DEFAULT 0,
      sources TEXT DEFAULT '[]',
      is_trending INTEGER DEFAULT 0,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_forum_posts_source ON forum_posts(source);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_external_id ON forum_posts(external_id);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_score ON forum_posts(score DESC);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_sentiment ON forum_posts(sentiment);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_is_trending ON forum_posts(is_trending);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_published_at ON forum_posts(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_forum_topics_slug ON forum_topics(slug);
    CREATE INDEX IF NOT EXISTS idx_forum_topics_is_trending ON forum_topics(is_trending);
    CREATE INDEX IF NOT EXISTS idx_forum_sources_enabled ON forum_sources(enabled);
  `);

  // ── Apps Market tables ──────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT NOT NULL,
      store TEXT NOT NULL,
      name TEXT NOT NULL,
      developer TEXT,
      description TEXT,
      icon_url TEXT,
      category TEXT DEFAULT 'general',
      subcategory TEXT,
      price REAL DEFAULT 0,
      is_free INTEGER DEFAULT 1,
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      downloads INTEGER DEFAULT 0,
      size_mb REAL DEFAULT 0,
      url TEXT,
      tags TEXT DEFAULT '[]',
      data_json TEXT DEFAULT '{}',
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(external_id, store)
    );

    CREATE TABLE IF NOT EXISTS app_rankings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER REFERENCES app_entries(id) ON DELETE CASCADE,
      store TEXT NOT NULL,
      category TEXT,
      rank INTEGER NOT NULL,
      previous_rank INTEGER,
      rank_delta INTEGER DEFAULT 0,
      rank_type TEXT DEFAULT 'top_free',
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER REFERENCES app_entries(id) ON DELETE CASCADE,
      rating REAL,
      rating_count INTEGER,
      downloads INTEGER,
      revenue_estimate REAL DEFAULT 0,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS store_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      parent_slug TEXT,
      app_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(store, slug)
    );

    CREATE INDEX IF NOT EXISTS idx_app_entries_external_id ON app_entries(external_id);
    CREATE INDEX IF NOT EXISTS idx_app_entries_store ON app_entries(store);
    CREATE INDEX IF NOT EXISTS idx_app_entries_category ON app_entries(category);
    CREATE INDEX IF NOT EXISTS idx_app_entries_rating ON app_entries(rating DESC);
    CREATE INDEX IF NOT EXISTS idx_app_entries_downloads ON app_entries(downloads DESC);
    CREATE INDEX IF NOT EXISTS idx_app_entries_first_seen ON app_entries(first_seen DESC);
    CREATE INDEX IF NOT EXISTS idx_app_rankings_app_id ON app_rankings(app_id);
    CREATE INDEX IF NOT EXISTS idx_app_rankings_store ON app_rankings(store);
    CREATE INDEX IF NOT EXISTS idx_app_rankings_rank_type ON app_rankings(rank_type);
    CREATE INDEX IF NOT EXISTS idx_app_rankings_recorded_at ON app_rankings(recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_app_rankings_rank_delta ON app_rankings(rank_delta DESC);
    CREATE INDEX IF NOT EXISTS idx_app_snapshots_app_id ON app_snapshots(app_id);
    CREATE INDEX IF NOT EXISTS idx_app_snapshots_recorded_at ON app_snapshots(recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_store_categories_store ON store_categories(store);
    CREATE INDEX IF NOT EXISTS idx_store_categories_slug ON store_categories(slug);
  `);

  // ── Region Analysis tables ──────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS region_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      trend_count INTEGER DEFAULT 0,
      avg_viral_score REAL DEFAULT 0,
      app_count INTEGER DEFAULT 0,
      forum_activity INTEGER DEFAULT 0,
      word_velocity REAL DEFAULT 0,
      total_mentions INTEGER DEFAULT 0,
      top_category TEXT,
      period TEXT DEFAULT 'daily',
      period_start DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(code, period, period_start)
    );

    CREATE TABLE IF NOT EXISTS region_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region_code TEXT NOT NULL,
      trend_count INTEGER DEFAULT 0,
      avg_viral_score REAL DEFAULT 0,
      app_count INTEGER DEFAULT 0,
      forum_activity INTEGER DEFAULT 0,
      word_velocity REAL DEFAULT 0,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS geo_trend_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trend_id INTEGER REFERENCES trends(id) ON DELETE CASCADE,
      region_code TEXT NOT NULL,
      relevance_score REAL DEFAULT 1.0,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(trend_id, region_code)
    );

    CREATE INDEX IF NOT EXISTS idx_region_metrics_code ON region_metrics(code);
    CREATE INDEX IF NOT EXISTS idx_region_metrics_period ON region_metrics(period);
    CREATE INDEX IF NOT EXISTS idx_region_metrics_code_period ON region_metrics(code, period);
    CREATE INDEX IF NOT EXISTS idx_region_snapshots_code ON region_snapshots(region_code);
    CREATE INDEX IF NOT EXISTS idx_region_snapshots_recorded_at ON region_snapshots(recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_geo_trend_links_trend_id ON geo_trend_links(trend_id);
    CREATE INDEX IF NOT EXISTS idx_geo_trend_links_region_code ON geo_trend_links(region_code);
  `);

  // Migration: add region columns to tables that lack them
  try { db.prepare("SELECT region FROM forum_posts LIMIT 0").run(); }
  catch { db.exec("ALTER TABLE forum_posts ADD COLUMN region TEXT DEFAULT 'global'"); }

  try { db.prepare("SELECT region FROM app_entries LIMIT 0").run(); }
  catch { db.exec("ALTER TABLE app_entries ADD COLUMN region TEXT DEFAULT 'global'"); }

  try { db.prepare("SELECT region FROM word_entries LIMIT 0").run(); }
  catch { db.exec("ALTER TABLE word_entries ADD COLUMN region TEXT DEFAULT 'global'"); }

  // Migration: add target_dashboard column if missing (for existing DBs)
  try {
    db.prepare("SELECT target_dashboard FROM cron_configs LIMIT 0").run();
  } catch {
    db.exec("ALTER TABLE cron_configs ADD COLUMN target_dashboard TEXT");
  }

  // Migration: add output_file column to cron_runs if missing
  try {
    db.prepare("SELECT output_file FROM cron_runs LIMIT 0").run();
  } catch {
    db.exec("ALTER TABLE cron_runs ADD COLUMN output_file TEXT");
  }

  // ── Calendar Trends tables ──────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT DEFAULT 'holiday',
      start_date TEXT NOT NULL,
      end_date TEXT,
      recurrence TEXT DEFAULT 'once',
      region TEXT DEFAULT 'global',
      impact_score REAL DEFAULT 50,
      categories TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      color TEXT DEFAULT '#3b82f6',
      data_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seasonal_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      pattern_type TEXT DEFAULT 'weekly',
      metric TEXT NOT NULL,
      baseline REAL DEFAULT 0,
      peak_value REAL DEFAULT 0,
      peak_period TEXT,
      trough_value REAL DEFAULT 0,
      trough_period TEXT,
      confidence REAL DEFAULT 0,
      sample_size INTEGER DEFAULT 0,
      data_json TEXT DEFAULT '{}',
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS engagement_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      milestone_type TEXT DEFAULT 'threshold',
      entity_type TEXT,
      entity_id INTEGER,
      entity_name TEXT,
      metric TEXT,
      value REAL DEFAULT 0,
      previous_value REAL DEFAULT 0,
      threshold REAL DEFAULT 0,
      calendar_event_id INTEGER REFERENCES calendar_events(id),
      significance REAL DEFAULT 0,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_region ON calendar_events(region);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_recurrence ON calendar_events(recurrence);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_impact ON calendar_events(impact_score DESC);
    CREATE INDEX IF NOT EXISTS idx_seasonal_patterns_type ON seasonal_patterns(pattern_type);
    CREATE INDEX IF NOT EXISTS idx_seasonal_patterns_metric ON seasonal_patterns(metric);
    CREATE INDEX IF NOT EXISTS idx_seasonal_patterns_confidence ON seasonal_patterns(confidence DESC);
    CREATE INDEX IF NOT EXISTS idx_milestones_type ON engagement_milestones(milestone_type);
    CREATE INDEX IF NOT EXISTS idx_milestones_entity ON engagement_milestones(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_milestones_event_id ON engagement_milestones(calendar_event_id);
    CREATE INDEX IF NOT EXISTS idx_milestones_detected ON engagement_milestones(detected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_milestones_significance ON engagement_milestones(significance DESC);
  `);

  // ── Sprint 6: Cross-Platform Correlations ──────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS correlations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      source_id INTEGER,
      source_name TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      target_name TEXT NOT NULL,
      correlation_type TEXT NOT NULL,
      strength REAL DEFAULT 0,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_correlations_source ON correlations(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_correlations_target ON correlations(target_type, target_id);
  `);

  // ── Sprint 6: Velocity Alerts ──────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS velocity_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      entity_name TEXT NOT NULL,
      velocity_score REAL DEFAULT 0,
      acceleration REAL DEFAULT 0,
      previous_score REAL DEFAULT 0,
      alert_level TEXT DEFAULT 'low',
      is_read INTEGER DEFAULT 0,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_velocity_alerts_level ON velocity_alerts(alert_level);
    CREATE INDEX IF NOT EXISTS idx_velocity_alerts_detected ON velocity_alerts(detected_at DESC);
  `);

  // ── Sprint 6: Competitor Watch ─────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'studio',
      website TEXT,
      description TEXT,
      tracked_since DATETIME DEFAULT CURRENT_TIMESTAMP,
      enabled INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS competitor_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competitor_id INTEGER REFERENCES competitors(id),
      app_count INTEGER DEFAULT 0,
      total_downloads INTEGER DEFAULT 0,
      avg_rating REAL DEFAULT 0,
      market_share REAL DEFAULT 0,
      snapshot_date DATE DEFAULT CURRENT_DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_competitor ON competitor_snapshots(competitor_id);
    CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_date ON competitor_snapshots(snapshot_date);
  `);

  // ── Auto-seed Calendar cron configs ─────────────────────────
  const calendarCronCount = db.prepare("SELECT COUNT(*) as count FROM cron_configs WHERE target_dashboard = 'calendar'").get() as { count: number };
  if (calendarCronCount.count < 3) {
    const insertCron = db.prepare(`
      INSERT OR IGNORE INTO cron_configs (name, description, prompt, schedule, agent, source_type, target_dashboard, enabled)
      VALUES (@name, @description, @prompt, @schedule, @agent, @source_type, @target_dashboard, @enabled)
    `);

    insertCron.run({
      name: 'Calendar Events Scanner',
      description: 'Scan for upcoming gaming industry events, holidays, and sales periods that impact mobile gaming engagement.',
      prompt: 'Search for upcoming gaming industry events, major holidays, app store sales, and cultural events that impact mobile gaming engagement. For each event found, provide: title, description, event_type (holiday/conference/sale/cultural/gaming/school), start_date, end_date, recurrence, region, impact_score (0-100), and relevant game categories. Output as JSON array of calendar_events.',
      schedule: '0 6 * * 1',
      agent: 'default',
      source_type: 'scanner',
      target_dashboard: 'calendar',
      enabled: 1,
    });

    insertCron.run({
      name: 'Pattern Detector',
      description: 'Analyze historical engagement data to detect recurring seasonal patterns in viral scores, downloads, and forum activity.',
      prompt: 'Analyze trend_snapshots, app_snapshots, and forum_posts tables for recurring patterns. Detect weekly patterns (day-of-week variations), monthly patterns (week-of-month), and seasonal patterns (quarter/month-of-year). For each pattern detected, compute baseline, peak, trough, and confidence score. Insert results into seasonal_patterns table.',
      schedule: '0 2 * * 0',
      agent: 'default',
      source_type: 'detector',
      target_dashboard: 'calendar',
      enabled: 1,
    });

    insertCron.run({
      name: 'Milestone Tracker',
      description: 'Monitor engagement metrics across trends, apps, words, and forums for significant threshold crossings, spikes, and records.',
      prompt: 'Check all tracked entities for engagement milestones. Look for: viral score threshold crossings (50/75/90), download spikes (>2x average), forum activity records, word frequency peaks, and region metric records. For each milestone, record the entity, metric, value, previous value, and attempt to correlate with recent calendar events. Insert results into engagement_milestones table.',
      schedule: '0 */4 * * *',
      agent: 'default',
      source_type: 'detector',
      target_dashboard: 'calendar',
      enabled: 1,
    });
  }

  // ── Auto-seed Velocity Scanner cron config ──────────────────
  const velocityCronCount = db.prepare("SELECT COUNT(*) as count FROM cron_configs WHERE name = 'Velocity Scanner'").get() as { count: number };
  if (velocityCronCount.count === 0) {
    db.prepare(`
      INSERT OR IGNORE INTO cron_configs (name, description, prompt, schedule, agent, source_type, target_dashboard, enabled)
      VALUES (@name, @description, @prompt, @schedule, @agent, @source_type, @target_dashboard, @enabled)
    `).run({
      name: 'Velocity Scanner',
      description: 'Scan trends, apps, forums, and words for velocity changes and acceleration. Creates alerts for fast-moving entities.',
      prompt: 'Run velocity scan across all tracked entities. Compute velocity (rate of change) and acceleration (rate of velocity change) for trends (viral_score), apps (downloads), forum posts (score), and words (frequency). Create velocity_alerts for entities exceeding thresholds: critical (velocity>=30 or accel>=100%), high (>=20 or >=50%), medium (>=10 or >=25%). Skip entities already alerted in past 24h.',
      schedule: '0 */2 * * *',
      agent: 'default',
      source_type: 'scanner',
      target_dashboard: 'velocity',
      enabled: 1,
    });
  }

  // ── Auto-seed Competitor Tracker cron config ────────────────
  const competitorCronCount = db.prepare("SELECT COUNT(*) as count FROM cron_configs WHERE name = 'Competitor Tracker'").get() as { count: number };
  if (competitorCronCount.count === 0) {
    db.prepare(`
      INSERT OR IGNORE INTO cron_configs (name, description, prompt, schedule, agent, source_type, target_dashboard, enabled)
      VALUES (@name, @description, @prompt, @schedule, @agent, @source_type, @target_dashboard, @enabled)
    `).run({
      name: 'Competitor Tracker',
      description: 'Daily snapshot of competitor metrics: app count, total downloads, average rating, and estimated market share.',
      prompt: 'For each enabled competitor, count their apps in app_entries (match by developer field), sum downloads, compute average rating, and estimate market share as percentage of total downloads. Insert a competitor_snapshot for each. Also auto-detect new competitors from app_entries developers with 3+ apps that are not yet tracked.',
      schedule: '0 6 * * *',
      agent: 'default',
      source_type: 'tracker',
      target_dashboard: 'competitors',
      enabled: 1,
    });
  }
}

// ── Trend helpers ──────────────────────────────────────────────

export function getTrends(opts?: { category?: string; region?: string; limit?: number; offset?: number; search?: string }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.category) { conditions.push('category = @category'); params.category = opts.category; }
  if (opts?.region) { conditions.push('region = @region'); params.region = opts.region; }
  if (opts?.search) { conditions.push('(title LIKE @search OR description LIKE @search)'); params.search = '%' + opts.search + '%'; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  return db.prepare(`SELECT * FROM trends ${where} ORDER BY viral_score DESC, detected_at DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
}

export function getTrendById(id: number) {
  return getDb().prepare('SELECT * FROM trends WHERE id = ?').get(id);
}

export function getTrendSnapshots(trendId: number) {
  return getDb().prepare('SELECT * FROM trend_snapshots WHERE trend_id = ? ORDER BY snapshot_at ASC').all(trendId);
}

export function getStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM trends').get() as { count: number };
  const emerging = db.prepare("SELECT COUNT(*) as count FROM trends WHERE lifecycle = 'emerging'").get() as { count: number };
  const trending = db.prepare("SELECT COUNT(*) as count FROM trends WHERE lifecycle = 'trending'").get() as { count: number };
  const avgScore = db.prepare('SELECT AVG(viral_score) as avg FROM trends').get() as { avg: number };
  const topCategories = db.prepare('SELECT category, COUNT(*) as count FROM trends GROUP BY category ORDER BY count DESC LIMIT 5').all();
  const topRegions = db.prepare('SELECT region, COUNT(*) as count FROM trends GROUP BY region ORDER BY count DESC LIMIT 5').all();
  return { total: total.count, emerging: emerging.count, trending: trending.count, avgScore: Math.round(avgScore.avg || 0), topCategories, topRegions };
}

// ── Cron helpers ──────────────────────────────────────────────

export function getCronConfigs() {
  return getDb().prepare('SELECT * FROM cron_configs ORDER BY created_at DESC').all();
}

export function getCronConfig(id: number) {
  return getDb().prepare('SELECT * FROM cron_configs WHERE id = ?').get(id);
}

export function createCronConfig(data: { name: string; description?: string; prompt: string; schedule: string; agent?: string; source_type?: string; target_dashboard?: string; enabled?: number }) {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO cron_configs (name, description, prompt, schedule, agent, source_type, target_dashboard, enabled) VALUES (@name, @description, @prompt, @schedule, @agent, @source_type, @target_dashboard, @enabled)');
  return stmt.run({ description: null, agent: 'default', source_type: null, target_dashboard: null, enabled: 1, ...data });
}

export function updateCronConfig(id: number, data: Partial<{ name: string; description: string; prompt: string; schedule: string; agent: string; source_type: string; target_dashboard: string; enabled: number }>) {
  const db = getDb();
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
  return db.prepare(`UPDATE cron_configs SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run({ ...data, id });
}

export function deleteCronConfig(id: number) {
  return getDb().prepare('DELETE FROM cron_configs WHERE id = ?').run(id);
}

export function getCronRuns(opts?: { configId?: number; status?: string; limit?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};
  const limit = opts?.limit || 50;

  if (opts?.configId) { conditions.push('cr.cron_config_id = @configId'); params.configId = opts.configId; }
  if (opts?.status) { conditions.push('cr.status = @status'); params.status = opts.status; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  return db.prepare(`
    SELECT cr.*, cc.name as cron_name, cc.target_dashboard as cron_dashboard
    FROM cron_runs cr
    LEFT JOIN cron_configs cc ON cr.cron_config_id = cc.id
    ${where}
    ORDER BY cr.started_at DESC, cr.created_at DESC
    LIMIT @limit
  `).all({ ...params, limit });
}

export function getCronRunStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM cron_runs').get() as { count: number };
  const success = db.prepare("SELECT COUNT(*) as count FROM cron_runs WHERE status = 'success'").get() as { count: number };
  const errors = db.prepare("SELECT COUNT(*) as count FROM cron_runs WHERE status = 'error'").get() as { count: number };
  const pending = db.prepare("SELECT COUNT(*) as count FROM cron_runs WHERE status = 'pending' OR status = 'running'").get() as { count: number };
  const totalItems = db.prepare('SELECT COALESCE(SUM(items_processed), 0) as total FROM cron_runs').get() as { total: number };
  return { total: total.count, success: success.count, errors: errors.count, pending: pending.count, totalItems: totalItems.total };
}

// ── Tag helpers ──────────────────────────────────────────────

export function getTopTags(limit = 30) {
  return getDb().prepare('SELECT * FROM tags ORDER BY count DESC LIMIT ?').all(limit);
}

// ── Word helpers ──────────────────────────────────────────────

export function getWords(opts?: { category?: string; source?: string; search?: string; limit?: number; offset?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.category) { conditions.push('category = @category'); params.category = opts.category; }
  if (opts?.source) { conditions.push('source = @source'); params.source = opts.source; }
  if (opts?.search) { conditions.push('word LIKE @search'); params.search = '%' + opts.search + '%'; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 100;
  const offset = opts?.offset || 0;

  return db.prepare(`SELECT * FROM word_entries ${where} ORDER BY score DESC, frequency DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
}

export function getWordStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM word_entries').get() as { count: number };
  const trending = db.prepare('SELECT COUNT(*) as count FROM word_entries WHERE growth > 0').get() as { count: number };
  const avgFreq = db.prepare('SELECT AVG(frequency) as avg FROM word_entries').get() as { avg: number };
  const topCategoryRow = db.prepare('SELECT category, COUNT(*) as count FROM word_entries GROUP BY category ORDER BY count DESC LIMIT 1').get() as { category: string; count: number } | undefined;
  const categories = db.prepare('SELECT category, COUNT(*) as count FROM word_entries GROUP BY category ORDER BY count DESC LIMIT 10').all();
  const sources = db.prepare('SELECT source, COUNT(*) as count FROM word_entries GROUP BY source ORDER BY count DESC LIMIT 10').all();
  return {
    total: total.count,
    trending: trending.count,
    avgFrequency: Math.round(avgFreq.avg || 0),
    topCategory: topCategoryRow?.category || 'N/A',
    categories,
    sources,
  };
}

export function getWordFrequency(opts?: { wordId?: number; word?: string; periodType?: string; limit?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.wordId) { conditions.push('wf.word_id = @wordId'); params.wordId = opts.wordId; }
  if (opts?.word) {
    conditions.push('we.word = @word');
    params.word = opts.word;
  }
  if (opts?.periodType) { conditions.push('wf.period_type = @periodType'); params.periodType = opts.periodType; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 90;

  return db.prepare(`
    SELECT wf.*, we.word FROM word_frequencies wf
    LEFT JOIN word_entries we ON wf.word_id = we.id
    ${where}
    ORDER BY wf.period ASC
    LIMIT @limit
  `).all({ ...params, limit });
}

export function getTopWords(opts?: { category?: string; limit?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.category) { conditions.push('category = @category'); params.category = opts.category; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 20;

  return db.prepare(`SELECT * FROM word_entries ${where} ORDER BY score DESC, frequency DESC LIMIT @limit`).all({ ...params, limit });
}

export function getWordCompetitions(opts?: { category?: string; limit?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.category) { conditions.push('wc.category = @category'); params.category = opts.category; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 50;

  return db.prepare(`
    SELECT wc.*, wa.word as word_a, wb.word as word_b
    FROM word_competitions wc
    LEFT JOIN word_entries wa ON wc.word_a_id = wa.id
    LEFT JOIN word_entries wb ON wc.word_b_id = wb.id
    ${where}
    ORDER BY wc.overlap_score DESC
    LIMIT @limit
  `).all({ ...params, limit });
}

export function getWordClusters(opts?: { category?: string; limit?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.category) { conditions.push('category = @category'); params.category = opts.category; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 20;

  return db.prepare(`SELECT * FROM word_clusters ${where} ORDER BY coherence_score DESC LIMIT @limit`).all({ ...params, limit });
}

export function upsertWordEntry(data: { word: string; source?: string; category?: string; frequency?: number; score?: number; growth?: number; sentiment?: number; data_json?: string }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO word_entries (word, source, category, frequency, score, growth, sentiment, data_json)
    VALUES (@word, @source, @category, @frequency, @score, @growth, @sentiment, @data_json)
    ON CONFLICT(word, source) DO UPDATE SET
      frequency = frequency + @frequency,
      score = @score,
      growth = @growth,
      sentiment = @sentiment,
      last_seen = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `);
  return stmt.run({
    word: data.word,
    source: data.source || null,
    category: data.category || 'general',
    frequency: data.frequency || 1,
    score: data.score || 0,
    growth: data.growth || 0,
    sentiment: data.sentiment || 0,
    data_json: data.data_json || '{}',
  });
}

export function upsertWordFrequency(data: { word_id: number; frequency: number; mentions?: number; period: string; period_type?: string }) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO word_frequencies (word_id, frequency, mentions, period, period_type)
    VALUES (@word_id, @frequency, @mentions, @period, @period_type)
  `).run({
    word_id: data.word_id,
    frequency: data.frequency,
    mentions: data.mentions || 0,
    period: data.period,
    period_type: data.period_type || 'daily',
  });
}

export function upsertWordCompetition(data: { word_a_id: number; word_b_id: number; overlap_score: number; context?: string; category?: string }) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO word_competitions (word_a_id, word_b_id, overlap_score, context, category)
    VALUES (@word_a_id, @word_b_id, @overlap_score, @context, @category)
  `).run({
    word_a_id: data.word_a_id,
    word_b_id: data.word_b_id,
    overlap_score: data.overlap_score,
    context: data.context || null,
    category: data.category || null,
  });
}

// ── Forum helpers ──────────────────────────────────────────────

export function getForumPosts(opts?: { source?: string; category?: string; search?: string; trending?: boolean; limit?: number; offset?: number; sort?: string }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.source) { conditions.push('source = @source'); params.source = opts.source; }
  if (opts?.category) { conditions.push('category = @category'); params.category = opts.category; }
  if (opts?.search) { conditions.push('(title LIKE @search OR body LIKE @search)'); params.search = '%' + opts.search + '%'; }
  if (opts?.trending) { conditions.push('is_trending = 1'); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  let orderBy = 'published_at DESC, score DESC';
  if (opts?.sort === 'score') orderBy = 'score DESC';
  if (opts?.sort === 'comments') orderBy = 'comments DESC';
  if (opts?.sort === 'sentiment') orderBy = 'sentiment DESC';
  if (opts?.sort === 'newest') orderBy = 'published_at DESC';

  return db.prepare(`SELECT * FROM forum_posts ${where} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
}

export function getForumStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM forum_posts').get() as { count: number };
  const activeSources = db.prepare('SELECT COUNT(*) as count FROM forum_sources WHERE enabled = 1').get() as { count: number };
  const avgSentiment = db.prepare('SELECT AVG(sentiment) as avg FROM forum_posts').get() as { avg: number };
  const trendingTopics = db.prepare('SELECT COUNT(*) as count FROM forum_topics WHERE is_trending = 1').get() as { count: number };
  const topSources = db.prepare('SELECT source, COUNT(*) as count, AVG(sentiment) as avg_sentiment, AVG(score) as avg_score FROM forum_posts GROUP BY source ORDER BY count DESC LIMIT 10').all();
  const topCategories = db.prepare('SELECT category, COUNT(*) as count FROM forum_posts GROUP BY category ORDER BY count DESC LIMIT 10').all();
  const recentActivity = db.prepare('SELECT DATE(published_at) as day, COUNT(*) as count, AVG(sentiment) as avg_sentiment FROM forum_posts WHERE published_at IS NOT NULL GROUP BY DATE(published_at) ORDER BY day DESC LIMIT 30').all();

  return {
    totalPosts: total.count,
    activeSources: activeSources.count,
    avgSentiment: Math.round((avgSentiment.avg || 0) * 100) / 100,
    trendingTopics: trendingTopics.count,
    topSources,
    topCategories,
    recentActivity,
  };
}

export function getForumTopics(opts?: { trending?: boolean; limit?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.trending) { conditions.push('is_trending = 1'); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 30;

  return db.prepare(`SELECT * FROM forum_topics ${where} ORDER BY post_count DESC, avg_score DESC LIMIT @limit`).all({ ...params, limit });
}

export function getForumSources() {
  return getDb().prepare('SELECT * FROM forum_sources ORDER BY post_count DESC, name ASC').all();
}

export function createForumSource(data: { name: string; type?: string; url?: string; icon?: string; description?: string; enabled?: number; scrape_config?: string }) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO forum_sources (name, type, url, icon, description, enabled, scrape_config)
    VALUES (@name, @type, @url, @icon, @description, @enabled, @scrape_config)
  `).run({
    name: data.name,
    type: data.type || 'forum',
    url: data.url || null,
    icon: data.icon || null,
    description: data.description || null,
    enabled: data.enabled ?? 1,
    scrape_config: data.scrape_config || '{}',
  });
}

export function updateForumSource(id: number, data: Partial<{ name: string; type: string; url: string; icon: string; description: string; enabled: number; scrape_config: string }>) {
  const db = getDb();
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
  if (!fields) return;
  return db.prepare(`UPDATE forum_sources SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run({ ...data, id });
}

export function deleteForumSource(id: number) {
  return getDb().prepare('DELETE FROM forum_sources WHERE id = ?').run(id);
}

export function upsertForumPost(data: {
  external_id: string; source: string; source_id?: number; title: string; body?: string;
  author?: string; url?: string; score?: number; comments?: number; sentiment?: number;
  category?: string; tags?: string; is_trending?: number; hot_words?: string; data_json?: string;
  published_at?: string;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO forum_posts (external_id, source, source_id, title, body, author, url, score, comments, sentiment, category, tags, is_trending, hot_words, data_json, published_at)
    VALUES (@external_id, @source, @source_id, @title, @body, @author, @url, @score, @comments, @sentiment, @category, @tags, @is_trending, @hot_words, @data_json, @published_at)
    ON CONFLICT(external_id, source) DO UPDATE SET
      title = @title,
      body = @body,
      score = @score,
      comments = @comments,
      sentiment = @sentiment,
      is_trending = @is_trending,
      hot_words = @hot_words,
      updated_at = CURRENT_TIMESTAMP
  `).run({
    external_id: data.external_id,
    source: data.source,
    source_id: data.source_id || null,
    title: data.title,
    body: data.body || null,
    author: data.author || null,
    url: data.url || null,
    score: data.score || 0,
    comments: data.comments || 0,
    sentiment: data.sentiment || 0,
    category: data.category || 'general',
    tags: data.tags || '[]',
    is_trending: data.is_trending || 0,
    hot_words: data.hot_words || '[]',
    data_json: data.data_json || '{}',
    published_at: data.published_at || null,
  });
}

export function upsertForumTopic(data: {
  name: string; slug: string; post_count?: number; avg_sentiment?: number;
  avg_score?: number; sources?: string; is_trending?: number;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO forum_topics (name, slug, post_count, avg_sentiment, avg_score, sources, is_trending)
    VALUES (@name, @slug, @post_count, @avg_sentiment, @avg_score, @sources, @is_trending)
    ON CONFLICT(slug) DO UPDATE SET
      post_count = @post_count,
      avg_sentiment = @avg_sentiment,
      avg_score = @avg_score,
      sources = @sources,
      is_trending = @is_trending,
      last_seen = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).run({
    name: data.name,
    slug: data.slug,
    post_count: data.post_count || 0,
    avg_sentiment: data.avg_sentiment || 0,
    avg_score: data.avg_score || 0,
    sources: data.sources || '[]',
    is_trending: data.is_trending || 0,
  });
}

// ── Forum Cross-Reference ──────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','it',
  'was','are','were','be','been','being','have','has','had','do','does','did','will','would',
  'could','should','may','might','shall','can','need','must','this','that','these','those',
  'i','me','my','we','our','you','your','he','she','they','them','their','its','who','what',
  'which','when','where','how','why','not','no','so','if','then','than','too','very','just',
  'about','up','out','into','over','after','before','between','under','again','more','most',
  'other','some','such','only','same','also','new','one','two','first','last','get','got',
  'all','any','each','every','both','few','many','much','own','still','back','even','here',
  'there','now','really','like','game','games','gaming',
]);

function extractTerms(text: string): string[] {
  if (!text) return [];
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

export function crossReferenceForumWords(): { postsUpdated: number; wordsLinked: number; frequenciesCreated: number } {
  const db = getDb();
  let postsUpdated = 0;
  let wordsLinked = 0;
  let frequenciesCreated = 0;

  // Get trending/high-score words from word_entries
  const trendingWords = db.prepare('SELECT id, word, score, source FROM word_entries WHERE score > 20 OR growth > 5 ORDER BY score DESC LIMIT 200').all() as Array<{ id: number; word: string; score: number; source: string }>;
  const trendingWordMap = new Map<string, { id: number; score: number }>();
  for (const w of trendingWords) {
    trendingWordMap.set(w.word.toLowerCase(), { id: w.id, score: w.score });
  }

  // Get all forum posts
  const posts = db.prepare('SELECT id, title, body, source FROM forum_posts').all() as Array<{ id: number; title: string; body: string; source: string }>;

  const today = new Date().toISOString().slice(0, 10);
  const updateHotWords = db.prepare('UPDATE forum_posts SET hot_words = @hot_words, updated_at = CURRENT_TIMESTAMP WHERE id = @id');

  // Word frequency tracking: word_id -> { freq, sources }
  const wordFreqMap = new Map<number, { freq: number; sources: Set<string> }>();

  const transaction = db.transaction(() => {
    for (const post of posts) {
      const terms = extractTerms((post.title || '') + ' ' + (post.body || ''));
      const hotWords: string[] = [];

      for (const term of terms) {
        const match = trendingWordMap.get(term);
        if (match) {
          hotWords.push(term);
          wordsLinked++;

          const existing = wordFreqMap.get(match.id);
          if (existing) {
            existing.freq++;
            existing.sources.add(post.source);
          } else {
            const srcSet = new Set<string>();
            srcSet.add(post.source);
            wordFreqMap.set(match.id, { freq: 1, sources: srcSet });
          }
        }
      }

      if (hotWords.length > 0) {
        updateHotWords.run({ id: post.id, hot_words: JSON.stringify(hotWords) });
        postsUpdated++;
      }
    }

    // Create word_frequencies entries with source="forums"
    const upsertFreq = db.prepare(`
      INSERT INTO word_frequencies (word_id, frequency, mentions, period, period_type)
      VALUES (@word_id, @frequency, @mentions, @period, @period_type)
    `);

    for (const [wordId, data] of wordFreqMap) {
      upsertFreq.run({
        word_id: wordId,
        frequency: data.freq,
        mentions: data.freq,
        period: today,
        period_type: 'daily',
      });
      frequenciesCreated++;
    }
  });

  transaction();

  return { postsUpdated, wordsLinked, frequenciesCreated };
}

// ── Apps Market helpers ──────────────────────────────────────

export function getAppEntries(opts?: { store?: string; category?: string; search?: string; is_free?: boolean; limit?: number; offset?: number; sort?: string }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.store) { conditions.push('store = @store'); params.store = opts.store; }
  if (opts?.category) { conditions.push('category = @category'); params.category = opts.category; }
  if (opts?.search) { conditions.push('(name LIKE @search OR developer LIKE @search)'); params.search = '%' + opts.search + '%'; }
  if (opts?.is_free !== undefined) { conditions.push('is_free = @is_free'); params.is_free = opts.is_free ? 1 : 0; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  let orderBy = 'downloads DESC, rating DESC';
  if (opts?.sort === 'rating') orderBy = 'rating DESC, rating_count DESC';
  if (opts?.sort === 'newest') orderBy = 'first_seen DESC';
  if (opts?.sort === 'name') orderBy = 'name ASC';
  if (opts?.sort === 'downloads') orderBy = 'downloads DESC';

  return db.prepare(`SELECT * FROM app_entries ${where} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
}

export function getAppStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM app_entries').get() as { count: number };

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const newThisWeek = db.prepare('SELECT COUNT(*) as count FROM app_entries WHERE first_seen >= ?').get(weekAgo) as { count: number };

  const avgRating = db.prepare('SELECT AVG(rating) as avg FROM app_entries WHERE rating > 0').get() as { avg: number };

  const topClimber = db.prepare(`
    SELECT ae.name, ar.rank_delta FROM app_rankings ar
    JOIN app_entries ae ON ar.app_id = ae.id
    WHERE ar.rank_delta > 0
    ORDER BY ar.rank_delta DESC LIMIT 1
  `).get() as { name: string; rank_delta: number } | undefined;

  const storeBreakdown = db.prepare('SELECT store, COUNT(*) as count FROM app_entries GROUP BY store ORDER BY count DESC').all();
  const categoryBreakdown = db.prepare('SELECT category, COUNT(*) as count FROM app_entries GROUP BY category ORDER BY count DESC LIMIT 10').all();

  return {
    total: total.count,
    newThisWeek: newThisWeek.count,
    avgRating: Math.round((avgRating.avg || 0) * 100) / 100,
    topClimber: topClimber ? { name: topClimber.name, delta: topClimber.rank_delta } : null,
    storeBreakdown,
    categoryBreakdown,
  };
}

export function getAppRankings(opts?: { store?: string; category?: string; rank_type?: string; limit?: number; offset?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.store) { conditions.push('ar.store = @store'); params.store = opts.store; }
  if (opts?.category) { conditions.push('ar.category = @category'); params.category = opts.category; }
  if (opts?.rank_type) { conditions.push('ar.rank_type = @rank_type'); params.rank_type = opts.rank_type; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  return db.prepare(`
    SELECT ar.*, ae.name, ae.developer, ae.icon_url, ae.rating, ae.rating_count, ae.downloads, ae.is_free, ae.price, ae.url as app_url
    FROM app_rankings ar
    JOIN app_entries ae ON ar.app_id = ae.id
    ${where}
    ORDER BY ar.rank ASC, ar.recorded_at DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });
}

export function getTopMovers(opts?: { store?: string; direction?: 'up' | 'down'; limit?: number }) {
  const db = getDb();
  const conditions: string[] = ['ar.rank_delta != 0'];
  const params: Record<string, unknown> = {};

  if (opts?.store) { conditions.push('ar.store = @store'); params.store = opts.store; }
  if (opts?.direction === 'up') { conditions.push('ar.rank_delta > 0'); }
  if (opts?.direction === 'down') { conditions.push('ar.rank_delta < 0'); }

  const where = 'WHERE ' + conditions.join(' AND ');
  const limit = opts?.limit || 20;

  return db.prepare(`
    SELECT ar.*, ae.name, ae.developer, ae.icon_url, ae.rating, ae.downloads, ae.category, ae.is_free
    FROM app_rankings ar
    JOIN app_entries ae ON ar.app_id = ae.id
    ${where}
    ORDER BY ABS(ar.rank_delta) DESC
    LIMIT @limit
  `).all({ ...params, limit });
}

export function getNewApps(opts?: { store?: string; limit?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.store) { conditions.push('store = @store'); params.store = opts.store; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 20;

  return db.prepare(`
    SELECT * FROM app_entries ${where}
    ORDER BY first_seen DESC
    LIMIT @limit
  `).all({ ...params, limit });
}

export function getAppHistory(appId: number) {
  const db = getDb();
  const app = db.prepare('SELECT * FROM app_entries WHERE id = ?').get(appId);
  const rankings = db.prepare('SELECT * FROM app_rankings WHERE app_id = ? ORDER BY recorded_at ASC').all(appId);
  const snapshots = db.prepare('SELECT * FROM app_snapshots WHERE app_id = ? ORDER BY recorded_at ASC').all(appId);
  return { app, rankings, snapshots };
}

export function upsertAppEntry(data: {
  external_id: string; store: string; name: string; developer?: string; description?: string;
  icon_url?: string; category?: string; subcategory?: string; price?: number; is_free?: boolean;
  rating?: number; rating_count?: number; downloads?: number; size_mb?: number; url?: string;
  tags?: string; data_json?: string;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO app_entries (external_id, store, name, developer, description, icon_url, category, subcategory, price, is_free, rating, rating_count, downloads, size_mb, url, tags, data_json)
    VALUES (@external_id, @store, @name, @developer, @description, @icon_url, @category, @subcategory, @price, @is_free, @rating, @rating_count, @downloads, @size_mb, @url, @tags, @data_json)
    ON CONFLICT(external_id, store) DO UPDATE SET
      name = @name,
      developer = @developer,
      description = @description,
      icon_url = @icon_url,
      category = @category,
      subcategory = @subcategory,
      price = @price,
      is_free = @is_free,
      rating = @rating,
      rating_count = @rating_count,
      downloads = @downloads,
      size_mb = @size_mb,
      url = @url,
      tags = @tags,
      data_json = @data_json,
      last_seen = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).run({
    external_id: data.external_id,
    store: data.store,
    name: data.name,
    developer: data.developer || null,
    description: data.description || null,
    icon_url: data.icon_url || null,
    category: data.category || 'general',
    subcategory: data.subcategory || null,
    price: data.price || 0,
    is_free: data.is_free !== false ? 1 : 0,
    rating: data.rating || 0,
    rating_count: data.rating_count || 0,
    downloads: data.downloads || 0,
    size_mb: data.size_mb || 0,
    url: data.url || null,
    tags: data.tags || '[]',
    data_json: data.data_json || '{}',
  });
}

export function insertAppRanking(data: {
  app_id: number; store: string; category?: string; rank: number;
  previous_rank?: number; rank_delta?: number; rank_type?: string;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO app_rankings (app_id, store, category, rank, previous_rank, rank_delta, rank_type)
    VALUES (@app_id, @store, @category, @rank, @previous_rank, @rank_delta, @rank_type)
  `).run({
    app_id: data.app_id,
    store: data.store,
    category: data.category || null,
    rank: data.rank,
    previous_rank: data.previous_rank || null,
    rank_delta: data.rank_delta || 0,
    rank_type: data.rank_type || 'top_free',
  });
}

export function insertAppSnapshot(data: {
  app_id: number; rating?: number; rating_count?: number;
  downloads?: number; revenue_estimate?: number;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO app_snapshots (app_id, rating, rating_count, downloads, revenue_estimate)
    VALUES (@app_id, @rating, @rating_count, @downloads, @revenue_estimate)
  `).run({
    app_id: data.app_id,
    rating: data.rating || null,
    rating_count: data.rating_count || null,
    downloads: data.downloads || null,
    revenue_estimate: data.revenue_estimate || 0,
  });
}

// ── Apps ↔ Words Cross-Reference ───────────────────────────

export function crossReferenceAppWords(): { appsProcessed: number; wordsCreated: number; frequenciesCreated: number } {
  const db = getDb();
  let appsProcessed = 0;
  let wordsCreated = 0;
  let frequenciesCreated = 0;

  const apps = db.prepare('SELECT id, name, description, store, category FROM app_entries').all() as Array<{
    id: number; name: string; description: string | null; store: string; category: string;
  }>;

  const today = new Date().toISOString().slice(0, 10);

  // Track keyword frequencies across apps
  const keywordFreqMap = new Map<string, { freq: number; stores: Set<string>; categories: Set<string> }>();

  for (const app of apps) {
    const text = (app.name || '') + ' ' + (app.description || '');
    const terms = extractTerms(text);

    for (const term of terms) {
      const existing = keywordFreqMap.get(term);
      if (existing) {
        existing.freq++;
        existing.stores.add(app.store);
        existing.categories.add(app.category);
      } else {
        const stores = new Set<string>();
        stores.add(app.store);
        const cats = new Set<string>();
        cats.add(app.category);
        keywordFreqMap.set(term, { freq: 1, stores, categories: cats });
      }
    }
    appsProcessed++;
  }

  const transaction = db.transaction(() => {
    const upsertWord = db.prepare(`
      INSERT INTO word_entries (word, source, category, frequency, score, growth, sentiment, data_json)
      VALUES (@word, 'appstore', @category, @frequency, @score, 0, 0, @data_json)
      ON CONFLICT(word, source) DO UPDATE SET
        frequency = @frequency,
        score = @score,
        last_seen = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `);

    const insertFreq = db.prepare(`
      INSERT INTO word_frequencies (word_id, frequency, mentions, period, period_type)
      VALUES (@word_id, @frequency, @mentions, @period, @period_type)
    `);

    // Only process keywords that appear in 2+ apps (to filter noise)
    for (const [word, data] of keywordFreqMap) {
      if (data.freq < 2) continue;

      const score = Math.min(100, data.freq * 5 + data.stores.size * 10);
      const storesArr = Array.from(data.stores);
      const catsArr = Array.from(data.categories);

      const result = upsertWord.run({
        word,
        category: catsArr[0] || 'general',
        frequency: data.freq,
        score,
        data_json: JSON.stringify({ stores: storesArr, categories: catsArr, app_mentions: data.freq }),
      });

      let wordId = Number(result.lastInsertRowid);
      if (!wordId || result.changes === 0) {
        const existing = db.prepare("SELECT id FROM word_entries WHERE word = ? AND source = 'appstore'").get(word) as { id: number } | undefined;
        if (existing) wordId = existing.id;
      }
      if (result.changes > 0 && !wordId) {
        const existing = db.prepare("SELECT id FROM word_entries WHERE word = ? AND source = 'appstore'").get(word) as { id: number } | undefined;
        if (existing) wordId = existing.id;
      }

      if (wordId) {
        insertFreq.run({
          word_id: wordId,
          frequency: data.freq,
          mentions: data.freq,
          period: today,
          period_type: 'daily',
        });
        frequenciesCreated++;
      }
      wordsCreated++;
    }
  });

  transaction();

  return { appsProcessed, wordsCreated, frequenciesCreated };
}

export function getAppTrendingKeywords(limit = 20): Array<{ word: string; frequency: number; score: number; data_json: string }> {
  const db = getDb();
  return db.prepare(`
    SELECT word, frequency, score, data_json FROM word_entries
    WHERE source = 'appstore' AND frequency >= 2
    ORDER BY score DESC, frequency DESC
    LIMIT ?
  `).all(limit) as Array<{ word: string; frequency: number; score: number; data_json: string }>;
}

export function getAppStoreComparison(appName: string) {
  const db = getDb();
  return db.prepare(`
    SELECT ae.*, 
      (SELECT ar.rank FROM app_rankings ar WHERE ar.app_id = ae.id ORDER BY ar.recorded_at DESC LIMIT 1) as latest_rank,
      (SELECT ar.rank_delta FROM app_rankings ar WHERE ar.app_id = ae.id ORDER BY ar.recorded_at DESC LIMIT 1) as latest_rank_delta
    FROM app_entries ae
    WHERE ae.name = ?
    ORDER BY ae.store ASC
  `).all(appName) as Array<Record<string, unknown>>;
}

// ── Region Analysis helpers ──────────────────────────────────

const REGION_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France', JP: 'Japan',
  KR: 'South Korea', CN: 'China', BR: 'Brazil', IN: 'India', CA: 'Canada',
  AU: 'Australia', MX: 'Mexico', ES: 'Spain', IT: 'Italy', RU: 'Russia',
  TR: 'Turkey', ID: 'Indonesia', TH: 'Thailand', VN: 'Vietnam', PH: 'Philippines',
  PL: 'Poland', NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', FI: 'Finland',
  DK: 'Denmark', AR: 'Argentina', CO: 'Colombia', CL: 'Chile', PE: 'Peru',
  ZA: 'South Africa', NG: 'Nigeria', EG: 'Egypt', SA: 'Saudi Arabia', AE: 'UAE',
  SG: 'Singapore', MY: 'Malaysia', TW: 'Taiwan', HK: 'Hong Kong', IL: 'Israel',
  PT: 'Portugal', AT: 'Austria', CH: 'Switzerland', BE: 'Belgium', IE: 'Ireland',
  NZ: 'New Zealand', CZ: 'Czech Republic', RO: 'Romania', UA: 'Ukraine', PK: 'Pakistan',
};

export function getRegionName(code: string): string {
  return REGION_NAMES[code] || code;
}

export function getRegions(opts?: { period?: string; search?: string; limit?: number; offset?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.period) { conditions.push('period = @period'); params.period = opts.period; }
  if (opts?.search) { conditions.push('(name LIKE @search OR code LIKE @search)'); params.search = '%' + opts.search + '%'; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 100;
  const offset = opts?.offset || 0;

  return db.prepare(`SELECT * FROM region_metrics ${where} ORDER BY avg_viral_score DESC, trend_count DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
}

export function getRegionStats() {
  const db = getDb();
  const totalRegions = db.prepare('SELECT COUNT(DISTINCT code) as count FROM region_metrics').get() as { count: number };
  const totalTrends = db.prepare("SELECT COALESCE(SUM(trend_count), 0) as total FROM region_metrics WHERE period = 'daily'").get() as { total: number };
  const avgViral = db.prepare("SELECT AVG(avg_viral_score) as avg FROM region_metrics WHERE period = 'daily'").get() as { avg: number };
  const topRegion = db.prepare("SELECT code, name, avg_viral_score FROM region_metrics WHERE period = 'daily' ORDER BY avg_viral_score DESC LIMIT 1").get() as { code: string; name: string; avg_viral_score: number } | undefined;
  const topByApps = db.prepare("SELECT code, name, app_count FROM region_metrics WHERE period = 'daily' ORDER BY app_count DESC LIMIT 1").get() as { code: string; name: string; app_count: number } | undefined;
  const topByForum = db.prepare("SELECT code, name, forum_activity FROM region_metrics WHERE period = 'daily' ORDER BY forum_activity DESC LIMIT 1").get() as { code: string; name: string; forum_activity: number } | undefined;

  return {
    totalRegions: totalRegions.count,
    totalTrends: totalTrends.total,
    avgViralScore: Math.round((avgViral.avg || 0) * 100) / 100,
    topRegion: topRegion || null,
    topByApps: topByApps || null,
    topByForum: topByForum || null,
  };
}

export function getMapData(opts?: { metric?: string; period?: string }) {
  const db = getDb();
  const period = opts?.period || 'daily';
  const rows = db.prepare('SELECT code, name, trend_count, avg_viral_score, app_count, forum_activity, word_velocity, total_mentions FROM region_metrics WHERE period = @period ORDER BY avg_viral_score DESC').all({ period }) as Array<Record<string, unknown>>;

  const metric = opts?.metric || 'avg_viral_score';
  let maxVal = 1;
  for (const r of rows) {
    const v = (r[metric] as number) || 0;
    if (v > maxVal) maxVal = v;
  }

  return rows.map(r => ({
    code: r.code as string,
    name: r.name as string,
    value: (r[metric] as number) || 0,
    normalized: ((r[metric] as number) || 0) / maxVal,
    trend_count: r.trend_count as number,
    avg_viral_score: r.avg_viral_score as number,
    app_count: r.app_count as number,
    forum_activity: r.forum_activity as number,
    word_velocity: r.word_velocity as number,
    total_mentions: r.total_mentions as number,
  }));
}

export function compareRegions(codes: string[]) {
  const db = getDb();
  if (!codes.length) return [];
  const placeholders = codes.map(() => '?').join(',');
  return db.prepare(`SELECT * FROM region_metrics WHERE code IN (${placeholders}) AND period = 'daily' ORDER BY avg_viral_score DESC`).all(...codes);
}

export function getRegionDetail(code: string) {
  const db = getDb();
  const metrics = db.prepare("SELECT * FROM region_metrics WHERE code = @code AND period = 'daily' LIMIT 1").get({ code }) as Record<string, unknown> | undefined;
  const snapshots = db.prepare('SELECT * FROM region_snapshots WHERE region_code = @code ORDER BY recorded_at DESC LIMIT 30').all({ code });
  const linkedTrendIds = db.prepare('SELECT trend_id, relevance_score FROM geo_trend_links WHERE region_code = @code ORDER BY relevance_score DESC LIMIT 20').all({ code }) as Array<{ trend_id: number; relevance_score: number }>;

  let trends;
  if (linkedTrendIds.length > 0) {
    const ids = linkedTrendIds.map(l => l.trend_id);
    const ph = ids.map(() => '?').join(',');
    trends = db.prepare(`SELECT * FROM trends WHERE id IN (${ph}) ORDER BY viral_score DESC`).all(...ids);
  } else {
    trends = db.prepare('SELECT * FROM trends WHERE region = @code ORDER BY viral_score DESC LIMIT 20').all({ code });
  }

  // Get top words for this region
  let words: unknown[] = [];
  try {
    words = db.prepare('SELECT * FROM word_entries WHERE region = @code ORDER BY score DESC LIMIT 10').all({ code });
  } catch { /* region column may not exist */ }

  // Get forum posts for this region
  let forumPosts: unknown[] = [];
  try {
    forumPosts = db.prepare('SELECT * FROM forum_posts WHERE region = @code ORDER BY score DESC LIMIT 10').all({ code });
  } catch { /* region column may not exist */ }

  // Get apps for this region
  let apps: unknown[] = [];
  try {
    apps = db.prepare('SELECT * FROM app_entries WHERE region = @code ORDER BY downloads DESC LIMIT 10').all({ code });
  } catch { /* region column may not exist */ }

  return { metrics: metrics || null, snapshots, trends, words, forumPosts, apps };
}

export function getRegionTrends(code: string, opts?: { limit?: number; offset?: number }) {
  const db = getDb();
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  const linked = db.prepare(`
    SELECT t.*, gtl.relevance_score FROM geo_trend_links gtl
    JOIN trends t ON gtl.trend_id = t.id
    WHERE gtl.region_code = @code
    ORDER BY t.viral_score DESC
    LIMIT @limit OFFSET @offset
  `).all({ code, limit, offset });

  if (linked.length > 0) return linked;

  return db.prepare('SELECT * FROM trends WHERE region = @code ORDER BY viral_score DESC LIMIT @limit OFFSET @offset').all({ code, limit, offset });
}

export function rebuildRegionMetrics(): { regionsProcessed: number; snapshotsCreated: number } {
  const db = getDb();
  let regionsProcessed = 0;
  let snapshotsCreated = 0;

  const transaction = db.transaction(() => {
    // Clear current daily metrics
    db.prepare("DELETE FROM region_metrics WHERE period = 'daily'").run();

    // Aggregate from trends table (primary source — has region column)
    const trendsByRegion = db.prepare(`
      SELECT region as code,
        COUNT(*) as trend_count,
        AVG(viral_score) as avg_viral_score,
        COALESCE(SUM(mentions), 0) as total_mentions,
        (SELECT category FROM trends t2 WHERE t2.region = trends.region GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1) as top_category
      FROM trends
      WHERE region IS NOT NULL AND region != '' AND region != 'global'
      GROUP BY region
    `).all() as Array<{ code: string; trend_count: number; avg_viral_score: number; total_mentions: number; top_category: string }>;

    // Build aggregation map
    const regionMap = new Map<string, { trend_count: number; avg_viral_score: number; app_count: number; forum_activity: number; word_velocity: number; total_mentions: number; top_category: string }>();

    for (const r of trendsByRegion) {
      regionMap.set(r.code, {
        trend_count: r.trend_count,
        avg_viral_score: r.avg_viral_score || 0,
        app_count: 0,
        forum_activity: 0,
        word_velocity: 0,
        total_mentions: r.total_mentions || 0,
        top_category: r.top_category || 'general',
      });
    }

    // Aggregate forum_posts by region (column added via migration)
    try {
      const forumByRegion = db.prepare(`
        SELECT region as code, COUNT(*) as count
        FROM forum_posts
        WHERE region IS NOT NULL AND region != '' AND region != 'global'
        GROUP BY region
      `).all() as Array<{ code: string; count: number }>;

      for (const f of forumByRegion) {
        const existing = regionMap.get(f.code);
        if (existing) {
          existing.forum_activity = f.count;
        } else {
          regionMap.set(f.code, { trend_count: 0, avg_viral_score: 0, app_count: 0, forum_activity: f.count, word_velocity: 0, total_mentions: 0, top_category: 'general' });
        }
      }
    } catch { /* column may not exist in older DBs */ }

    // Aggregate app_entries by region
    try {
      const appsByRegion = db.prepare(`
        SELECT region as code, COUNT(*) as count
        FROM app_entries
        WHERE region IS NOT NULL AND region != '' AND region != 'global'
        GROUP BY region
      `).all() as Array<{ code: string; count: number }>;

      for (const a of appsByRegion) {
        const existing = regionMap.get(a.code);
        if (existing) {
          existing.app_count = a.count;
        } else {
          regionMap.set(a.code, { trend_count: 0, avg_viral_score: 0, app_count: a.count, forum_activity: 0, word_velocity: 0, total_mentions: 0, top_category: 'general' });
        }
      }
    } catch { /* column may not exist in older DBs */ }

    // Aggregate word_entries by region
    try {
      const wordsByRegion = db.prepare(`
        SELECT region as code, AVG(growth) as avg_growth
        FROM word_entries
        WHERE region IS NOT NULL AND region != '' AND region != 'global'
        GROUP BY region
      `).all() as Array<{ code: string; avg_growth: number }>;

      for (const w of wordsByRegion) {
        const existing = regionMap.get(w.code);
        if (existing) {
          existing.word_velocity = w.avg_growth || 0;
        } else {
          regionMap.set(w.code, { trend_count: 0, avg_viral_score: 0, app_count: 0, forum_activity: 0, word_velocity: w.avg_growth || 0, total_mentions: 0, top_category: 'general' });
        }
      }
    } catch { /* column may not exist in older DBs */ }

    // Insert metrics and snapshots
    const insertMetrics = db.prepare(`
      INSERT OR REPLACE INTO region_metrics (code, name, trend_count, avg_viral_score, app_count, forum_activity, word_velocity, total_mentions, top_category, period, period_start)
      VALUES (@code, @name, @trend_count, @avg_viral_score, @app_count, @forum_activity, @word_velocity, @total_mentions, @top_category, 'daily', datetime('now'))
    `);

    const insertSnapshot = db.prepare(`
      INSERT INTO region_snapshots (region_code, trend_count, avg_viral_score, app_count, forum_activity, word_velocity)
      VALUES (@region_code, @trend_count, @avg_viral_score, @app_count, @forum_activity, @word_velocity)
    `);

    for (const [code, data] of regionMap) {
      const name = REGION_NAMES[code] || code;
      insertMetrics.run({
        code,
        name,
        trend_count: data.trend_count,
        avg_viral_score: Math.round(data.avg_viral_score * 100) / 100,
        app_count: data.app_count,
        forum_activity: data.forum_activity,
        word_velocity: Math.round(data.word_velocity * 100) / 100,
        total_mentions: data.total_mentions,
        top_category: data.top_category,
      });
      regionsProcessed++;

      insertSnapshot.run({
        region_code: code,
        trend_count: data.trend_count,
        avg_viral_score: Math.round(data.avg_viral_score * 100) / 100,
        app_count: data.app_count,
        forum_activity: data.forum_activity,
        word_velocity: Math.round(data.word_velocity * 100) / 100,
      });
      snapshotsCreated++;
    }
  });

  transaction();
  return { regionsProcessed, snapshotsCreated };
}

export function upsertGeoTrendLink(data: { trend_id: number; region_code: string; relevance_score?: number }) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO geo_trend_links (trend_id, region_code, relevance_score)
    VALUES (@trend_id, @region_code, @relevance_score)
    ON CONFLICT(trend_id, region_code) DO UPDATE SET
      relevance_score = @relevance_score,
      detected_at = CURRENT_TIMESTAMP
  `).run({
    trend_id: data.trend_id,
    region_code: data.region_code,
    relevance_score: data.relevance_score ?? 1.0,
  });
}

// ── Calendar Events helpers ──────────────────────────────────

export function getCalendarEvents(opts?: {
  event_type?: string; region?: string; search?: string;
  start_after?: string; start_before?: string;
  limit?: number; offset?: number;
}) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.event_type) { conditions.push('event_type = @event_type'); params.event_type = opts.event_type; }
  if (opts?.region) { conditions.push('region = @region'); params.region = opts.region; }
  if (opts?.search) { conditions.push('(title LIKE @search OR description LIKE @search)'); params.search = '%' + opts.search + '%'; }
  if (opts?.start_after) { conditions.push('start_date >= @start_after'); params.start_after = opts.start_after; }
  if (opts?.start_before) { conditions.push('start_date <= @start_before'); params.start_before = opts.start_before; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 100;
  const offset = opts?.offset || 0;

  return db.prepare(`SELECT * FROM calendar_events ${where} ORDER BY start_date ASC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
}

export function getCalendarEventById(id: number) {
  return getDb().prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
}

export function createCalendarEvent(data: {
  title: string; description?: string; event_type?: string;
  start_date: string; end_date?: string; recurrence?: string;
  region?: string; impact_score?: number; categories?: string;
  tags?: string; color?: string; data_json?: string;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO calendar_events (title, description, event_type, start_date, end_date, recurrence, region, impact_score, categories, tags, color, data_json)
    VALUES (@title, @description, @event_type, @start_date, @end_date, @recurrence, @region, @impact_score, @categories, @tags, @color, @data_json)
  `).run({
    title: data.title,
    description: data.description || null,
    event_type: data.event_type || 'holiday',
    start_date: data.start_date,
    end_date: data.end_date || null,
    recurrence: data.recurrence || 'once',
    region: data.region || 'global',
    impact_score: data.impact_score ?? 50,
    categories: data.categories || '[]',
    tags: data.tags || '[]',
    color: data.color || '#3b82f6',
    data_json: data.data_json || '{}',
  });
}

export function updateCalendarEvent(id: number, data: Partial<{
  title: string; description: string; event_type: string;
  start_date: string; end_date: string; recurrence: string;
  region: string; impact_score: number; categories: string;
  tags: string; color: string; data_json: string;
}>) {
  const db = getDb();
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
  if (!fields) return;
  return db.prepare(`UPDATE calendar_events SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run({ ...data, id });
}

export function deleteCalendarEvent(id: number) {
  return getDb().prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
}

/** Expand recurring events into occurrences within a date range */
export function getExpandedCalendarEvents(startDate: string, endDate: string): Array<Record<string, unknown>> {
  const db = getDb();
  // Get one-time events in range
  const oneTime = db.prepare(`
    SELECT * FROM calendar_events
    WHERE recurrence = 'once' AND start_date >= @startDate AND start_date <= @endDate
    ORDER BY start_date ASC
  `).all({ startDate, endDate }) as Array<Record<string, unknown>>;

  // Get recurring events (could start anytime)
  const recurring = db.prepare(`
    SELECT * FROM calendar_events WHERE recurrence != 'once'
  `).all() as Array<Record<string, unknown>>;

  const results = [...oneTime];
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);

  for (const ev of recurring) {
    const evStart = new Date(ev.start_date as string);
    const recurrence = ev.recurrence as string;

    // Generate occurrences within the range
    const occurrences = generateOccurrences(evStart, recurrence, rangeStart, rangeEnd);
    for (const occ of occurrences) {
      results.push({ ...ev, start_date: occ.toISOString().slice(0, 10), _occurrence: true });
    }
  }

  results.sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  return results;
}

function generateOccurrences(eventStart: Date, recurrence: string, rangeStart: Date, rangeEnd: Date): Date[] {
  const occurrences: Date[] = [];
  const maxIterations = 500;
  let current = new Date(eventStart);
  let iterations = 0;

  while (current <= rangeEnd && iterations < maxIterations) {
    if (current >= rangeStart) {
      occurrences.push(new Date(current));
    }

    switch (recurrence) {
      case 'yearly':
        current = new Date(current.getFullYear() + 1, current.getMonth(), current.getDate());
        break;
      case 'quarterly':
        current = new Date(current.getFullYear(), current.getMonth() + 3, current.getDate());
        break;
      case 'monthly':
        current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
        break;
      case 'weekly':
        current = new Date(current.getTime() + 7 * 86400000);
        break;
      default:
        return occurrences;
    }
    iterations++;
  }
  return occurrences;
}

export function getCalendarStats() {
  const db = getDb();
  const now = new Date().toISOString().slice(0, 10);
  const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const monthFromNow = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const totalEvents = db.prepare('SELECT COUNT(*) as count FROM calendar_events').get() as { count: number };
  const upcomingEvents = db.prepare('SELECT COUNT(*) as count FROM calendar_events WHERE start_date >= @now AND start_date <= @monthFromNow').get({ now, monthFromNow }) as { count: number };
  const upcomingWeek = db.prepare('SELECT COUNT(*) as count FROM calendar_events WHERE start_date >= @now AND start_date <= @weekFromNow').get({ now, weekFromNow }) as { count: number };
  const activePatterns = db.prepare('SELECT COUNT(*) as count FROM seasonal_patterns WHERE confidence >= 0.5').get() as { count: number };
  const recentMilestones = db.prepare("SELECT COUNT(*) as count FROM engagement_milestones WHERE detected_at >= datetime('now', '-7 days')").get() as { count: number };

  const eventsByType = db.prepare('SELECT event_type, COUNT(*) as count FROM calendar_events GROUP BY event_type ORDER BY count DESC').all();
  const eventsByRegion = db.prepare('SELECT region, COUNT(*) as count FROM calendar_events GROUP BY region ORDER BY count DESC LIMIT 10').all();
  const avgImpact = db.prepare('SELECT AVG(impact_score) as avg FROM calendar_events').get() as { avg: number };

  // Next high-impact event
  const nextHighImpact = db.prepare('SELECT * FROM calendar_events WHERE start_date >= @now AND impact_score >= 70 ORDER BY start_date ASC LIMIT 1').get({ now }) as Record<string, unknown> | undefined;

  return {
    totalEvents: totalEvents.count,
    upcomingEvents: upcomingEvents.count,
    upcomingWeek: upcomingWeek.count,
    activePatterns: activePatterns.count,
    recentMilestones: recentMilestones.count,
    eventsByType,
    eventsByRegion,
    avgImpact: Math.round((avgImpact.avg || 0) * 100) / 100,
    nextHighImpact: nextHighImpact || null,
  };
}

// ── Seasonal Patterns helpers ──────────────────────────────────

export function getSeasonalPatterns(opts?: { pattern_type?: string; metric?: string; min_confidence?: number; limit?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.pattern_type) { conditions.push('pattern_type = @pattern_type'); params.pattern_type = opts.pattern_type; }
  if (opts?.metric) { conditions.push('metric = @metric'); params.metric = opts.metric; }
  if (opts?.min_confidence !== undefined) { conditions.push('confidence >= @min_confidence'); params.min_confidence = opts.min_confidence; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 50;

  return db.prepare(`SELECT * FROM seasonal_patterns ${where} ORDER BY confidence DESC, peak_value DESC LIMIT @limit`).all({ ...params, limit });
}

export function createSeasonalPattern(data: {
  name: string; description?: string; pattern_type?: string;
  metric: string; baseline?: number; peak_value?: number;
  peak_period?: string; trough_value?: number; trough_period?: string;
  confidence?: number; sample_size?: number; data_json?: string;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO seasonal_patterns (name, description, pattern_type, metric, baseline, peak_value, peak_period, trough_value, trough_period, confidence, sample_size, data_json)
    VALUES (@name, @description, @pattern_type, @metric, @baseline, @peak_value, @peak_period, @trough_value, @trough_period, @confidence, @sample_size, @data_json)
  `).run({
    name: data.name,
    description: data.description || null,
    pattern_type: data.pattern_type || 'weekly',
    metric: data.metric,
    baseline: data.baseline || 0,
    peak_value: data.peak_value || 0,
    peak_period: data.peak_period || null,
    trough_value: data.trough_value || 0,
    trough_period: data.trough_period || null,
    confidence: data.confidence || 0,
    sample_size: data.sample_size || 0,
    data_json: data.data_json || '{}',
  });
}

// ── Engagement Milestones helpers ──────────────────────────────

export function getEngagementMilestones(opts?: {
  milestone_type?: string; entity_type?: string;
  min_significance?: number; limit?: number; offset?: number;
}) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.milestone_type) { conditions.push('milestone_type = @milestone_type'); params.milestone_type = opts.milestone_type; }
  if (opts?.entity_type) { conditions.push('entity_type = @entity_type'); params.entity_type = opts.entity_type; }
  if (opts?.min_significance !== undefined) { conditions.push('significance >= @min_significance'); params.min_significance = opts.min_significance; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  return db.prepare(`
    SELECT em.*, ce.title as event_title, ce.start_date as event_date
    FROM engagement_milestones em
    LEFT JOIN calendar_events ce ON em.calendar_event_id = ce.id
    ${where}
    ORDER BY em.detected_at DESC, em.significance DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });
}

export function createEngagementMilestone(data: {
  title: string; description?: string; milestone_type?: string;
  entity_type?: string; entity_id?: number; entity_name?: string;
  metric?: string; value?: number; previous_value?: number;
  threshold?: number; calendar_event_id?: number; significance?: number;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO engagement_milestones (title, description, milestone_type, entity_type, entity_id, entity_name, metric, value, previous_value, threshold, calendar_event_id, significance)
    VALUES (@title, @description, @milestone_type, @entity_type, @entity_id, @entity_name, @metric, @value, @previous_value, @threshold, @calendar_event_id, @significance)
  `).run({
    title: data.title,
    description: data.description || null,
    milestone_type: data.milestone_type || 'threshold',
    entity_type: data.entity_type || null,
    entity_id: data.entity_id || null,
    entity_name: data.entity_name || null,
    metric: data.metric || null,
    value: data.value || 0,
    previous_value: data.previous_value || 0,
    threshold: data.threshold || 0,
    calendar_event_id: data.calendar_event_id || null,
    significance: data.significance || 0,
  });
}

// ── Pattern Detection ──────────────────────────────────────────

export function detectSeasonalPatterns(): { patternsDetected: number } {
  const db = getDb();
  let patternsDetected = 0;

  // Detect weekly patterns from trend snapshots
  const weeklyData = db.prepare(`
    SELECT strftime('%w', snapshot_at) as dow, AVG(viral_score) as avg_score, COUNT(*) as cnt
    FROM trend_snapshots
    WHERE snapshot_at >= datetime('now', '-90 days')
    GROUP BY strftime('%w', snapshot_at)
    HAVING cnt >= 5
  `).all() as Array<{ dow: string; avg_score: number; cnt: number }>;

  if (weeklyData.length >= 5) {
    const scores = weeklyData.map(d => d.avg_score);
    const baseline = scores.reduce((a, b) => a + b, 0) / scores.length;
    const peak = weeklyData.reduce((a, b) => a.avg_score > b.avg_score ? a : b);
    const trough = weeklyData.reduce((a, b) => a.avg_score < b.avg_score ? a : b);
    const variance = scores.reduce((a, b) => a + Math.pow(b - baseline, 2), 0) / scores.length;
    const confidence = Math.min(1, variance > 0 ? Math.sqrt(variance) / baseline : 0);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    db.prepare(`
      INSERT INTO seasonal_patterns (name, description, pattern_type, metric, baseline, peak_value, peak_period, trough_value, trough_period, confidence, sample_size, data_json)
      VALUES (@name, @description, @pattern_type, @metric, @baseline, @peak_value, @peak_period, @trough_value, @trough_period, @confidence, @sample_size, @data_json)
    `).run({
      name: 'Weekly Viral Score Pattern',
      description: 'Weekly variation in average viral scores across all trends',
      pattern_type: 'weekly',
      metric: 'viral_score',
      baseline: Math.round(baseline * 100) / 100,
      peak_value: Math.round(peak.avg_score * 100) / 100,
      peak_period: dayNames[parseInt(peak.dow)] || peak.dow,
      trough_value: Math.round(trough.avg_score * 100) / 100,
      trough_period: dayNames[parseInt(trough.dow)] || trough.dow,
      confidence: Math.round(confidence * 100) / 100,
      sample_size: weeklyData.reduce((a, b) => a + b.cnt, 0),
      data_json: JSON.stringify({ daily_averages: weeklyData }),
    });
    patternsDetected++;
  }

  // Detect monthly patterns from app downloads
  const monthlyAppData = db.prepare(`
    SELECT strftime('%m', recorded_at) as month, AVG(downloads) as avg_downloads, COUNT(*) as cnt
    FROM app_snapshots
    WHERE recorded_at >= datetime('now', '-365 days')
    GROUP BY strftime('%m', recorded_at)
    HAVING cnt >= 3
  `).all() as Array<{ month: string; avg_downloads: number; cnt: number }>;

  if (monthlyAppData.length >= 6) {
    const vals = monthlyAppData.map(d => d.avg_downloads);
    const baseline = vals.reduce((a, b) => a + b, 0) / vals.length;
    const peak = monthlyAppData.reduce((a, b) => a.avg_downloads > b.avg_downloads ? a : b);
    const trough = monthlyAppData.reduce((a, b) => a.avg_downloads < b.avg_downloads ? a : b);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    db.prepare(`
      INSERT INTO seasonal_patterns (name, description, pattern_type, metric, baseline, peak_value, peak_period, trough_value, trough_period, confidence, sample_size, data_json)
      VALUES (@name, @description, @pattern_type, @metric, @baseline, @peak_value, @peak_period, @trough_value, @trough_period, @confidence, @sample_size, @data_json)
    `).run({
      name: 'Monthly App Download Pattern',
      description: 'Monthly variation in average app downloads',
      pattern_type: 'monthly',
      metric: 'downloads',
      baseline: Math.round(baseline),
      peak_value: Math.round(peak.avg_downloads),
      peak_period: monthNames[parseInt(peak.month) - 1] || peak.month,
      trough_value: Math.round(trough.avg_downloads),
      trough_period: monthNames[parseInt(trough.month) - 1] || trough.month,
      confidence: 0.7,
      sample_size: monthlyAppData.reduce((a, b) => a + b.cnt, 0),
      data_json: JSON.stringify({ monthly_averages: monthlyAppData }),
    });
    patternsDetected++;
  }

  return { patternsDetected };
}

// ── Milestone Detection ──────────────────────────────────────

export function detectEngagementMilestones(): { milestonesDetected: number } {
  const db = getDb();
  let milestonesDetected = 0;

  // Detect trends that crossed viral score thresholds
  const thresholds = [50, 75, 90];
  for (const threshold of thresholds) {
    const trendsCrossing = db.prepare(`
      SELECT t.id, t.title, t.viral_score,
        (SELECT ts.viral_score FROM trend_snapshots ts WHERE ts.trend_id = t.id ORDER BY ts.snapshot_at DESC LIMIT 1 OFFSET 1) as prev_score
      FROM trends t
      WHERE t.viral_score >= @threshold
      AND NOT EXISTS (
        SELECT 1 FROM engagement_milestones em
        WHERE em.entity_type = 'trend' AND em.entity_id = t.id AND em.threshold = @threshold
      )
      LIMIT 20
    `).all({ threshold }) as Array<{ id: number; title: string; viral_score: number; prev_score: number | null }>;

    for (const t of trendsCrossing) {
      if (t.prev_score !== null && t.prev_score < threshold) {
        // Find temporally correlated calendar event
        const now = new Date().toISOString().slice(0, 10);
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        const nearbyEvent = db.prepare(`
          SELECT id FROM calendar_events
          WHERE start_date >= @weekAgo AND start_date <= @now
          ORDER BY impact_score DESC LIMIT 1
        `).get({ weekAgo, now }) as { id: number } | undefined;

        db.prepare(`
          INSERT INTO engagement_milestones (title, description, milestone_type, entity_type, entity_id, entity_name, metric, value, previous_value, threshold, calendar_event_id, significance)
          VALUES (@title, @description, @milestone_type, @entity_type, @entity_id, @entity_name, @metric, @value, @previous_value, @threshold, @calendar_event_id, @significance)
        `).run({
          title: `${t.title} crossed ${threshold} viral score`,
          description: `Trend "${t.title}" viral score went from ${t.prev_score} to ${t.viral_score}`,
          milestone_type: 'threshold',
          entity_type: 'trend',
          entity_id: t.id,
          entity_name: t.title,
          metric: 'viral_score',
          value: t.viral_score,
          previous_value: t.prev_score,
          threshold,
          calendar_event_id: nearbyEvent?.id || null,
          significance: Math.min(100, (t.viral_score / 100) * 80 + (threshold / 100) * 20),
        });
        milestonesDetected++;
      }
    }
  }

  // Detect app download spikes
  const appSpikes = db.prepare(`
    SELECT ae.id, ae.name, ae.downloads,
      (SELECT AVG(asn.downloads) FROM app_snapshots asn WHERE asn.app_id = ae.id) as avg_downloads
    FROM app_entries ae
    WHERE ae.downloads > 0
    AND NOT EXISTS (
      SELECT 1 FROM engagement_milestones em
      WHERE em.entity_type = 'app' AND em.entity_id = ae.id AND em.milestone_type = 'spike'
        AND em.detected_at >= datetime('now', '-7 days')
    )
    HAVING avg_downloads > 0 AND ae.downloads > avg_downloads * 2
    LIMIT 10
  `).all() as Array<{ id: number; name: string; downloads: number; avg_downloads: number }>;

  for (const app of appSpikes) {
    db.prepare(`
      INSERT INTO engagement_milestones (title, description, milestone_type, entity_type, entity_id, entity_name, metric, value, previous_value, threshold, significance)
      VALUES (@title, @description, @milestone_type, @entity_type, @entity_id, @entity_name, @metric, @value, @previous_value, @threshold, @significance)
    `).run({
      title: `${app.name} download spike`,
      description: `Downloads surged to ${app.downloads} (avg: ${Math.round(app.avg_downloads)})`,
      milestone_type: 'spike',
      entity_type: 'app',
      entity_id: app.id,
      entity_name: app.name,
      metric: 'downloads',
      value: app.downloads,
      previous_value: Math.round(app.avg_downloads),
      threshold: Math.round(app.avg_downloads * 2),
      significance: Math.min(100, (app.downloads / Math.max(1, app.avg_downloads)) * 30),
    });
    milestonesDetected++;
  }

  return { milestonesDetected };
}

// ── Predictions ──────────────────────────────────────────────

export interface CalendarPrediction {
  event_id: number | null;
  event_title: string;
  predicted_date: string;
  metric: string;
  predicted_value: number;
  confidence: number;
  basis: string;
  type: 'event_based' | 'pattern_based';
}

export function getCalendarPredictions(opts?: { days_ahead?: number; limit?: number }): CalendarPrediction[] {
  const db = getDb();
  const daysAhead = opts?.days_ahead || 30;
  const limit = opts?.limit || 20;
  const now = new Date();
  const futureDate = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const predictions: CalendarPrediction[] = [];

  // Event-based predictions: upcoming events with high impact
  const upcomingEvents = db.prepare(`
    SELECT * FROM calendar_events
    WHERE start_date >= @today AND start_date <= @futureDate
    ORDER BY impact_score DESC
    LIMIT @limit
  `).all({ today, futureDate, limit }) as Array<Record<string, unknown>>;

  for (const ev of upcomingEvents) {
    const impactScore = (ev.impact_score as number) || 50;
    // Predict viral score boost based on impact and historical patterns
    const predictedBoost = impactScore * 0.8;
    predictions.push({
      event_id: ev.id as number,
      event_title: ev.title as string,
      predicted_date: ev.start_date as string,
      metric: 'viral_score',
      predicted_value: Math.round(predictedBoost * 100) / 100,
      confidence: Math.min(0.95, impactScore / 120),
      basis: `High-impact ${ev.event_type} event (score: ${impactScore})`,
      type: 'event_based',
    });
  }

  // Pattern-based predictions: use seasonal patterns
  const patterns = db.prepare('SELECT * FROM seasonal_patterns WHERE confidence >= 0.4 ORDER BY confidence DESC LIMIT 10').all() as Array<Record<string, unknown>>;

  for (const p of patterns) {
    const patternType = p.pattern_type as string;
    const peakPeriod = p.peak_period as string;
    const peakValue = p.peak_value as number;
    const conf = p.confidence as number;

    if (patternType === 'weekly' && peakPeriod) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const peakDayIdx = dayNames.indexOf(peakPeriod);
      if (peakDayIdx >= 0) {
        const nextPeakDate = new Date(now);
        const daysUntilPeak = (peakDayIdx - now.getDay() + 7) % 7 || 7;
        nextPeakDate.setDate(nextPeakDate.getDate() + daysUntilPeak);
        if (nextPeakDate.toISOString().slice(0, 10) <= futureDate) {
          predictions.push({
            event_id: null,
            event_title: p.name as string,
            predicted_date: nextPeakDate.toISOString().slice(0, 10),
            metric: p.metric as string,
            predicted_value: peakValue,
            confidence: conf,
            basis: `Weekly pattern peaks on ${peakPeriod}`,
            type: 'pattern_based',
          });
        }
      }
    }
  }

  predictions.sort((a, b) => a.predicted_date.localeCompare(b.predicted_date));
  return predictions.slice(0, limit);
}

// ── Timeline ──────────────────────────────────────────────────

export interface TimelineEntry {
  id: number;
  date: string;
  title: string;
  description: string | null;
  type: 'event' | 'milestone' | 'prediction';
  subtype: string;
  impact: number;
  color: string;
  entity_link?: { type: string; id: number; name: string } | null;
}

export function getCalendarTimeline(opts?: { start_date?: string; end_date?: string; limit?: number }): TimelineEntry[] {
  const db = getDb();
  const startDate = opts?.start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = opts?.end_date || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const limit = opts?.limit || 100;

  const entries: TimelineEntry[] = [];

  // Events
  const events = db.prepare(`
    SELECT * FROM calendar_events
    WHERE start_date >= @startDate AND start_date <= @endDate
    ORDER BY start_date ASC LIMIT @limit
  `).all({ startDate, endDate, limit }) as Array<Record<string, unknown>>;

  for (const ev of events) {
    entries.push({
      id: ev.id as number,
      date: ev.start_date as string,
      title: ev.title as string,
      description: ev.description as string | null,
      type: 'event',
      subtype: ev.event_type as string,
      impact: ev.impact_score as number,
      color: ev.color as string || '#3b82f6',
    });
  }

  // Milestones
  const milestones = db.prepare(`
    SELECT * FROM engagement_milestones
    WHERE DATE(detected_at) >= @startDate AND DATE(detected_at) <= @endDate
    ORDER BY detected_at DESC LIMIT @limit
  `).all({ startDate, endDate, limit }) as Array<Record<string, unknown>>;

  for (const m of milestones) {
    entries.push({
      id: m.id as number,
      date: (m.detected_at as string).slice(0, 10),
      title: m.title as string,
      description: m.description as string | null,
      type: 'milestone',
      subtype: m.milestone_type as string,
      impact: m.significance as number,
      color: '#f59e0b',
      entity_link: m.entity_type ? { type: m.entity_type as string, id: m.entity_id as number, name: m.entity_name as string } : null,
    });
  }

  // Predictions (future only)
  const today = new Date().toISOString().slice(0, 10);
  if (endDate >= today) {
    const predictions = getCalendarPredictions({ days_ahead: 60, limit: 20 });
    for (const pred of predictions) {
      if (pred.predicted_date >= startDate && pred.predicted_date <= endDate) {
        entries.push({
          id: pred.event_id || 0,
          date: pred.predicted_date,
          title: `📈 ${pred.event_title}`,
          description: pred.basis,
          type: 'prediction',
          subtype: pred.type,
          impact: Math.round(pred.confidence * 100),
          color: '#8b5cf6',
        });
      }
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries.slice(0, limit);
}

// ── Sprint 6: Cross-Platform Correlation helpers ──────────────

export function getCorrelations(opts?: {
  source_type?: string; target_type?: string; correlation_type?: string;
  min_strength?: number; limit?: number; offset?: number;
}) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.source_type) { conditions.push('source_type = @source_type'); params.source_type = opts.source_type; }
  if (opts?.target_type) { conditions.push('target_type = @target_type'); params.target_type = opts.target_type; }
  if (opts?.correlation_type) { conditions.push('correlation_type = @correlation_type'); params.correlation_type = opts.correlation_type; }
  if (opts?.min_strength !== undefined) { conditions.push('strength >= @min_strength'); params.min_strength = opts.min_strength; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  return db.prepare(`SELECT * FROM correlations ${where} ORDER BY strength DESC, detected_at DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
}

export function buildCorrelation(data: {
  source_type: string; source_id?: number; source_name: string;
  target_type: string; target_id?: number; target_name: string;
  correlation_type: string; strength?: number; metadata?: string;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO correlations (source_type, source_id, source_name, target_type, target_id, target_name, correlation_type, strength, metadata)
    VALUES (@source_type, @source_id, @source_name, @target_type, @target_id, @target_name, @correlation_type, @strength, @metadata)
  `).run({
    source_type: data.source_type,
    source_id: data.source_id || null,
    source_name: data.source_name,
    target_type: data.target_type,
    target_id: data.target_id || null,
    target_name: data.target_name,
    correlation_type: data.correlation_type,
    strength: data.strength ?? 0,
    metadata: data.metadata || null,
  });
}

export function rebuildCorrelations(): { correlationsCreated: number } {
  const db = getDb();
  let correlationsCreated = 0;

  const transaction = db.transaction(() => {
    // Clear old auto-detected correlations
    db.prepare("DELETE FROM correlations WHERE correlation_type IN ('keyword_match','topic_overlap','category_match')").run();

    // Get all trends
    const trends = db.prepare('SELECT id, title, description, category, tags FROM trends').all() as Array<{
      id: number; title: string; description: string | null; category: string; tags: string;
    }>;

    // Get forum posts
    const posts = db.prepare('SELECT id, title, body, category, source FROM forum_posts').all() as Array<{
      id: number; title: string; body: string | null; category: string; source: string;
    }>;

    // Get apps
    const apps = db.prepare('SELECT id, name, description, category, developer FROM app_entries').all() as Array<{
      id: number; name: string; description: string | null; category: string; developer: string | null;
    }>;

    // Get words
    const words = db.prepare('SELECT id, word, category, score FROM word_entries WHERE score > 10 ORDER BY score DESC LIMIT 200').all() as Array<{
      id: number; word: string; category: string; score: number;
    }>;

    const wordSet = new Map<string, { id: number; score: number }>();
    for (const w of words) {
      wordSet.set(w.word.toLowerCase(), { id: w.id, score: w.score });
    }

    const insertCorr = db.prepare(`
      INSERT INTO correlations (source_type, source_id, source_name, target_type, target_id, target_name, correlation_type, strength, metadata)
      VALUES (@source_type, @source_id, @source_name, @target_type, @target_id, @target_name, @correlation_type, @strength, @metadata)
    `);

    // Trend → Forum: keyword match
    for (const trend of trends) {
      const trendTerms = extractTerms((trend.title || '') + ' ' + (trend.description || ''));
      for (const post of posts) {
        const postTerms = extractTerms((post.title || '') + ' ' + (post.body || ''));
        const overlap = trendTerms.filter(t => postTerms.includes(t));
        if (overlap.length >= 2) {
          const strength = Math.min(1, overlap.length / 5);
          insertCorr.run({
            source_type: 'trend', source_id: trend.id, source_name: trend.title,
            target_type: 'forum', target_id: post.id, target_name: post.title,
            correlation_type: 'keyword_match', strength: Math.round(strength * 100) / 100,
            metadata: JSON.stringify({ shared_keywords: overlap.slice(0, 10) }),
          });
          correlationsCreated++;
          if (correlationsCreated > 500) break;
        }
      }
      if (correlationsCreated > 500) break;
    }

    // Trend → App: keyword match
    for (const trend of trends) {
      const trendTerms = extractTerms((trend.title || '') + ' ' + (trend.description || ''));
      for (const app of apps) {
        const appTerms = extractTerms((app.name || '') + ' ' + (app.description || ''));
        const overlap = trendTerms.filter(t => appTerms.includes(t));
        if (overlap.length >= 2) {
          const strength = Math.min(1, overlap.length / 5);
          insertCorr.run({
            source_type: 'trend', source_id: trend.id, source_name: trend.title,
            target_type: 'app', target_id: app.id, target_name: app.name,
            correlation_type: 'keyword_match', strength: Math.round(strength * 100) / 100,
            metadata: JSON.stringify({ shared_keywords: overlap.slice(0, 10) }),
          });
          correlationsCreated++;
        }
      }
    }

    // Trend → Word: direct mention
    for (const trend of trends) {
      const trendTerms = extractTerms((trend.title || '') + ' ' + (trend.description || ''));
      for (const term of trendTerms) {
        const wordMatch = wordSet.get(term);
        if (wordMatch) {
          const strength = Math.min(1, wordMatch.score / 100);
          insertCorr.run({
            source_type: 'trend', source_id: trend.id, source_name: trend.title,
            target_type: 'word', target_id: wordMatch.id, target_name: term,
            correlation_type: 'keyword_match', strength: Math.round(strength * 100) / 100,
            metadata: JSON.stringify({ word_score: wordMatch.score }),
          });
          correlationsCreated++;
        }
      }
    }

    // Forum → App: category match
    for (const post of posts) {
      for (const app of apps) {
        if (post.category && app.category && post.category.toLowerCase() === app.category.toLowerCase()) {
          const postTerms = extractTerms((post.title || '') + ' ' + (post.body || ''));
          const appTerms = extractTerms((app.name || '') + ' ' + (app.description || ''));
          const overlap = postTerms.filter(t => appTerms.includes(t));
          if (overlap.length >= 1) {
            insertCorr.run({
              source_type: 'forum', source_id: post.id, source_name: post.title,
              target_type: 'app', target_id: app.id, target_name: app.name,
              correlation_type: 'category_match', strength: Math.round(Math.min(1, overlap.length / 3) * 100) / 100,
              metadata: JSON.stringify({ category: post.category, shared_keywords: overlap.slice(0, 5) }),
            });
            correlationsCreated++;
          }
        }
      }
    }
  });

  transaction();
  return { correlationsCreated };
}

// ── Sprint 6: Velocity Alerts helpers ─────────────────────────

export function getVelocityAlerts(opts?: {
  alert_level?: string; entity_type?: string; unread_only?: boolean;
  limit?: number; offset?: number;
}) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.alert_level) { conditions.push('alert_level = @alert_level'); params.alert_level = opts.alert_level; }
  if (opts?.entity_type) { conditions.push('entity_type = @entity_type'); params.entity_type = opts.entity_type; }
  if (opts?.unread_only) { conditions.push('is_read = 0'); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  return db.prepare(`SELECT * FROM velocity_alerts ${where} ORDER BY detected_at DESC, velocity_score DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
}

export function getVelocityStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM velocity_alerts').get() as { count: number };
  const unread = db.prepare('SELECT COUNT(*) as count FROM velocity_alerts WHERE is_read = 0').get() as { count: number };
  const critical = db.prepare("SELECT COUNT(*) as count FROM velocity_alerts WHERE alert_level = 'critical'").get() as { count: number };
  const high = db.prepare("SELECT COUNT(*) as count FROM velocity_alerts WHERE alert_level = 'high'").get() as { count: number };
  const medium = db.prepare("SELECT COUNT(*) as count FROM velocity_alerts WHERE alert_level = 'medium'").get() as { count: number };
  const low = db.prepare("SELECT COUNT(*) as count FROM velocity_alerts WHERE alert_level = 'low'").get() as { count: number };
  const avgVelocity = db.prepare('SELECT AVG(velocity_score) as avg FROM velocity_alerts').get() as { avg: number };
  const topEntity = db.prepare('SELECT entity_name, velocity_score FROM velocity_alerts ORDER BY velocity_score DESC LIMIT 1').get() as { entity_name: string; velocity_score: number } | undefined;

  return {
    total: total.count,
    unread: unread.count,
    critical: critical.count,
    high: high.count,
    medium: medium.count,
    low: low.count,
    avgVelocity: Math.round((avgVelocity.avg || 0) * 100) / 100,
    topEntity: topEntity || null,
  };
}

export function markAlertRead(id: number) {
  return getDb().prepare('UPDATE velocity_alerts SET is_read = 1 WHERE id = ?').run(id);
}

export function scanVelocity(): { alertsCreated: number } {
  const db = getDb();
  let alertsCreated = 0;

  const transaction = db.transaction(() => {
    // Scan trends for velocity changes
    const trends = db.prepare(`
      SELECT t.id, t.title, t.viral_score, t.velocity,
        (SELECT ts.viral_score FROM trend_snapshots ts WHERE ts.trend_id = t.id ORDER BY ts.snapshot_at DESC LIMIT 1 OFFSET 1) as prev_score
      FROM trends t
      WHERE t.viral_score > 0
    `).all() as Array<{ id: number; title: string; viral_score: number; velocity: number; prev_score: number | null }>;

    const insertAlert = db.prepare(`
      INSERT INTO velocity_alerts (entity_type, entity_id, entity_name, velocity_score, acceleration, previous_score, alert_level)
      VALUES (@entity_type, @entity_id, @entity_name, @velocity_score, @acceleration, @previous_score, @alert_level)
    `);

    for (const t of trends) {
      const prevScore = t.prev_score ?? 0;
      const delta = t.viral_score - prevScore;
      const velocityScore = Math.abs(delta);
      const acceleration = prevScore > 0 ? (delta / prevScore) * 100 : (delta > 0 ? 100 : 0);

      if (velocityScore < 5) continue;

      let alertLevel = 'low';
      if (velocityScore >= 30 || Math.abs(acceleration) >= 100) alertLevel = 'critical';
      else if (velocityScore >= 20 || Math.abs(acceleration) >= 50) alertLevel = 'high';
      else if (velocityScore >= 10 || Math.abs(acceleration) >= 25) alertLevel = 'medium';

      // Avoid duplicate alerts for the same entity
      const existing = db.prepare(
        "SELECT id FROM velocity_alerts WHERE entity_type = 'trend' AND entity_id = @id AND detected_at >= datetime('now', '-1 day')"
      ).get({ id: t.id });
      if (existing) continue;

      insertAlert.run({
        entity_type: 'trend',
        entity_id: t.id,
        entity_name: t.title,
        velocity_score: Math.round(velocityScore * 100) / 100,
        acceleration: Math.round(acceleration * 100) / 100,
        previous_score: prevScore,
        alert_level: alertLevel,
      });
      alertsCreated++;
    }

    // Scan apps for download velocity
    const apps = db.prepare(`
      SELECT ae.id, ae.name, ae.downloads,
        (SELECT asn.downloads FROM app_snapshots asn WHERE asn.app_id = ae.id ORDER BY asn.recorded_at DESC LIMIT 1 OFFSET 1) as prev_downloads
      FROM app_entries ae
      WHERE ae.downloads > 0
    `).all() as Array<{ id: number; name: string; downloads: number; prev_downloads: number | null }>;

    for (const app of apps) {
      const prevDl = app.prev_downloads ?? 0;
      const delta = app.downloads - prevDl;
      if (delta <= 0 || prevDl === 0) continue;

      const acceleration = (delta / Math.max(1, prevDl)) * 100;
      if (acceleration < 20) continue;

      const existing = db.prepare(
        "SELECT id FROM velocity_alerts WHERE entity_type = 'app' AND entity_id = @id AND detected_at >= datetime('now', '-1 day')"
      ).get({ id: app.id });
      if (existing) continue;

      let alertLevel = 'low';
      if (acceleration >= 200) alertLevel = 'critical';
      else if (acceleration >= 100) alertLevel = 'high';
      else if (acceleration >= 50) alertLevel = 'medium';

      insertAlert.run({
        entity_type: 'app',
        entity_id: app.id,
        entity_name: app.name,
        velocity_score: Math.round(delta * 100) / 100,
        acceleration: Math.round(acceleration * 100) / 100,
        previous_score: prevDl,
        alert_level: alertLevel,
      });
      alertsCreated++;
    }

    // Scan forum posts for score velocity
    const hotPosts = db.prepare(`
      SELECT id, title, score FROM forum_posts WHERE score >= 50 ORDER BY score DESC LIMIT 100
    `).all() as Array<{ id: number; title: string; score: number }>;

    for (const post of hotPosts) {
      if (post.score < 50) continue;
      const existing = db.prepare(
        "SELECT id FROM velocity_alerts WHERE entity_type = 'forum' AND entity_id = @id AND detected_at >= datetime('now', '-1 day')"
      ).get({ id: post.id });
      if (existing) continue;

      let alertLevel = 'low';
      if (post.score >= 500) alertLevel = 'critical';
      else if (post.score >= 200) alertLevel = 'high';
      else if (post.score >= 100) alertLevel = 'medium';

      insertAlert.run({
        entity_type: 'forum',
        entity_id: post.id,
        entity_name: post.title,
        velocity_score: post.score,
        acceleration: 0,
        previous_score: 0,
        alert_level: alertLevel,
      });
      alertsCreated++;
    }
  });

  transaction();
  return { alertsCreated };
}

// ── Sprint 6: Competitor Watch helpers ────────────────────────

export function getCompetitors(opts?: { enabled_only?: boolean; search?: string; type?: string; limit?: number; offset?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.enabled_only) { conditions.push('enabled = 1'); }
  if (opts?.search) { conditions.push('(name LIKE @search OR description LIKE @search)'); params.search = '%' + opts.search + '%'; }
  if (opts?.type) { conditions.push('type = @type'); params.type = opts.type; }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  return db.prepare(`SELECT * FROM competitors ${where} ORDER BY name ASC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
}

export function createCompetitor(data: {
  name: string; type?: string; website?: string; description?: string; enabled?: number;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO competitors (name, type, website, description, enabled)
    VALUES (@name, @type, @website, @description, @enabled)
  `).run({
    name: data.name,
    type: data.type || 'studio',
    website: data.website || null,
    description: data.description || null,
    enabled: data.enabled ?? 1,
  });
}

export function updateCompetitor(id: number, data: Partial<{
  name: string; type: string; website: string; description: string; enabled: number;
}>) {
  const db = getDb();
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
  if (!fields) return;
  return db.prepare(`UPDATE competitors SET ${fields} WHERE id = @id`).run({ ...data, id });
}

export function deleteCompetitor(id: number) {
  const db = getDb();
  db.prepare('DELETE FROM competitor_snapshots WHERE competitor_id = ?').run(id);
  return db.prepare('DELETE FROM competitors WHERE id = ?').run(id);
}

export function getCompetitorDetail(id: number) {
  const db = getDb();
  const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(id);
  const latestSnapshot = db.prepare('SELECT * FROM competitor_snapshots WHERE competitor_id = ? ORDER BY snapshot_date DESC LIMIT 1').get(id);
  const snapshotCount = db.prepare('SELECT COUNT(*) as count FROM competitor_snapshots WHERE competitor_id = ?').get(id) as { count: number };
  return { competitor, latestSnapshot, snapshotCount: snapshotCount.count };
}

export function getCompetitorHistory(id: number) {
  const db = getDb();
  const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(id);
  const snapshots = db.prepare('SELECT * FROM competitor_snapshots WHERE competitor_id = ? ORDER BY snapshot_date ASC').all(id);
  return { competitor, snapshots };
}

export function getCompetitorLeaderboard() {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, cs.app_count, cs.total_downloads, cs.avg_rating, cs.market_share, cs.snapshot_date
    FROM competitors c
    LEFT JOIN competitor_snapshots cs ON cs.competitor_id = c.id
      AND cs.snapshot_date = (SELECT MAX(cs2.snapshot_date) FROM competitor_snapshots cs2 WHERE cs2.competitor_id = c.id)
    WHERE c.enabled = 1
    ORDER BY cs.total_downloads DESC, cs.app_count DESC
  `).all();
}

export function insertCompetitorSnapshot(data: {
  competitor_id: number; app_count?: number; total_downloads?: number;
  avg_rating?: number; market_share?: number; snapshot_date?: string;
}) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO competitor_snapshots (competitor_id, app_count, total_downloads, avg_rating, market_share, snapshot_date)
    VALUES (@competitor_id, @app_count, @total_downloads, @avg_rating, @market_share, @snapshot_date)
  `).run({
    competitor_id: data.competitor_id,
    app_count: data.app_count || 0,
    total_downloads: data.total_downloads || 0,
    avg_rating: data.avg_rating || 0,
    market_share: data.market_share || 0,
    snapshot_date: data.snapshot_date || new Date().toISOString().slice(0, 10),
  });
}

// ── Sprint 6: Home Dashboard helpers ──────────────────────────

export function getHomeDashboardStats() {
  const db = getDb();
  const totalTrends = db.prepare('SELECT COUNT(*) as count FROM trends').get() as { count: number };
  const activeAlerts = db.prepare('SELECT COUNT(*) as count FROM velocity_alerts WHERE is_read = 0').get() as { count: number };

  const now = new Date().toISOString().slice(0, 10);
  const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const upcomingEvents = db.prepare('SELECT COUNT(*) as count FROM calendar_events WHERE start_date >= @now AND start_date <= @weekFromNow').get({ now, weekFromNow }) as { count: number };
  const trackedCompetitors = db.prepare('SELECT COUNT(*) as count FROM competitors WHERE enabled = 1').get() as { count: number };

  return {
    totalTrends: totalTrends.count,
    activeAlerts: activeAlerts.count,
    upcomingEvents: upcomingEvents.count,
    trackedCompetitors: trackedCompetitors.count,
  };
}

export function getTopTrendingItems(limit = 10) {
  const db = getDb();
  const trends = db.prepare('SELECT id, title, viral_score, category, lifecycle FROM trends ORDER BY viral_score DESC LIMIT ?').all(limit) as Array<Record<string, unknown>>;
  return trends.map(t => ({ ...t, source: 'trend' }));
}

export function getUpcomingCalendarEvents(days = 7) {
  const db = getDb();
  const now = new Date().toISOString().slice(0, 10);
  const future = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  return db.prepare('SELECT * FROM calendar_events WHERE start_date >= @now AND start_date <= @future ORDER BY start_date ASC LIMIT 10').all({ now, future });
}

// ── Sprint 6: Auto-detect Competitors from App Developers ────

export function autoDetectCompetitors(): { detected: number; skipped: number } {
  const db = getDb();
  let detected = 0;
  let skipped = 0;

  // Find developers with 3+ apps that aren't already tracked
  const developers = db.prepare(`
    SELECT developer, COUNT(*) as app_count, SUM(downloads) as total_downloads, AVG(rating) as avg_rating
    FROM app_entries
    WHERE developer IS NOT NULL AND developer != ''
    GROUP BY developer
    HAVING COUNT(*) >= 3
    ORDER BY total_downloads DESC
    LIMIT 50
  `).all() as Array<{ developer: string; app_count: number; total_downloads: number; avg_rating: number }>;

  const insertCompetitor = db.prepare(`
    INSERT OR IGNORE INTO competitors (name, type, description, enabled)
    VALUES (@name, @type, @description, @enabled)
  `);

  for (const dev of developers) {
    // Check if already tracked
    const existing = db.prepare('SELECT id FROM competitors WHERE name = ?').get(dev.developer);
    if (existing) {
      skipped++;
      continue;
    }

    insertCompetitor.run({
      name: dev.developer,
      type: 'developer',
      description: `Auto-detected: ${dev.app_count} apps, ${(dev.total_downloads || 0).toLocaleString()} downloads`,
      enabled: 1,
    });
    detected++;
  }

  return { detected, skipped };
}

// ── Sprint 6: Snapshot Competitors (for cron) ─────────────────

export function snapshotCompetitors(): { snapshotsCreated: number } {
  const db = getDb();
  let snapshotsCreated = 0;

  const competitors = db.prepare('SELECT * FROM competitors WHERE enabled = 1').all() as Array<{ id: number; name: string }>;
  const totalDownloads = (db.prepare('SELECT COALESCE(SUM(downloads), 0) as total FROM app_entries').get() as { total: number }).total || 1;

  for (const comp of competitors) {
    const stats = db.prepare(`
      SELECT COUNT(*) as app_count, COALESCE(SUM(downloads), 0) as total_dl, AVG(rating) as avg_rating
      FROM app_entries
      WHERE developer = ?
    `).get(comp.name) as { app_count: number; total_dl: number; avg_rating: number } | undefined;

    if (stats) {
      const marketShare = totalDownloads > 0 ? (stats.total_dl / totalDownloads) * 100 : 0;
      insertCompetitorSnapshot({
        competitor_id: comp.id,
        app_count: stats.app_count,
        total_downloads: stats.total_dl,
        avg_rating: Math.round((stats.avg_rating || 0) * 100) / 100,
        market_share: Math.round(marketShare * 100) / 100,
      });
      snapshotsCreated++;
    }
  }

  return { snapshotsCreated };
}
