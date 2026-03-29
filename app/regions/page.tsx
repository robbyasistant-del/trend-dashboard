'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

import type { MapDataPoint } from '@/components/regions/RegionMap';

const RegionMap = dynamic(() => import('@/components/regions/RegionMap'), { ssr: false, loading: () => <div className="h-[400px] bg-dark-800 rounded-xl animate-pulse flex items-center justify-center text-slate-600">Loading map…</div> });

// ── Types ──────────────────────────────────────────────

interface RegionStats {
  totalRegions: number;
  totalTrends: number;
  avgViralScore: number;
  topRegion: { code: string; name: string; avg_viral_score: number } | null;
  topByApps: { code: string; name: string; app_count: number } | null;
  topByForum: { code: string; name: string; forum_activity: number } | null;
}

interface RegionMetric {
  id: number; code: string; name: string;
  trend_count: number; avg_viral_score: number; app_count: number;
  forum_activity: number; word_velocity: number; total_mentions: number;
  top_category: string; period: string;
}

interface TrendItem {
  id: number; title: string; viral_score: number; category: string;
  region: string; velocity: number; lifecycle: string;
}

interface RegionDetail {
  metrics: RegionMetric | null;
  snapshots: Array<{ region_code: string; trend_count: number; avg_viral_score: number; app_count: number; forum_activity: number; word_velocity: number; recorded_at: string }>;
  trends: TrendItem[];
  words: Array<{ id: number; word: string; score: number; frequency: number; growth: number }>;
  forumPosts: Array<{ id: number; title: string; score: number; source: string; comments: number }>;
  apps: Array<{ id: number; name: string; store: string; rating: number; downloads: number; category: string }>;
}

type MetricKey = 'avg_viral_score' | 'trend_count' | 'app_count' | 'forum_activity' | 'word_velocity';

const METRICS: { key: MetricKey; label: string; icon: string }[] = [
  { key: 'avg_viral_score', label: 'Viral Score', icon: '🔥' },
  { key: 'trend_count', label: 'Trend Count', icon: '📈' },
  { key: 'app_count', label: 'App Count', icon: '📱' },
  { key: 'forum_activity', label: 'Forum Activity', icon: '💬' },
  { key: 'word_velocity', label: 'Word Velocity', icon: '⚡' },
];

// ── Helpers ────────────────────────────────────────────

function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  return code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

function metricValue(r: RegionMetric | MapDataPoint, key: MetricKey): number {
  return (r[key] as number) || 0;
}

function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon: string; sub?: string }) {
  return (
    <div className="bg-dark-800 border border-dark-500 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────

export default function RegionsPage() {
  const [stats, setStats] = useState<RegionStats | null>(null);
  const [mapData, setMapData] = useState<MapDataPoint[]>([]);
  const [regions, setRegions] = useState<RegionMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('avg_viral_score');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<{ code: string; name: string } | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<RegionMetric[]>([]);
  const [drillDown, setDrillDown] = useState<RegionDetail | null>(null);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<string>('daily');

  // Fetch stats
  useEffect(() => {
    fetch('/api/regions/stats').then(r => r.json()).then(setStats).catch(console.error);
  }, []);

  // Fetch map data when metric or period changes
  useEffect(() => {
    fetch(`/api/regions/map-data?metric=${selectedMetric}&period=${period}`)
      .then(r => r.json()).then(setMapData).catch(console.error);
  }, [selectedMetric, period]);

  // Fetch leaderboard
  useEffect(() => {
    const params = new URLSearchParams({ period });
    if (searchQuery) params.set('search', searchQuery);
    fetch(`/api/regions?${params}`).then(r => r.json()).then(setRegions).catch(console.error);
  }, [period, searchQuery]);

  // Fetch comparison data
  useEffect(() => {
    if (compareList.length >= 2) {
      fetch(`/api/regions/compare?codes=${compareList.join(',')}`).then(r => r.json()).then(setCompareData).catch(console.error);
    } else {
      setCompareData([]);
    }
  }, [compareList]);

  // Region click handler
  const handleRegionClick = useCallback((code: string, _name: string) => {
    setSelectedRegion(prev => prev === code ? null : code);
    setDrillDownLoading(true);
    fetch(`/api/regions/${code}`)
      .then(r => r.json())
      .then((data: RegionDetail) => { setDrillDown(data); setDrillDownLoading(false); })
      .catch(() => setDrillDownLoading(false));
  }, []);

  const handleRegionHover = useCallback((code: string | null, name: string | null) => {
    setHoveredRegion(code && name ? { code, name } : null);
  }, []);

  // Toggle compare
  const toggleCompare = (code: string) => {
    setCompareList(prev => {
      if (prev.includes(code)) return prev.filter(c => c !== code);
      if (prev.length >= 5) return prev;
      return [...prev, code];
    });
  };

  // Sorted leaderboard
  const sortedRegions = [...regions].sort((a, b) => metricValue(b, selectedMetric) - metricValue(a, selectedMetric));
  const maxLeaderboardVal = sortedRegions.length > 0 ? metricValue(sortedRegions[0], selectedMetric) : 1;

  // Radar data for comparison
  const radarData = compareData.length > 0 ? [
    { metric: 'Viral Score', ...Object.fromEntries(compareData.map(r => [r.code, r.avg_viral_score])) },
    { metric: 'Trends', ...Object.fromEntries(compareData.map(r => [r.code, r.trend_count])) },
    { metric: 'Apps', ...Object.fromEntries(compareData.map(r => [r.code, r.app_count])) },
    { metric: 'Forums', ...Object.fromEntries(compareData.map(r => [r.code, r.forum_activity])) },
    { metric: 'Word Vel.', ...Object.fromEntries(compareData.map(r => [r.code, r.word_velocity * 10])) },
  ] : [];

  const RADAR_COLORS = ['#22d3ee', '#06ffa5', '#fbbf24', '#f472b6', '#a78bfa'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            🗺️ Region Analysis
            {hoveredRegion && (
              <span className="text-base font-normal text-slate-400">
                {flagEmoji(hoveredRegion.code)} {hoveredRegion.name}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Interactive geo dashboard — viral trends by country</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period switcher */}
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-slate-500 hover:text-white hover:bg-dark-700'}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="🌍" label="Regions Tracked" value={stats.totalRegions} />
          <StatCard icon="🔥" label="Avg Viral Score" value={stats.avgViralScore} />
          <StatCard icon="🏆" label="Top Region" value={stats.topRegion ? `${flagEmoji(stats.topRegion.code)} ${stats.topRegion.name}` : '—'} sub={stats.topRegion ? `Score: ${stats.topRegion.avg_viral_score}` : undefined} />
          <StatCard icon="📊" label="Total Trends" value={stats.totalTrends.toLocaleString()} />
        </div>
      )}

      {/* Metric Selector */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map(m => (
          <button key={m.key} onClick={() => setSelectedMetric(m.key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedMetric === m.key ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-dark-800 text-slate-400 border border-dark-500 hover:text-white hover:border-dark-400'}`}>
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Map + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-dark-800 border border-dark-500 rounded-xl p-4 relative">
          {/* Desktop: map, Mobile: fallback list */}
          <div className="hidden md:block">
            <RegionMap
              data={mapData}
              selectedRegion={selectedRegion}
              onRegionClick={handleRegionClick}
              onRegionHover={handleRegionHover}
            />
          </div>
          {/* Mobile fallback: region list */}
          <div className="md:hidden space-y-2 max-h-[400px] overflow-y-auto">
            <p className="text-xs text-slate-500 mb-2">Tap a region to explore:</p>
            {sortedRegions.slice(0, 20).map(r => (
              <button key={r.code} onClick={() => handleRegionClick(r.code, r.name)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${selectedRegion === r.code ? 'bg-neon-cyan/10 border border-neon-cyan/30' : 'bg-dark-700 hover:bg-dark-600'}`}>
                <span className="text-lg">{flagEmoji(r.code)}</span>
                <span className="text-sm text-white flex-1">{r.name}</span>
                <span className="text-xs text-neon-cyan font-mono">{metricValue(r, selectedMetric).toLocaleString()}</span>
              </button>
            ))}
          </div>
          {/* Heat map legend */}
          <div className="flex items-center gap-2 mt-3 justify-center">
            <span className="text-[10px] text-slate-500">Low</span>
            <div className="flex h-2 rounded-full overflow-hidden w-32">
              <div className="flex-1 bg-[#0f3460]" />
              <div className="flex-1 bg-[#164e8a]" />
              <div className="flex-1 bg-[#0ea5e9]" />
              <div className="flex-1 bg-[#22d3ee]" />
              <div className="flex-1 bg-[#06ffa5]" />
            </div>
            <span className="text-[10px] text-slate-500">High</span>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-dark-800 border border-dark-500 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">🏆 Leaderboard</h2>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="bg-dark-700 text-xs text-white px-2 py-1 rounded border border-dark-500 w-24 focus:outline-none focus:border-neon-cyan/50"
            />
          </div>
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {sortedRegions.map((r, i) => {
              const val = metricValue(r, selectedMetric);
              const barWidth = maxLeaderboardVal > 0 ? (val / maxLeaderboardVal) * 100 : 0;
              const isCompared = compareList.includes(r.code);
              return (
                <div key={r.code} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${selectedRegion === r.code ? 'bg-neon-cyan/10' : 'hover:bg-dark-700'}`} onClick={() => handleRegionClick(r.code, r.name)}>
                  <span className="text-xs text-slate-600 w-5 text-right font-mono">{i + 1}</span>
                  <span className="text-base">{flagEmoji(r.code)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{r.name}</div>
                    <div className="h-1.5 bg-dark-600 rounded-full mt-0.5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-green rounded-full transition-all duration-500" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-neon-cyan w-12 text-right">{typeof val === 'number' && val % 1 !== 0 ? val.toFixed(1) : val}</span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleCompare(r.code); }}
                    className={`text-xs px-1.5 py-0.5 rounded transition-all ${isCompared ? 'bg-neon-purple/20 text-neon-purple' : 'text-slate-600 hover:text-slate-400'}`}
                    title={isCompared ? 'Remove from compare' : 'Add to compare'}
                  >
                    {isCompared ? '✓' : '+'}
                  </button>
                </div>
              );
            })}
            {sortedRegions.length === 0 && (
              <div className="text-center py-8 text-slate-600 text-sm">No region data yet. Run seed or rebuild.</div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Panel */}
      {compareData.length >= 2 && (
        <div className="bg-dark-800 border border-dark-500 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">📊 Region Comparison</h2>
            <button onClick={() => setCompareList([])} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {compareData.map(r => (
              <span key={r.code} className="px-2 py-1 bg-dark-700 rounded-lg text-xs text-white flex items-center gap-1">
                {flagEmoji(r.code)} {r.name}
                <button onClick={() => toggleCompare(r.code)} className="text-slate-500 hover:text-red-400 ml-1">×</button>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar chart comparison */}
            <div>
              <h3 className="text-xs text-slate-500 mb-2 uppercase tracking-wider">By {METRICS.find(m => m.key === selectedMetric)?.label}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={compareData.map(r => ({ name: r.code, value: metricValue(r, selectedMetric), fullName: r.name }))}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} labelFormatter={(v) => { const r = compareData.find(c => c.code === v); return r ? `${flagEmoji(r.code)} ${r.name}` : v; }} />
                  <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Radar chart */}
            <div>
              <h3 className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Multi-metric Radar</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  {compareData.map((r, i) => (
                    <Radar key={r.code} name={`${flagEmoji(r.code)} ${r.code}`} dataKey={r.code} stroke={RADAR_COLORS[i % RADAR_COLORS.length]} fill={RADAR_COLORS[i % RADAR_COLORS.length]} fillOpacity={0.15} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Drill-Down Panel */}
      {selectedRegion && (
        <div className="bg-dark-800 border border-dark-500 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              {flagEmoji(selectedRegion)} {drillDown?.metrics?.name || selectedRegion} — Deep Dive
            </h2>
            <button onClick={() => { setSelectedRegion(null); setDrillDown(null); }} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Close ×</button>
          </div>

          {drillDownLoading ? (
            <div className="text-center py-8 text-slate-500 animate-pulse">Loading region data…</div>
          ) : drillDown ? (
            <div className="space-y-6">
              {/* Region metrics summary */}
              {drillDown.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-dark-700 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Viral Score</div>
                    <div className="text-lg font-bold text-neon-cyan">{drillDown.metrics.avg_viral_score}</div>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Trends</div>
                    <div className="text-lg font-bold text-white">{drillDown.metrics.trend_count}</div>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Apps</div>
                    <div className="text-lg font-bold text-white">{drillDown.metrics.app_count}</div>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Forum Posts</div>
                    <div className="text-lg font-bold text-white">{drillDown.metrics.forum_activity}</div>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-500">Word Velocity</div>
                    <div className="text-lg font-bold text-neon-green">{drillDown.metrics.word_velocity}</div>
                  </div>
                </div>
              )}

              {/* Tabs: Trends, Words, Apps, Forums */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Trends */}
                <div>
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">🔥 Top Trends</h3>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {drillDown.trends.length > 0 ? drillDown.trends.slice(0, 10).map((t) => (
                      <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 bg-dark-700 rounded-lg">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${t.viral_score >= 70 ? 'bg-neon-cyan/20 text-neon-cyan' : t.viral_score >= 40 ? 'bg-neon-amber/20 text-neon-amber' : 'bg-dark-600 text-slate-400'}`}>{t.viral_score}</span>
                        <span className="text-xs text-white truncate flex-1">{t.title}</span>
                        <span className="text-[10px] text-slate-600">{t.category}</span>
                      </div>
                    )) : <div className="text-xs text-slate-600 py-4 text-center">No trends linked to this region</div>}
                  </div>
                </div>

                {/* Top Words */}
                <div>
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">💬 Top Words</h3>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {drillDown.words.length > 0 ? drillDown.words.slice(0, 10).map((w) => (
                      <div key={w.id} className="flex items-center gap-2 px-2 py-1.5 bg-dark-700 rounded-lg">
                        <span className="text-xs text-neon-green font-mono">{w.score.toFixed(0)}</span>
                        <span className="text-xs text-white flex-1">{w.word}</span>
                        <span className="text-[10px] text-slate-600">×{w.frequency}</span>
                      </div>
                    )) : <div className="text-xs text-slate-600 py-4 text-center">No words for this region</div>}
                  </div>
                </div>

                {/* Forum Posts */}
                <div>
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">🎮 Forum Posts</h3>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {drillDown.forumPosts.length > 0 ? drillDown.forumPosts.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 bg-dark-700 rounded-lg">
                        <span className="text-xs text-neon-amber font-mono">{p.score}</span>
                        <span className="text-xs text-white truncate flex-1">{p.title}</span>
                        <span className="text-[10px] text-slate-600">{p.source}</span>
                      </div>
                    )) : <div className="text-xs text-slate-600 py-4 text-center">No forum posts for this region</div>}
                  </div>
                </div>

                {/* Apps */}
                <div>
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">📱 Apps</h3>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {drillDown.apps.length > 0 ? drillDown.apps.slice(0, 10).map((a) => (
                      <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 bg-dark-700 rounded-lg">
                        <span className="text-xs text-neon-purple font-mono">★{a.rating.toFixed(1)}</span>
                        <span className="text-xs text-white truncate flex-1">{a.name}</span>
                        <span className="text-[10px] text-slate-600">{a.store}</span>
                      </div>
                    )) : <div className="text-xs text-slate-600 py-4 text-center">No apps for this region</div>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600">No data available for this region</div>
          )}
        </div>
      )}
    </div>
  );
}
