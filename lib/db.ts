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
  `);

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
