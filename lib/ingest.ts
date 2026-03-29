import fs from 'fs';
import path from 'path';
import { getDb, crossReferenceForumWords, crossReferenceAppWords, upsertAppEntry, insertAppRanking, insertAppSnapshot } from './db';

const INBOX_DIR = path.join(process.cwd(), 'data', 'inbox');

export interface InboxTrend {
  title: string;
  description?: string;
  source?: string;
  url?: string;
  viral_score?: number;
  velocity?: number;
  category?: string;
  region?: string;
  tags?: string[];
  mentions?: number;
  sentiment?: number;
  lifecycle?: string;
  data?: Record<string, unknown>;
}

export interface InboxWord {
  word: string;
  source?: string;
  category?: string;
  frequency?: number;
  score?: number;
  growth?: number;
  sentiment?: number;
  data?: Record<string, unknown>;
}

export interface InboxForumPost {
  external_id: string;
  title: string;
  body?: string;
  author?: string;
  url?: string;
  score?: number;
  comments?: number;
  sentiment?: number;
  category?: string;
  tags?: string[];
  is_trending?: boolean;
  published_at?: string;
  data?: Record<string, unknown>;
}

export interface InboxApp {
  external_id: string;
  store: string;
  name: string;
  developer?: string;
  description?: string;
  icon_url?: string;
  category?: string;
  subcategory?: string;
  price?: number;
  is_free?: boolean;
  rating?: number;
  rating_count?: number;
  downloads?: number;
  size_mb?: number;
  url?: string;
  tags?: string[];
  rank?: number;
  rank_type?: string;
  data?: Record<string, unknown>;
}

export interface InboxPayload {
  source?: string;
  target?: string;
  trends?: InboxTrend[];
  words?: InboxWord[];
  forum_posts?: InboxForumPost[];
  apps?: InboxApp[];
  cron_config_id?: number;
}

/** Ensure inbox directory exists */
export function ensureInbox() {
  if (!fs.existsSync(INBOX_DIR)) {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
  }
  const gitkeep = path.join(INBOX_DIR, '.gitkeep');
  if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '');
}

/** Process all JSON files in the inbox directory */
export function processInbox(): { processed: number; errors: string[] } {
  ensureInbox();
  const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.json'));
  let processed = 0;
  const errors: string[] = [];

  for (const file of files) {
    const filePath = path.join(INBOX_DIR, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const payload: InboxPayload = JSON.parse(raw);
      ingestPayload(payload);
      // Move processed file to processed/ subfolder
      const processedDir = path.join(INBOX_DIR, '..', 'processed');
      if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });
      fs.renameSync(filePath, path.join(processedDir, `${Date.now()}_${file}`));
      processed++;
    } catch (err) {
      errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { processed, errors };
}

/** Ingest a single payload into the database */
export function ingestPayload(payload: InboxPayload) {
  const db = getDb();

  // Ensure source exists
  if (payload.source) {
    const existing = db.prepare('SELECT id FROM sources WHERE name = ?').get(payload.source);
    if (!existing) {
      db.prepare('INSERT INTO sources (name, type) VALUES (?, ?)').run(payload.source, payload.source);
    }
  }

  const sourceRow = payload.source
    ? db.prepare('SELECT id FROM sources WHERE name = ?').get(payload.source) as { id: number } | undefined
    : undefined;

  if (payload.trends && Array.isArray(payload.trends)) {
    const insertTrend = db.prepare(`
      INSERT INTO trends (title, description, source_id, source_name, url, viral_score, velocity, category, region, tags, mentions, sentiment, lifecycle, data_json)
      VALUES (@title, @description, @source_id, @source_name, @url, @viral_score, @velocity, @category, @region, @tags, @mentions, @sentiment, @lifecycle, @data_json)
    `);

    const insertSnapshot = db.prepare(`
      INSERT INTO trend_snapshots (trend_id, viral_score, velocity, mentions) VALUES (?, ?, ?, ?)
    `);

    const upsertTag = db.prepare(`
      INSERT INTO tags (name, count) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET count = count + 1
    `);

    const batchInsert = db.transaction((trends: InboxTrend[]) => {
      for (const t of trends) {
        const result = insertTrend.run({
          title: t.title,
          description: t.description || null,
          source_id: sourceRow?.id || null,
          source_name: t.source || payload.source || null,
          url: t.url || null,
          viral_score: t.viral_score || 0,
          velocity: t.velocity || 0,
          category: t.category || 'general',
          region: t.region || 'global',
          tags: JSON.stringify(t.tags || []),
          mentions: t.mentions || 0,
          sentiment: t.sentiment || 0,
          lifecycle: t.lifecycle || 'emerging',
          data_json: JSON.stringify(t.data || {}),
        });

        // Create initial snapshot
        insertSnapshot.run(result.lastInsertRowid, t.viral_score || 0, t.velocity || 0, t.mentions || 0);

        // Update tags
        if (t.tags) {
          for (const tag of t.tags) { upsertTag.run(tag.toLowerCase()); }
        }
      }
    });

    batchInsert(payload.trends);
  }

  // ── Words ingestion ──────────────────────────────────────────
  if ((payload.target === 'words' || payload.words) && payload.words && Array.isArray(payload.words)) {
    const upsertWord = db.prepare(`
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

    const insertFreq = db.prepare(`
      INSERT INTO word_frequencies (word_id, frequency, mentions, period, period_type)
      VALUES (@word_id, @frequency, @mentions, @period, @period_type)
    `);

    const today = new Date().toISOString().slice(0, 10);

    const batchWords = db.transaction((words: InboxWord[]) => {
      for (const w of words) {
        const result = upsertWord.run({
          word: w.word.toLowerCase().trim(),
          source: w.source || payload.source || null,
          category: w.category || 'general',
          frequency: w.frequency || 1,
          score: w.score || 0,
          growth: w.growth || 0,
          sentiment: w.sentiment || 0,
          data_json: JSON.stringify(w.data || {}),
        });

        const wordId = result.lastInsertRowid || db.prepare('SELECT id FROM word_entries WHERE word = ? AND source = ?').get(w.word.toLowerCase().trim(), w.source || payload.source || null) as { id: number } | undefined;
        const id = typeof wordId === 'number' ? wordId : (wordId as { id: number } | undefined)?.id;

        if (id) {
          insertFreq.run({
            word_id: id,
            frequency: w.frequency || 1,
            mentions: w.frequency || 1,
            period: today,
            period_type: 'daily',
          });
        }
      }
    });

    batchWords(payload.words);
  }

  // ── Forums ingestion ──────────────────────────────────────────
  if ((payload.target === 'forums' || payload.forum_posts) && payload.forum_posts && Array.isArray(payload.forum_posts)) {
    // Ensure forum source exists
    const forumSourceName = payload.source || 'unknown';
    const existingForumSource = db.prepare('SELECT id FROM forum_sources WHERE name = ?').get(forumSourceName) as { id: number } | undefined;
    let forumSourceId: number | null = existingForumSource?.id || null;
    if (!existingForumSource) {
      const res = db.prepare('INSERT INTO forum_sources (name, type) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP').run(forumSourceName, 'forum');
      forumSourceId = Number(res.lastInsertRowid) || null;
    }

    const upsertPost = db.prepare(`
      INSERT INTO forum_posts (external_id, source, source_id, title, body, author, url, score, comments, sentiment, category, tags, is_trending, data_json, published_at)
      VALUES (@external_id, @source, @source_id, @title, @body, @author, @url, @score, @comments, @sentiment, @category, @tags, @is_trending, @data_json, @published_at)
      ON CONFLICT(external_id, source) DO UPDATE SET
        title = @title,
        body = @body,
        score = @score,
        comments = @comments,
        sentiment = @sentiment,
        is_trending = @is_trending,
        updated_at = CURRENT_TIMESTAMP
    `);

    const batchForumPosts = db.transaction((posts: InboxForumPost[]) => {
      for (const p of posts) {
        upsertPost.run({
          external_id: p.external_id,
          source: forumSourceName,
          source_id: forumSourceId,
          title: p.title,
          body: p.body || null,
          author: p.author || null,
          url: p.url || null,
          score: p.score || 0,
          comments: p.comments || 0,
          sentiment: p.sentiment || 0,
          category: p.category || 'general',
          tags: JSON.stringify(p.tags || []),
          is_trending: p.is_trending ? 1 : 0,
          data_json: JSON.stringify(p.data || {}),
          published_at: p.published_at || null,
        });
      }
    });

    batchForumPosts(payload.forum_posts);

    // Update post count on forum source
    db.prepare('UPDATE forum_sources SET post_count = (SELECT COUNT(*) FROM forum_posts WHERE source = ?), last_scraped = CURRENT_TIMESTAMP WHERE name = ?').run(forumSourceName, forumSourceName);

    // Cross-reference forum posts with word trends
    try { crossReferenceForumWords(); } catch { /* non-critical */ }
  }

  // ── Apps Market ingestion ──────────────────────────────────
  if ((payload.target === 'apps-market' || payload.apps) && payload.apps && Array.isArray(payload.apps)) {
    const batchApps = db.transaction((apps: InboxApp[]) => {
      for (const app of apps) {
        // Upsert the app entry (dedup by external_id + store)
        const result = upsertAppEntry({
          external_id: app.external_id,
          store: app.store,
          name: app.name,
          developer: app.developer,
          description: app.description,
          icon_url: app.icon_url,
          category: app.category,
          subcategory: app.subcategory,
          price: app.price,
          is_free: app.is_free,
          rating: app.rating,
          rating_count: app.rating_count,
          downloads: app.downloads,
          size_mb: app.size_mb,
          url: app.url,
          tags: JSON.stringify(app.tags || []),
          data_json: JSON.stringify(app.data || {}),
        });

        // Resolve app_id (could be insert or update)
        let appId = Number(result.lastInsertRowid);
        if (!appId || result.changes === 0) {
          const existing = db.prepare('SELECT id FROM app_entries WHERE external_id = ? AND store = ?').get(app.external_id, app.store) as { id: number } | undefined;
          if (existing) appId = existing.id;
        }
        // If changes > 0 but lastInsertRowid is 0, it was an update — look up
        if (result.changes > 0 && !appId) {
          const existing = db.prepare('SELECT id FROM app_entries WHERE external_id = ? AND store = ?').get(app.external_id, app.store) as { id: number } | undefined;
          if (existing) appId = existing.id;
        }

        if (!appId) continue;

        // Insert ranking if rank is provided
        if (app.rank !== undefined && app.rank !== null) {
          // Get the most recent previous ranking for delta calculation
          const prevRanking = db.prepare(
            'SELECT rank FROM app_rankings WHERE app_id = ? AND store = ? AND rank_type = ? ORDER BY recorded_at DESC LIMIT 1'
          ).get(appId, app.store, app.rank_type || 'top_free') as { rank: number } | undefined;

          const previousRank = prevRanking?.rank || null;
          // rank_delta: positive = climbed (rank number decreased), negative = dropped (rank number increased)
          const rankDelta = previousRank ? (previousRank - app.rank) : 0;

          insertAppRanking({
            app_id: appId,
            store: app.store,
            category: app.category,
            rank: app.rank,
            previous_rank: previousRank || undefined,
            rank_delta: rankDelta,
            rank_type: app.rank_type || 'top_free',
          });
        }

        // Insert snapshot for growth tracking
        insertAppSnapshot({
          app_id: appId,
          rating: app.rating,
          rating_count: app.rating_count,
          downloads: app.downloads,
          revenue_estimate: 0,
        });
      }
    });

    batchApps(payload.apps);

    // Cross-reference app keywords with word trends
    try { crossReferenceAppWords(); } catch { /* non-critical */ }
  }

  // Log cron run if applicable
  if (payload.cron_config_id) {
    const itemCount = (payload.trends?.length || 0) + (payload.words?.length || 0) + (payload.forum_posts?.length || 0) + (payload.apps?.length || 0);
    db.prepare(`
      INSERT INTO cron_runs (cron_config_id, status, items_processed, started_at, completed_at)
      VALUES (?, 'success', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(payload.cron_config_id, itemCount);

    db.prepare('UPDATE cron_configs SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(payload.cron_config_id);
  }
}
