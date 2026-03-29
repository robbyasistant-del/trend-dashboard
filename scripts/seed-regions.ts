/**
 * Seed script for Region Analysis data
 * Run: npx tsx scripts/seed-regions.ts
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'trends.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

interface RegionSeed {
  code: string;
  name: string;
  trend_count: number;
  avg_viral_score: number;
  app_count: number;
  forum_activity: number;
  word_velocity: number;
  total_mentions: number;
  top_category: string;
}

const REGIONS: RegionSeed[] = [
  { code: 'US', name: 'United States', trend_count: 187, avg_viral_score: 78.4, app_count: 342, forum_activity: 1520, word_velocity: 12.3, total_mentions: 45600, top_category: 'puzzle' },
  { code: 'GB', name: 'United Kingdom', trend_count: 98, avg_viral_score: 71.2, app_count: 189, forum_activity: 870, word_velocity: 9.8, total_mentions: 21300, top_category: 'idle' },
  { code: 'DE', name: 'Germany', trend_count: 76, avg_viral_score: 65.8, app_count: 156, forum_activity: 640, word_velocity: 7.2, total_mentions: 15800, top_category: 'strategy' },
  { code: 'JP', name: 'Japan', trend_count: 145, avg_viral_score: 82.1, app_count: 298, forum_activity: 1180, word_velocity: 14.5, total_mentions: 38200, top_category: 'gacha' },
  { code: 'KR', name: 'South Korea', trend_count: 132, avg_viral_score: 79.6, app_count: 267, forum_activity: 1050, word_velocity: 13.1, total_mentions: 33400, top_category: 'rpg' },
  { code: 'BR', name: 'Brazil', trend_count: 89, avg_viral_score: 68.3, app_count: 134, forum_activity: 920, word_velocity: 11.4, total_mentions: 19700, top_category: 'action' },
  { code: 'IN', name: 'India', trend_count: 112, avg_viral_score: 62.7, app_count: 215, forum_activity: 780, word_velocity: 10.2, total_mentions: 28900, top_category: 'casual' },
  { code: 'CN', name: 'China', trend_count: 168, avg_viral_score: 85.3, app_count: 412, forum_activity: 1340, word_velocity: 15.8, total_mentions: 52100, top_category: 'moba' },
  { code: 'FR', name: 'France', trend_count: 67, avg_viral_score: 63.4, app_count: 128, forum_activity: 540, word_velocity: 6.9, total_mentions: 13200, top_category: 'puzzle' },
  { code: 'CA', name: 'Canada', trend_count: 58, avg_viral_score: 66.1, app_count: 112, forum_activity: 480, word_velocity: 8.1, total_mentions: 11500, top_category: 'idle' },
  { code: 'AU', name: 'Australia', trend_count: 45, avg_viral_score: 64.8, app_count: 98, forum_activity: 390, word_velocity: 7.6, total_mentions: 9800, top_category: 'casual' },
  { code: 'MX', name: 'Mexico', trend_count: 52, avg_viral_score: 59.2, app_count: 87, forum_activity: 420, word_velocity: 8.9, total_mentions: 10200, top_category: 'action' },
  { code: 'ES', name: 'Spain', trend_count: 48, avg_viral_score: 61.5, app_count: 95, forum_activity: 380, word_velocity: 6.4, total_mentions: 9400, top_category: 'puzzle' },
  { code: 'IT', name: 'Italy', trend_count: 42, avg_viral_score: 58.7, app_count: 82, forum_activity: 340, word_velocity: 5.8, total_mentions: 8100, top_category: 'strategy' },
  { code: 'TR', name: 'Turkey', trend_count: 61, avg_viral_score: 67.9, app_count: 108, forum_activity: 560, word_velocity: 9.3, total_mentions: 12800, top_category: 'action' },
  { code: 'ID', name: 'Indonesia', trend_count: 78, avg_viral_score: 64.2, app_count: 145, forum_activity: 620, word_velocity: 10.7, total_mentions: 16400, top_category: 'moba' },
  { code: 'TH', name: 'Thailand', trend_count: 55, avg_viral_score: 62.8, app_count: 98, forum_activity: 440, word_velocity: 8.4, total_mentions: 11200, top_category: 'gacha' },
  { code: 'VN', name: 'Vietnam', trend_count: 49, avg_viral_score: 60.1, app_count: 86, forum_activity: 380, word_velocity: 7.9, total_mentions: 9600, top_category: 'moba' },
  { code: 'PH', name: 'Philippines', trend_count: 44, avg_viral_score: 58.5, app_count: 76, forum_activity: 350, word_velocity: 7.2, total_mentions: 8700, top_category: 'action' },
  { code: 'RU', name: 'Russia', trend_count: 72, avg_viral_score: 63.9, app_count: 134, forum_activity: 580, word_velocity: 8.6, total_mentions: 14500, top_category: 'strategy' },
  { code: 'PL', name: 'Poland', trend_count: 38, avg_viral_score: 57.3, app_count: 68, forum_activity: 290, word_velocity: 5.4, total_mentions: 7200, top_category: 'rpg' },
  { code: 'NL', name: 'Netherlands', trend_count: 32, avg_viral_score: 60.8, app_count: 62, forum_activity: 260, word_velocity: 6.1, total_mentions: 6400, top_category: 'idle' },
  { code: 'SE', name: 'Sweden', trend_count: 28, avg_viral_score: 62.4, app_count: 54, forum_activity: 230, word_velocity: 5.9, total_mentions: 5600, top_category: 'puzzle' },
  { code: 'SG', name: 'Singapore', trend_count: 35, avg_viral_score: 70.2, app_count: 78, forum_activity: 310, word_velocity: 9.1, total_mentions: 7800, top_category: 'gacha' },
  { code: 'SA', name: 'Saudi Arabia', trend_count: 41, avg_viral_score: 66.5, app_count: 89, forum_activity: 370, word_velocity: 8.7, total_mentions: 8900, top_category: 'action' },
  { code: 'AE', name: 'UAE', trend_count: 33, avg_viral_score: 68.9, app_count: 72, forum_activity: 280, word_velocity: 7.8, total_mentions: 7100, top_category: 'casual' },
  { code: 'AR', name: 'Argentina', trend_count: 36, avg_viral_score: 56.4, app_count: 64, forum_activity: 300, word_velocity: 7.1, total_mentions: 6800, top_category: 'action' },
  { code: 'CO', name: 'Colombia', trend_count: 29, avg_viral_score: 54.8, app_count: 52, forum_activity: 240, word_velocity: 6.5, total_mentions: 5400, top_category: 'casual' },
  { code: 'ZA', name: 'South Africa', trend_count: 24, avg_viral_score: 52.1, app_count: 45, forum_activity: 190, word_velocity: 5.2, total_mentions: 4200, top_category: 'casual' },
  { code: 'NG', name: 'Nigeria', trend_count: 31, avg_viral_score: 55.6, app_count: 48, forum_activity: 260, word_velocity: 6.8, total_mentions: 5800, top_category: 'action' },
  { code: 'EG', name: 'Egypt', trend_count: 27, avg_viral_score: 53.2, app_count: 42, forum_activity: 220, word_velocity: 5.9, total_mentions: 4800, top_category: 'puzzle' },
  { code: 'MY', name: 'Malaysia', trend_count: 38, avg_viral_score: 63.7, app_count: 72, forum_activity: 320, word_velocity: 8.2, total_mentions: 7600, top_category: 'moba' },
  { code: 'TW', name: 'Taiwan', trend_count: 46, avg_viral_score: 72.4, app_count: 96, forum_activity: 410, word_velocity: 10.3, total_mentions: 9800, top_category: 'gacha' },
  { code: 'FI', name: 'Finland', trend_count: 22, avg_viral_score: 69.8, app_count: 48, forum_activity: 180, word_velocity: 5.6, total_mentions: 4100, top_category: 'strategy' },
  { code: 'NO', name: 'Norway', trend_count: 18, avg_viral_score: 61.3, app_count: 38, forum_activity: 150, word_velocity: 4.8, total_mentions: 3200, top_category: 'idle' },
  { code: 'DK', name: 'Denmark', trend_count: 20, avg_viral_score: 60.5, app_count: 42, forum_activity: 170, word_velocity: 5.1, total_mentions: 3600, top_category: 'puzzle' },
  { code: 'IL', name: 'Israel', trend_count: 26, avg_viral_score: 67.4, app_count: 56, forum_activity: 230, word_velocity: 7.4, total_mentions: 5200, top_category: 'strategy' },
  { code: 'PT', name: 'Portugal', trend_count: 19, avg_viral_score: 55.9, app_count: 36, forum_activity: 160, word_velocity: 4.6, total_mentions: 3400, top_category: 'casual' },
  { code: 'AT', name: 'Austria', trend_count: 21, avg_viral_score: 58.2, app_count: 44, forum_activity: 180, word_velocity: 5.3, total_mentions: 3800, top_category: 'strategy' },
  { code: 'CH', name: 'Switzerland', trend_count: 23, avg_viral_score: 62.7, app_count: 50, forum_activity: 200, word_velocity: 5.7, total_mentions: 4400, top_category: 'puzzle' },
];

function seedRegions() {
  console.log('🌍 Seeding region data...');

  // Ensure tables exist
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
      trend_id INTEGER,
      region_code TEXT NOT NULL,
      relevance_score REAL DEFAULT 1.0,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(trend_id, region_code)
    );
  `);

  // Clear existing seed data
  db.prepare("DELETE FROM region_metrics WHERE period = 'daily'").run();

  const insertMetrics = db.prepare(`
    INSERT OR REPLACE INTO region_metrics (code, name, trend_count, avg_viral_score, app_count, forum_activity, word_velocity, total_mentions, top_category, period, period_start)
    VALUES (@code, @name, @trend_count, @avg_viral_score, @app_count, @forum_activity, @word_velocity, @total_mentions, @top_category, 'daily', datetime('now'))
  `);

  const insertSnapshot = db.prepare(`
    INSERT INTO region_snapshots (region_code, trend_count, avg_viral_score, app_count, forum_activity, word_velocity, recorded_at)
    VALUES (@region_code, @trend_count, @avg_viral_score, @app_count, @forum_activity, @word_velocity, @recorded_at)
  `);

  const transaction = db.transaction(() => {
    for (const r of REGIONS) {
      // Insert current metrics
      insertMetrics.run({
        code: r.code,
        name: r.name,
        trend_count: r.trend_count,
        avg_viral_score: r.avg_viral_score,
        app_count: r.app_count,
        forum_activity: r.forum_activity,
        word_velocity: r.word_velocity,
        total_mentions: r.total_mentions,
        top_category: r.top_category,
      });

      // Generate 14 days of historical snapshots with slight variance
      for (let d = 13; d >= 0; d--) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        const jitter = () => 0.85 + Math.random() * 0.3; // 0.85 - 1.15 variance

        insertSnapshot.run({
          region_code: r.code,
          trend_count: Math.round(r.trend_count * jitter()),
          avg_viral_score: Math.round(r.avg_viral_score * jitter() * 100) / 100,
          app_count: Math.round(r.app_count * jitter()),
          forum_activity: Math.round(r.forum_activity * jitter()),
          word_velocity: Math.round(r.word_velocity * jitter() * 100) / 100,
          recorded_at: date.toISOString(),
        });
      }
    }

    // Link existing trends to regions via geo_trend_links
    const trends = db.prepare("SELECT id, region FROM trends WHERE region IS NOT NULL AND region != 'global' LIMIT 500").all() as Array<{ id: number; region: string }>;

    const insertLink = db.prepare(`
      INSERT OR IGNORE INTO geo_trend_links (trend_id, region_code, relevance_score)
      VALUES (@trend_id, @region_code, @relevance_score)
    `);

    for (const t of trends) {
      insertLink.run({
        trend_id: t.id,
        region_code: t.region,
        relevance_score: 0.7 + Math.random() * 0.3,
      });
    }

    console.log(`  ✅ Inserted ${REGIONS.length} region metrics`);
    console.log(`  ✅ Generated ${REGIONS.length * 14} historical snapshots`);
    console.log(`  ✅ Linked ${trends.length} trends to regions`);
  });

  transaction();
}

function seedCronConfigs() {
  console.log('⚙️  Seeding region cron configs...');

  // Ensure cron_configs table exists (it should from main db init)
  const existing = db.prepare("SELECT COUNT(*) as count FROM cron_configs WHERE target_dashboard = 'regions'").get() as { count: number };
  if (existing.count >= 2) {
    console.log('  ⏭️  Region cron configs already exist, skipping');
    return;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO cron_configs (name, description, prompt, schedule, agent, source_type, target_dashboard, enabled)
    VALUES (@name, @description, @prompt, @schedule, @agent, @source_type, @target_dashboard, @enabled)
  `);

  insert.run({
    name: 'Region Metrics Aggregator',
    description: 'Rebuild region_metrics by aggregating trends, apps, forums, and words data grouped by region. Runs daily to keep the geo dashboard up to date.',
    prompt: 'Aggregate all trend, app, forum, and word data by region. For each ISO 3166-1 alpha-2 region code found in the trends table, compute: trend_count, avg_viral_score, app_count, forum_activity, word_velocity, total_mentions. Insert results into region_metrics with period=daily. Also create a region_snapshot for historical tracking.',
    schedule: '0 3 * * *',
    agent: 'default',
    source_type: 'aggregator',
    target_dashboard: 'regions',
    enabled: 1,
  });

  insert.run({
    name: 'Regional Viral Detector',
    description: 'Scan for trends with unusually high viral scores in specific regions. Detect regional spikes and cross-border spread patterns.',
    prompt: 'Analyze trends table for regional viral spikes. For each region, compare current avg_viral_score against 7-day moving average from region_snapshots. Flag regions where current score exceeds average by >20%. Create geo_trend_links for high-relevance trend-region pairs. Report detected regional virals with region code, trend titles, and spike magnitude.',
    schedule: '0 */6 * * *',
    agent: 'default',
    source_type: 'detector',
    target_dashboard: 'regions',
    enabled: 1,
  });

  console.log('  ✅ Inserted 2 region cron configs');
}

seedRegions();
seedCronConfigs();
db.close();
console.log('🌍 Region seed complete!');
