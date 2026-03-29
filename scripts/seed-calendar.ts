/**
 * Seed script for Calendar Trends data
 * Run: npx tsx scripts/seed-calendar.ts
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'trends.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

interface CalendarEventSeed {
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date?: string;
  recurrence: string;
  region: string;
  impact_score: number;
  categories: string[];
  tags: string[];
  color: string;
}

const CALENDAR_EVENTS: CalendarEventSeed[] = [
  // Major holidays (yearly recurring)
  { title: 'Christmas & Holiday Season', description: 'Peak gaming engagement period. Gift card redemptions drive massive app installs and in-app purchases.', event_type: 'holiday', start_date: '2025-12-20', end_date: '2026-01-02', recurrence: 'yearly', region: 'global', impact_score: 95, categories: ['casual', 'puzzle', 'idle'], tags: ['holiday', 'installs', 'iap'], color: '#ef4444' },
  { title: 'Chinese New Year', description: 'Huge engagement spike in APAC markets. Special themed events in mobile games.', event_type: 'cultural', start_date: '2026-02-17', end_date: '2026-02-24', recurrence: 'yearly', region: 'CN', impact_score: 90, categories: ['gacha', 'moba', 'rpg'], tags: ['lunar-new-year', 'apac', 'themed-events'], color: '#dc2626' },
  { title: "Valentine's Day", description: 'Romance-themed game events. Dating sim and casual game spike.', event_type: 'holiday', start_date: '2026-02-14', recurrence: 'yearly', region: 'global', impact_score: 65, categories: ['casual', 'simulation'], tags: ['valentines', 'themed-events'], color: '#ec4899' },
  { title: 'Easter Weekend', description: 'Family gaming time increases. Casual game installs rise.', event_type: 'holiday', start_date: '2026-04-05', end_date: '2026-04-06', recurrence: 'yearly', region: 'global', impact_score: 60, categories: ['casual', 'puzzle'], tags: ['easter', 'family'], color: '#a855f7' },
  { title: 'Halloween', description: 'Horror and themed game events. Seasonal content drives engagement.', event_type: 'holiday', start_date: '2025-10-25', end_date: '2025-11-01', recurrence: 'yearly', region: 'global', impact_score: 80, categories: ['action', 'casual', 'rpg'], tags: ['halloween', 'themed-events', 'horror'], color: '#f97316' },
  { title: 'Black Friday / Cyber Monday', description: 'Massive IAP discounts. Premium game sales. Ad revenue spikes.', event_type: 'sale', start_date: '2025-11-28', end_date: '2025-12-01', recurrence: 'yearly', region: 'US', impact_score: 88, categories: ['all'], tags: ['black-friday', 'sales', 'iap'], color: '#1e293b' },
  { title: 'Diwali', description: 'Major engagement period in India. Festival-themed events in games.', event_type: 'cultural', start_date: '2025-10-20', end_date: '2025-10-24', recurrence: 'yearly', region: 'IN', impact_score: 82, categories: ['casual', 'puzzle', 'action'], tags: ['diwali', 'india', 'festival'], color: '#eab308' },
  { title: 'Golden Week (Japan)', description: 'Japanese players have extended time off. Gacha game revenue peaks.', event_type: 'cultural', start_date: '2026-04-29', end_date: '2026-05-05', recurrence: 'yearly', region: 'JP', impact_score: 85, categories: ['gacha', 'rpg', 'moba'], tags: ['golden-week', 'japan', 'gacha'], color: '#f59e0b' },
  { title: "New Year's Day", description: 'Global gaming engagement peak. New Year themed events and rewards.', event_type: 'holiday', start_date: '2026-01-01', recurrence: 'yearly', region: 'global', impact_score: 75, categories: ['casual', 'idle', 'puzzle'], tags: ['new-year', 'rewards'], color: '#6366f1' },
  { title: 'Thanksgiving', description: 'US family gathering time. Casual and party game installs increase.', event_type: 'holiday', start_date: '2025-11-27', recurrence: 'yearly', region: 'US', impact_score: 70, categories: ['casual', 'party'], tags: ['thanksgiving', 'family'], color: '#b45309' },

  // Gaming conferences and events
  { title: 'GDC (Game Developers Conference)', description: 'Major industry event. New game announcements drive search trends.', event_type: 'conference', start_date: '2026-03-16', end_date: '2026-03-20', recurrence: 'yearly', region: 'US', impact_score: 78, categories: ['all'], tags: ['gdc', 'conference', 'announcements'], color: '#0ea5e9' },
  { title: 'E3 / Summer Game Fest', description: 'Biggest gaming reveal season. Massive spike in gaming interest.', event_type: 'conference', start_date: '2026-06-08', end_date: '2026-06-12', recurrence: 'yearly', region: 'global', impact_score: 92, categories: ['all'], tags: ['e3', 'summer-game-fest', 'reveals'], color: '#06b6d4' },
  { title: 'Gamescom', description: 'European gaming expo. New titles and trailers generate buzz.', event_type: 'conference', start_date: '2026-08-19', end_date: '2026-08-23', recurrence: 'yearly', region: 'DE', impact_score: 75, categories: ['all'], tags: ['gamescom', 'europe', 'expo'], color: '#0284c7' },
  { title: 'Tokyo Game Show', description: 'Japanese gaming showcase. JRPG and mobile game announcements.', event_type: 'conference', start_date: '2026-09-24', end_date: '2026-09-27', recurrence: 'yearly', region: 'JP', impact_score: 80, categories: ['gacha', 'rpg'], tags: ['tgs', 'japan', 'mobile'], color: '#7c3aed' },
  { title: 'The Game Awards', description: 'Awards show with major reveals. Drives massive search and download spikes.', event_type: 'conference', start_date: '2025-12-11', recurrence: 'yearly', region: 'global', impact_score: 85, categories: ['all'], tags: ['game-awards', 'reveals', 'awards'], color: '#d946ef' },

  // Seasonal / School patterns
  { title: 'Summer Break Start (US)', description: 'Kids out of school. Mobile gaming usage surges.', event_type: 'school', start_date: '2026-06-15', recurrence: 'yearly', region: 'US', impact_score: 82, categories: ['casual', 'action', 'puzzle'], tags: ['summer', 'school-break', 'youth'], color: '#22c55e' },
  { title: 'Back to School', description: 'Gaming time decreases as school resumes. Shift to shorter-session games.', event_type: 'school', start_date: '2026-09-01', recurrence: 'yearly', region: 'US', impact_score: 55, categories: ['casual', 'idle'], tags: ['back-to-school', 'session-length'], color: '#84cc16' },
  { title: 'Winter Break Start', description: 'School holidays begin. Extended gaming sessions. Gift-related installs.', event_type: 'school', start_date: '2025-12-19', recurrence: 'yearly', region: 'global', impact_score: 78, categories: ['casual', 'rpg', 'action'], tags: ['winter-break', 'holidays'], color: '#14b8a6' },

  // Sales events
  { title: 'Steam Summer Sale', description: 'Major PC game sale. Drives cross-platform interest in mobile versions.', event_type: 'sale', start_date: '2026-06-25', end_date: '2026-07-09', recurrence: 'yearly', region: 'global', impact_score: 72, categories: ['all'], tags: ['steam', 'sale', 'cross-platform'], color: '#1e40af' },
  { title: 'Apple App Store Anniversary Sale', description: 'iOS app and game promotions.', event_type: 'sale', start_date: '2026-07-10', end_date: '2026-07-14', recurrence: 'yearly', region: 'global', impact_score: 65, categories: ['all'], tags: ['apple', 'ios', 'sale'], color: '#64748b' },
  { title: 'Singles Day (11.11)', description: 'Massive Chinese e-commerce event. In-game purchase promotions.', event_type: 'sale', start_date: '2025-11-11', recurrence: 'yearly', region: 'CN', impact_score: 85, categories: ['gacha', 'moba', 'rpg'], tags: ['singles-day', 'china', 'iap'], color: '#e11d48' },
  { title: 'Amazon Prime Day', description: 'Gaming hardware deals. Amazon Appstore promotions.', event_type: 'sale', start_date: '2026-07-15', end_date: '2026-07-16', recurrence: 'yearly', region: 'US', impact_score: 60, categories: ['all'], tags: ['prime-day', 'amazon', 'deals'], color: '#f97316' },

  // Quarterly recurring
  { title: 'Quarterly Earnings Season', description: 'Major publisher earnings affect market sentiment and stock prices.', event_type: 'conference', start_date: '2026-01-15', recurrence: 'quarterly', region: 'global', impact_score: 45, categories: ['all'], tags: ['earnings', 'finance', 'publishers'], color: '#64748b' },

  // Monthly recurring
  { title: 'App Store Featured Reset', description: 'Apple and Google refresh featured game sections monthly.', event_type: 'sale', start_date: '2026-01-01', recurrence: 'monthly', region: 'global', impact_score: 40, categories: ['all'], tags: ['featured', 'app-store', 'visibility'], color: '#94a3b8' },

  // One-time events
  { title: 'Clash of Clans 15th Anniversary', description: 'Major milestone for one of the biggest mobile games. Expected massive in-game events.', event_type: 'gaming', start_date: '2027-08-02', recurrence: 'once', region: 'global', impact_score: 70, categories: ['strategy'], tags: ['clash-of-clans', 'anniversary', 'supercell'], color: '#f59e0b' },
  { title: 'FIFA World Cup 2026', description: 'Massive global sporting event drives sports game engagement.', event_type: 'cultural', start_date: '2026-06-11', end_date: '2026-07-19', recurrence: 'once', region: 'global', impact_score: 93, categories: ['sports', 'casual'], tags: ['world-cup', 'fifa', 'sports'], color: '#16a34a' },
  { title: 'Olympics 2028 Los Angeles', description: 'Summer Olympics drive sports and casual game interest globally.', event_type: 'cultural', start_date: '2028-07-14', end_date: '2028-07-30', recurrence: 'once', region: 'US', impact_score: 88, categories: ['sports', 'casual'], tags: ['olympics', 'sports', 'la2028'], color: '#0284c7' },
];

interface PatternSeed {
  name: string;
  description: string;
  pattern_type: string;
  metric: string;
  baseline: number;
  peak_value: number;
  peak_period: string;
  trough_value: number;
  trough_period: string;
  confidence: number;
  sample_size: number;
}

const PATTERNS: PatternSeed[] = [
  { name: 'Weekend Engagement Surge', description: 'Viral scores consistently peak on weekends, especially Saturday', pattern_type: 'weekly', metric: 'viral_score', baseline: 52, peak_value: 78, peak_period: 'Saturday', trough_value: 38, trough_period: 'Tuesday', confidence: 0.87, sample_size: 365 },
  { name: 'Friday Download Spike', description: 'App downloads increase on Fridays as users prepare for weekend gaming', pattern_type: 'weekly', metric: 'downloads', baseline: 12400, peak_value: 18600, peak_period: 'Friday', trough_value: 8200, trough_period: 'Monday', confidence: 0.82, sample_size: 365 },
  { name: 'Holiday Season Revenue Peak', description: 'Q4 shows highest revenue driven by holiday gift-giving and time off', pattern_type: 'seasonal', metric: 'revenue', baseline: 45000, peak_value: 89000, peak_period: 'Q4', trough_value: 32000, trough_period: 'Q1', confidence: 0.91, sample_size: 120 },
  { name: 'Summer Install Boom', description: 'June-August shows increased installs from school breaks globally', pattern_type: 'seasonal', metric: 'installs', baseline: 28000, peak_value: 42000, peak_period: 'Jul', trough_value: 19000, trough_period: 'Sep', confidence: 0.78, sample_size: 90 },
  { name: 'Monthly Forum Activity Cycle', description: 'Forum activity peaks mid-month and dips at month boundaries', pattern_type: 'monthly', metric: 'forum_activity', baseline: 1200, peak_value: 1800, peak_period: 'week-2', trough_value: 850, trough_period: 'week-4', confidence: 0.65, sample_size: 180 },
  { name: 'December Viral Score Explosion', description: 'December consistently sees the highest viral scores of the year', pattern_type: 'annual', metric: 'viral_score', baseline: 55, peak_value: 92, peak_period: 'Dec', trough_value: 41, trough_period: 'Feb', confidence: 0.89, sample_size: 365 },
  { name: 'Post-Holiday Word Trend Shift', description: 'New gaming terminology emerges January-February after holiday releases', pattern_type: 'annual', metric: 'word_velocity', baseline: 7.5, peak_value: 14.2, peak_period: 'Jan', trough_value: 4.8, trough_period: 'Aug', confidence: 0.62, sample_size: 365 },
  { name: 'Conference Announcement Spike', description: 'E3/GDC/TGS periods show predictable spikes in trending terms', pattern_type: 'annual', metric: 'mentions', baseline: 15000, peak_value: 45000, peak_period: 'Jun', trough_value: 8000, trough_period: 'Apr', confidence: 0.85, sample_size: 365 },
];

interface MilestoneSeed {
  title: string;
  description: string;
  milestone_type: string;
  entity_type: string;
  entity_name: string;
  metric: string;
  value: number;
  previous_value: number;
  threshold: number;
  significance: number;
  days_ago: number;
}

const MILESTONES: MilestoneSeed[] = [
  { title: 'Puzzle Quest crossed 90 viral score', description: 'Viral score surged during holiday season', milestone_type: 'threshold', entity_type: 'trend', entity_name: 'Puzzle Quest', metric: 'viral_score', value: 92, previous_value: 67, threshold: 90, significance: 88, days_ago: 2 },
  { title: 'Candy Crush download spike', description: 'Downloads doubled during Black Friday promotions', milestone_type: 'spike', entity_type: 'app', entity_name: 'Candy Crush Saga', metric: 'downloads', value: 2400000, previous_value: 1100000, threshold: 2200000, significance: 82, days_ago: 5 },
  { title: '"idle" word reached peak frequency', description: 'Idle game genre term hit all-time high mentions', milestone_type: 'record', entity_type: 'word', entity_name: 'idle', metric: 'frequency', value: 4500, previous_value: 3200, threshold: 4000, significance: 75, days_ago: 8 },
  { title: 'Reddit r/gaming forum surge', description: 'Forum activity hit record levels during Game Awards', milestone_type: 'spike', entity_type: 'forum', entity_name: 'r/gaming', metric: 'forum_activity', value: 8900, previous_value: 4200, threshold: 7000, significance: 90, days_ago: 1 },
  { title: 'US region viral score record', description: 'United States average viral score hit all-time high', milestone_type: 'record', entity_type: 'region', entity_name: 'United States', metric: 'avg_viral_score', value: 85.4, previous_value: 78.4, threshold: 80, significance: 78, days_ago: 3 },
  { title: 'Gacha games 50-download streak', description: '50 consecutive days of increasing gacha game downloads', milestone_type: 'streak', entity_type: 'app', entity_name: 'Gacha Games Category', metric: 'downloads', value: 50, previous_value: 32, threshold: 30, significance: 70, days_ago: 12 },
  { title: 'Among Us revival detected', description: 'Among Us downloads and mentions spiked simultaneously', milestone_type: 'spike', entity_type: 'trend', entity_name: 'Among Us', metric: 'mentions', value: 18000, previous_value: 3500, threshold: 10000, significance: 85, days_ago: 15 },
  { title: 'Japan region app count milestone', description: 'Japan crossed 300 tracked apps threshold', milestone_type: 'threshold', entity_type: 'region', entity_name: 'Japan', metric: 'app_count', value: 312, previous_value: 289, threshold: 300, significance: 55, days_ago: 20 },
];

function seedCalendar() {
  console.log('📅 Seeding calendar events...');

  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT DEFAULT 'holiday',
      start_date TEXT NOT NULL,
      end_date TEXT,
      recurrence TEXT DEFAULT 'once',
      region TEXT DEFAULT 'global',
      impact_score REAL DEFAULT 50,
      categories TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      color TEXT DEFAULT '#3b82f6',
      data_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seasonal_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      pattern_type TEXT DEFAULT 'weekly',
      metric TEXT NOT NULL,
      baseline REAL DEFAULT 0,
      peak_value REAL DEFAULT 0,
      peak_period TEXT,
      trough_value REAL DEFAULT 0,
      trough_period TEXT,
      confidence REAL DEFAULT 0,
      sample_size INTEGER DEFAULT 0,
      data_json TEXT DEFAULT '{}',
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS engagement_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      milestone_type TEXT DEFAULT 'threshold',
      entity_type TEXT,
      entity_id INTEGER,
      entity_name TEXT,
      metric TEXT,
      value REAL DEFAULT 0,
      previous_value REAL DEFAULT 0,
      threshold REAL DEFAULT 0,
      calendar_event_id INTEGER,
      significance REAL DEFAULT 0,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Clear existing seed data
  db.prepare('DELETE FROM engagement_milestones').run();
  db.prepare('DELETE FROM seasonal_patterns').run();
  db.prepare('DELETE FROM calendar_events').run();

  const insertEvent = db.prepare(`
    INSERT INTO calendar_events (title, description, event_type, start_date, end_date, recurrence, region, impact_score, categories, tags, color)
    VALUES (@title, @description, @event_type, @start_date, @end_date, @recurrence, @region, @impact_score, @categories, @tags, @color)
  `);

  const insertPattern = db.prepare(`
    INSERT INTO seasonal_patterns (name, description, pattern_type, metric, baseline, peak_value, peak_period, trough_value, trough_period, confidence, sample_size, data_json)
    VALUES (@name, @description, @pattern_type, @metric, @baseline, @peak_value, @peak_period, @trough_value, @trough_period, @confidence, @sample_size, @data_json)
  `);

  const insertMilestone = db.prepare(`
    INSERT INTO engagement_milestones (title, description, milestone_type, entity_type, entity_name, metric, value, previous_value, threshold, significance, detected_at)
    VALUES (@title, @description, @milestone_type, @entity_type, @entity_name, @metric, @value, @previous_value, @threshold, @significance, @detected_at)
  `);

  const transaction = db.transaction(() => {
    // Insert calendar events
    for (const ev of CALENDAR_EVENTS) {
      insertEvent.run({
        title: ev.title,
        description: ev.description,
        event_type: ev.event_type,
        start_date: ev.start_date,
        end_date: ev.end_date || null,
        recurrence: ev.recurrence,
        region: ev.region,
        impact_score: ev.impact_score,
        categories: JSON.stringify(ev.categories),
        tags: JSON.stringify(ev.tags),
        color: ev.color,
      });
    }
    console.log(`  ✅ Inserted ${CALENDAR_EVENTS.length} calendar events`);

    // Insert seasonal patterns
    for (const p of PATTERNS) {
      insertPattern.run({
        name: p.name,
        description: p.description,
        pattern_type: p.pattern_type,
        metric: p.metric,
        baseline: p.baseline,
        peak_value: p.peak_value,
        peak_period: p.peak_period,
        trough_value: p.trough_value,
        trough_period: p.trough_period,
        confidence: p.confidence,
        sample_size: p.sample_size,
        data_json: '{}',
      });
    }
    console.log(`  ✅ Inserted ${PATTERNS.length} seasonal patterns`);

    // Insert milestones with varied detected_at dates
    for (const m of MILESTONES) {
      const detectedAt = new Date(Date.now() - m.days_ago * 86400000).toISOString();

      // Try to link to a nearby calendar event
      const nearbyEvent = db.prepare(`
        SELECT id FROM calendar_events
        WHERE start_date >= date(@detected, '-7 days') AND start_date <= @detected
        ORDER BY impact_score DESC LIMIT 1
      `).get({ detected: detectedAt.slice(0, 10) }) as { id: number } | undefined;

      insertMilestone.run({
        title: m.title,
        description: m.description,
        milestone_type: m.milestone_type,
        entity_type: m.entity_type,
        entity_name: m.entity_name,
        metric: m.metric,
        value: m.value,
        previous_value: m.previous_value,
        threshold: m.threshold,
        significance: m.significance,
        detected_at: detectedAt,
      });

      // If we found a nearby event, update the milestone to link to it
      if (nearbyEvent) {
        db.prepare('UPDATE engagement_milestones SET calendar_event_id = ? WHERE id = last_insert_rowid()').run(nearbyEvent.id);
      }
    }
    console.log(`  ✅ Inserted ${MILESTONES.length} engagement milestones`);
  });

  transaction();
}

function seedCalendarCronConfigs() {
  console.log('⚙️  Seeding calendar cron configs...');

  // Ensure cron_configs has target_dashboard column
  try {
    db.prepare('SELECT target_dashboard FROM cron_configs LIMIT 0').run();
  } catch {
    db.exec('ALTER TABLE cron_configs ADD COLUMN target_dashboard TEXT');
  }

  const existing = db.prepare("SELECT COUNT(*) as count FROM cron_configs WHERE target_dashboard = 'calendar'").get() as { count: number };
  if (existing.count >= 3) {
    console.log('  ⏭️  Calendar cron configs already exist, skipping');
    return;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO cron_configs (name, description, prompt, schedule, agent, source_type, target_dashboard, enabled)
    VALUES (@name, @description, @prompt, @schedule, @agent, @source_type, @target_dashboard, @enabled)
  `);

  insert.run({
    name: 'Calendar Events Scanner',
    description: 'Scan for upcoming calendar events and check for new gaming industry events, holidays, and sales periods that should be tracked.',
    prompt: 'Search for upcoming gaming industry events, major holidays, app store sales, and cultural events that impact mobile gaming engagement. For each event found, provide: title, description, event_type (holiday/conference/sale/cultural/gaming/school), start_date, end_date, recurrence, region, impact_score (0-100), and relevant game categories. Output as JSON array of calendar_events.',
    schedule: '0 6 * * 1',
    agent: 'default',
    source_type: 'scanner',
    target_dashboard: 'calendar',
    enabled: 1,
  });

  insert.run({
    name: 'Pattern Detector',
    description: 'Analyze historical engagement data to detect recurring seasonal patterns in viral scores, downloads, and forum activity.',
    prompt: 'Analyze trend_snapshots, app_snapshots, and forum_posts tables for recurring patterns. Detect weekly patterns (day-of-week variations), monthly patterns (week-of-month), and seasonal patterns (quarter/month-of-year). For each pattern detected, compute baseline, peak, trough, and confidence score. Insert results into seasonal_patterns table.',
    schedule: '0 2 * * 0',
    agent: 'default',
    source_type: 'detector',
    target_dashboard: 'calendar',
    enabled: 1,
  });

  insert.run({
    name: 'Milestone Tracker',
    description: 'Monitor engagement metrics across trends, apps, words, and forums for significant threshold crossings, spikes, and records.',
    prompt: 'Check all tracked entities for engagement milestones. Look for: viral score threshold crossings (50/75/90), download spikes (>2x average), forum activity records, word frequency peaks, and region metric records. For each milestone, record the entity, metric, value, previous value, and attempt to correlate with recent calendar events. Insert results into engagement_milestones table.',
    schedule: '0 */4 * * *',
    agent: 'default',
    source_type: 'detector',
    target_dashboard: 'calendar',
    enabled: 1,
  });

  console.log('  ✅ Inserted 3 calendar cron configs');
}

seedCalendar();
seedCalendarCronConfigs();
db.close();
console.log('📅 Calendar seed complete!');
