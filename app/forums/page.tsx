'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Types ──────────────────────────────────────────────────

interface ForumPost {
  id: number;
  external_id: string;
  source: string;
  source_id: number | null;
  title: string;
  body: string | null;
  author: string | null;
  url: string | null;
  score: number;
  comments: number;
  sentiment: number;
  category: string;
  tags: string;
  is_trending: number;
  hot_words: string;
  published_at: string | null;
  created_at: string;
}

interface ForumStats {
  totalPosts: number;
  activeSources: number;
  avgSentiment: number;
  trendingTopics: number;
  topSources: Array<{ source: string; count: number; avg_sentiment: number; avg_score: number }>;
  topCategories: Array<{ category: string; count: number }>;
  recentActivity: Array<{ day: string; count: number; avg_sentiment: number }>;
}

interface ForumTopic {
  id: number;
  name: string;
  slug: string;
  post_count: number;
  avg_sentiment: number;
  avg_score: number;
  sources: string;
  is_trending: number;
}

interface ForumSource {
  id: number;
  name: string;
  type: string;
  url: string | null;
  icon: string | null;
  description: string | null;
  enabled: number;
  post_count: number;
}

// ── Helpers ────────────────────────────────────────────────

function sourceIcon(source: string): string {
  if (source.startsWith('reddit')) return '🔴';
  if (source === 'hackernews') return '🟠';
  if (source === 'toucharcade' || source === 'tigsource') return '📱';
  if (source.includes('blog')) return '📰';
  return '💬';
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    'reddit-r-gaming': 'r/gaming',
    'reddit-r-indiegames': 'r/indiegames',
    'hackernews': 'Hacker News',
    'toucharcade': 'TouchArcade',
    'tigsource': 'TIGSource',
    'gaming-blogs': 'Gaming Blogs',
  };
  return map[source] || source;
}

function sentimentBadge(sentiment: number) {
  if (sentiment >= 0.6) return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">😊 {sentiment.toFixed(2)}</span>;
  if (sentiment >= 0.2) return <span className="text-xs px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan font-medium">🙂 {sentiment.toFixed(2)}</span>;
  if (sentiment >= -0.2) return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 font-medium">😐 {sentiment.toFixed(2)}</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">😠 {sentiment.toFixed(2)}</span>;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'unknown';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function parseTags(tagsStr: string): string[] {
  try { return JSON.parse(tagsStr); } catch { return []; }
}

const SOURCE_COLORS: Record<string, string> = {
  'reddit-r-gaming': '#ef4444',
  'reddit-r-indiegames': '#f97316',
  'hackernews': '#f59e0b',
  'toucharcade': '#22d3ee',
  'tigsource': '#a855f7',
  'gaming-blogs': '#10b981',
};

// ── Main Page ──────────────────────────────────────────────

export default function ForumsPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [sources, setSources] = useState<ForumSource[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState({
    source: '',
    category: '',
    search: '',
    trending: false,
    sort: 'newest',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.source) params.set('source', filter.source);
      if (filter.category) params.set('category', filter.category);
      if (filter.search) params.set('search', filter.search);
      if (filter.trending) params.set('trending', 'true');
      if (filter.sort) params.set('sort', filter.sort);
      params.set('limit', '50');

      const [postsRes, statsRes, topicsRes, sourcesRes] = await Promise.all([
        fetch(`/api/forums?${params}`),
        fetch('/api/forums/stats'),
        fetch('/api/forums/topics'),
        fetch('/api/forums/sources'),
      ]);

      setPosts(await postsRes.json());
      setStats(await statsRes.json());
      setTopics(await topicsRes.json());
      setSources(await sourcesRes.json());
    } catch (e) {
      console.error('Failed to fetch forum data:', e);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived
  const categories = useMemo(
    () => Array.from(new Set(posts.map(p => p.category).filter(Boolean))),
    [posts]
  );

  const trendingTopics = useMemo(
    () => topics.filter(t => t.is_trending),
    [topics]
  );

  // Sentiment by source chart data
  const sentimentBySource = useMemo(() => {
    if (!stats?.topSources) return [];
    return stats.topSources.map(s => ({
      name: sourceLabel(s.source),
      source: s.source,
      sentiment: Math.round(s.avg_sentiment * 100) / 100,
      posts: s.count,
      avgScore: Math.round(s.avg_score),
    }));
  }, [stats]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🎮 Games Forums</h1>
          <p className="text-sm text-slate-500 mt-1">
            Multi-source forum intelligence — Reddit, Hacker News, TouchArcade &amp; gaming blogs
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-dark-600 hover:bg-dark-500 border border-dark-500 rounded-lg text-sm text-slate-300 transition-all"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stat-card glow-cyan">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Posts</p>
            <p className="text-2xl font-bold text-neon-cyan">{stats.totalPosts.toLocaleString()}</p>
          </div>
          <div className="stat-card glow-green">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active Sources</p>
            <p className="text-2xl font-bold text-neon-green">{stats.activeSources}</p>
          </div>
          <div className="stat-card glow-magenta">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg Sentiment</p>
            <p className="text-2xl font-bold text-neon-magenta">{stats.avgSentiment.toFixed(2)}</p>
          </div>
          <div className="stat-card glow-amber">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trending Topics</p>
            <p className="text-2xl font-bold text-neon-amber">{stats.trendingTopics}</p>
          </div>
        </div>
      )}

      {/* Trending Topics Pills */}
      {trendingTopics.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">🔥 Trending Topics</h3>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map(t => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 rounded-full text-sm text-neon-cyan hover:bg-neon-cyan/20 transition-colors cursor-default"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-xs bg-neon-cyan/20 px-1.5 py-0.5 rounded-full text-neon-cyan/80">
                  {t.post_count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment by Source Chart */}
      {sentimentBySource.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">📊 Sentiment by Source</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sentimentBySource} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#2a2a5a' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#2a2a5a' }}
                tickLine={false}
                domain={[-1, 1]}
              />
              <Tooltip
                contentStyle={{
                  background: '#161638',
                  border: '1px solid #2a2a5a',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'sentiment') return [value.toFixed(2), 'Avg Sentiment'];
                  return [value, name];
                }}
                labelFormatter={(label: string) => `Source: ${label}`}
              />
              <Bar dataKey="sentiment" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {sentimentBySource.map((entry) => (
                  <Cell
                    key={entry.source}
                    fill={SOURCE_COLORS[entry.source] || '#22d3ee'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {sentimentBySource.map(s => (
              <span key={s.source} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: SOURCE_COLORS[s.source] || '#22d3ee' }}
                />
                {s.name} ({s.posts} posts)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search posts..."
          value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          className="flex-1 min-w-[200px] max-w-xs"
        />
        <select
          value={filter.source}
          onChange={e => setFilter(f => ({ ...f, source: e.target.value }))}
        >
          <option value="">All Sources</option>
          {sources.map(s => (
            <option key={s.id} value={s.name}>
              {sourceLabel(s.name)} ({s.post_count})
            </option>
          ))}
        </select>
        <select
          value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filter.sort}
          onChange={e => setFilter(f => ({ ...f, sort: e.target.value }))}
        >
          <option value="newest">Newest</option>
          <option value="score">Top Score</option>
          <option value="comments">Most Comments</option>
          <option value="sentiment">Best Sentiment</option>
        </select>
        <button
          onClick={() => setFilter(f => ({ ...f, trending: !f.trending }))}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
            filter.trending
              ? 'bg-neon-amber/20 border-neon-amber/40 text-neon-amber'
              : 'bg-dark-600 border-dark-500 text-slate-400 hover:text-slate-300'
          }`}
        >
          🔥 Trending
        </button>
      </div>

      {/* Forum Feed */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading forum posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 text-lg mb-2">No forum posts found</p>
          <p className="text-slate-600 text-sm">
            Run the seed script: <code className="bg-dark-700 px-2 py-1 rounded">npm run seed:forums</code>
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {posts.map(post => {
            const tags = parseTags(post.tags);
            return (
              <div
                key={post.id}
                className="card hover:border-dark-400 transition-all group"
              >
                <div className="flex gap-3">
                  {/* Source Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center text-lg">
                    {sourceIcon(post.source)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white group-hover:text-neon-cyan transition-colors leading-snug">
                          {post.url ? (
                            <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {post.title}
                            </a>
                          ) : (
                            post.title
                          )}
                        </h3>
                      </div>
                      {post.is_trending === 1 && (
                        <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-neon-amber/20 text-neon-amber border border-neon-amber/30 font-medium">
                          🔥 Trending
                        </span>
                      )}
                    </div>

                    {/* Body preview */}
                    {post.body && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                        {post.body.slice(0, 200)}{post.body.length > 200 ? '...' : ''}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        <span className="text-slate-400 font-medium">{sourceLabel(post.source)}</span>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500">
                        ▲ <span className="text-slate-300 font-medium">{post.score.toLocaleString()}</span>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500">
                        💬 <span className="text-slate-300">{post.comments}</span>
                      </span>
                      <span className="text-slate-600">•</span>
                      {sentimentBadge(post.sentiment)}
                      {post.author && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-500">by <span className="text-slate-400">{post.author}</span></span>
                        </>
                      )}
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-600">{relativeTime(post.published_at)}</span>
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-slate-500 border border-dark-500"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Non-trending topics */}
      {topics.filter(t => !t.is_trending).length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">📁 All Topics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {topics.filter(t => !t.is_trending).map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2.5 bg-dark-800 rounded-lg"
              >
                <span className="text-xs text-slate-300 font-medium truncate">{t.name}</span>
                <span className="text-[10px] text-slate-500 ml-2 flex-shrink-0">{t.post_count} posts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
