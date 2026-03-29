'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface Trend {
  id: number; title: string; description: string; source_name: string; url: string;
  viral_score: number; velocity: number; category: string; region: string;
  tags: string; mentions: number; sentiment: number; lifecycle: string; detected_at: string;
}

interface Stats {
  total: number; emerging: number; trending: number; avgScore: number;
  topCategories: { category: string; count: number }[];
  topRegions: { region: string; count: number }[];
}

const LIFECYCLE_COLORS: Record<string, string> = {
  emerging: '#22d3ee', trending: '#10b981', peaked: '#f59e0b', declining: '#ef4444',
};

const CATEGORY_COLORS = ['#22d3ee', '#ec4899', '#10b981', '#f59e0b', '#a855f7', '#ef4444'];

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 70 ? 'score-high' : score >= 40 ? 'score-med' : 'score-low';
  return <span className={`score-badge ${cls}`}>{score}</span>;
}

function LifecycleBadge({ lifecycle }: { lifecycle: string }) {
  return (
    <span className={`score-badge lifecycle-${lifecycle}`}>
      {lifecycle.charAt(0).toUpperCase() + lifecycle.slice(1)}
    </span>
  );
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState({ category: '', search: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filter]);

  async function fetchData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.category) params.set('category', filter.category);
    if (filter.search) params.set('search', filter.search);
    try {
      const [trendsRes, statsRes] = await Promise.all([
        fetch(`/api/trends?${params}`), fetch('/api/trends/stats'),
      ]);
      setTrends(await trendsRes.json());
      setStats(await statsRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const categories = Array.from(new Set(trends.map(t => t.category).filter(Boolean)));

  // Chart data: aggregate by lifecycle
  const lifecycleCounts = trends.reduce((acc, t) => {
    acc[t.lifecycle] = (acc[t.lifecycle] || 0) + 1; return acc;
  }, {} as Record<string, number>);
  const lifecycleData = Object.entries(lifecycleCounts).map(([name, value]) => ({ name, value }));

  // Score distribution for area chart
  const scoreDistribution = [
    { range: '0-20', count: trends.filter(t => t.viral_score <= 20).length },
    { range: '21-40', count: trends.filter(t => t.viral_score > 20 && t.viral_score <= 40).length },
    { range: '41-60', count: trends.filter(t => t.viral_score > 40 && t.viral_score <= 60).length },
    { range: '61-80', count: trends.filter(t => t.viral_score > 60 && t.viral_score <= 80).length },
    { range: '81-100', count: trends.filter(t => t.viral_score > 80).length },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">🔥 Viral Trends</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time casual games market intelligence</p>
        </div>
        <div className="flex gap-2">
          <a href="/correlations" className="px-3 py-2 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all">🔗 Cross-Platform</a>
          <a href="/api/export?type=csv&source=trends" className="px-3 py-2 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-white hover:border-neon-cyan transition-all">📥 Export CSV</a>
          <a href="/api/export?type=json&source=trends" className="px-3 py-2 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-white hover:border-neon-cyan transition-all">📥 Export JSON</a>
          <button onClick={fetchData} className="px-4 py-2 bg-dark-600 hover:bg-dark-500 border border-dark-500 rounded-lg text-sm text-slate-300 transition-all">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stat-card glow-cyan">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Trends</p>
            <p className="text-2xl font-bold text-neon-cyan">{stats.total}</p>
          </div>
          <div className="stat-card glow-green">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Emerging</p>
            <p className="text-2xl font-bold text-neon-green">{stats.emerging}</p>
          </div>
          <div className="stat-card glow-magenta">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trending Now</p>
            <p className="text-2xl font-bold text-neon-magenta">{stats.trending}</p>
          </div>
          <div className="stat-card glow-amber">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg Score</p>
            <p className="text-2xl font-bold text-neon-amber">{stats.avgScore}</p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={scoreDistribution}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#161638', border: '1px solid #2a2a5a', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#22d3ee" fill="url(#scoreGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Lifecycle Breakdown</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={lifecycleData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#161638', border: '1px solid #2a2a5a', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {lifecycleData.map((entry, i) => (
                  <Cell key={i} fill={LIFECYCLE_COLORS[entry.name] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text" placeholder="Search trends..." value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          className="flex-1 max-w-xs"
        />
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Trends list */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading trends...</div>
      ) : trends.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 text-lg mb-2">No trends found</p>
          <p className="text-slate-600 text-sm">Run the seed script: <code className="bg-dark-700 px-2 py-1 rounded">npm run seed</code></p>
        </div>
      ) : (
        <div className="space-y-3">
          {trends.map(trend => {
            let tags: string[] = [];
            try { tags = JSON.parse(trend.tags); } catch { /* ignore */ }
            return (
              <div key={trend.id} className="card flex items-start gap-4 group">
                <div className="flex-shrink-0 pt-1">
                  <ScoreBadge score={trend.viral_score} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate group-hover:text-neon-cyan transition-colors">
                      {trend.url ? <a href={trend.url} target="_blank" rel="noopener noreferrer">{trend.title}</a> : trend.title}
                    </h3>
                    <LifecycleBadge lifecycle={trend.lifecycle} />
                  </div>
                  {trend.description && (
                    <p className="text-sm text-slate-400 line-clamp-2 mb-2">{trend.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {trend.source_name && <span>📡 {trend.source_name}</span>}
                    {trend.category && <span>🏷️ {trend.category}</span>}
                    {trend.region !== 'global' && <span>🌍 {trend.region}</span>}
                    {trend.velocity !== 0 && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        Math.abs(trend.velocity) >= 20 ? 'bg-red-500/20 text-red-400' :
                        Math.abs(trend.velocity) >= 10 ? 'bg-orange-500/20 text-orange-400' :
                        Math.abs(trend.velocity) >= 5 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {trend.velocity > 0 ? '🚀' : '📉'} {trend.velocity > 0 ? '+' : ''}{trend.velocity.toFixed(1)}
                      </span>
                    )}
                    <span>💬 {trend.mentions} mentions</span>
                    {tags.length > 0 && tags.slice(0, 3).map(t => (
                      <span key={t} className="bg-dark-600 px-1.5 py-0.5 rounded text-slate-400">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-600 flex-shrink-0">
                  {new Date(trend.detected_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
