# 📊 Trends Dashboard — Casual Games Market Intelligence

Real-time intelligence dashboard for the casual games market, powered by OpenClaw agent crons.

## Architecture

```
trends-dashboard/
├── app/                    # Next.js 14 App Router pages
│   ├── trends/             # 🔥 Viral Trends (MVP)
│   ├── crons/              # ⚙️ Crons Settings (MVP)
│   ├── regions/            # 🗺️ Region Analysis (coming soon)
│   ├── calendar/           # 📅 Calendar Trends (coming soon)
│   ├── words/              # 💬 Words Trends (coming soon)
│   ├── forums/             # 🎮 Games Forums (coming soon)
│   ├── apps-market/        # 📱 Apps Market (coming soon)
│   └── api/                # REST API routes
├── components/             # Reusable React components
├── lib/
│   ├── db.ts               # SQLite database layer
│   └── ingest.ts           # JSON inbox processor
├── scripts/
│   └── seed.ts             # Demo data seeder
├── data/
│   ├── inbox/              # Drop JSON files here for ingestion
│   └── processed/          # Processed files moved here
└── trends.db               # SQLite database (auto-created)
```

## Quick Start

```bash
# Install dependencies
npm install

# Seed demo data
npm run seed

# Start dev server (port 4002)
npm run dev
```

Open [http://localhost:4002](http://localhost:4002)

## Data Flow

```
Agents → JSON in data/inbox/ → POST /api/ingest/process → SQLite → API → Frontend
```

### Inbox JSON Format

Drop JSON files in `data/inbox/` with this structure:

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

Then call `POST /api/ingest/process` or run `npm run ingest`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trends` | List trends (query: category, region, search, limit, offset) |
| GET | `/api/trends/stats` | Aggregate statistics |
| GET | `/api/crons` | List cron configurations |
| POST | `/api/crons` | Create cron config |
| PUT | `/api/crons` | Update cron config |
| DELETE | `/api/crons?id=N` | Delete cron config |
| GET | `/api/crons/runs` | List cron run history |
| POST | `/api/ingest/process` | Process all inbox JSON files |

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** SQLite via better-sqlite3
- **Charts:** Recharts
- **Styling:** Tailwind CSS (dark analytics theme)
- **Port:** 4002

## Database Schema

- `sources` — Data source definitions (Reddit, TikTok, App Stores, etc.)
- `trends` — Individual trend entries with viral scoring
- `trend_snapshots` — Historical score tracking over time
- `cron_configs` — Agent cron job configurations
- `cron_runs` — Execution history and status
- `tags` — Aggregated tag counts

## Planned Features

- 🗺️ **Region Analysis** — Interactive map with geo-specific viral detection
- 📅 **Calendar Trends** — Seasonal patterns and engagement milestones
- 💬 **Words Trends** — Term frequency, competition mapping, semantic analysis
- 🎮 **Games Forums** — Aggregated community intelligence
- 📱 **Apps Market** — Cross-store ranking and growth tracking
- 📈 **Trend Velocity** — Rate-of-change scoring for early detection
- 🔄 **Cross-Platform Correlation** — Multi-source trend linking
- 🎯 **Competitor Watch** — Studio/publisher tracking
