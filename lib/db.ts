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
