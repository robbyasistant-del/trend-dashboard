'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ── Types ──────────────────────────────────────────────────

interface WordEntry {
  id: number; word: string; source: string; category: string;
  frequency: number; score: number; growth: number; sentiment: number;
  first_seen: string; last_seen: string; data_json: string;
}

interface WordStats {
  total: number; trending: number; avgFrequency: number; topCategory: string;
  categories: Array<{ category: string; count: number }>;
  sources: Array<{ source: string; count: number }>;
}

interface FreqPoint {
  period: string; frequency: number; mentions: number; word: string;
}

interface Competition {
  id: number; word_a: string; word_b: string; overlap_score: number;
  context: string; category: string;
}

interface Cluster {
  id: number; name: string; description: string; words: string;
  centroid_word: string; coherence_score: number; category: string;
}

type SortKey = 'score' | 'frequency' | 'growth';

// ── Helpers ────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 70 ? 'score-high' : score >= 40 ? 'score-med' : 'score-low';
  return <span className={`score-badge ${cls}`}>{Math.round(score)}</span>;
}

function GrowthIndicator({ growth }: { growth: number }) {
  if (growth > 0) return <span className="text-emerald-400 text-xs font-medium">▲ {growth.toFixed(1)}%</span>;
  if (growth < 0) return <span className="text-red-400 text-xs font-medium">▼ {Math.abs(growth).toFixed(1)}%</span>;
  return <span className="text-slate-500 text-xs">— 0%</span>;
}

function overlapColor(score: number): string {
  if (score >= 0.8) return 'bg-neon-cyan/30 text-neon-cyan';
  if (score >= 0.6) return 'bg-neon-green/20 text-neon-green';
  if (score >= 0.4) return 'bg-neon-amber/20 text-neon-amber';
  return 'bg-dark-600 text-slate-400';
}

// ── Word Cloud Component ───────────────────────────────────

function WordCloud({ words }: { words: WordEntry[] }) {
  if (words.length === 0) return <div className="text-center py-8 text-slate-600">No words to display</div>;

  const maxFreq = Math.max(...words.map(w => w.frequency));
  const minFreq = Math.min(...words.map(w => w.frequency));
  const range = maxFreq - minFreq || 1;

  // Colors by growth direction
  function wordColor(w: WordEntry): string {
    if (w.growth > 10) return '#22d3ee';
    if (w.growth > 0) return '#10b981';
    if (w.growth > -5) return '#f59e0b';
    return '#ef4444';
  }

  // Simple grid-based layout for SVG word cloud
  const sorted = [...words].sort((a, b) => b.frequency - a.frequency).slice(0, 40);
  const cols = 5;

  return (
    <svg viewBox="0 0 600 360" className="w-full h-full" style={{ minHeight: 280 }}>
      {sorted.map((w, i) => {
        const norm = (w.frequency - minFreq) / range;
        const size = 11 + norm * 22;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 60 + col * 115 + (row % 2 === 1 ? 30 : 0);
        const y = 28 + row * 42;
        const opacity = 0.5 + norm * 0.5;

        return (
          <text
            key={w.id}
            x={x} y={y}
            fontSize={size}
            fill={wordColor(w)}
            opacity={opacity}
            fontWeight={norm > 0.5 ? 700 : 400}
            textAnchor="middle"
            className="select-none"
          >
            {w.word}
          </text>
        );
      })}
    </svg>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function WordsPage() {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [stats, setStats] = useState<WordStats | null>(null);
  const [frequency, setFrequency] = useState<FreqPoint[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [filter, setFilter] = useState({ search: '', source: '', category: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.search) params.set('search', filter.search);
      if (filter.source) params.set('source', filter.source);
      if (filter.category) params.set('category', filter.category);

      const [wordsRes, statsRes, freqRes, compRes, clustRes] = await Promise.all([
        fetch(`/api/words?${params}`),
        fetch('/api/words/stats'),
        fetch('/api/words/frequency?periodType=daily&limit=200'),
        fetch('/api/words/competition'),
        fetch('/api/words/clusters'),
      ]);

      setWords(await wordsRes.json());
      setStats(await statsRes.json());
      setFrequency(await freqRes.json());
      setCompetitions(await compRes.json());
      setClusters(await clustRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived data
  const categories = useMemo(() => Array.from(new Set(words.map(w => w.category).filter(Boolean))), [words]);
  const sources = useMemo(() => Array.from(new Set(words.map(w => w.source).filter(Boolean))), [words]);

  const sortedWords = useMemo(() => {
    return [...words].sort((a, b) => {
      if (sortKey === 'score') return b.score - a.score;
      if (sortKey === 'frequency') return b.frequency - a.frequency;
      return b.growth - a.growth;
    });
  }, [words, sortKey]);

  // Aggregate frequency data by period for chart
  const freqChartData = useMemo(() => {
    const byPeriod: Record<string, { period: string; frequency: number; mentions: number }> = {};
    for (const f of frequency) {
      if (!byPeriod[f.period]) {
        byPeriod[f.period] = { period: f.period, frequency: 0, mentions: 0 };
      }
      byPeriod[f.period].frequency += f.frequency;
      byPeriod[f.period].mentions += f.mentions;
    }
    return Object.values(byPeriod).sort((a, b) => a.period.localeCompare(b.period));
  }, [frequency]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">💬 Words Trends</h1>
          <p className="text-sm text-slate-500 mt-1">Term frequency analysis, competition mapping &amp; semantic clustering</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-dark-600 hover:bg-dark-500 border border-dark-500 rounded-lg text-sm text-slate-300 transition-all">
          ↻ Refresh
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stat-card glow-cyan">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Words</p>
            <p className="text-2xl font-bold text-neon-cyan">{stats.total}</p>
          </div>
          <div className="stat-card glow-green">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trending</p>
            <p className="text-2xl font-bold text-neon-green">{stats.trending}</p>
          </div>
          <div className="stat-card glow-magenta">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg Frequency</p>
            <p className="text-2xl font-bold text-neon-magenta">{stats.avgFrequency}</p>
          </div>
          <div className="stat-card glow-amber">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Top Category</p>
            <p className="text-2xl font-bold text-neon-amber capitalize">{stats.topCategory}</p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Word Cloud */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Word Cloud</h3>
          {loading ? (
            <div className="flex items-center justify-center h-[280px] text-slate-600">Loading...</div>
          ) : (
            <WordCloud words={words} />
          )}
          <div className="flex gap-4 mt-2 text-[10px] text-slate-600">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-cyan inline-block" /> Strong growth</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-green inline-block" /> Growing</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-amber inline-block" /> Stable</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-red inline-block" /> Declining</span>
          </div>
        </div>

        {/* Frequency Chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Aggregate Frequency Over Time</h3>
          {freqChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={freqChartData}>
                <defs>
                  <linearGradient id="freqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#161638', border: '1px solid #2a2a5a', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="frequency" stroke="#22d3ee" fill="url(#freqGrad)" strokeWidth={2} name="Frequency" />
                <Area type="monotone" dataKey="mentions" stroke="#ec4899" fill="url(#mentGrad)" strokeWidth={1.5} name="Mentions" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-600">No frequency data</div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text" placeholder="Search words..." value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          className="flex-1 max-w-xs"
        />
        <select value={filter.source} onChange={e => setFilter(f => ({ ...f, source: e.target.value }))}>
          <option value="">All Sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Top Terms Table */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-400">Top Terms</h3>
          <div className="flex gap-1 bg-dark-800 p-0.5 rounded-md">
            {(['score', 'frequency', 'growth'] as SortKey[]).map(key => (
              <button key={key} onClick={() => setSortKey(key)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${sortKey === key ? 'bg-dark-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : sortedWords.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-lg mb-2">No words found</p>
            <p className="text-slate-600 text-sm">Run the seed script: <code className="bg-dark-700 px-2 py-1 rounded">npm run seed:words</code></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-500 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-2 pr-3">Word</th>
                  <th className="text-left py-2 pr-3">Source</th>
                  <th className="text-left py-2 pr-3">Category</th>
                  <th className="text-right py-2 pr-3">Score</th>
                  <th className="text-right py-2 pr-3">Frequency</th>
                  <th className="text-right py-2 pr-3">Growth</th>
                  <th className="text-right py-2">Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {sortedWords.slice(0, 20).map(w => (
                  <tr key={w.id} className="border-b border-dark-500/50 hover:bg-dark-700/30 transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-white">{w.word}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-400">{w.source}</td>
                    <td className="py-2.5 pr-3">
                      <span className="text-xs bg-dark-600 px-2 py-0.5 rounded text-slate-400 capitalize">{w.category}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right"><ScoreBadge score={w.score} /></td>
                    <td className="py-2.5 pr-3 text-right text-slate-300">{w.frequency.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-right"><GrowthIndicator growth={w.growth} /></td>
                    <td className="py-2.5 text-right">
                      <span className={w.sentiment >= 0.5 ? 'text-emerald-400' : w.sentiment >= 0 ? 'text-slate-400' : 'text-red-400'}>
                        {w.sentiment.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Competition Matrix + Clusters */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Competition Matrix */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Competition Matrix</h3>
          {competitions.length === 0 ? (
            <div className="text-center py-8 text-slate-600">No competition data</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {competitions.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2 bg-dark-800 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-medium text-neon-cyan truncate">{c.word_a}</span>
                    <span className="text-slate-600">↔</span>
                    <span className="text-xs font-medium text-neon-magenta truncate">{c.word_b}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${overlapColor(c.overlap_score)}`}>
                    {(c.overlap_score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Word Clusters */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Semantic Clusters</h3>
          {clusters.length === 0 ? (
            <div className="text-center py-8 text-slate-600">No cluster data</div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {clusters.map(c => {
                let clusterWords: string[] = [];
                try { clusterWords = JSON.parse(c.words); } catch { /* ignore */ }
                return (
                  <div key={c.id} className="p-3 bg-dark-800 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-white">{c.name}</span>
                      <span className="text-[10px] text-slate-500">
                        coherence: <span className="text-neon-green">{(c.coherence_score * 100).toFixed(0)}%</span>
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-slate-500 mb-2">{c.description}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {clusterWords.map(word => (
                        <span key={word} className={`text-xs px-2 py-0.5 rounded-full ${word === c.centroid_word ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-dark-600 text-slate-400'}`}>
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
