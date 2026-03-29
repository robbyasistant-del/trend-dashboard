'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────

interface AppEntry {
  id: number;
  external_id: string;
  store: string;
  name: string;
  developer: string | null;
  description: string | null;
  icon_url: string | null;
  category: string;
  subcategory: string | null;
  price: number;
  is_free: number;
  rating: number;
  rating_count: number;
  downloads: number;
  size_mb: number;
  url: string | null;
  tags: string;
  first_seen: string;
  last_seen: string;
}

interface AppStats {
  total: number;
  newThisWeek: number;
  avgRating: number;
  topClimber: { name: string; delta: number } | null;
  storeBreakdown: Array<{ store: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
}

interface AppRanking {
  id: number;
  app_id: number;
  store: string;
  category: string | null;
  rank: number;
  previous_rank: number | null;
  rank_delta: number;
  rank_type: string;
  recorded_at: string;
  name: string;
  developer: string | null;
  icon_url: string | null;
  rating: number;
  rating_count: number;
  downloads: number;
  is_free: number;
  price: number;
  app_url: string | null;
}

interface AppMover {
  id: number;
  app_id: number;
  store: string;
  rank: number;
  previous_rank: number | null;
  rank_delta: number;
  rank_type: string;
  name: string;
  developer: string | null;
  icon_url: string | null;
  rating: number;
  downloads: number;
  category: string;
  is_free: number;
}

interface AppHistoryData {
  app: AppEntry;
  rankings: Array<{ rank: number; rank_delta: number; rank_type: string; recorded_at: string }>;
  snapshots: Array<{ rating: number; rating_count: number; downloads: number; revenue_estimate: number; recorded_at: string }>;
}

// ── Helpers ────────────────────────────────────────────────

function storeIcon(store: string): string {
  if (store === 'google_play') return '🤖';
  if (store === 'app_store') return '🍎';
  if (store === 'amazon') return '📦';
  return '📱';
}

function storeLabel(store: string): string {
  const map: Record<string, string> = {
    google_play: 'Google Play',
    app_store: 'App Store',
    amazon: 'Amazon',
  };
  return map[store] || store;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
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

function rankDeltaDisplay(delta: number) {
  if (delta > 0) return <span className="text-emerald-400 font-semibold">▲ {delta}</span>;
  if (delta < 0) return <span className="text-red-400 font-semibold">▼ {Math.abs(delta)}</span>;
  return <span className="text-slate-500">—</span>;
}

function ratingStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

// ── Store Tabs ─────────────────────────────────────────────

const STORE_TABS = [
  { key: '', label: 'All Stores', icon: '🌐' },
  { key: 'google_play', label: 'Google Play', icon: '🤖' },
  { key: 'app_store', label: 'App Store', icon: '🍎' },
  { key: 'amazon', label: 'Amazon', icon: '📦' },
];

// ── Main Page ──────────────────────────────────────────────

export default function AppsMarketPage() {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [rankings, setRankings] = useState<AppRanking[]>([]);
  const [movers, setMovers] = useState<AppMover[]>([]);
  const [newApps, setNewApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [storeTab, setStoreTab] = useState('');
  const [category, setCategory] = useState('');
  const [rankType, setRankType] = useState('');
  const [freeFilter, setFreeFilter] = useState('');

  // Detail modal
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [appHistory, setAppHistory] = useState<AppHistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const storeParam = storeTab ? `&store=${storeTab}` : '';
      const catParam = category ? `&category=${category}` : '';
      const rankTypeParam = rankType ? `&rank_type=${rankType}` : '';

      const [statsRes, rankingsRes, moversRes, newRes] = await Promise.all([
        fetch('/api/apps-market/stats'),
        fetch(`/api/apps-market/rankings?limit=50${storeParam}${catParam}${rankTypeParam}`),
        fetch(`/api/apps-market/movers?limit=20${storeParam}`),
        fetch(`/api/apps-market/new?limit=12${storeParam}`),
      ]);

      setStats(await statsRes.json());
      setRankings(await rankingsRes.json());
      setMovers(await moversRes.json());
      setNewApps(await newRes.json());
    } catch (e) {
      console.error('Failed to fetch apps market data:', e);
    }
    setLoading(false);
  }, [storeTab, category, rankType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch app history for modal
  const openAppDetail = useCallback(async (appId: number) => {
    setSelectedAppId(appId);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/apps-market/${appId}/history`);
      const data = await res.json();
      setAppHistory(data);
    } catch (e) {
      console.error('Failed to fetch app history:', e);
    }
    setHistoryLoading(false);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedAppId(null);
    setAppHistory(null);
  }, []);

  // Derived data
  const categories = useMemo(
    () => Array.from(new Set(rankings.map(r => r.category).filter(Boolean) as string[])),
    [rankings]
  );

  // Filter rankings by free/paid
  const filteredRankings = useMemo(() => {
    let result = rankings;
    if (freeFilter === 'free') result = result.filter(r => r.is_free === 1);
    if (freeFilter === 'paid') result = result.filter(r => r.is_free === 0);
    return result;
  }, [rankings, freeFilter]);

  // Movers chart data
  const moversChartData = useMemo(() => {
    return movers.slice(0, 12).map(m => ({
      name: m.name.length > 18 ? m.name.slice(0, 16) + '…' : m.name,
      delta: m.rank_delta,
      fullName: m.name,
      store: m.store,
    }));
  }, [movers]);

  // Snapshot chart data for detail modal
  const snapshotChartData = useMemo(() => {
    if (!appHistory?.snapshots) return [];
    return appHistory.snapshots.map(s => ({
      date: new Date(s.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rating: s.rating,
      downloads: s.downloads,
      ratingCount: s.rating_count,
    }));
  }, [appHistory]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📱 Apps Market</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cross-store rankings &amp; growth tracking — Google Play, App Store &amp; Amazon
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
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Apps</p>
            <p className="text-2xl font-bold text-neon-cyan">{stats.total.toLocaleString()}</p>
          </div>
          <div className="stat-card glow-green">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">New This Week</p>
            <p className="text-2xl font-bold text-neon-green">{stats.newThisWeek}</p>
          </div>
          <div className="stat-card glow-magenta">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg Rating</p>
            <p className="text-2xl font-bold text-neon-magenta">{stats.avgRating.toFixed(1)} ★</p>
          </div>
          <div className="stat-card glow-amber">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Top Climber</p>
            <p className="text-lg font-bold text-neon-amber truncate">
              {stats.topClimber ? (
                <>{stats.topClimber.name} <span className="text-emerald-400 text-sm">▲{stats.topClimber.delta}</span></>
              ) : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Store Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {STORE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStoreTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              storeTab === tab.key
                ? 'bg-neon-cyan/20 border-neon-cyan/40 text-neon-cyan'
                : 'bg-dark-600 border-dark-500 text-slate-400 hover:text-slate-300 hover:bg-dark-500'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={rankType}
          onChange={e => setRankType(e.target.value)}
        >
          <option value="">All Chart Types</option>
          <option value="top_free">Top Free</option>
          <option value="top_paid">Top Paid</option>
          <option value="top_grossing">Top Grossing</option>
        </select>
        <select
          value={freeFilter}
          onChange={e => setFreeFilter(e.target.value)}
        >
          <option value="">Free &amp; Paid</option>
          <option value="free">Free Only</option>
          <option value="paid">Paid Only</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading apps market data...</div>
      ) : (
        <>
          {/* Rankings Table */}
          <div className="card mb-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">🏆 Rankings</h3>
            {filteredRankings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 text-lg mb-2">No rankings found</p>
                <p className="text-slate-600 text-sm">
                  Run the seed script: <code className="bg-dark-700 px-2 py-1 rounded">npm run seed:apps</code>
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-dark-500">
                      <th className="pb-2 pr-3 w-12">#</th>
                      <th className="pb-2 pr-3 w-8">Store</th>
                      <th className="pb-2 pr-3">App</th>
                      <th className="pb-2 pr-3">Developer</th>
                      <th className="pb-2 pr-3 text-center">Rating</th>
                      <th className="pb-2 pr-3 text-right">Downloads</th>
                      <th className="pb-2 pr-3 text-center">Delta</th>
                      <th className="pb-2 text-center">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRankings.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-dark-600/50 hover:bg-dark-700/50 cursor-pointer transition-colors"
                        onClick={() => openAppDetail(r.app_id)}
                      >
                        <td className="py-2.5 pr-3 font-bold text-slate-300">{r.rank}</td>
                        <td className="py-2.5 pr-3 text-base">{storeIcon(r.store)}</td>
                        <td className="py-2.5 pr-3">
                          <span className="text-white font-medium hover:text-neon-cyan transition-colors">
                            {r.name}
                          </span>
                          {r.is_free === 0 && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-neon-amber/20 text-neon-amber">
                              ${r.price}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-500">{r.developer || '—'}</td>
                        <td className="py-2.5 pr-3 text-center">
                          <span className="text-yellow-400">{r.rating.toFixed(1)}</span>
                          <span className="text-slate-600 text-xs ml-1">({formatNumber(r.rating_count)})</span>
                        </td>
                        <td className="py-2.5 pr-3 text-right text-slate-300">{formatNumber(r.downloads)}</td>
                        <td className="py-2.5 pr-3 text-center">{rankDeltaDisplay(r.rank_delta)}</td>
                        <td className="py-2.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-slate-500 border border-dark-500">
                            {r.rank_type.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Movers Chart */}
          {moversChartData.length > 0 && (
            <div className="card mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">📈 Top Movers</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={moversChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#2a2a5a' }}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#2a2a5a' }}
                    tickLine={false}
                    label={{ value: 'Rank Change', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#161638',
                      border: '1px solid #2a2a5a',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => {
                      const label = value > 0 ? `▲ ${value} (climbed)` : value < 0 ? `▼ ${Math.abs(value)} (dropped)` : 'No change';
                      return [label, 'Rank Delta'];
                    }}
                    labelFormatter={(label: string) => `App: ${label}`}
                  />
                  <Bar dataKey="delta" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {moversChartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.delta > 0 ? '#10b981' : entry.delta < 0 ? '#ef4444' : '#64748b'}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* New Apps Gallery */}
          {newApps.length > 0 && (
            <div className="card mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">🆕 New Apps</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {newApps.map(app => (
                  <div
                    key={app.id}
                    className="bg-dark-800 rounded-lg p-3 border border-dark-600 hover:border-neon-cyan/30 transition-all cursor-pointer group"
                    onClick={() => openAppDetail(app.id)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center text-lg flex-shrink-0">
                        {storeIcon(app.store)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-neon-cyan transition-colors">
                          {app.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{app.developer}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-yellow-400">{app.rating.toFixed(1)} ★</span>
                      <span className="text-slate-500">{formatNumber(app.downloads)} dl</span>
                      <span className="text-slate-600">{relativeTime(app.first_seen)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-dark-700 text-slate-500">{app.category}</span>
                      {app.is_free ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Free</span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-neon-amber/20 text-neon-amber">${app.price}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Store Breakdown */}
          {stats && stats.storeBreakdown.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="card">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">🏪 Store Breakdown</h3>
                <div className="space-y-2">
                  {stats.storeBreakdown.map(s => (
                    <div key={s.store} className="flex items-center justify-between p-2 bg-dark-800 rounded-lg">
                      <span className="text-sm text-slate-300">
                        {storeIcon(s.store)} {storeLabel(s.store)}
                      </span>
                      <span className="text-sm font-bold text-neon-cyan">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">📂 Top Categories</h3>
                <div className="space-y-2">
                  {stats.categoryBreakdown.slice(0, 6).map(c => (
                    <div key={c.category} className="flex items-center justify-between p-2 bg-dark-800 rounded-lg">
                      <span className="text-sm text-slate-300 capitalize">{c.category}</span>
                      <span className="text-sm font-bold text-neon-magenta">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* App Detail Modal */}
      {selectedAppId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-dark-800 border border-dark-500 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            {historyLoading ? (
              <div className="text-center py-12 text-slate-500">Loading app details...</div>
            ) : appHistory?.app ? (
              <>
                {/* App Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-dark-700 flex items-center justify-center text-2xl">
                      {storeIcon(appHistory.app.store)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{appHistory.app.name}</h2>
                      <p className="text-sm text-slate-400">{appHistory.app.developer} · {storeLabel(appHistory.app.store)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-yellow-400 text-sm">{ratingStars(appHistory.app.rating)} {appHistory.app.rating.toFixed(1)}</span>
                        <span className="text-slate-500 text-xs">({formatNumber(appHistory.app.rating_count)} ratings)</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={closeModal} className="text-slate-500 hover:text-white text-xl">✕</button>
                </div>

                {/* App Meta */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-dark-700 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Downloads</p>
                    <p className="text-sm font-bold text-neon-cyan">{formatNumber(appHistory.app.downloads)}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Category</p>
                    <p className="text-sm font-bold text-neon-magenta capitalize">{appHistory.app.category}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Price</p>
                    <p className="text-sm font-bold text-neon-green">{appHistory.app.is_free ? 'Free' : `$${appHistory.app.price}`}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Size</p>
                    <p className="text-sm font-bold text-slate-300">{appHistory.app.size_mb}MB</p>
                  </div>
                </div>

                {appHistory.app.description && (
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">{appHistory.app.description}</p>
                )}

                {/* Growth History Chart — Downloads */}
                {snapshotChartData.length > 1 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-slate-400 mb-2">📊 Growth History</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={snapshotChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a5a" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} tickFormatter={(v: number) => formatNumber(v)} />
                        <Tooltip
                          contentStyle={{ background: '#161638', border: '1px solid #2a2a5a', borderRadius: 8, fontSize: 11 }}
                          formatter={(value: number, name: string) => {
                            if (name === 'downloads') return [formatNumber(value), 'Downloads'];
                            if (name === 'ratingCount') return [formatNumber(value), 'Ratings'];
                            return [value, name];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="downloads" stroke="#22d3ee" strokeWidth={2} dot={false} name="Downloads" />
                        <Line type="monotone" dataKey="ratingCount" stroke="#d946ef" strokeWidth={2} dot={false} name="Ratings" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Ranking History */}
                {appHistory.rankings.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 mb-2">🏆 Ranking History</h3>
                    <div className="space-y-1">
                      {appHistory.rankings.map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 px-2 bg-dark-700 rounded text-xs">
                          <span className="text-slate-300">Rank #{r.rank}</span>
                          <span>{rankDeltaDisplay(r.rank_delta)}</span>
                          <span className="text-slate-500">{r.rank_type.replace('_', ' ')}</span>
                          <span className="text-slate-600">{new Date(r.recorded_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {appHistory.app.url && (
                  <div className="mt-4 text-center">
                    <a
                      href={appHistory.app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neon-cyan hover:underline"
                    >
                      View in {storeLabel(appHistory.app.store)} →
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">App not found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
