import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'trends.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('🎮 Seeding forum data...');

// ── Forum Sources ──────────────────────────────────────────
const forumSources = [
  { name: 'reddit-r-gaming', type: 'reddit', url: 'https://reddit.com/r/gaming', icon: '🟠', description: 'Reddit r/gaming community discussions' },
  { name: 'reddit-r-indiegames', type: 'reddit', url: 'https://reddit.com/r/indiegames', icon: '🟠', description: 'Reddit indie games subreddit' },
  { name: 'hackernews', type: 'hackernews', url: 'https://news.ycombinator.com', icon: '🟧', description: 'Hacker News gaming and tech discussions' },
  { name: 'toucharcade', type: 'blog', url: 'https://toucharcade.com', icon: '📱', description: 'TouchArcade mobile gaming forum' },
  { name: 'tigsource', type: 'forum', url: 'https://forums.tigsource.com', icon: '🎯', description: 'TIGSource indie game dev community' },
  { name: 'gaming-blogs', type: 'blog', url: 'https://various-blogs.com', icon: '📝', description: 'Aggregated gaming blog posts' },
];

const insertSource = db.prepare(`
  INSERT OR IGNORE INTO forum_sources (name, type, url, icon, description, enabled)
  VALUES (@name, @type, @url, @icon, @description, 1)
`);

for (const s of forumSources) {
  insertSource.run(s);
}
console.log(`  ✅ ${forumSources.length} forum sources created`);

// ── Forum Posts ──────────────────────────────────────────
const now = Date.now();
const DAY = 86400000;

const posts = [
  // Reddit r/gaming
  { external_id: 'reddit-abc123', source: 'reddit-r-gaming', title: 'Balatro just hit 1M sales in its first month - incredible for a solo dev', body: 'The poker roguelike Balatro has officially crossed 1 million copies sold. This is a massive achievement for a single developer. The game costs $15 and has overwhelmingly positive reviews on Steam.', author: 'gamingfan2024', url: 'https://reddit.com/r/gaming/comments/abc123', score: 4521, comments: 342, sentiment: 0.85, category: 'indie', tags: '["balatro","roguelike","sales","indie"]', is_trending: 1, published_at: new Date(now - 1 * DAY).toISOString() },
  { external_id: 'reddit-def456', source: 'reddit-r-gaming', title: 'Why are idle games suddenly dominating mobile charts?', body: 'Looking at the top charts and idle/incremental games are everywhere. Cookie Clicker clones, idle RPGs, and auto-battlers. Is this the new casual meta?', author: 'mobilegamer99', url: 'https://reddit.com/r/gaming/comments/def456', score: 1823, comments: 567, sentiment: 0.32, category: 'mobile', tags: '["idle-games","mobile","casual","trends"]', is_trending: 1, published_at: new Date(now - 2 * DAY).toISOString() },
  { external_id: 'reddit-ghi789', source: 'reddit-r-gaming', title: 'Vampire Survivors pattern: why $3 games with huge replayability are the future', body: 'The Vampire Survivors formula keeps working. Low price, simple mechanics, massive content. Games like Brotato, Soulstone Survivors are all following this model.', author: 'devwatcher', url: 'https://reddit.com/r/gaming/comments/ghi789', score: 3102, comments: 289, sentiment: 0.72, category: 'indie', tags: '["vampire-survivors","roguelike","pricing","indie"]', is_trending: 1, published_at: new Date(now - 3 * DAY).toISOString() },
  { external_id: 'reddit-jkl012', source: 'reddit-r-gaming', title: 'Unity pricing backlash: devs migrating to Godot en masse', body: 'After Unity announced their new runtime fee, thousands of developers are switching to Godot. The Godot Foundation saw a 10x increase in donations.', author: 'enginewatch', url: 'https://reddit.com/r/gaming/comments/jkl012', score: 8734, comments: 1203, sentiment: -0.45, category: 'gamedev', tags: '["unity","godot","game-engine","controversy"]', is_trending: 0, published_at: new Date(now - 8 * DAY).toISOString() },
  { external_id: 'reddit-mno345', source: 'reddit-r-gaming', title: 'Hypercasual is dead, hybridcasual is king - 2024 mobile trends', body: 'The hypercasual bubble has popped. Publishers like Voodoo and Ketchapp are pivoting to hybridcasual - games with simple core loops but deeper meta layers and monetization.', author: 'mobileAnalyst', url: 'https://reddit.com/r/gaming/comments/mno345', score: 2456, comments: 178, sentiment: 0.55, category: 'mobile', tags: '["hypercasual","hybridcasual","mobile","monetization"]', is_trending: 1, published_at: new Date(now - 1 * DAY).toISOString() },

  // Reddit r/indiegames  
  { external_id: 'indie-aaa111', source: 'reddit-r-indiegames', title: 'My cozy farming sim just got featured on the Steam front page!', body: 'After 3 years of solo development, my farming sim Meadow Dreams got featured on Steam. Already 500 wishlists in the first day. AMA about marketing and development!', author: 'solodevjane', url: 'https://reddit.com/r/indiegames/comments/aaa111', score: 1567, comments: 234, sentiment: 0.92, category: 'indie', tags: '["farming-sim","steam","wishlist","solo-dev"]', is_trending: 0, published_at: new Date(now - 2 * DAY).toISOString() },
  { external_id: 'indie-bbb222', source: 'reddit-r-indiegames', title: 'Puzzle games are having a renaissance - Cocoon, Viewfinder, and more', body: 'This year has been incredible for puzzle games. Cocoon is a masterpiece, Viewfinder is mind-bending, and there are dozens more quality puzzle titles coming.', author: 'puzzlelover', url: 'https://reddit.com/r/indiegames/comments/bbb222', score: 892, comments: 156, sentiment: 0.88, category: 'indie', tags: '["puzzle","cocoon","viewfinder","renaissance"]', is_trending: 1, published_at: new Date(now - 4 * DAY).toISOString() },
  { external_id: 'indie-ccc333', source: 'reddit-r-indiegames', title: 'How I got 10K wishlists with zero marketing budget using TikTok', body: 'Just posted devlogs on TikTok showing my pixel art process. One video went viral (2M views) and drove 10,000 Steam wishlists. Zero ad spend.', author: 'tiktokdev', url: 'https://reddit.com/r/indiegames/comments/ccc333', score: 3421, comments: 445, sentiment: 0.78, category: 'marketing', tags: '["tiktok","marketing","wishlists","viral"]', is_trending: 1, published_at: new Date(now - 1 * DAY).toISOString() },

  // Hacker News
  { external_id: 'hn-39284756', source: 'hackernews', title: 'Show HN: I built a casual game that teaches programming concepts', body: 'Built a puzzle game where you solve levels by writing simple code. Uses a visual block-based language. Free, no ads. Looking for feedback on the learning curve.', author: 'codegamer', url: 'https://news.ycombinator.com/item?id=39284756', score: 567, comments: 189, sentiment: 0.75, category: 'edtech', tags: '["programming","education","puzzle","show-hn"]', is_trending: 0, published_at: new Date(now - 3 * DAY).toISOString() },
  { external_id: 'hn-39301234', source: 'hackernews', title: 'The economics of free-to-play: how top grossing mobile games really make money', body: 'Deep analysis of monetization in the top 100 grossing mobile games. Battle passes generate 40% of revenue, followed by cosmetics at 25%.', author: 'dataminer42', url: 'https://news.ycombinator.com/item?id=39301234', score: 1234, comments: 456, sentiment: 0.42, category: 'business', tags: '["f2p","monetization","mobile","battle-pass"]', is_trending: 1, published_at: new Date(now - 2 * DAY).toISOString() },
  { external_id: 'hn-39315678', source: 'hackernews', title: 'WebGPU is ready: building browser games that rival native performance', body: 'WebGPU is now available in Chrome, Edge, and Firefox. Built a complex 3D game running at 60fps in the browser. The future of web gaming is here.', author: 'webgpudev', url: 'https://news.ycombinator.com/item?id=39315678', score: 2345, comments: 312, sentiment: 0.82, category: 'technology', tags: '["webgpu","browser-games","performance","web"]', is_trending: 1, published_at: new Date(now - 1 * DAY).toISOString() },
  { external_id: 'hn-39328901', source: 'hackernews', title: 'AI-generated game assets: legal and ethical implications for indie devs', body: 'With tools like Midjourney and Stable Diffusion, indie devs can create assets faster. But the legal landscape is murky. Analysis of current lawsuits and what it means.', author: 'legaltech', url: 'https://news.ycombinator.com/item?id=39328901', score: 891, comments: 523, sentiment: -0.15, category: 'ai', tags: '["ai","assets","legal","ethics","indie"]', is_trending: 0, published_at: new Date(now - 5 * DAY).toISOString() },

  // TouchArcade
  { external_id: 'ta-review-9876', source: 'toucharcade', title: 'Review: Slay the Spire mobile port is the definitive version', body: 'The mobile port of Slay the Spire is fantastic. Touch controls work perfectly, and having it on the go makes it even more addictive. 5/5 stars.', author: 'toucharcade_staff', url: 'https://toucharcade.com/review/slay-the-spire-mobile', score: 456, comments: 89, sentiment: 0.95, category: 'review', tags: '["slay-the-spire","roguelike","card-game","mobile-port"]', is_trending: 0, published_at: new Date(now - 6 * DAY).toISOString() },
  { external_id: 'ta-news-5432', source: 'toucharcade', title: 'Apple Arcade adds 5 new games this month including surprise hit', body: 'Apple Arcade continues to grow its catalog. The standout is Tiny Tower 2, a sequel to the beloved NimbleBit classic. Also includes a new puzzle game and two RPGs.', author: 'toucharcade_news', url: 'https://toucharcade.com/news/apple-arcade-march', score: 234, comments: 67, sentiment: 0.68, category: 'mobile', tags: '["apple-arcade","subscription","mobile","new-releases"]', is_trending: 0, published_at: new Date(now - 4 * DAY).toISOString() },
  { external_id: 'ta-feature-1111', source: 'toucharcade', title: 'The best casual games of the month: March 2024 roundup', body: 'Our monthly roundup of the best casual mobile games. Top picks: Dots & Co sequel, a new match-3 from King, and an innovative idle game that defies the genre.', author: 'toucharcade_staff', url: 'https://toucharcade.com/feature/best-casual-march-2024', score: 345, comments: 112, sentiment: 0.72, category: 'roundup', tags: '["casual","match-3","idle","roundup"]', is_trending: 1, published_at: new Date(now - 1 * DAY).toISOString() },

  // TIGSource
  { external_id: 'tig-devlog-7890', source: 'tigsource', title: 'Devlog #47: Procedural dungeon generation using wave function collapse', body: 'This week I implemented WFC for my roguelike dungeon generator. The results are way better than BSP trees. Sharing the algorithm and code.', author: 'procgendev', url: 'https://forums.tigsource.com/index.php?topic=7890', score: 234, comments: 78, sentiment: 0.65, category: 'gamedev', tags: '["procgen","wfc","roguelike","devlog"]', is_trending: 0, published_at: new Date(now - 3 * DAY).toISOString() },
  { external_id: 'tig-discuss-4567', source: 'tigsource', title: 'Is pixel art still commercially viable in 2024?', body: 'Serious question - with AI art and high-quality 3D getting cheaper, is there still a market for pixel art games? Looking at sales data and trends.', author: 'pixelartist', url: 'https://forums.tigsource.com/index.php?topic=4567', score: 567, comments: 234, sentiment: 0.48, category: 'discussion', tags: '["pixel-art","art-style","market","viability"]', is_trending: 1, published_at: new Date(now - 2 * DAY).toISOString() },

  // Gaming Blogs
  { external_id: 'blog-gamasutra-001', source: 'gaming-blogs', title: 'Postmortem: How our match-3 game generated $2M in the first quarter', body: 'A detailed postmortem of our match-3 puzzle game launch. We cover UA strategy, LiveOps, retention optimization, and the AB tests that moved the needle.', author: 'matchthree_studio', url: 'https://gamasutra.com/postmortem/match3-2m', score: 1890, comments: 234, sentiment: 0.78, category: 'business', tags: '["match-3","postmortem","revenue","ua"]', is_trending: 1, published_at: new Date(now - 2 * DAY).toISOString() },
  { external_id: 'blog-pocketgamer-001', source: 'gaming-blogs', title: 'The rise of merge games: why merge mechanics are the new match-3', body: 'Merge games have exploded in popularity. Merge Mansion, Merge Dragons, and dozens of clones. We analyze why merge mechanics work so well for casual audiences.', author: 'pocketgamer_editorial', url: 'https://pocketgamer.biz/analysis/merge-games-rise', score: 1234, comments: 156, sentiment: 0.65, category: 'analysis', tags: '["merge-games","casual","match-3","mechanics"]', is_trending: 1, published_at: new Date(now - 1 * DAY).toISOString() },
  { external_id: 'blog-deconstr-001', source: 'gaming-blogs', title: 'Deconstructing Royal Match: the king of casual puzzle games', body: 'Royal Match is now the #1 grossing puzzle game globally. We break down its core loop, meta progression, monetization, and LiveOps strategy.', author: 'deconstructor_fun', url: 'https://deconstructoroffun.com/royal-match', score: 2100, comments: 189, sentiment: 0.71, category: 'analysis', tags: '["royal-match","puzzle","deconstruction","casual"]', is_trending: 1, published_at: new Date(now - 3 * DAY).toISOString() },
];

const insertPost = db.prepare(`
  INSERT OR IGNORE INTO forum_posts (external_id, source, title, body, author, url, score, comments, sentiment, category, tags, is_trending, published_at)
  VALUES (@external_id, @source, @title, @body, @author, @url, @score, @comments, @sentiment, @category, @tags, @is_trending, @published_at)
`);

const insertPosts = db.transaction(() => {
  for (const p of posts) {
    insertPost.run(p);
  }
});
insertPosts();
console.log(`  ✅ ${posts.length} forum posts created`);

// Update post counts on sources
db.prepare(`
  UPDATE forum_sources SET post_count = (
    SELECT COUNT(*) FROM forum_posts WHERE forum_posts.source = forum_sources.name
  )
`).run();

// ── Forum Topics ──────────────────────────────────────────
const topics = [
  { name: 'Roguelike Renaissance', slug: 'roguelike-renaissance', post_count: 8, avg_sentiment: 0.78, avg_score: 2800, sources: '["reddit-r-gaming","reddit-r-indiegames","toucharcade"]', is_trending: 1 },
  { name: 'Mobile Monetization', slug: 'mobile-monetization', post_count: 6, avg_sentiment: 0.45, avg_score: 1600, sources: '["hackernews","gaming-blogs","reddit-r-gaming"]', is_trending: 1 },
  { name: 'Indie Dev Marketing', slug: 'indie-dev-marketing', post_count: 5, avg_sentiment: 0.82, avg_score: 2100, sources: '["reddit-r-indiegames","tigsource","hackernews"]', is_trending: 1 },
  { name: 'Game Engine Wars', slug: 'game-engine-wars', post_count: 4, avg_sentiment: -0.20, avg_score: 5200, sources: '["reddit-r-gaming","hackernews","tigsource"]', is_trending: 0 },
  { name: 'AI in Game Development', slug: 'ai-in-gamedev', post_count: 3, avg_sentiment: 0.35, avg_score: 890, sources: '["hackernews","tigsource","gaming-blogs"]', is_trending: 1 },
  { name: 'Casual Puzzle Trends', slug: 'casual-puzzle-trends', post_count: 7, avg_sentiment: 0.72, avg_score: 1450, sources: '["toucharcade","gaming-blogs","reddit-r-gaming"]', is_trending: 1 },
  { name: 'WebGPU & Browser Games', slug: 'webgpu-browser-games', post_count: 2, avg_sentiment: 0.80, avg_score: 1800, sources: '["hackernews"]', is_trending: 1 },
  { name: 'Merge Game Mechanics', slug: 'merge-game-mechanics', post_count: 4, avg_sentiment: 0.65, avg_score: 1200, sources: '["gaming-blogs","toucharcade","reddit-r-gaming"]', is_trending: 1 },
  { name: 'Pixel Art Viability', slug: 'pixel-art-viability', post_count: 3, avg_sentiment: 0.48, avg_score: 430, sources: '["tigsource","reddit-r-indiegames"]', is_trending: 0 },
  { name: 'Apple Arcade Updates', slug: 'apple-arcade-updates', post_count: 2, avg_sentiment: 0.68, avg_score: 300, sources: '["toucharcade"]', is_trending: 0 },
  { name: 'Idle Game Meta', slug: 'idle-game-meta', post_count: 3, avg_sentiment: 0.40, avg_score: 1100, sources: '["reddit-r-gaming","toucharcade"]', is_trending: 1 },
  { name: 'Hybridcasual Evolution', slug: 'hybridcasual-evolution', post_count: 3, avg_sentiment: 0.58, avg_score: 1700, sources: '["reddit-r-gaming","gaming-blogs"]', is_trending: 1 },
];

const insertTopic = db.prepare(`
  INSERT OR IGNORE INTO forum_topics (name, slug, post_count, avg_sentiment, avg_score, sources, is_trending)
  VALUES (@name, @slug, @post_count, @avg_sentiment, @avg_score, @sources, @is_trending)
`);

const insertTopics = db.transaction(() => {
  for (const t of topics) {
    insertTopic.run(t);
  }
});
insertTopics();
console.log(`  ✅ ${topics.length} forum topics created`);

console.log('✅ Forum seed complete!');
db.close();
