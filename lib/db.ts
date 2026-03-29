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
  `);
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

export function createCronConfig(data: { name: string; description?: string; prompt: string; schedule: string; agent?: string; source_type?: string; enabled?: number }) {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO cron_configs (name, description, prompt, schedule, agent, source_type, enabled) VALUES (@name, @description, @prompt, @schedule, @agent, @source_type, @enabled)');
  return stmt.run({ description: null, agent: 'default', source_type: null, enabled: 1, ...data });
}

export function updateCronConfig(id: number, data: Partial<{ name: string; description: string; prompt: string; schedule: string; agent: string; source_type: string; enabled: number }>) {
  const db = getDb();
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
  return db.prepare(`UPDATE cron_configs SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run({ ...data, id });
}

export function deleteCronConfig(id: number) {
  return getDb().prepare('DELETE FROM cron_configs WHERE id = ?').run(id);
}

export function getCronRuns(configId?: number, limit = 20) {
  const db = getDb();
  if (configId) return db.prepare('SELECT * FROM cron_runs WHERE cron_config_id = ? ORDER BY created_at DESC LIMIT ?').all(configId, limit);
  return db.prepare('SELECT cr.*, cc.name as cron_name FROM cron_runs cr LEFT JOIN cron_configs cc ON cr.cron_config_id = cc.id ORDER BY cr.created_at DESC LIMIT ?').all(limit);
}

// ── Tag helpers ──────────────────────────────────────────────

export function getTopTags(limit = 30) {
  return getDb().prepare('SELECT * FROM tags ORDER BY count DESC LIMIT ?').all(limit);
}
