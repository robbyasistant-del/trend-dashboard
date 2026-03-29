import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'trends.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('🌱 Seeding Sprint 6 data...\n');

// ── Ensure tables exist ──────────────────────────────────────
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
`);

// ── Correlations ─────────────────────────────────────────────
const insertCorr = db.prepare(`
  INSERT OR IGNORE INTO correlations (source_type, source_id, source_name, target_type, target_id, target_name, correlation_type, strength, metadata)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const correlations = [
  ['trend', 1, 'Hyper-Casual Puzzle Surge', 'forum', 1, 'Best puzzle games 2025?', 'keyword_match', 0.85, '{"shared_keywords":["puzzle","casual","surge"]}'],
  ['trend', 2, 'Idle Tycoon Mechanics Revival', 'app', 1, 'Idle Factory Empire', 'keyword_match', 0.78, '{"shared_keywords":["idle","tycoon","factory"]}'],
  ['trend', 3, 'Merge Games Explosion', 'forum', 2, 'Merge mechanics discussion', 'keyword_match', 0.92, '{"shared_keywords":["merge","combine","match"]}'],
  ['trend', 4, 'Battle Royale Casual Mix', 'app', 3, 'Mini Royale', 'keyword_match', 0.71, '{"shared_keywords":["battle","royale","casual"]}'],
  ['trend', 5, 'Cozy Farming Revival', 'word', 1, 'cozy', 'keyword_match', 0.88, '{"word_score":95}'],
  ['forum', 3, 'What idle games are worth it?', 'app', 2, 'Idle Miner Tycoon', 'category_match', 0.65, '{"category":"idle"}'],
  ['forum', 4, 'Best new match-3 games', 'trend', 6, 'Match-3 Innovation Wave', 'keyword_match', 0.73, '{"shared_keywords":["match","puzzle","candy"]}'],
  ['trend', 7, 'AI-Generated Game Assets', 'forum', 5, 'AI art in mobile games debate', 'topic_overlap', 0.82, '{"topic":"ai_gaming"}'],
  ['app', 4, 'Candy Crush Saga', 'word', 2, 'candy', 'keyword_match', 0.90, '{"word_score":88}'],
  ['trend', 8, 'Social Casino Resurgence', 'app', 5, 'Coin Master', 'category_match', 0.67, '{"category":"casino"}'],
  ['word', 3, 'roguelike', 'forum', 6, 'Roguelike mechanics in mobile', 'keyword_match', 0.79, '{"mentions":42}'],
  ['trend', 9, 'Cross-Platform Play Demand', 'forum', 7, 'Cross-play for mobile games', 'topic_overlap', 0.86, '{"topic":"cross_platform"}'],
];

const corrTransaction = db.transaction(() => {
  for (const c of correlations) {
    insertCorr.run(...c);
  }
});
corrTransaction();
console.log(`✅ Inserted ${correlations.length} correlations`);

// ── Velocity Alerts ──────────────────────────────────────────
const insertAlert = db.prepare(`
  INSERT INTO velocity_alerts (entity_type, entity_id, entity_name, velocity_score, acceleration, previous_score, alert_level, is_read, detected_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date();
function daysAgo(n: number) {
  return new Date(now.getTime() - n * 86400000).toISOString();
}

const velocityAlerts = [
  ['trend', 1, 'Hyper-Casual Puzzle Surge', 45.2, 120.5, 20.5, 'critical', 0, daysAgo(0)],
  ['trend', 2, 'Idle Tycoon Revival', 32.1, 85.3, 37.0, 'critical', 0, daysAgo(0)],
  ['app', 1, 'Idle Factory Empire', 28.7, 67.8, 42.3, 'high', 0, daysAgo(1)],
  ['trend', 3, 'Merge Games Explosion', 25.4, 55.1, 46.2, 'high', 0, daysAgo(1)],
  ['forum', 1, 'Best puzzle games 2025?', 18.9, 42.0, 45.0, 'medium', 0, daysAgo(1)],
  ['trend', 5, 'Cozy Farming Revival', 15.3, 35.2, 43.5, 'medium', 0, daysAgo(2)],
  ['app', 3, 'Mini Royale', 12.8, 28.9, 44.3, 'medium', 1, daysAgo(2)],
  ['trend', 6, 'Match-3 Innovation Wave', 9.5, 22.1, 43.0, 'low', 1, daysAgo(3)],
  ['forum', 4, 'Best new match-3 games', 8.2, 18.5, 44.5, 'low', 1, daysAgo(3)],
  ['app', 5, 'Coin Master', 7.1, 15.3, 47.5, 'low', 1, daysAgo(4)],
  ['trend', 7, 'AI-Generated Game Assets', 35.8, 95.2, 37.6, 'critical', 0, daysAgo(0)],
  ['trend', 8, 'Social Casino Resurgence', 22.4, 52.7, 42.7, 'high', 0, daysAgo(1)],
  ['forum', 6, 'Roguelike mechanics in mobile', 11.3, 25.8, 43.9, 'medium', 0, daysAgo(2)],
  ['app', 2, 'Idle Miner Tycoon', 6.5, 14.2, 45.7, 'low', 1, daysAgo(4)],
  ['trend', 9, 'Cross-Platform Play Demand', 19.7, 44.3, 44.4, 'medium', 0, daysAgo(1)],
  ['word', 1, 'cozy', 14.1, 31.6, 45.0, 'medium', 0, daysAgo(2)],
  ['word', 3, 'roguelike', 8.9, 19.8, 45.5, 'low', 1, daysAgo(3)],
];

const alertTransaction = db.transaction(() => {
  for (const a of velocityAlerts) {
    insertAlert.run(...a);
  }
});
alertTransaction();
console.log(`✅ Inserted ${velocityAlerts.length} velocity alerts`);

// ── Competitors ──────────────────────────────────────────────
const insertCompetitor = db.prepare(`
  INSERT OR IGNORE INTO competitors (name, type, website, description, enabled)
  VALUES (?, ?, ?, ?, ?)
`);

const competitors = [
  ['Voodoo', 'studio', 'https://www.voodoo.io', 'Leading hyper-casual game publisher with 6B+ downloads', 1],
  ['Supersonic (ironSource)', 'studio', 'https://supersonic.com', 'Hyper-casual publishing arm of Unity/ironSource', 1],
  ['Playrix', 'studio', 'https://www.playrix.com', 'Russian studio known for Homescapes, Gardenscapes, Township', 1],
  ['King (Activision)', 'studio', 'https://king.com', 'Candy Crush franchise, casual puzzle leader', 1],
  ['Zynga (Take-Two)', 'studio', 'https://www.zynga.com', 'Social casino and casual games powerhouse', 1],
  ['Rovio (SEGA)', 'studio', 'https://www.rovio.com', 'Angry Birds franchise, casual entertainment', 1],
  ['SayGames', 'studio', 'https://saygames.io', 'Top hyper-casual publisher from Ukraine', 1],
  ['Azur Games', 'studio', 'https://azurgames.com', 'Major hyper-casual and mid-core publisher', 1],
  ['Jam City', 'studio', 'https://www.jamcity.com', 'Disney partnerships, match-3 and RPG games', 1],
  ['CrazyLabs', 'studio', 'https://www.crazylabs.com', 'Hyper-casual publisher with 5B+ downloads', 1],
];

const compTransaction = db.transaction(() => {
  for (const c of competitors) {
    insertCompetitor.run(...c);
  }
});
compTransaction();
console.log(`✅ Inserted ${competitors.length} competitors`);

// ── Competitor Snapshots ─────────────────────────────────────
const insertSnapshot = db.prepare(`
  INSERT INTO competitor_snapshots (competitor_id, app_count, total_downloads, avg_rating, market_share, snapshot_date)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Get competitor IDs
const compRows = db.prepare('SELECT id, name FROM competitors ORDER BY name ASC').all() as Array<{ id: number; name: string }>;
const compMap = new Map<string, number>();
for (const c of compRows) {
  compMap.set(c.name, c.id);
}

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

const snapshotData: Array<[string, number, number, number, number]> = [
  ['Voodoo', 250, 6200000000, 4.1, 12.5],
  ['Supersonic (ironSource)', 120, 3100000000, 4.0, 8.2],
  ['Playrix', 15, 2800000000, 4.5, 7.8],
  ['King (Activision)', 25, 5500000000, 4.3, 11.0],
  ['Zynga (Take-Two)', 40, 4200000000, 4.1, 9.5],
  ['Rovio (SEGA)', 20, 4800000000, 4.2, 10.1],
  ['SayGames', 180, 2500000000, 3.9, 6.8],
  ['Azur Games', 200, 3800000000, 4.0, 9.0],
  ['Jam City', 18, 1200000000, 4.3, 3.5],
  ['CrazyLabs', 190, 5000000000, 3.8, 10.5],
];

const snapTransaction = db.transaction(() => {
  for (const [name, appCount, downloads, rating, share] of snapshotData) {
    const compId = compMap.get(name);
    if (!compId) continue;
    // Insert 3 snapshots with slight variations
    insertSnapshot.run(compId, appCount - 5, downloads - 100000000, rating - 0.1, share - 0.3, weekAgo);
    insertSnapshot.run(compId, appCount - 2, downloads - 50000000, rating, share - 0.1, yesterday);
    insertSnapshot.run(compId, appCount, downloads, rating, share, today);
  }
});
snapTransaction();
console.log(`✅ Inserted ${snapshotData.length * 3} competitor snapshots`);

console.log('\n🎉 Sprint 6 seed data complete!');
db.close();
