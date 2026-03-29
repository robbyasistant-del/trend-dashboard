'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Legend,
} from 'recharts';
import dynamic from 'next/dynamic';

const RegionMap = dynamic(() => import('../../components/RegionMap'), {
  ssr: false,
  loading: () => <div className="card animate-pulse" style={{ height: 480 }} />,
});

// ── Types ──────────────────────────────────────────────────────

interface RegionMetric {
  id: number;
  code: string;
  name: string;
  trend_count: number;
  avg_viral_score: number;
  app_count: number;
  forum_activity: number;
  word_velocity: number;
  total_mentions: number;
  top_category: string;
  period: string;
}

interface MapDataPoint {
  code: string;
  name: string;
  value: number;
  normalized: number;
  trend_count: number;
  avg_viral_score: number;
  app_count: number;
  forum_activity: number;
  word_velocity: number;
  total_mentions: number;
}

interface RegionStats {
  totalRegions: number;
  totalTrends: number;
  avgViralScore: number;
  topRegion: { code: string; name: string; avg_viral_score: number } | null;
  topByApps: { code: string; name: string; app_count: number } | null;
  topByForum: { code: string; name: string; forum_activity: number } | null;
}

interface RegionDetail {
  metrics: RegionMetric | null;
  snapshots: Array<Record<string, unknown>>;
  trends: Array<{ id: number; title: string; viral_score: number; category: string; relevance_score?: number }>;
  words: Array<Record<string, unknown>>;
  forumPosts: Array<Record<string, unknown>>;
  apps: Array<Record<string, unknown>>;
}

// ── Constants ──────────────────────────────────────────────────

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', ES: '🇪🇸', DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵', KR: '🇰🇷',
  BR: '🇧🇷', MX: '🇲🇽', IN: '🇮🇳', AU: '🇦🇺', CA: '🇨🇦', IT: '🇮🇹', SE: '🇸🇪',
  NL: '🇳🇱', CN: '🇨🇳', RU: '🇷🇺', TR: '🇹🇷', ID: '🇮🇩', TH: '🇹🇭', VN: '🇻🇳',
  PH: '🇵🇭', PL: '🇵🇱', SG: '🇸🇬', SA: '🇸🇦', AE: '🇦🇪', AR: '🇦🇷', CO: '🇨🇴',
  ZA: '🇿🇦', NG: '🇳🇬', EG: '🇪🇬', MY: '🇲🇾', TW: '🇹🇼', FI: '🇫🇮', NO: '🇳🇴',
  DK: '🇩🇰', IL: '🇮🇱', PT: '🇵🇹', AT: '🇦🇹', CH: '🇨🇭', IE: '🇮🇪', NZ: '🇳🇿',
  CZ: '🇨🇿', RO: '🇷🇴', UA: '🇺🇦', PK: '🇵🇰', CL: '🇨🇱', PE: '🇵🇪', HK: '🇭🇰',
  BE: '🇧🇪',
};

// ISO 3166-1 alpha-2 to numeric code mapping for world-atlas TopoJSON
const ALPHA2_TO_NUMERIC: Record<string, string> = {
  AF:'004',AL:'008',DZ:'012',AS:'016',AD:'020',AO:'024',AG:'028',AR:'032',AM:'051',AU:'036',
  AT:'040',AZ:'031',BS:'044',BH:'048',BD:'050',BB:'052',BY:'112',BE:'056',BZ:'084',BJ:'204',
  BT:'064',BO:'068',BA:'070',BW:'072',BR:'076',BN:'096',BG:'100',BF:'854',BI:'108',KH:'116',
  CM:'120',CA:'124',CV:'132',CF:'140',TD:'148',CL:'152',CN:'156',CO:'170',KM:'174',CD:'180',
  CG:'178',CR:'188',CI:'384',HR:'191',CU:'192',CY:'196',CZ:'203',DK:'208',DJ:'262',DM:'212',
  DO:'214',EC:'218',EG:'818',SV:'222',GQ:'226',ER:'232',EE:'233',ET:'231',FJ:'242',FI:'246',
  FR:'250',GA:'266',GM:'270',GE:'268',DE:'276',GH:'288',GR:'300',GD:'308',GT:'320',GN:'324',
  GW:'624',GY:'328',HT:'332',HN:'340',HU:'348',IS:'352',IN:'356',ID:'360',IR:'364',IQ:'368',
  IE:'372',IL:'376',IT:'380',JM:'388',JP:'392',JO:'400',KZ:'398',KE:'404',KI:'296',KP:'408',
  KR:'410',KW:'414',KG:'417',LA:'418',LV:'428',LB:'422',LS:'426',LR:'430',LY:'434',LI:'438',
  LT:'440',LU:'442',MK:'807',MG:'450',MW:'454',MY:'458',MV:'462',ML:'466',MT:'470',MH:'584',
  MR:'478',MU:'480',MX:'484',FM:'583',MD:'498',MC:'492',MN:'496',ME:'499',MA:'504',MZ:'508',
  MM:'104',NA:'516',NR:'520',NP:'524',NL:'528',NZ:'554',NI:'558',NE:'562',NG:'566',NO:'578',
  OM:'512',PK:'586',PW:'585',PA:'591',PG:'598',PY:'600',PE:'604',PH:'608',PL:'616',PT:'620',
  QA:'634',RO:'642',RU:'643',RW:'646',KN:'659',LC:'662',VC:'670',WS:'882',SM:'674',ST:'678',
  SA:'682',SN:'686',RS:'688',SC:'690',SL:'694',SG:'702',SK:'703',SI:'705',SB:'090',SO:'706',
  ZA:'710',SS:'728',ES:'724',LK:'144',SD:'729',SR:'740',SZ:'748',SE:'752',CH:'756',SY:'760',
  TW:'158',TJ:'762',TZ:'834',TH:'764',TL:'626',TG:'768',TO:'776',TT:'780',TN:'788',TR:'792',
  TM:'795',TV:'798',UG:'800',UA:'804',AE:'784',GB:'826',US:'840',UY:'858',UZ:'860',VU:'548',
  VE:'862',VN:'704',YE:'887',ZM:'894',ZW:'716',XK:'412',HK:'344',
};

// Reverse mapping: numeric to alpha-2
const NUMERIC_TO_ALPHA2: Record<string, string> = {};
for (const [alpha2, numeric] of Object.entries(ALPHA2_TO_NUMERIC)) {
  NUMERIC_TO_ALPHA2[numeric] = alpha2;
}

type MetricKey = 'avg_viral_score' | 'trend_count' | 'app_count' | 'forum_activity' | 'word_velocity';

const METRICS: { key: MetricKey; label: string; icon: string; color: string }[] = [
  { key: 'avg_viral_score', label: 'Viral Score', icon: '🔥', color: '#ec4899' },
  { key: 'trend_count', label: 'Trend Count', icon: '📈', color: '#22d3ee' },
  { key: 'app_count', label: 'App Count', icon: '📱', color: '#10b981' },
  { key: 'forum_activity', label: 'Forum Activity', icon: '💬', color: '#f59e0b' },
  { key: 'word_velocity', label: 'Word Velocity', icon: '⚡', color: '#a855f7' },
];

const PERIODS = ['daily', 'weekly', 'monthly'] as const;

// ── Helpers ────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : String(n);
}

function getColorForValue(normalized: number, baseColor: string): string {
  // Returns an rgba from transparent to full color based on normalized 0-1
  const alpha = 0.15 + normalized * 0.85;
  // Parse hex to rgb
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getMetricValue(obj: Record<string, unknown> | RegionMetric | MapDataPoint, key: string): number {
  return (obj as unknown as Record<string, number>)[key] || 0;
}

function getHeatColor(normalized: number): string {
  // Dark blue (cold) → cyan → green → yellow → red (hot)
  if (normalized <= 0) return '#1e1e48';
  if (normalized < 0.2) return '#1a3a5c';
  if (normalized < 0.4) return '#0e7490';
  if (normalized < 0.6) return '#10b981';
  if (normalized < 0.8) return '#f59e0b';
  return '#ef4444';
}

// ── Skeleton Components ────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-3 w-20 bg-dark-500 rounded mb-3" />
      <div className="h-8 w-16 bg-dark-500 rounded mb-2" />
      <div className="h-3 w-24 bg-dark-500 rounded" />
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="card animate-pulse flex items-center justify-center" style={{ height: 480 }}>
      <div className="text-center">
        <div className="text-4xl mb-3">🌍</div>
        <div className="h-4 w-32 bg-dark-500 rounded mx-auto" />
      </div>
    </div>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-8 w-8 bg-dark-500 rounded" />
          <div className="flex-1 h-4 bg-dark-500 rounded" />
          <div className="h-4 w-12 bg-dark-500 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Chart Tooltip ──────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-500 rounded-lg p-3 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {formatNum(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────

export default function RegionsPage() {
  const [stats, setStats] = useState<RegionStats | null>(null);
  const [mapData, setMapData] = useState<MapDataPoint[]>([]);
  const [regions, setRegions] = useState<RegionMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('avg_viral_score');
  const [period, setPeriod] = useState<typeof PERIODS[number]>('daily');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regionDetail, setRegionDetail] = useState<RegionDetail | null>(null);
  const [compareSelected, setCompareSelected] = useState<Set<string>>(new Set());
  const [compareData, setCompareData] = useState<RegionMetric[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildMsg, setRebuildMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data Fetching ──────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, mapRes, regionsRes] = await Promise.all([
        fetch('/api/regions/stats'),
        fetch(`/api/regions/map-data?metric=${selectedMetric}&period=${period}`),
        fetch(`/api/regions?period=${period}&limit=100`),
      ]);
      const [statsData, mapDataArr, regionsData] = await Promise.all([
        statsRes.json(),
        mapRes.json(),
        regionsRes.json(),
      ]);
      setStats(statsData);
      setMapData(Array.isArray(mapDataArr) ? mapDataArr : []);
      setRegions(Array.isArray(regionsData) ? regionsData : []);
    } catch (e) {
      console.error('Failed to fetch region data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMetric, period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch region detail
  useEffect(() => {
    if (!selectedRegion) { setRegionDetail(null); return; }
    setDetailLoading(true);
    fetch(`/api/regions/${selectedRegion}`)
      .then(r => r.json())
      .then(data => setRegionDetail(data))
      .catch(() => setRegionDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedRegion]);

  // Fetch comparison data
  useEffect(() => {
    if (compareSelected.size < 2) { setCompareData([]); return; }
    const codes = Array.from(compareSelected).join(',');
    fetch(`/api/regions/compare?codes=${codes}`)
      .then(r => r.json())
      .then(data => setCompareData(Array.isArray(data) ? data : []))
      .catch(() => setCompareData([]));
  }, [compareSelected]);

  // ── Handlers ───────────────────────────────────────────

  const handleGeoClick = (code: string) => {
    setSelectedRegion(prev => prev === code ? null : code);
  };

  const toggleCompare = (code: string) => {
    setCompareSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) { next.delete(code); }
      else if (next.size < 5) { next.add(code); }
      return next;
    });
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    setRebuildMsg(null);
    try {
      const res = await fetch('/api/regions/rebuild', { method: 'POST' });
      const data = await res.json();
      setRebuildMsg(data.message || 'Rebuilt successfully');
      fetchAll();
    } catch (e) {
      setRebuildMsg('Rebuild failed: ' + String(e));
    } finally {
      setRebuilding(false);
      setTimeout(() => setRebuildMsg(null), 5000);
    }
  };

  const currentMetricInfo = METRICS.find(m => m.key === selectedMetric) || METRICS[0];

  // Top regions for leaderboard (filtered by search)
  const leaderboard = React.useMemo(() => {
    let filtered = [...regions];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
    }
    return filtered
      .sort((a, b) => getMetricValue(b, selectedMetric) - getMetricValue(a, selectedMetric))
      .slice(0, searchQuery.trim() ? 50 : 10);
  }, [regions, selectedMetric, searchQuery]);

  const maxLeaderboardVal = leaderboard.length > 0
    ? Math.max(...leaderboard.map(r => getMetricValue(r, selectedMetric)))
    : 1;

  // Radar chart data for comparison
  const radarData = React.useMemo(() => {
    if (compareData.length === 0) return [];
    // Normalize each metric to 0-100 for radar display
    const metricKeys: MetricKey[] = ['avg_viral_score', 'trend_count', 'app_count', 'forum_activity', 'word_velocity'];
    const maxVals: Record<string, number> = {};
    for (const k of metricKeys) {
      maxVals[k] = Math.max(...compareData.map(d => getMetricValue(d, k)), 1);
    }
    return metricKeys.map(k => {
      const info = METRICS.find(m => m.key === k);
      const entry: Record<string, unknown> = { metric: info?.label || k };
      for (const d of compareData) {
        const val = getMetricValue(d, k);
        entry[d.code] = Math.round((val / maxVals[k]) * 100);
      }
      return entry;
    });
  }, [compareData]);

  const RADAR_COLORS = ['#22d3ee', '#ec4899', '#10b981', '#f59e0b', '#a855f7'];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🗺️ Region Analysis
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Interactive geo-intelligence for casual gaming trends worldwide
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/correlations" className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all">🔗 Cross-Platform</a>
          <a href="/api/export?type=csv&source=regions" className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-white hover:border-neon-cyan transition-all">📥 Export</a>
          {rebuildMsg && (
            <span className="text-xs text-neon-green animate-pulse">{rebuildMsg}</span>
          )}
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              rebuilding
                ? 'border-dark-500 text-slate-500 cursor-wait'
                : 'border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10'
            }`}
          >
            {rebuilding ? '⏳ Rebuilding…' : '🔄 Rebuild Metrics'}
          </button>
          <div className="flex items-center bg-dark-800 border border-dark-500 rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === p
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : stats ? (
          <>
            <div className="stat-card glow-cyan">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Regions</p>
              <p className="text-3xl font-bold text-neon-cyan">{stats.totalRegions}</p>
              <p className="text-xs text-slate-500 mt-1">Countries tracked</p>
            </div>
            <div className="stat-card glow-magenta">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Top Region</p>
              <p className="text-2xl font-bold text-neon-magenta">
                {stats.topRegion ? `${FLAGS[stats.topRegion.code] || '🌐'} ${stats.topRegion.name}` : 'N/A'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.topRegion ? `Score: ${stats.topRegion.avg_viral_score}` : ''}
              </p>
            </div>
            <div className="stat-card glow-green">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Avg Viral Score</p>
              <p className="text-3xl font-bold text-neon-green">{stats.avgViralScore}</p>
              <p className="text-xs text-slate-500 mt-1">Across all regions</p>
            </div>
            <div className="stat-card glow-amber">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Linked Trends</p>
              <p className="text-3xl font-bold text-neon-amber">{formatNum(stats.totalTrends)}</p>
              <p className="text-xs text-slate-500 mt-1">Geo-tagged trends</p>
            </div>
          </>
        ) : null}
      </div>

      {/* Metric Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 uppercase tracking-wider mr-2">Map Metric:</span>
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setSelectedMetric(m.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              selectedMetric === m.key
                ? 'border-opacity-50 text-white'
                : 'border-dark-500 text-slate-400 hover:text-white hover:border-dark-500'
            }`}
            style={selectedMetric === m.key ? { borderColor: m.color, background: `${m.color}20` } : {}}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content: Map + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* World Map (hidden on mobile, replaced by list) */}
        <div className="hidden md:block lg:col-span-2">
          {loading ? <MapSkeleton /> : (
            <RegionMap
              mapData={mapData}
              selectedRegion={selectedRegion}
              currentMetricInfo={currentMetricInfo}
              onRegionClick={handleGeoClick}
            />
          )}
        </div>

        {/* Mobile Fallback: Region list instead of map */}
        <div className="md:hidden">
          <div className="card">
            <h3 className="text-sm font-bold text-white mb-3">🌍 Regions</h3>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {leaderboard.map((r, i) => {
                const val = getMetricValue(r, selectedMetric);
                return (
                  <button
                    key={r.code}
                    onClick={() => handleGeoClick(r.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                      selectedRegion === r.code ? 'bg-neon-cyan/10 border border-neon-cyan/30' : 'hover:bg-dark-600 border border-transparent'
                    }`}
                  >
                    <span className="text-xs text-slate-500 w-4 font-mono">{i + 1}</span>
                    <span>{FLAGS[r.code] || '🌐'}</span>
                    <span className="text-xs text-white flex-1 truncate">{r.name}</span>
                    <span className="text-xs font-mono text-neon-cyan">{formatNum(val)}</span>
                  </button>
                );
              })}
              {leaderboard.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No regions found</p>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-1">
          <div className="card h-full" style={{ maxHeight: 520, overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                🏆 Top Regions — {currentMetricInfo.label}
              </h3>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search regions…"
              className="w-full bg-dark-900 text-xs text-white px-3 py-2 rounded-lg border border-dark-500 mb-3 focus:outline-none focus:border-neon-cyan/50 placeholder-slate-600"
            />
            {loading ? <ListSkeleton rows={10} /> : (
              <div className="space-y-2">
                {leaderboard.map((r, i) => {
                  const val = getMetricValue(r, selectedMetric);
                  const pct = (val / maxLeaderboardVal) * 100;
                  const isSelected = r.code === selectedRegion;
                  return (
                    <button
                      key={r.code}
                      onClick={() => handleGeoClick(r.code)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-neon-cyan/10 border border-neon-cyan/30'
                          : 'hover:bg-dark-600 border border-transparent'
                      }`}
                    >
                      <span className="text-xs text-slate-500 w-5 font-mono">{i + 1}</span>
                      <span className="text-base">{FLAGS[r.code] || '🌐'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white truncate">{r.name}</span>
                          <span className="text-xs font-mono text-slate-300 ml-2">{formatNum(val)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-dark-900 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${currentMetricInfo.color}80, ${currentMetricInfo.color})`,
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Region Drill-Down Panel */}
      {selectedRegion && (
        <div className="card glow-cyan">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {FLAGS[selectedRegion] || '🌐'} {regionDetail?.metrics?.name || selectedRegion} — Drill Down
            </h3>
            <button
              onClick={() => setSelectedRegion(null)}
              className="text-slate-400 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-dark-600 transition-all"
            >
              ✕ Close
            </button>
          </div>

          {detailLoading ? (
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 w-16 bg-dark-500 rounded mb-2" />
                  <div className="h-6 w-12 bg-dark-500 rounded" />
                </div>
              ))}
            </div>
          ) : regionDetail?.metrics ? (
            <div>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {METRICS.map(m => {
                  const val = regionDetail.metrics ? getMetricValue(regionDetail.metrics, m.key) : 0;
                  return (
                    <div key={m.key} className="bg-dark-800 rounded-lg p-3 border border-dark-500">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{m.icon} {m.label}</p>
                      <p className="text-xl font-bold" style={{ color: m.color }}>{formatNum(val || 0)}</p>
                    </div>
                  );
                })}
              </div>

              {/* Extra info */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-dark-800 rounded-lg p-3 border border-dark-500">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">📊 Total Mentions</p>
                  <p className="text-lg font-bold text-white">{formatNum(regionDetail.metrics.total_mentions || 0)}</p>
                </div>
                <div className="bg-dark-800 rounded-lg p-3 border border-dark-500">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">🏷️ Top Category</p>
                  <p className="text-lg font-bold text-white">{regionDetail.metrics.top_category || 'N/A'}</p>
                </div>
              </div>

              {/* Linked Trends */}
              {regionDetail.trends.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">🔗 Top Linked Trends</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {regionDetail.trends.slice(0, 8).map((t) => (
                      <div key={t.id} className="flex items-center gap-2 bg-dark-900 rounded-lg px-3 py-2 border border-dark-500">
                        <span className={`score-badge text-xs ${
                          t.viral_score >= 70 ? 'score-high' : t.viral_score >= 40 ? 'score-med' : 'score-low'
                        }`}>
                          {t.viral_score}
                        </span>
                        <span className="text-xs text-white truncate flex-1">{t.title}</span>
                        <span className="text-[10px] text-slate-500">{t.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No data available for this region.</p>
          )}
        </div>
      )}

      {/* Comparison Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            ⚖️ Region Comparison
            <span className="text-[10px] text-slate-500 font-normal">(Select 2-5 regions)</span>
          </h3>
          <button
            onClick={() => setShowCompare(prev => !prev)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              showCompare ? 'bg-neon-purple/20 text-neon-purple' : 'bg-dark-600 text-slate-400 hover:text-white'
            }`}
          >
            {showCompare ? 'Hide Selector' : 'Select Regions'}
          </button>
        </div>

        {showCompare && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-dark-900 rounded-lg border border-dark-500">
            {regions.slice(0, 30).map(r => (
              <button
                key={r.code}
                onClick={() => toggleCompare(r.code)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all border ${
                  compareSelected.has(r.code)
                    ? 'bg-neon-purple/20 border-neon-purple/40 text-white'
                    : 'border-dark-500 text-slate-400 hover:text-white hover:border-dark-500'
                }`}
              >
                <span>{FLAGS[r.code] || '🌐'}</span>
                <span>{r.code}</span>
              </button>
            ))}
          </div>
        )}

        {compareSelected.size >= 2 && compareData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div>
              <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Radar Overview</h4>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#2a2a5a" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 9 }} domain={[0, 100]} />
                  {Array.from(compareSelected).map((code, i) => (
                    <Radar
                      key={code}
                      name={`${FLAGS[code] || ''} ${code}`}
                      dataKey={code}
                      stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart comparison */}
            <div>
              <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Side-by-Side — {currentMetricInfo.label}</h4>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={compareData.map(d => ({
                  name: `${FLAGS[d.code] || ''} ${d.code}`,
                  value: getMetricValue(d, selectedMetric),
                  code: d.code,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a5a" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name={currentMetricInfo.label} radius={[4, 4, 0, 0]}>
                    {compareData.map((d, i) => (
                      <Cell key={d.code} fill={RADAR_COLORS[i % RADAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">
            {compareSelected.size < 2
              ? 'Select at least 2 regions above to compare metrics'
              : 'Loading comparison data...'}
          </div>
        )}
      </div>
    </div>
  );
}
