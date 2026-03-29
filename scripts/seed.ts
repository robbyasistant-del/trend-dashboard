import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'trends.db');

// Delete existing DB for clean seed
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create tables ──────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, type TEXT NOT NULL,
    url TEXT, icon TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT,
    source_id INTEGER REFERENCES sources(id), source_name TEXT, url TEXT,
    viral_score INTEGER DEFAULT 0, velocity REAL DEFAULT 0, category TEXT,
    region TEXT DEFAULT 'global', tags TEXT DEFAULT '[]', mentions INTEGER DEFAULT 0,
    sentiment REAL DEFAULT 0, lifecycle TEXT DEFAULT 'emerging', data_json TEXT DEFAULT '{}',
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS trend_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, trend_id INTEGER REFERENCES trends(id) ON DELETE CASCADE,
    viral_score INTEGER, velocity REAL, mentions INTEGER, snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cron_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, prompt TEXT NOT NULL,
    schedule TEXT NOT NULL, agent TEXT DEFAULT 'default', source_type TEXT, enabled INTEGER DEFAULT 1,
    last_run DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cron_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cron_config_id INTEGER REFERENCES cron_configs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', output TEXT, items_processed INTEGER DEFAULT 0, error TEXT,
    started_at DATETIME, completed_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, count INTEGER DEFAULT 0,
    category TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_trends_viral_score ON trends(viral_score DESC);
  CREATE INDEX IF NOT EXISTS idx_trends_category ON trends(category);
  CREATE INDEX IF NOT EXISTS idx_trends_region ON trends(region);
  CREATE INDEX IF NOT EXISTS idx_trends_lifecycle ON trends(lifecycle);
`);

// ── Sources ────────────────────────────────────────────────────

const insertSource = db.prepare('INSERT INTO sources (name, type, url, icon) VALUES (?, ?, ?, ?)');
const sources = [
  ['Reddit r/gaming', 'reddit', 'https://reddit.com/r/gaming', '🔴'],
  ['Reddit r/AndroidGaming', 'reddit', 'https://reddit.com/r/AndroidGaming', '🔴'],
  ['Hacker News', 'hackernews', 'https://news.ycombinator.com', '🟠'],
  ['X/Twitter Gaming', 'twitter', 'https://x.com', '🐦'],
  ['TikTok Gaming', 'tiktok', 'https://tiktok.com', '🎵'],
  ['Google Play Store', 'appstore', 'https://play.google.com', '🟢'],
  ['Apple App Store', 'appstore', 'https://apps.apple.com', '🍎'],
  ['TouchArcade', 'forum', 'https://toucharcade.com', '🎮'],
  ['Pocket Gamer', 'news', 'https://pocketgamer.com', '📰'],
  ['YouTube Gaming', 'youtube', 'https://youtube.com', '▶️'],
];
for (const s of sources) insertSource.run(...s);

// ── Trends ─────────────────────────────────────────────────────

const insertTrend = db.prepare(`
  INSERT INTO trends (title, description, source_name, url, viral_score, velocity, category, region, tags, mentions, sentiment, lifecycle, detected_at)
  VALUES (@title, @description, @source_name, @url, @viral_score, @velocity, @category, @region, @tags, @mentions, @sentiment, @lifecycle, @detected_at)
`);

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

const trends = [
  { title: 'Puzzle Merge Mechanics Going Viral on TikTok', description: 'New wave of merge-3 puzzle games gaining massive traction through short-form video content. Multiple clones appearing daily.', source_name: 'TikTok Gaming', url: 'https://tiktok.com/tag/mergepuzzle', viral_score: 92, velocity: 8.5, category: 'puzzle', region: 'global', tags: '["merge","puzzle","tiktok","viral"]', mentions: 45200, sentiment: 0.78, lifecycle: 'trending', detected_at: daysAgo(2) },
  { title: 'Daily Word Games Renaissance — Post-Wordle Era', description: 'A new generation of daily word games combining multiple mechanics. Connections, Strands, and indie alternatives growing fast.', source_name: 'Reddit r/gaming', url: 'https://reddit.com/r/gaming/daily-word-games', viral_score: 85, velocity: 6.2, category: 'daily', region: 'US', tags: '["wordle","daily","word-game","puzzle"]', mentions: 32100, sentiment: 0.82, lifecycle: 'trending', detected_at: daysAgo(5) },
  { title: 'Idle Tycoon Games Surge in Japanese Market', description: 'Idle management games with anime aesthetics seeing unprecedented growth in Japan and South Korea. Revenue up 340% YoY.', source_name: 'Pocket Gamer', url: 'https://pocketgamer.com/idle-tycoon-japan', viral_score: 78, velocity: 7.1, category: 'idle', region: 'JP', tags: '["idle","tycoon","anime","japan"]', mentions: 18700, sentiment: 0.65, lifecycle: 'trending', detected_at: daysAgo(3) },
  { title: 'Hyper-Casual "Satisfying" Genre Decline', description: 'The satisfying/ASMR genre that dominated 2024-2025 showing signs of market saturation. Downloads down 28% QoQ.', source_name: 'Google Play Store', viral_score: 35, velocity: -3.2, category: 'hypercasual', region: 'global', tags: '["satisfying","asmr","hypercasual","decline"]', mentions: 8900, sentiment: -0.15, lifecycle: 'declining', detected_at: daysAgo(7) },
  { title: 'Cozy Farm Sim + Social = New Hit Formula', description: 'Games combining cozy farming simulation with async social mechanics (visiting friends farms, trading) emerging as top category.', source_name: 'Apple App Store', viral_score: 88, velocity: 9.2, category: 'casual', region: 'US', tags: '["cozy","farming","social","casual"]', mentions: 27800, sentiment: 0.91, lifecycle: 'emerging', detected_at: daysAgo(1) },
  { title: 'Roguelike Deck Builders on Mobile — Slay the Spire Effect', description: 'Mobile ports and clones of roguelike deck-building games showing strong retention metrics. Category growing 15% monthly.', source_name: 'TouchArcade', url: 'https://toucharcade.com/roguelike-deckbuilders', viral_score: 72, velocity: 4.8, category: 'strategy', region: 'global', tags: '["roguelike","deckbuilder","strategy","mobile"]', mentions: 15400, sentiment: 0.74, lifecycle: 'trending', detected_at: daysAgo(4) },
  { title: 'AI-Generated Puzzle Levels Controversy', description: 'Several top puzzle games caught using AI to generate levels, sparking debate about quality vs quantity in casual gaming.', source_name: 'Hacker News', url: 'https://news.ycombinator.com/ai-puzzle-levels', viral_score: 65, velocity: 5.4, category: 'puzzle', region: 'global', tags: '["ai","controversy","puzzle","quality"]', mentions: 22100, sentiment: -0.32, lifecycle: 'peaked', detected_at: daysAgo(6) },
  { title: 'Match-3 RPG Hybrids Dominating Revenue Charts', description: 'Games like Puzzles & Survival and similar match-3 + RPG hybrids are consistently in top 20 revenue worldwide.', source_name: 'Google Play Store', viral_score: 81, velocity: 3.1, category: 'puzzle', region: 'global', tags: '["match-3","rpg","hybrid","revenue"]', mentions: 19500, sentiment: 0.58, lifecycle: 'trending', detected_at: daysAgo(8) },
  { title: 'Retro Pixel Art Mini-Games Bundle Trend', description: 'Collections of retro-styled mini-games packaged as a single app gaining traction. Nostalgic aesthetics + bite-sized gameplay.', source_name: 'Reddit r/AndroidGaming', viral_score: 58, velocity: 4.1, category: 'casual', region: 'EU', tags: '["retro","pixel-art","mini-games","nostalgia"]', mentions: 9200, sentiment: 0.67, lifecycle: 'emerging', detected_at: daysAgo(2) },
  { title: 'Brain Training Apps Comeback via Short-Form Content', description: 'Brain training and IQ test games resurging thanks to viral TikTok/Reels content showing "impossible" puzzles.', source_name: 'TikTok Gaming', viral_score: 74, velocity: 6.8, category: 'puzzle', region: 'global', tags: '["brain-training","iq","viral","tiktok"]', mentions: 31000, sentiment: 0.45, lifecycle: 'emerging', detected_at: daysAgo(3) },
  { title: 'Spanish-Language Casual Games Market Boom', description: 'Latin American casual games market growing 45% YoY. Local studios producing culturally-relevant content seeing massive adoption.', source_name: 'Pocket Gamer', viral_score: 69, velocity: 5.5, category: 'casual', region: 'ES', tags: '["latam","spanish","localization","growth"]', mentions: 7800, sentiment: 0.72, lifecycle: 'emerging', detected_at: daysAgo(4) },
  { title: 'Multiplayer Party Games — Among Us Legacy Lives On', description: 'New wave of multiplayer party games with simple mechanics and social deduction elements. Discord integration becoming standard.', source_name: 'YouTube Gaming', viral_score: 63, velocity: 2.9, category: 'social', region: 'global', tags: '["multiplayer","party","social-deduction","discord"]', mentions: 14200, sentiment: 0.61, lifecycle: 'peaked', detected_at: daysAgo(10) },
  { title: 'Minimalist Puzzle Games — Less is More', description: 'Ultra-minimalist puzzle games with clean design and no ads gaining cult following. Premium model working for this niche.', source_name: 'Hacker News', viral_score: 55, velocity: 2.3, category: 'puzzle', region: 'US', tags: '["minimalist","premium","no-ads","indie"]', mentions: 6100, sentiment: 0.88, lifecycle: 'emerging', detected_at: daysAgo(5) },
  { title: 'Fitness + Gaming Casual Crossover', description: 'Gamified fitness apps with casual game mechanics (step counting = currency, walking = exploration) breaking into top charts.', source_name: 'Apple App Store', viral_score: 71, velocity: 7.3, category: 'casual', region: 'US', tags: '["fitness","gamification","health","walking"]', mentions: 16800, sentiment: 0.79, lifecycle: 'emerging', detected_at: daysAgo(1) },
  { title: 'Narrative Puzzle Boxes — Escape Room at Home', description: 'Physical-digital hybrid puzzle box games trending. QR codes link to app-based puzzles. Great for gifting season.', source_name: 'Reddit r/gaming', viral_score: 47, velocity: 3.6, category: 'puzzle', region: 'EU', tags: '["escape-room","narrative","hybrid","physical"]', mentions: 5400, sentiment: 0.71, lifecycle: 'emerging', detected_at: daysAgo(6) },
  { title: 'Casual Auto-Battler Genre Explosion', description: 'Simplified auto-battler games designed for mobile casual audience. 5-minute matches, easy to learn, hard to master.', source_name: 'TouchArcade', viral_score: 76, velocity: 5.9, category: 'strategy', region: 'KR', tags: '["auto-battler","strategy","mobile","casual"]', mentions: 12300, sentiment: 0.64, lifecycle: 'trending', detected_at: daysAgo(3) },
  { title: 'Color Sorting / Ball Sort Clones Oversaturation', description: 'The ball/color sorting genre has hit peak saturation with 500+ clones on stores. Only top 3 remain profitable.', source_name: 'Google Play Store', viral_score: 28, velocity: -4.1, category: 'hypercasual', region: 'global', tags: '["ball-sort","color-sort","saturation","clone"]', mentions: 4200, sentiment: -0.25, lifecycle: 'declining', detected_at: daysAgo(12) },
  { title: 'AI Companion Casual Games — Virtual Pet 2.0', description: 'AI-powered virtual pet and companion games using LLMs for personality. Users spending avg 25 min/day. New engagement paradigm.', source_name: 'X/Twitter Gaming', viral_score: 83, velocity: 8.1, category: 'casual', region: 'US', tags: '["ai","virtual-pet","companion","llm"]', mentions: 28500, sentiment: 0.73, lifecycle: 'emerging', detected_at: daysAgo(2) },
  { title: 'Crossword Renaissance — NYT Effect Spreading', description: 'NYT Games success inspiring a wave of premium crossword and word puzzle apps. Subscription model validated at scale.', source_name: 'Apple App Store', viral_score: 67, velocity: 3.4, category: 'daily', region: 'US', tags: '["crossword","nyt","subscription","premium"]', mentions: 11700, sentiment: 0.81, lifecycle: 'trending', detected_at: daysAgo(9) },
  { title: 'Casual RTS Games for Mobile — Clash Evolved', description: 'New generation of real-time strategy games with simplified controls and 3-minute matches. Accessible strategy for everyone.', source_name: 'Pocket Gamer', viral_score: 59, velocity: 4.2, category: 'strategy', region: 'global', tags: '["rts","strategy","mobile","accessible"]', mentions: 8900, sentiment: 0.56, lifecycle: 'emerging', detected_at: daysAgo(4) },
];

const insertBatch = db.transaction(() => {
  for (const t of trends) insertTrend.run({ url: null, ...t });
});
insertBatch();

// ── Tags ───────────────────────────────────────────────────────

const upsertTag = db.prepare('INSERT INTO tags (name, count, category) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET count = count + ?');
const tagCounts: Record<string, { count: number; category: string }> = {};
for (const t of trends) {
  const tags = JSON.parse(t.tags) as string[];
  for (const tag of tags) {
    if (!tagCounts[tag]) tagCounts[tag] = { count: 0, category: t.category };
    tagCounts[tag].count++;
  }
}
for (const [name, { count, category }] of Object.entries(tagCounts)) {
  upsertTag.run(name, count, category, count);
}

// ── Cron configs ───────────────────────────────────────────────

const insertCron = db.prepare(`
  INSERT INTO cron_configs (name, description, prompt, schedule, agent, source_type, enabled)
  VALUES (@name, @description, @prompt, @schedule, @agent, @source_type, @enabled)
`);

const crons = [
  { name: 'Reddit Casual Gaming Scanner', description: 'Scans r/gaming, r/AndroidGaming, r/iosgaming for trending casual game posts', prompt: 'Search Reddit subreddits r/gaming, r/AndroidGaming, r/iosgaming for posts about casual games that are gaining traction. For each trending topic, extract: title, description, URL, estimated viral score (0-100), category (puzzle/idle/casual/hypercasual/daily/strategy/social), relevant tags, and mention count. Output as JSON array of trends.', schedule: '0 */6 * * *', agent: 'default', source_type: 'reddit', enabled: 1 },
  { name: 'App Store Top Movers', description: 'Tracks fastest-rising casual games on Google Play and Apple App Store', prompt: 'Check Google Play Store and Apple App Store for casual games that are rapidly climbing the charts. Focus on games in categories: Puzzle, Casual, Board, Trivia, Word. For each, extract: title, current ranking, rank change, description, category, estimated viral score, region of strongest growth. Output as JSON array of trends.', schedule: '0 9,18 * * *', agent: 'default', source_type: 'appstore', enabled: 1 },
  { name: 'TikTok Gaming Viral Detector', description: 'Finds casual game content going viral on TikTok', prompt: 'Search TikTok for casual game-related videos with high engagement (>100K views in 24h). Identify which games are being featured, what mechanics are shown, and how the community is reacting. Extract: game title, viral score, view count, engagement rate, category, relevant tags. Output as JSON array of trends.', schedule: '0 */4 * * *', agent: 'default', source_type: 'tiktok', enabled: 1 },
  { name: 'HN/Tech Forum Games Intel', description: 'Monitors Hacker News and tech forums for casual gaming discussions', prompt: 'Search Hacker News, Lobsters, and tech forums for discussions about casual game development, new game launches, or gaming market analysis. Focus on technical and business insights. Extract: topic title, description, URL, relevance score, category, tags. Output as JSON array of trends.', schedule: '0 8 * * *', agent: 'default', source_type: 'hackernews', enabled: 1 },
  { name: 'YouTube Gaming Trends', description: 'Tracks trending casual game videos and reviews on YouTube', prompt: 'Search YouTube for trending videos about casual mobile games, game reviews, and "best casual games" compilations published in the last 24h. Extract: video title, game mentioned, view count, like ratio, category, tags. Output as JSON array of trends.', schedule: '0 12 * * *', agent: 'default', source_type: 'youtube', enabled: 0 },
  { name: 'Weekly Market Report', description: 'Comprehensive weekly analysis of casual games market', prompt: 'Generate a comprehensive weekly report of the casual games market: top trending genres, emerging mechanics, declining categories, notable new releases, revenue highlights, and regional analysis. Include data from all tracked sources. Output as a single trend entry with detailed data_json.', schedule: '0 10 * * 1', agent: 'claude-sonnet', source_type: 'analysis', enabled: 1 },
];

for (const c of crons) insertCron.run(c);

// ── Cron runs (demo history) ───────────────────────────────────

const insertRun = db.prepare(`
  INSERT INTO cron_runs (cron_config_id, status, items_processed, started_at, completed_at)
  VALUES (?, ?, ?, ?, ?)
`);

for (let i = 1; i <= 4; i++) {
  for (let d = 0; d < 3; d++) {
    const started = daysAgo(d);
    insertRun.run(i, 'success', Math.floor(Math.random() * 8) + 2, started, started);
  }
}

// ── Ensure inbox directory ─────────────────────────────────────

const inboxDir = path.join(process.cwd(), 'data', 'inbox');
if (!fs.existsSync(inboxDir)) fs.mkdirSync(inboxDir, { recursive: true });
const gitkeep = path.join(inboxDir, '.gitkeep');
if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '');

db.close();
console.log('✅ Seed complete! Created:');
console.log(`   ${sources.length} sources`);
console.log(`   ${trends.length} trends`);
console.log(`   ${Object.keys(tagCounts).length} tags`);
console.log(`   ${crons.length} cron configs`);
console.log(`   12 cron run records`);
console.log(`\nRun: npm run dev`);
