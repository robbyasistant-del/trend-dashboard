"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────

interface AppEntry {
  id: number; external_id: string; store: string; name: string; developer: string | null;
  description: string | null; icon_url: string | null; category: string; subcategory: string | null;
  price: number; is_free: number; rating: number; rating_count: number; downloads: number;
  size_mb: number; url: string | null; tags: string; data_json: string;
  first_seen: string; last_seen: string; created_at: string; updated_at: string;
}

interface RankingEntry extends AppEntry {
  app_id: number; rank: number; previous_rank: number | null; rank_delta: number;
  rank_type: string; recorded_at: string; app_url: string | null;
}

interface MoverEntry {
  app_id: number; rank: number; previous_rank: number | null; rank_delta: number;
  rank_type: string; store: string; category: string; recorded_at: string;
  name: string; developer: string | null; icon_url: string | null; rating: number;
  downloads: number; is_free: number;
}

interface AppStats {
  total: number; newThisWeek: number; avgRating: number;
  topClimber: { name: string; delta: number } | null;
  storeBreakdown: { store: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
}

interface AppHistoryData {
  app: AppEntry;
  rankings: { rank: number; rank_delta: number; rank_type: string; recorded_at: string }[];
  snapshots: { rating: number; rating_count: number; downloads: number; revenue_estimate: number; recorded_at: string }[];
}

interface TrendingKeyword {
  word: string;
  frequency: number;
  score: number;
  data_json: string;
}

interface StoreComparisonEntry {
  id: number;
  store: string;
  name: string;
  rating: number;
  rating_count: number;
  downloads: number;
  price: number;
  is_free: number;
  latest_rank: number | null;
  latest_rank_delta: number | null;
}

// ── Helpers ────────────────────────────────────────────────────

const STORE_LABELS: Record<string, string> = { google_play: "Google Play", app_store: "App Store", amazon: "Amazon" };
const STORE_ICONS: Record<string, string> = { google_play: "🤖", app_store: "🍎", amazon: "📦" };
const STORE_COLORS: Record<string, string> = { google_play: "#34A853", app_store: "#007AFF", amazon: "#FF9900" };

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function starsDisplay(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 ? "½" : "";
  return "★".repeat(full) + half + "☆".repeat(5 - full - (half ? 1 : 0));
}

function deltaArrow(delta: number): React.ReactNode {
  if (delta > 0) return <span className="text-green-400 font-bold">▲ {delta}</span>;
  if (delta < 0) return <span className="text-red-400 font-bold">▼ {Math.abs(delta)}</span>;
  return <span className="text-slate-500">—</span>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 30) return `${Math.floor(d / 30)}mo ago`;
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  return "Just now";
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} style={{ color: e.color }}>{e.name}: {e.value}</p>
      ))}
    </div>
  );
};

// ── Page Component ─────────────────────────────────────────────

export default function AppsMarketPage() {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [movers, setMovers] = useState<MoverEntry[]>([]);
  const [newApps, setNewApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [storeTab, setStoreTab] = useState("");
  const [category, setCategory] = useState("");
  const [freeFilter, setFreeFilter] = useState<"" | "free" | "paid">("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("downloads");
  const [showCharts, setShowCharts] = useState(true);

  // Modal
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [appHistory, setAppHistory] = useState<AppHistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [storeComparison, setStoreComparison] = useState<StoreComparisonEntry[]>([]);

  // Trending keywords
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);

  // Derive categories from rankings
  const categories = Array.from(new Set(rankings.map(r => r.category).filter(Boolean))).sort();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (storeTab) params.set("store", storeTab);
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      if (freeFilter === "free") params.set("is_free", "true");
      if (freeFilter === "paid") params.set("is_free", "false");
      if (sort) params.set("sort", sort);
      params.set("limit", "100");

      const [statsRes, rankingsRes, moversRes, newRes, kwRes] = await Promise.all([
        fetch("/api/apps-market/stats"),
        fetch(`/api/apps-market/rankings?${params.toString()}`),
        fetch(`/api/apps-market/movers?${storeTab ? `store=${storeTab}&` : ""}limit=15`),
        fetch(`/api/apps-market/new?${storeTab ? `store=${storeTab}&` : ""}limit=12`),
        fetch("/api/apps-market/keywords?limit=15"),
      ]);

      const [statsData, rankingsData, moversData, newData, kwData] = await Promise.all([
        statsRes.json(), rankingsRes.json(), moversRes.json(), newRes.json(), kwRes.json(),
      ]);

      setStats(statsData);
      setRankings(Array.isArray(rankingsData) ? rankingsData : []);
      setMovers(Array.isArray(moversData) ? moversData : []);
      setNewApps(Array.isArray(newData) ? newData : []);
      setTrendingKeywords(Array.isArray(kwData) ? kwData : []);
    } catch (err) {
      console.error("Failed to fetch apps data:", err);
    } finally {
      setLoading(false);
    }
  }, [storeTab, category, freeFilter, search, sort]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // App detail modal
  const openAppDetail = async (appId: number) => {
    setSelectedAppId(appId);
    setHistoryLoading(true);
    setStoreComparison([]);
    try {
      const res = await fetch(`/api/apps-market/${appId}/history`);
      const data = await res.json();
      setAppHistory(data);
      // Fetch store comparison for this app name
      if (data?.app?.name) {
        try {
          const compRes = await fetch(`/api/apps-market/keywords?action=comparison&name=${encodeURIComponent(data.app.name)}`);
          const compData = await compRes.json();
          setStoreComparison(Array.isArray(compData) ? compData : []);
        } catch { /* non-critical */ }
      }
    } catch { setAppHistory(null); }
    finally { setHistoryLoading(false); }
  };

  const closeModal = () => { setSelectedAppId(null); setAppHistory(null); setStoreComparison([]); };

  // Prepare movers chart data
  const moversChartData = movers.slice(0, 10).map(m => ({
    name: m.name.length > 20 ? m.name.substring(0, 20) + "…" : m.name,
    delta: m.rank_delta,
    store: m.store,
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">📱 Apps Market</h1>
          <p className="text-sm text-slate-500 mt-1">Cross-store rankings and growth tracking for casual games</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/correlations" className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all">🔗 Cross-Platform</a>
          <a href="/competitors" className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-neon-green hover:border-neon-green/30 transition-all">🏢 Competitors</a>
          <a href="/api/export?type=csv&source=apps" className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-white hover:border-neon-cyan transition-all">📥 Export</a>
          <button onClick={() => setShowCharts(!showCharts)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showCharts ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "bg-dark-600 text-slate-400 border border-dark-500"}`}>
            {showCharts ? "📊 Charts On" : "📊 Charts Off"}
          </button>
          <div className="text-xs text-slate-600 bg-dark-700 px-3 py-1.5 rounded-lg border border-dark-500">
            {stats?.total || 0} apps tracked
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Apps", value: stats?.total ?? "—", icon: "📱", color: "from-purple-500/20 to-blue-500/10", border: "border-purple-500/20", textColor: "text-purple-400" },
          { label: "New This Week", value: stats?.newThisWeek ?? "—", icon: "🆕", color: "from-cyan-500/20 to-blue-500/10", border: "border-cyan-500/20", textColor: "text-cyan-400" },
          { label: "Avg Rating", value: stats ? `${stats.avgRating} ★` : "—", icon: "⭐", color: "from-yellow-500/20 to-orange-500/10", border: "border-yellow-500/20", textColor: "text-yellow-400" },
          { label: "Top Climber", value: stats?.topClimber ? `▲${stats.topClimber.delta}` : "—", icon: "🚀", color: "from-green-500/20 to-emerald-500/10", border: "border-green-500/20", textColor: "text-green-400",
            sub: stats?.topClimber?.name },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-xl p-5 card-hover`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${card.textColor}`}>{card.value}</div>
            {card.sub && <div className="text-[10px] text-slate-500 mt-1 truncate">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Trending Keywords from App Stores */}
      {trendingKeywords.length > 0 && (
        <div className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-6">
          <h3 className="text-xs font-semibold text-slate-400 mb-3">🔑 Trending App Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {trendingKeywords.map(kw => {
              let parsed: { stores?: string[] } = {};
              try { parsed = JSON.parse(kw.data_json); } catch { /* ignore */ }
              const stores = parsed.stores || [];
              return (
                <span
                  key={kw.word}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 rounded-full text-xs text-neon-cyan hover:bg-neon-cyan/20 transition-colors cursor-default"
                >
                  <span className="font-medium">{kw.word}</span>
                  <span className="text-[9px] bg-neon-cyan/20 px-1.5 py-0.5 rounded-full text-neon-cyan/80">
                    {kw.frequency}x
                  </span>
                  {stores.length > 1 && (
                    <span className="text-[8px] bg-neon-amber/20 text-neon-amber px-1 py-0.5 rounded-full ml-0.5">
                      🏪 {stores.length} stores
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Store Tabs */}
      <div className="flex gap-2 mb-4">
        {[{ key: "", label: "All Stores", icon: "🌐" },
          { key: "google_play", label: "Google Play", icon: "🤖" },
          { key: "app_store", label: "App Store", icon: "🍎" },
          { key: "amazon", label: "Amazon", icon: "📦" }
        ].map(tab => (
          <button key={tab.key} onClick={() => setStoreTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              storeTab === tab.key
                ? "bg-dark-600 text-white border border-neon-cyan/30 glow-cyan"
                : "bg-dark-700 text-slate-400 border border-dark-500 hover:text-slate-200"
            }`}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-dark-700 border border-dark-500 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input type="text" placeholder="Search apps or developers..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-800 border border-dark-500 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 transition-all" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-neon-cyan/50 cursor-pointer">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select value={freeFilter} onChange={e => setFreeFilter(e.target.value as any)}
            className="bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-neon-cyan/50 cursor-pointer">
            <option value="">Free &amp; Paid</option>
            <option value="free">Free Only</option>
            <option value="paid">Paid Only</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-neon-cyan/50 cursor-pointer">
            <option value="downloads">Sort: Downloads</option>
            <option value="rating">Sort: Rating</option>
            <option value="newest">Sort: Newest</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {/* Charts Section */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Top Movers */}
          <div className="bg-dark-700 border border-dark-500 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">🚀 Top Movers (Rank Changes)</h3>
            {moversChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={moversChartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e45" />
                  <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} width={130} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="delta" name="Rank Δ" radius={[0, 4, 4, 0]}>
                    {moversChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.delta >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-slate-500 text-center py-8">No mover data available</p>}
          </div>

          {/* Store & Category Breakdown */}
          <div className="bg-dark-700 border border-dark-500 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">📊 Store &amp; Category Breakdown</h3>
            {stats?.storeBreakdown && stats.storeBreakdown.length > 0 ? (
              <div className="space-y-6">
                {/* Store bars */}
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">By Store</p>
                  <div className="space-y-2">
                    {stats.storeBreakdown.map(s => {
                      const pct = stats.total > 0 ? (s.count / stats.total) * 100 : 0;
                      return (
                        <div key={s.store} className="flex items-center gap-2">
                          <span className="text-xs w-24 text-slate-300 flex items-center gap-1">
                            {STORE_ICONS[s.store] || "🌐"} {STORE_LABELS[s.store] || s.store}
                          </span>
                          <div className="flex-1 h-4 bg-dark-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: STORE_COLORS[s.store] || "#8b5cf6" }} />
                          </div>
                          <span className="text-[10px] text-slate-400 w-12 text-right">{s.count} ({Math.round(pct)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Category bars */}
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">By Category</p>
                  <div className="space-y-1.5">
                    {stats.categoryBreakdown.slice(0, 6).map((c, i) => {
                      const pct = stats.total > 0 ? (c.count / stats.total) * 100 : 0;
                      const colors = ["#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#f97316"];
                      return (
                        <div key={c.category} className="flex items-center gap-2">
                          <span className="text-[11px] w-20 text-slate-400 truncate capitalize">{c.category}</span>
                          <div className="flex-1 h-3 bg-dark-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }} />
                          </div>
                          <span className="text-[10px] text-slate-500 w-8 text-right">{c.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : <p className="text-xs text-slate-500 text-center py-8">No data available</p>}
          </div>
        </div>
      )}

      {/* Rankings Table */}
      <div className="bg-dark-700 border border-dark-500 rounded-xl mb-6">
        <div className="px-5 py-4 border-b border-dark-500 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">🏆 Rankings</h3>
          <span className="text-[10px] text-slate-500">{rankings.length} results</span>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-dark-600 rounded-lg animate-pulse" />)}</div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-sm text-slate-400">No rankings found</p>
            <p className="text-[10px] text-slate-600 mt-1">Try adjusting filters or run seed-apps</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-dark-500">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3 w-8">Δ</th>
                  <th className="px-4 py-3">App</th>
                  <th className="px-4 py-3 w-16">Store</th>
                  <th className="px-4 py-3 w-20">Category</th>
                  <th className="px-4 py-3 w-16">Rating</th>
                  <th className="px-4 py-3 w-20 text-right">Downloads</th>
                  <th className="px-4 py-3 w-16 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, idx) => (
                  <tr key={`${r.app_id}-${r.store}-${idx}`}
                    className="border-b border-dark-600/50 hover:bg-dark-600/50 cursor-pointer transition-colors"
                    onClick={() => openAppDetail(r.app_id)}>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{r.rank}</td>
                    <td className="px-4 py-3 text-xs">{deltaArrow(r.rank_delta)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-dark-500 flex items-center justify-center text-sm flex-shrink-0">
                          {STORE_ICONS[r.store] || "📱"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{r.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{r.developer || "Unknown"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${STORE_COLORS[r.store]}20`, color: STORE_COLORS[r.store] }}>
                        {STORE_LABELS[r.store] || r.store}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 capitalize">{r.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-[10px]">★</span>
                        <span className="text-xs text-slate-300">{r.rating?.toFixed(1)}</span>
                        <span className="text-[9px] text-slate-600">({formatNum(r.rating_count || 0)})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 text-right font-mono">{formatNum(r.downloads || 0)}</td>
                    <td className="px-4 py-3 text-xs text-right">
                      {r.is_free ? <span className="text-green-400">Free</span> : <span className="text-yellow-400">${r.price?.toFixed(2)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Apps Gallery */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">🆕 Recently Detected Apps</h3>
        {newApps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {newApps.map(app => (
              <div key={`${app.external_id}-${app.store}`}
                className="bg-dark-700 border border-dark-500 rounded-xl p-4 card-hover cursor-pointer"
                onClick={() => openAppDetail(app.id)}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-dark-500 flex items-center justify-center text-lg flex-shrink-0">
                    {STORE_ICONS[app.store] || "📱"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{app.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{app.developer || "Unknown"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-dark-600 capitalize">{app.category}</span>
                  <span style={{ color: STORE_COLORS[app.store] }}>{STORE_LABELS[app.store]}</span>
                  <span className="text-yellow-400">★ {app.rating?.toFixed(1)}</span>
                  <span className="ml-auto text-slate-600">{timeAgo(app.first_seen)}</span>
                </div>
                {app.is_free ? (
                  <span className="text-[9px] text-green-400 mt-2 inline-block">Free</span>
                ) : (
                  <span className="text-[9px] text-yellow-400 mt-2 inline-block">${app.price?.toFixed(2)}</span>
                )}
              </div>
            ))}
          </div>
        ) : !loading && (
          <div className="bg-dark-700 border border-dark-500 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-400">No new apps detected yet</p>
          </div>
        )}
      </div>

      {/* App Detail Modal */}
      {selectedAppId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-dark-800 border border-dark-500 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            {historyLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin text-3xl mb-3">⏳</div>
                <p className="text-sm text-slate-400">Loading app details...</p>
              </div>
            ) : appHistory?.app ? (
              <>
                {/* Modal Header */}
                <div className="p-6 border-b border-dark-500 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-dark-600 flex items-center justify-center text-2xl flex-shrink-0">
                    {STORE_ICONS[appHistory.app.store] || "📱"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white">{appHistory.app.name}</h2>
                    <p className="text-xs text-slate-400">{appHistory.app.developer} · {STORE_LABELS[appHistory.app.store]}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="text-yellow-400">{starsDisplay(appHistory.app.rating)} {appHistory.app.rating?.toFixed(1)}</span>
                      <span>({formatNum(appHistory.app.rating_count)} ratings)</span>
                      <span>📥 {formatNum(appHistory.app.downloads)}</span>
                      <span className="capitalize bg-dark-600 px-1.5 py-0.5 rounded">{appHistory.app.category}</span>
                    </div>
                  </div>
                  <button onClick={closeModal} className="text-slate-500 hover:text-white text-lg transition-colors">✕</button>
                </div>

                {/* Description */}
                {appHistory.app.description && (
                  <div className="px-6 py-4 border-b border-dark-600/50">
                    <p className="text-xs text-slate-400 leading-relaxed">{appHistory.app.description}</p>
                  </div>
                )}

                {/* Growth Charts */}
                {appHistory.snapshots.length > 1 && (
                  <div className="p-6 border-b border-dark-600/50">
                    <h3 className="text-xs font-semibold text-slate-300 mb-3">📈 Growth History</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={appHistory.snapshots.map(s => ({
                        date: s.recorded_at.slice(5, 10),
                        downloads: s.downloads,
                        ratings: s.rating_count,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e45" />
                        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} />
                        <YAxis yAxisId="l" tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={formatNum} />
                        <YAxis yAxisId="r" orientation="right" tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={formatNum} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Line yAxisId="l" type="monotone" dataKey="downloads" name="Downloads" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                        <Line yAxisId="r" type="monotone" dataKey="ratings" name="Rating Count" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Ranking History */}
                {appHistory.rankings.length > 0 && (
                  <div className="p-6">
                    <h3 className="text-xs font-semibold text-slate-300 mb-3">🏆 Ranking History</h3>
                    <div className="space-y-2">
                      {appHistory.rankings.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs bg-dark-700 rounded-lg px-3 py-2">
                          <span className="text-slate-500 text-[10px] w-16">{r.recorded_at.slice(0, 10)}</span>
                          <span className="font-mono text-slate-300">#{r.rank}</span>
                          <span>{deltaArrow(r.rank_delta)}</span>
                          <span className="text-[10px] text-slate-500 capitalize">{r.rank_type.replace("_", " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* App URL */}
                {appHistory.app.url && (
                  <div className="px-6 pb-6">
                    <a href={appHistory.app.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-neon-cyan hover:underline">
                      View in {STORE_LABELS[appHistory.app.store]} →
                    </a>
                  </div>
                )}

                {/* Store Comparison */}
                {storeComparison.length > 1 && (
                  <div className="px-6 pb-6 border-t border-dark-600/50 pt-4">
                    <h3 className="text-xs font-semibold text-slate-300 mb-3">🏪 Cross-Store Comparison</h3>
                    <div className="grid gap-2">
                      {storeComparison.map((sc) => (
                        <div key={sc.id} className="flex items-center gap-3 bg-dark-700 rounded-lg px-3 py-2.5 text-xs">
                          <span className="text-base">{STORE_ICONS[sc.store] || "📱"}</span>
                          <span className="text-slate-300 font-medium w-20">{STORE_LABELS[sc.store] || sc.store}</span>
                          <span className="text-yellow-400">★ {sc.rating?.toFixed(1)}</span>
                          <span className="text-slate-500">({formatNum(sc.rating_count || 0)})</span>
                          <span className="text-slate-300 ml-auto">📥 {formatNum(sc.downloads || 0)}</span>
                          {sc.latest_rank && (
                            <span className="text-slate-400 font-mono">#{sc.latest_rank}</span>
                          )}
                          {sc.latest_rank_delta !== null && sc.latest_rank_delta !== 0 && (
                            <span>{deltaArrow(sc.latest_rank_delta)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-400">App not found</p>
                <button onClick={closeModal} className="mt-3 text-xs text-neon-cyan">Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
