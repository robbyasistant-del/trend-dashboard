import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'trends.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('📱 Seeding apps market data...');

const now = Date.now();
const DAY = 86400000;

// ── App Entries ──────────────────────────────────────────────

const apps = [
  // Google Play apps
  { external_id: 'com.king.candycrush', store: 'google_play', name: 'Candy Crush Saga', developer: 'King', description: 'Switch and match your way through hundreds of levels in this delicious puzzle adventure.', icon_url: 'https://play-lh.googleusercontent.com/candy-crush.png', category: 'puzzle', subcategory: 'match-3', price: 0, is_free: 1, rating: 4.5, rating_count: 28500000, downloads: 1000000000, size_mb: 85, url: 'https://play.google.com/store/apps/details?id=com.king.candycrush' },
  { external_id: 'com.supercell.clashofclans', store: 'google_play', name: 'Clash of Clans', developer: 'Supercell', description: 'Epic strategy game. Build your village, raise an army, and crush your enemies.', icon_url: 'https://play-lh.googleusercontent.com/clash-of-clans.png', category: 'strategy', subcategory: 'real-time', price: 0, is_free: 1, rating: 4.4, rating_count: 55000000, downloads: 500000000, size_mb: 220, url: 'https://play.google.com/store/apps/details?id=com.supercell.clashofclans' },
  { external_id: 'com.innersloth.spacemafia', store: 'google_play', name: 'Among Us', developer: 'Innersloth', description: 'An online multiplayer social deduction game.', icon_url: 'https://play-lh.googleusercontent.com/among-us.png', category: 'casual', subcategory: 'party', price: 0, is_free: 1, rating: 3.8, rating_count: 12000000, downloads: 500000000, size_mb: 150, url: 'https://play.google.com/store/apps/details?id=com.innersloth.spacemafia' },
  { external_id: 'com.playrix.gardenscapes', store: 'google_play', name: 'Gardenscapes', developer: 'Playrix', description: 'Restore a wonderful garden to its former glory by solving match-3 puzzles.', icon_url: 'https://play-lh.googleusercontent.com/gardenscapes.png', category: 'puzzle', subcategory: 'match-3', price: 0, is_free: 1, rating: 4.3, rating_count: 15000000, downloads: 100000000, size_mb: 175, url: 'https://play.google.com/store/apps/details?id=com.playrix.gardenscapes' },
  { external_id: 'com.miniclip.subwaysurfers', store: 'google_play', name: 'Subway Surfers', developer: 'SYBO Games', description: 'Dash through the subway and dodge oncoming trains.', icon_url: 'https://play-lh.googleusercontent.com/subway-surfers.png', category: 'action', subcategory: 'runner', price: 0, is_free: 1, rating: 4.4, rating_count: 42000000, downloads: 2000000000, size_mb: 95, url: 'https://play.google.com/store/apps/details?id=com.miniclip.subwaysurfers' },
  { external_id: 'com.dream.merge', store: 'google_play', name: 'Merge Mansion', developer: 'Metacore Games', description: 'Merge items and discover the secrets of a grand old mansion.', icon_url: 'https://play-lh.googleusercontent.com/merge-mansion.png', category: 'puzzle', subcategory: 'merge', price: 0, is_free: 1, rating: 4.4, rating_count: 3200000, downloads: 50000000, size_mb: 200, url: 'https://play.google.com/store/apps/details?id=com.dream.merge' },
  { external_id: 'com.gram.monopoly', store: 'google_play', name: 'Monopoly GO!', developer: 'Scopely', description: 'A mobile take on the classic board game Monopoly.', icon_url: 'https://play-lh.googleusercontent.com/monopoly-go.png', category: 'board', subcategory: 'classic', price: 0, is_free: 1, rating: 4.2, rating_count: 8700000, downloads: 100000000, size_mb: 260, url: 'https://play.google.com/store/apps/details?id=com.gram.monopoly' },
  { external_id: 'com.dreamgames.royalmatch', store: 'google_play', name: 'Royal Match', developer: 'Dream Games', description: 'Decorate the Royal castle by solving match-3 puzzles.', icon_url: 'https://play-lh.googleusercontent.com/royal-match.png', category: 'puzzle', subcategory: 'match-3', price: 0, is_free: 1, rating: 4.7, rating_count: 9500000, downloads: 200000000, size_mb: 140, url: 'https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch' },

  // App Store apps
  { external_id: 'id553834731', store: 'app_store', name: 'Candy Crush Saga', developer: 'King', description: 'Switch and match your way through hundreds of levels in this delicious puzzle adventure.', icon_url: 'https://is1-ssl.mzstatic.com/candy-crush.png', category: 'puzzle', subcategory: 'match-3', price: 0, is_free: 1, rating: 4.6, rating_count: 6500000, downloads: 500000000, size_mb: 290, url: 'https://apps.apple.com/app/candy-crush-saga/id553834731' },
  { external_id: 'id529479190', store: 'app_store', name: 'Clash of Clans', developer: 'Supercell', description: 'Epic strategy game. Build your village, raise an army, and crush your enemies.', icon_url: 'https://is1-ssl.mzstatic.com/clash-of-clans.png', category: 'strategy', subcategory: 'real-time', price: 0, is_free: 1, rating: 4.5, rating_count: 8200000, downloads: 300000000, size_mb: 350, url: 'https://apps.apple.com/app/clash-of-clans/id529479190' },
  { external_id: 'id1596399952', store: 'app_store', name: 'Royal Match', developer: 'Dream Games', description: 'Decorate the Royal castle by solving match-3 puzzles.', icon_url: 'https://is1-ssl.mzstatic.com/royal-match.png', category: 'puzzle', subcategory: 'match-3', price: 0, is_free: 1, rating: 4.8, rating_count: 2100000, downloads: 100000000, size_mb: 280, url: 'https://apps.apple.com/app/royal-match/id1596399952' },
  { external_id: 'id1514104671', store: 'app_store', name: 'Monopoly GO!', developer: 'Scopely', description: 'A mobile take on the classic board game Monopoly.', icon_url: 'https://is1-ssl.mzstatic.com/monopoly-go.png', category: 'board', subcategory: 'classic', price: 0, is_free: 1, rating: 4.3, rating_count: 2400000, downloads: 80000000, size_mb: 310, url: 'https://apps.apple.com/app/monopoly-go/id1514104671' },
  { external_id: 'id1612098425', store: 'app_store', name: 'Last War: Survival', developer: 'FirstFun', description: 'Strategy and survival combined in this post-apocalyptic game.', icon_url: 'https://is1-ssl.mzstatic.com/last-war.png', category: 'strategy', subcategory: 'survival', price: 0, is_free: 1, rating: 4.1, rating_count: 890000, downloads: 30000000, size_mb: 450, url: 'https://apps.apple.com/app/last-war-survival/id1612098425' },
  { external_id: 'id1591620171', store: 'app_store', name: 'Block Blast!', developer: 'Hungry Studio', description: 'A relaxing block puzzle game. Place blocks and clear lines.', icon_url: 'https://is1-ssl.mzstatic.com/block-blast.png', category: 'puzzle', subcategory: 'block', price: 0, is_free: 1, rating: 4.7, rating_count: 1200000, downloads: 40000000, size_mb: 120, url: 'https://apps.apple.com/app/block-blast/id1591620171' },
  { external_id: 'id1622931553', store: 'app_store', name: 'Whiteout Survival', developer: 'Century Games', description: 'Build and survive in a frozen apocalyptic world.', icon_url: 'https://is1-ssl.mzstatic.com/whiteout.png', category: 'strategy', subcategory: 'survival', price: 0, is_free: 1, rating: 4.4, rating_count: 670000, downloads: 25000000, size_mb: 380, url: 'https://apps.apple.com/app/whiteout-survival/id1622931553' },
  { external_id: 'id6443460088', store: 'app_store', name: 'Brawl Stars', developer: 'Supercell', description: 'Fast-paced 3v3 multiplayer and battle royale.', icon_url: 'https://is1-ssl.mzstatic.com/brawl-stars.png', category: 'action', subcategory: 'multiplayer', price: 0, is_free: 1, rating: 4.3, rating_count: 3400000, downloads: 200000000, size_mb: 420, url: 'https://apps.apple.com/app/brawl-stars/id6443460088' },

  // Amazon Appstore apps
  { external_id: 'B00ISIL41G', store: 'amazon', name: 'Candy Crush Saga', developer: 'King', description: 'Switch and match your way through hundreds of levels in this delicious puzzle adventure.', icon_url: 'https://m.media-amazon.com/candy-crush.png', category: 'puzzle', subcategory: 'match-3', price: 0, is_free: 1, rating: 4.3, rating_count: 450000, downloads: 10000000, size_mb: 85, url: 'https://www.amazon.com/dp/B00ISIL41G' },
  { external_id: 'B00KVQOOJW', store: 'amazon', name: 'Clash of Clans', developer: 'Supercell', description: 'Epic strategy game. Build your village, raise an army.', icon_url: 'https://m.media-amazon.com/clash-of-clans.png', category: 'strategy', subcategory: 'real-time', price: 0, is_free: 1, rating: 4.2, rating_count: 320000, downloads: 5000000, size_mb: 210, url: 'https://www.amazon.com/dp/B00KVQOOJW' },
  { external_id: 'B09XYZ1234', store: 'amazon', name: 'Merge Mansion', developer: 'Metacore Games', description: 'Merge items and discover the secrets.', icon_url: 'https://m.media-amazon.com/merge-mansion.png', category: 'puzzle', subcategory: 'merge', price: 0, is_free: 1, rating: 4.1, rating_count: 85000, downloads: 2000000, size_mb: 190, url: 'https://www.amazon.com/dp/B09XYZ1234' },
  { external_id: 'B07ABCDEFG', store: 'amazon', name: 'Subway Surfers', developer: 'SYBO Games', description: 'Dash through the subway and dodge oncoming trains.', icon_url: 'https://m.media-amazon.com/subway-surfers.png', category: 'action', subcategory: 'runner', price: 0, is_free: 1, rating: 4.3, rating_count: 210000, downloads: 8000000, size_mb: 90, url: 'https://www.amazon.com/dp/B07ABCDEFG' },
  // Some paid apps
  { external_id: 'com.mojang.minecraftpe', store: 'google_play', name: 'Minecraft', developer: 'Mojang', description: 'Explore, build, and survive in infinite worlds.', icon_url: 'https://play-lh.googleusercontent.com/minecraft.png', category: 'simulation', subcategory: 'sandbox', price: 6.99, is_free: 0, rating: 4.5, rating_count: 7800000, downloads: 50000000, size_mb: 700, url: 'https://play.google.com/store/apps/details?id=com.mojang.minecraftpe' },
  { external_id: 'id479516143', store: 'app_store', name: 'Minecraft', developer: 'Mojang', description: 'Explore, build, and survive in infinite worlds.', icon_url: 'https://is1-ssl.mzstatic.com/minecraft.png', category: 'simulation', subcategory: 'sandbox', price: 6.99, is_free: 0, rating: 4.6, rating_count: 2300000, downloads: 30000000, size_mb: 850, url: 'https://apps.apple.com/app/minecraft/id479516143' },
  { external_id: 'com.localstrike.casualpuzzle', store: 'google_play', name: 'Trickshot Blitz', developer: 'Pocket Studios', description: 'Aim and shoot in this casual physics puzzle.', icon_url: 'https://play-lh.googleusercontent.com/trickshot.png', category: 'casual', subcategory: 'physics', price: 0, is_free: 1, rating: 4.6, rating_count: 42000, downloads: 1500000, size_mb: 65, url: 'https://play.google.com/store/apps/details?id=com.localstrike.casualpuzzle' },
  { external_id: 'id6467890123', store: 'app_store', name: 'Trickshot Blitz', developer: 'Pocket Studios', description: 'Aim and shoot in this casual physics puzzle.', icon_url: 'https://is1-ssl.mzstatic.com/trickshot.png', category: 'casual', subcategory: 'physics', price: 0, is_free: 1, rating: 4.7, rating_count: 18000, downloads: 800000, size_mb: 75, url: 'https://apps.apple.com/app/trickshot-blitz/id6467890123' },
];

// Need to init the app tables first
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
`);

const upsertApp = db.prepare(`
  INSERT INTO app_entries (external_id, store, name, developer, description, icon_url, category, subcategory, price, is_free, rating, rating_count, downloads, size_mb, url, first_seen)
  VALUES (@external_id, @store, @name, @developer, @description, @icon_url, @category, @subcategory, @price, @is_free, @rating, @rating_count, @downloads, @size_mb, @url, @first_seen)
  ON CONFLICT(external_id, store) DO UPDATE SET
    name = @name, developer = @developer, rating = @rating, rating_count = @rating_count,
    downloads = @downloads, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
`);

const insertApps = db.transaction(() => {
  for (const a of apps) {
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    upsertApp.run({
      ...a,
      first_seen: new Date(now - daysAgo * DAY).toISOString(),
    });
  }
});
insertApps();
console.log(`  ✅ ${apps.length} app entries created`);

// ── Rankings (simulate 2 snapshots with deltas) ────────────

const allApps = db.prepare('SELECT id, external_id, store, category, is_free FROM app_entries').all() as Array<{
  id: number; external_id: string; store: string; category: string; is_free: number;
}>;

const insertRanking = db.prepare(`
  INSERT INTO app_rankings (app_id, store, category, rank, previous_rank, rank_delta, rank_type, recorded_at)
  VALUES (@app_id, @store, @category, @rank, @previous_rank, @rank_delta, @rank_type, @recorded_at)
`);

const insertSnapshot = db.prepare(`
  INSERT INTO app_snapshots (app_id, rating, rating_count, downloads, revenue_estimate, recorded_at)
  VALUES (@app_id, @rating, @rating_count, @downloads, @revenue_estimate, @recorded_at)
`);

// Group apps by store for ranking
const storeGroups = new Map<string, typeof allApps>();
for (const a of allApps) {
  const group = storeGroups.get(a.store) || [];
  group.push(a);
  storeGroups.set(a.store, group);
}

const insertRankings = db.transaction(() => {
  for (const [store, storeApps] of storeGroups) {
    // Shuffle for first period rankings
    const shuffled = [...storeApps].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i++) {
      const app = shuffled[i];
      const firstRank = i + 1;

      // First period (7 days ago) — no previous rank
      insertRanking.run({
        app_id: app.id,
        store,
        category: app.category,
        rank: firstRank,
        previous_rank: null,
        rank_delta: 0,
        rank_type: app.is_free ? 'top_free' : 'top_paid',
        recorded_at: new Date(now - 7 * DAY).toISOString(),
      });
    }

    // Re-shuffle for second period (today)
    const reshuffled = [...storeApps].sort(() => Math.random() - 0.5);
    // Build lookup for previous ranks
    const prevRankMap = new Map<number, number>();
    for (let i = 0; i < shuffled.length; i++) {
      prevRankMap.set(shuffled[i].id, i + 1);
    }

    for (let i = 0; i < reshuffled.length; i++) {
      const app = reshuffled[i];
      const currentRank = i + 1;
      const previousRank = prevRankMap.get(app.id) || currentRank;
      // positive delta = climbed (rank number decreased), negative = dropped
      const rankDelta = previousRank - currentRank;

      insertRanking.run({
        app_id: app.id,
        store,
        category: app.category,
        rank: currentRank,
        previous_rank: previousRank,
        rank_delta: rankDelta,
        rank_type: app.is_free ? 'top_free' : 'top_paid',
        recorded_at: new Date().toISOString(),
      });
    }
  }
});
insertRankings();
console.log(`  ✅ Rankings created for ${allApps.length} apps across ${storeGroups.size} stores`);

// ── Snapshots (simulate growth over 7 days) ────────────────

const appDetails = db.prepare('SELECT id, rating, rating_count, downloads FROM app_entries').all() as Array<{
  id: number; rating: number; rating_count: number; downloads: number;
}>;

const insertSnapshots = db.transaction(() => {
  for (const app of appDetails) {
    for (let d = 7; d >= 0; d--) {
      const factor = 1 - (d * 0.02) + (Math.random() * 0.01);
      insertSnapshot.run({
        app_id: app.id,
        rating: Math.round((app.rating * (0.95 + Math.random() * 0.1)) * 100) / 100,
        rating_count: Math.round(app.rating_count * factor),
        downloads: Math.round(app.downloads * factor),
        revenue_estimate: Math.round(Math.random() * 50000),
        recorded_at: new Date(now - d * DAY).toISOString(),
      });
    }
  }
});
insertSnapshots();
console.log(`  ✅ ${appDetails.length * 8} snapshots created (8 per app)`);

// ── Store Categories ────────────────────────────────────────

const categories = [
  { store: 'google_play', name: 'Puzzle', slug: 'puzzle', parent_slug: null },
  { store: 'google_play', name: 'Match-3', slug: 'match-3', parent_slug: 'puzzle' },
  { store: 'google_play', name: 'Merge', slug: 'merge', parent_slug: 'puzzle' },
  { store: 'google_play', name: 'Strategy', slug: 'strategy', parent_slug: null },
  { store: 'google_play', name: 'Action', slug: 'action', parent_slug: null },
  { store: 'google_play', name: 'Casual', slug: 'casual', parent_slug: null },
  { store: 'google_play', name: 'Simulation', slug: 'simulation', parent_slug: null },
  { store: 'google_play', name: 'Board', slug: 'board', parent_slug: null },
  { store: 'app_store', name: 'Puzzle', slug: 'puzzle', parent_slug: null },
  { store: 'app_store', name: 'Strategy', slug: 'strategy', parent_slug: null },
  { store: 'app_store', name: 'Action', slug: 'action', parent_slug: null },
  { store: 'app_store', name: 'Casual', slug: 'casual', parent_slug: null },
  { store: 'app_store', name: 'Simulation', slug: 'simulation', parent_slug: null },
  { store: 'app_store', name: 'Board', slug: 'board', parent_slug: null },
  { store: 'amazon', name: 'Puzzle', slug: 'puzzle', parent_slug: null },
  { store: 'amazon', name: 'Strategy', slug: 'strategy', parent_slug: null },
  { store: 'amazon', name: 'Action', slug: 'action', parent_slug: null },
];

const insertCategory = db.prepare(`
  INSERT OR IGNORE INTO store_categories (store, name, slug, parent_slug, app_count)
  VALUES (@store, @name, @slug, @parent_slug, @app_count)
`);

const insertCategories = db.transaction(() => {
  for (const c of categories) {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM app_entries WHERE store = ? AND category = ?').get(c.store, c.slug) as { cnt: number };
    insertCategory.run({ ...c, app_count: count.cnt });
  }
});
insertCategories();
console.log(`  ✅ ${categories.length} store categories created`);

console.log('✅ Apps market seed complete!');
db.close();
