import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'trends.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure word tables exist
db.exec(`
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
`);

// Clear existing word data for clean seed
db.exec('DELETE FROM word_frequencies');
db.exec('DELETE FROM word_competitions');
db.exec('DELETE FROM word_clusters');
db.exec('DELETE FROM word_entries');

// ── Seed word entries ──────────────────────────────────────────

const insertWord = db.prepare(`
  INSERT INTO word_entries (word, source, category, frequency, score, growth, sentiment, first_seen, last_seen)
  VALUES (@word, @source, @category, @frequency, @score, @growth, @sentiment, @first_seen, @last_seen)
`);

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

const wordEntries = [
  { word: 'merge', source: 'reddit', category: 'mechanic', frequency: 342, score: 92, growth: 15.2, sentiment: 0.78, first_seen: daysAgo(30), last_seen: daysAgo(0) },
  { word: 'idle', source: 'reddit', category: 'genre', frequency: 287, score: 85, growth: 8.4, sentiment: 0.65, first_seen: daysAgo(45), last_seen: daysAgo(0) },
  { word: 'puzzle', source: 'tiktok', category: 'genre', frequency: 523, score: 88, growth: 12.1, sentiment: 0.82, first_seen: daysAgo(60), last_seen: daysAgo(0) },
  { word: 'cozy', source: 'twitter', category: 'aesthetic', frequency: 198, score: 79, growth: 22.5, sentiment: 0.91, first_seen: daysAgo(20), last_seen: daysAgo(0) },
  { word: 'roguelike', source: 'reddit', category: 'genre', frequency: 156, score: 72, growth: 6.8, sentiment: 0.74, first_seen: daysAgo(50), last_seen: daysAgo(1) },
  { word: 'deckbuilder', source: 'reddit', category: 'mechanic', frequency: 134, score: 68, growth: 5.2, sentiment: 0.71, first_seen: daysAgo(40), last_seen: daysAgo(1) },
  { word: 'satisfying', source: 'tiktok', category: 'aesthetic', frequency: 412, score: 35, growth: -12.3, sentiment: 0.45, first_seen: daysAgo(90), last_seen: daysAgo(2) },
  { word: 'asmr', source: 'tiktok', category: 'aesthetic', frequency: 289, score: 32, growth: -8.7, sentiment: 0.42, first_seen: daysAgo(80), last_seen: daysAgo(3) },
  { word: 'wordle', source: 'twitter', category: 'game', frequency: 267, score: 65, growth: -3.1, sentiment: 0.81, first_seen: daysAgo(120), last_seen: daysAgo(0) },
  { word: 'tycoon', source: 'appstore', category: 'genre', frequency: 178, score: 76, growth: 18.9, sentiment: 0.63, first_seen: daysAgo(35), last_seen: daysAgo(0) },
  { word: 'match-3', source: 'appstore', category: 'mechanic', frequency: 445, score: 81, growth: 3.4, sentiment: 0.58, first_seen: daysAgo(100), last_seen: daysAgo(0) },
  { word: 'auto-battler', source: 'reddit', category: 'genre', frequency: 112, score: 74, growth: 14.6, sentiment: 0.64, first_seen: daysAgo(25), last_seen: daysAgo(0) },
  { word: 'farming', source: 'twitter', category: 'theme', frequency: 167, score: 77, growth: 19.3, sentiment: 0.88, first_seen: daysAgo(15), last_seen: daysAgo(0) },
  { word: 'retro', source: 'reddit', category: 'aesthetic', frequency: 143, score: 58, growth: 7.2, sentiment: 0.67, first_seen: daysAgo(55), last_seen: daysAgo(1) },
  { word: 'pixel-art', source: 'reddit', category: 'aesthetic', frequency: 121, score: 55, growth: 6.1, sentiment: 0.72, first_seen: daysAgo(48), last_seen: daysAgo(2) },
  { word: 'brain-training', source: 'tiktok', category: 'genre', frequency: 198, score: 71, growth: 16.4, sentiment: 0.45, first_seen: daysAgo(22), last_seen: daysAgo(0) },
  { word: 'crossword', source: 'appstore', category: 'genre', frequency: 156, score: 67, growth: 4.8, sentiment: 0.79, first_seen: daysAgo(70), last_seen: daysAgo(0) },
  { word: 'ai-companion', source: 'twitter', category: 'feature', frequency: 89, score: 83, growth: 34.2, sentiment: 0.73, first_seen: daysAgo(10), last_seen: daysAgo(0) },
  { word: 'subscription', source: 'appstore', category: 'monetization', frequency: 234, score: 62, growth: 2.1, sentiment: -0.15, first_seen: daysAgo(90), last_seen: daysAgo(0) },
  { word: 'free-to-play', source: 'reddit', category: 'monetization', frequency: 312, score: 48, growth: -1.5, sentiment: -0.22, first_seen: daysAgo(100), last_seen: daysAgo(1) },
  { word: 'social-deduction', source: 'reddit', category: 'mechanic', frequency: 98, score: 63, growth: -2.4, sentiment: 0.61, first_seen: daysAgo(65), last_seen: daysAgo(3) },
  { word: 'gamification', source: 'twitter', category: 'feature', frequency: 145, score: 69, growth: 11.8, sentiment: 0.76, first_seen: daysAgo(28), last_seen: daysAgo(0) },
  { word: 'minimalist', source: 'reddit', category: 'aesthetic', frequency: 87, score: 55, growth: 4.3, sentiment: 0.88, first_seen: daysAgo(42), last_seen: daysAgo(2) },
  { word: 'narrative', source: 'reddit', category: 'feature', frequency: 76, score: 47, growth: 3.8, sentiment: 0.71, first_seen: daysAgo(38), last_seen: daysAgo(4) },
  { word: 'multiplayer', source: 'tiktok', category: 'feature', frequency: 256, score: 59, growth: -0.8, sentiment: 0.56, first_seen: daysAgo(85), last_seen: daysAgo(1) },
  { word: 'casual-rts', source: 'reddit', category: 'genre', frequency: 67, score: 56, growth: 9.3, sentiment: 0.54, first_seen: daysAgo(18), last_seen: daysAgo(1) },
  { word: 'hypercasual', source: 'appstore', category: 'genre', frequency: 389, score: 28, growth: -15.6, sentiment: -0.18, first_seen: daysAgo(110), last_seen: daysAgo(2) },
  { word: 'clone', source: 'reddit', category: 'negative', frequency: 201, score: 25, growth: -4.2, sentiment: -0.35, first_seen: daysAgo(75), last_seen: daysAgo(1) },
  { word: 'fitness', source: 'appstore', category: 'theme', frequency: 134, score: 71, growth: 21.7, sentiment: 0.79, first_seen: daysAgo(12), last_seen: daysAgo(0) },
  { word: 'anime', source: 'reddit', category: 'aesthetic', frequency: 178, score: 73, growth: 9.8, sentiment: 0.68, first_seen: daysAgo(55), last_seen: daysAgo(0) },
];

const batchInsertWords = db.transaction(() => {
  for (const w of wordEntries) {
    insertWord.run(w);
  }
});
batchInsertWords();

// ── Seed word frequencies (time series) ────────────────────────

const insertFreq = db.prepare(`
  INSERT INTO word_frequencies (word_id, frequency, mentions, period, period_type)
  VALUES (@word_id, @frequency, @mentions, @period, @period_type)
`);

// Get all word IDs
const allWords = db.prepare('SELECT id, word, frequency FROM word_entries').all() as Array<{ id: number; word: string; frequency: number }>;

const batchInsertFreq = db.transaction(() => {
  for (const w of allWords) {
    // Generate 14 days of frequency data with some variance
    for (let d = 13; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const period = date.toISOString().slice(0, 10);
      const variance = 0.7 + Math.random() * 0.6; // 0.7x to 1.3x
      const dailyFreq = Math.max(1, Math.round((w.frequency / 14) * variance));
      insertFreq.run({
        word_id: w.id,
        frequency: dailyFreq,
        mentions: Math.round(dailyFreq * (0.8 + Math.random() * 0.4)),
        period,
        period_type: 'daily',
      });
    }
  }
});
batchInsertFreq();

// ── Seed word competitions ─────────────────────────────────────

const insertComp = db.prepare(`
  INSERT INTO word_competitions (word_a_id, word_b_id, overlap_score, context, category)
  VALUES (@word_a_id, @word_b_id, @overlap_score, @context, @category)
`);

const wordMap: Record<string, number> = {};
for (const w of allWords) wordMap[w.word] = w.id;

const competitions = [
  { a: 'merge', b: 'match-3', overlap: 0.82, context: 'Puzzle mechanic overlap — both compete for casual puzzle players', category: 'mechanic' },
  { a: 'idle', b: 'tycoon', overlap: 0.75, context: 'Idle management games overlap with tycoon genre', category: 'genre' },
  { a: 'cozy', b: 'farming', overlap: 0.71, context: 'Cozy aesthetic strongly associated with farming games', category: 'theme' },
  { a: 'satisfying', b: 'asmr', overlap: 0.88, context: 'Both describe the same hypercasual content wave', category: 'aesthetic' },
  { a: 'roguelike', b: 'deckbuilder', overlap: 0.67, context: 'Roguelike deckbuilder is now a combined genre', category: 'genre' },
  { a: 'wordle', b: 'crossword', overlap: 0.58, context: 'Daily word puzzle players overlap', category: 'genre' },
  { a: 'brain-training', b: 'puzzle', overlap: 0.63, context: 'Brain training positioned as subset of puzzle', category: 'genre' },
  { a: 'retro', b: 'pixel-art', overlap: 0.79, context: 'Retro aesthetic almost always means pixel art', category: 'aesthetic' },
  { a: 'subscription', b: 'free-to-play', overlap: 0.45, context: 'Competing monetization models', category: 'monetization' },
  { a: 'ai-companion', b: 'gamification', overlap: 0.52, context: 'AI features + gamification converging', category: 'feature' },
  { a: 'auto-battler', b: 'casual-rts', overlap: 0.61, context: 'Simplified strategy game overlap', category: 'genre' },
  { a: 'hypercasual', b: 'clone', overlap: 0.73, context: 'Hypercasual market saturated with clones', category: 'negative' },
  { a: 'anime', b: 'idle', overlap: 0.56, context: 'Anime idle games are a growing niche', category: 'aesthetic' },
  { a: 'fitness', b: 'gamification', overlap: 0.64, context: 'Fitness gamification is the crossover trend', category: 'feature' },
];

const batchInsertComp = db.transaction(() => {
  for (const c of competitions) {
    if (wordMap[c.a] && wordMap[c.b]) {
      insertComp.run({
        word_a_id: wordMap[c.a],
        word_b_id: wordMap[c.b],
        overlap_score: c.overlap,
        context: c.context,
        category: c.category,
      });
    }
  }
});
batchInsertComp();

// ── Seed word clusters ─────────────────────────────────────────

const insertCluster = db.prepare(`
  INSERT INTO word_clusters (name, description, words, centroid_word, coherence_score, category)
  VALUES (@name, @description, @words, @centroid_word, @coherence_score, @category)
`);

const clusters = [
  { name: 'Puzzle Mechanics', description: 'Core puzzle game mechanics and variations', words: JSON.stringify(['merge', 'match-3', 'puzzle', 'crossword', 'brain-training']), centroid_word: 'puzzle', coherence_score: 0.85, category: 'mechanic' },
  { name: 'Cozy/Aesthetic Wave', description: 'Visual and emotional aesthetic trends', words: JSON.stringify(['cozy', 'satisfying', 'asmr', 'minimalist', 'pixel-art', 'retro']), centroid_word: 'cozy', coherence_score: 0.72, category: 'aesthetic' },
  { name: 'Strategy Lite', description: 'Simplified strategy genres gaining mobile traction', words: JSON.stringify(['roguelike', 'deckbuilder', 'auto-battler', 'casual-rts', 'tycoon']), centroid_word: 'roguelike', coherence_score: 0.78, category: 'genre' },
  { name: 'Social & Multiplayer', description: 'Social gaming and multiplayer mechanics', words: JSON.stringify(['multiplayer', 'social-deduction', 'farming']), centroid_word: 'multiplayer', coherence_score: 0.65, category: 'feature' },
  { name: 'AI & Innovation', description: 'AI-driven features and gamification trends', words: JSON.stringify(['ai-companion', 'gamification', 'fitness']), centroid_word: 'ai-companion', coherence_score: 0.69, category: 'feature' },
  { name: 'Monetization Models', description: 'How games make money — evolving landscape', words: JSON.stringify(['subscription', 'free-to-play', 'hypercasual']), centroid_word: 'subscription', coherence_score: 0.71, category: 'monetization' },
  { name: 'Declining Patterns', description: 'Words associated with declining trends', words: JSON.stringify(['hypercasual', 'clone', 'satisfying', 'asmr']), centroid_word: 'hypercasual', coherence_score: 0.76, category: 'negative' },
  { name: 'Japanese Market', description: 'Terms trending in Japanese/Korean markets', words: JSON.stringify(['anime', 'idle', 'tycoon']), centroid_word: 'anime', coherence_score: 0.68, category: 'region' },
];

const batchInsertCluster = db.transaction(() => {
  for (const c of clusters) {
    insertCluster.run(c);
  }
});
batchInsertCluster();

// ── Seed cron configs for words ────────────────────────────────

// Ensure cron_configs table exists (it should from main seed, but be safe)
db.exec(`
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
`);

const insertCron = db.prepare(`
  INSERT OR IGNORE INTO cron_configs (name, description, prompt, schedule, agent, source_type, target_dashboard, enabled)
  VALUES (@name, @description, @prompt, @schedule, @agent, @source_type, @target_dashboard, @enabled)
`);

const wordCrons = [
  {
    name: 'Word Extractor - Trends',
    description: 'Extracts trending words and terms from Reddit, TikTok, and Twitter gaming discussions. Analyzes frequency, growth, and sentiment.',
    prompt: 'Search Reddit (r/gaming, r/AndroidGaming, r/iosgaming), TikTok, and Twitter for casual gaming discussions from the last 24h. Extract the most frequently used words and terms. For each word, determine: frequency count, category (genre/mechanic/aesthetic/theme/feature/monetization), growth rate vs last week, and sentiment. Output as JSON with format: { "target": "words", "words": [{ "word": "...", "source": "...", "category": "...", "frequency": N, "score": N, "growth": N, "sentiment": N }] }',
    schedule: '0 */6 * * *',
    agent: 'default',
    source_type: 'multi',
    target_dashboard: 'words',
    enabled: 1,
  },
  {
    name: 'Word Extractor - Tags',
    description: 'Extracts and analyzes hashtags and tags from social media gaming content to identify emerging terminology.',
    prompt: 'Search TikTok hashtags, Twitter hashtags, and Reddit flair tags related to casual/mobile gaming. Extract trending tags, their usage frequency, and categorize them. Focus on new or rapidly growing tags. Output as JSON with format: { "target": "words", "words": [{ "word": "...", "source": "...", "category": "...", "frequency": N, "score": N, "growth": N }] }',
    schedule: '0 8,20 * * *',
    agent: 'default',
    source_type: 'social-tags',
    target_dashboard: 'words',
    enabled: 1,
  },
  {
    name: 'Word Cluster Builder',
    description: 'Analyzes existing word entries to build and update semantic clusters. Groups related terms by meaning and usage context.',
    prompt: 'Analyze the current word entries in the Words Trends database. Group related words into semantic clusters based on: co-occurrence in discussions, categorical similarity, and usage context. For each cluster, identify a centroid word and coherence score. Update existing clusters or create new ones as needed. Output cluster definitions as JSON.',
    schedule: '0 3 * * *',
    agent: 'claude-sonnet',
    source_type: 'analysis',
    target_dashboard: 'words',
    enabled: 1,
  },
];

let cronsInserted = 0;
for (const c of wordCrons) {
  const result = insertCron.run(c);
  if (result.changes > 0) cronsInserted++;
}

db.close();

console.log('✅ Word seed complete! Created:');
console.log(`   ${wordEntries.length} word entries`);
console.log(`   ${allWords.length * 14} frequency records (14 days × ${allWords.length} words)`);
console.log(`   ${competitions.length} competition pairs`);
console.log(`   ${clusters.length} word clusters`);
console.log(`   ${cronsInserted} cron configs for words`);
console.log('\nRun: npm run dev');
