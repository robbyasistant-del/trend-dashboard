# 📊 Trends Dashboard — Casual Games Market Intelligence

Real-time intelligence dashboard for the casual games market, powered by OpenClaw agent crons. Full-stack Next.js application with SQLite, featuring cross-platform correlation, velocity detection, competitor tracking, and 10+ interactive dashboard pages.

## Features

### Core Dashboards
- **📊 Home Dashboard** — Unified overview with global stats, top trends, velocity alerts, upcoming events, and quick navigation
- **🔥 Viral Trends** — Real-time trend tracking with viral scoring, lifecycle stages, velocity indicators, and category filtering
- **💬 Words Trends** — Term frequency analysis, competition mapping, semantic clustering, and AI-powered analysis
- **🎮 Games Forums** — Multi-source forum intelligence (Reddit, HN, TouchArcade) with sentiment analysis and hot topics
- **📱 Apps Market** — Cross-store app rankings, growth tracking, top movers, and keyword analysis
- **🗺️ Region Analysis** — Interactive geographic intelligence with heatmap, region comparison, and trend distribution
- **📅 Calendar Trends** — Seasonal patterns, engagement milestones, event-impact predictions, and timeline visualization

### Sprint 6: Advanced Intelligence
- **🔗 Cross-Platform Correlations** — Discover connections across trends↔forums↔apps↔words with network visualization and correlation matrix
- **⚡ Velocity Alerts** — Early detection of rapidly moving trends, apps, and forum topics with acceleration scoring and alert levels
- **🏢 Competitor Watch** — Track competing studios/publishers with leaderboard, history snapshots, and auto-detection from app developers
- **📥 Export** — CSV and JSON export on every page for all data sources

### Infrastructure
- **⚙️ Cron Settings** — Configure automated data collection agents with scheduling, run history, and status tracking
- **🔄 Data Ingestion** — JSON inbox processing for agent-sourced data
- **📱 Responsive Design** — Collapsible sidebar, mobile layouts, adaptive grids

## Architecture

```
trends-dashboard/
├── app/                        # Next.js 14 App Router
│   ├── page.tsx                # 📊 Home Dashboard
│   ├── trends/                 # 🔥 Viral Trends
│   ├── words/                  # 💬 Words Trends
│   ├── forums/                 # 🎮 Games Forums
│   ├── apps-market/            # 📱 Apps Market
│   ├── regions/                # 🗺️ Region Analysis
│   ├── calendar/               # 📅 Calendar Trends
│   ├── correlations/           # 🔗 Cross-Platform Correlations
│   ├── velocity/               # ⚡ Velocity Alerts
│   ├── competitors/            # 🏢 Competitor Watch
│   ├── crons/                  # ⚙️ Cron Settings
│   └── api/                    # 50+ REST API routes
├── components/
│   ├── Sidebar.tsx             # Responsive navigation sidebar
│   ├── RegionMap.tsx           # Geographic visualization
│   └── ComingSoon.tsx          # Placeholder component
├── lib/
│   ├── db.ts                   # SQLite database layer (2800+ lines)
│   └── ingest.ts               # JSON inbox processor
├── scripts/
│   └── seed.ts                 # Demo data seeder
├── data/
│   ├── inbox/                  # Drop JSON files for ingestion
│   └── processed/              # Processed files
└── trends.db                   # SQLite database (auto-created)
```

## Quick Start

```bash
# Install dependencies
npm install

# Seed demo data (optional)
npm run seed

# Start dev server (port 4002)
npm run dev

# Production build
npm run build
```

Open [http://localhost:4002](http://localhost:4002)

## Data Flow

```
Agents → JSON in data/inbox/ → POST /api/ingest/process → SQLite → API → Frontend
```

### Inbox JSON Format

```json
{
  "source": "reddit",
  "cron_config_id": 1,
  "trends": [
    {
      "title": "Puzzle Merge Games Going Viral",
      "description": "New merge-3 puzzle games gaining traction...",
      "viral_score": 85,
      "velocity": 6.2,
      "category": "puzzle",
      "region": "US",
      "tags": ["merge", "puzzle", "viral"],
      "mentions": 12500,
      "sentiment": 0.75,
      "lifecycle": "emerging"
    }
  ]
}
```

## API Endpoints

### Trends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trends` | List trends (query: category, region, search, limit, offset) |
| GET | `/api/trends/stats` | Aggregate statistics |

### Words
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/words` | List word entries (query: category, source, search) |
| GET | `/api/words/stats` | Word statistics |
| GET | `/api/words/top` | Top words by score |
| GET | `/api/words/frequency` | Word frequency over time |
| GET | `/api/words/competition` | Word competition pairs |
| GET | `/api/words/clusters` | Semantic clusters |
| POST | `/api/words/analyze` | AI-powered word analysis |

### Forums
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forums` | List forum posts (query: source, category, trending, sort) |
| GET | `/api/forums/stats` | Forum statistics |
| GET | `/api/forums/topics` | Trending topics |
| GET/POST/PUT/DELETE | `/api/forums/sources` | Manage forum sources |
| POST | `/api/forums/cross-reference` | Cross-reference forums with words |

### Apps Market
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/apps-market` | List apps (query: store, category, search, sort) |
| GET | `/api/apps-market/stats` | Market statistics |
| GET | `/api/apps-market/rankings` | App rankings |
| GET | `/api/apps-market/movers` | Top movers (up/down) |
| GET | `/api/apps-market/new` | Newly added apps |
| GET | `/api/apps-market/keywords` | Trending app keywords |
| GET | `/api/apps-market/[id]/history` | App history (rankings + snapshots) |

### Regions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/regions` | List regions with metrics |
| GET | `/api/regions/stats` | Region statistics |
| GET | `/api/regions/map-data` | Map visualization data |
| GET | `/api/regions/compare` | Compare multiple regions |
| GET | `/api/regions/[code]` | Region detail |
| GET | `/api/regions/[code]/trends` | Trends for a region |
| POST | `/api/regions/rebuild` | Rebuild region metrics |

### Calendar
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar` | List events (query: type, region, date range) |
| GET | `/api/calendar/stats` | Calendar statistics |
| GET/POST | `/api/calendar/events` | Manage calendar events |
| GET | `/api/calendar/patterns` | Seasonal patterns |
| GET | `/api/calendar/milestones` | Engagement milestones |
| GET | `/api/calendar/predictions` | AI predictions |
| GET | `/api/calendar/timeline` | Unified timeline |

### Cross-Platform Correlations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/correlations` | List correlations (query: source_type, target_type, min_strength) |
| GET | `/api/correlations/graph` | Network graph data (nodes + edges + matrix) |
| GET | `/api/correlations/[type]/[id]` | Correlations for a specific entity |
| POST | `/api/correlations/rebuild` | Rebuild all cross-platform correlations |

### Velocity Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/velocity` | List alerts (query: alert_level, entity_type, unread_only) |
| GET | `/api/velocity/stats` | Alert statistics |
| POST | `/api/velocity/scan` | Run velocity scan across all entities |
| POST | `/api/velocity/[id]/read` | Mark alert as read |

### Competitor Watch
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/competitors` | List/create competitors |
| GET/PUT/DELETE | `/api/competitors/[id]` | Manage individual competitor |
| GET | `/api/competitors/[id]/history` | Competitor snapshot history |
| GET | `/api/competitors/leaderboard` | Competitor leaderboard |

### Export & Infrastructure
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export` | Export data (query: type=csv/json, source=trends/forums/apps/words/regions/calendar) |
| GET/POST/PUT/DELETE | `/api/crons` | Manage cron configurations |
| GET | `/api/crons/runs` | Cron run history |
| POST | `/api/ingest/process` | Process inbox JSON files |

## Database Schema

### Core Tables
- `sources` — Data source definitions
- `trends` — Viral trend entries with scoring
- `trend_snapshots` — Historical score tracking
- `tags` — Aggregated tag counts

### Word Trends
- `word_entries` — Tracked words with frequency/score
- `word_frequencies` — Time-series frequency data
- `word_competitions` — Word pair competition scores
- `word_clusters` — Semantic word clusters

### Forums
- `forum_sources` — Forum source configurations
- `forum_posts` — Individual forum posts
- `forum_topics` — Aggregated trending topics

### Apps Market
- `app_entries` — App listings across stores
- `app_rankings` — Historical ranking data
- `app_snapshots` — Rating/download snapshots
- `store_categories` — Store category taxonomy

### Regions
- `region_metrics` — Aggregated regional metrics
- `region_snapshots` — Historical region data
- `geo_trend_links` — Trend-to-region associations

### Calendar
- `calendar_events` — Scheduled events with impact scoring
- `seasonal_patterns` — Detected recurring patterns
- `engagement_milestones` — Threshold crossings and spikes

### Cross-Platform (Sprint 6)
- `correlations` — Cross-platform entity correlations
- `velocity_alerts` — Velocity/acceleration alerts
- `competitors` — Tracked competitor studios
- `competitor_snapshots` — Historical competitor metrics

### Infrastructure
- `cron_configs` — Agent cron job configurations
- `cron_runs` — Execution history and status

## Pre-seeded Cron Configs

| Name | Schedule | Dashboard |
|------|----------|-----------|
| Calendar Events Scanner | Weekly (Mon 6am) | Calendar |
| Pattern Detector | Weekly (Sun 2am) | Calendar |
| Milestone Tracker | Every 4 hours | Calendar |
| Velocity Scanner | Every 2 hours | Velocity |
| Competitor Tracker | Daily (6am) | Competitors |

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** SQLite via better-sqlite3 (WAL mode, foreign keys)
- **Charts:** Recharts
- **Styling:** Tailwind CSS (dark analytics theme with neon accents)
- **Port:** 4002

## Sprint History

1. **Sprint 1** — Core foundation: Trends, Crons, Data Ingestion
2. **Sprint 2** — Words Trends: frequency analysis, competitions, clusters
3. **Sprint 3** — Forums: multi-source posts, topics, cross-reference with words
4. **Sprint 4** — Apps Market: rankings, movers, snapshots, keyword extraction
5. **Sprint 5** — Regions + Calendar: geo-analysis, events, patterns, milestones, predictions
6. **Sprint 6** — Cross-Platform Correlation, Velocity Alerts, Competitor Watch, Home Dashboard, Export, Responsive Design
