'use client';

import { useEffect, useState } from 'react';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  connections: number;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: number;
  type: string;
}

interface Correlation {
  id: number;
  source_type: string;
  source_id: number | null;
  source_name: string;
  target_type: string;
  target_id: number | null;
  target_name: string;
  correlation_type: string;
  strength: number;
  detected_at: string;
  metadata: string | null;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  matrix: Record<string, Record<string, number>>;
  types: string[];
  stats: { totalNodes: number; totalEdges: number; avgStrength: number };
}

const TYPE_COLORS: Record<string, string> = {
  trend: '#06b6d4',
  forum: '#22c55e',
  app: '#a855f7',
  word: '#f59e0b',
};

const TYPE_ICONS: Record<string, string> = {
  trend: '🔥',
  forum: '🎮',
  app: '📱',
  word: '💬',
};

export default function CorrelationsPage() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [minStrength, setMinStrength] = useState(0.2);

  useEffect(() => {
    fetchData();
  }, [minStrength]);

  async function fetchData() {
    setLoading(true);
    try {
      const [graphRes, corrRes] = await Promise.all([
        fetch(`/api/correlations/graph?min_strength=${minStrength}&limit=200`).then(r => r.json()).catch(() => null),
        fetch(`/api/correlations?min_strength=${minStrength}&limit=100`).then(r => r.json()).catch(() => []),
      ]);
      setGraph(graphRes);
      setCorrelations(Array.isArray(corrRes) ? corrRes : []);
    } catch (err) {
      console.error('Failed to load correlations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRebuild() {
    setRebuilding(true);
    try {
      await fetch('/api/correlations/rebuild', { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Rebuild failed:', err);
    } finally {
      setRebuilding(false);
    }
  }

  const filteredCorrelations = filterType === 'all'
    ? correlations
    : correlations.filter(c => c.source_type === filterType || c.target_type === filterType);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔗</div>
          <p className="text-slate-400">Loading correlations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Cross-Platform Correlations</h1>
          <p className="text-sm text-slate-400 mt-1">Discover connections across trends, forums, apps & words</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            className="px-4 py-2 text-sm bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded-lg hover:bg-neon-cyan/20 disabled:opacity-50 transition-all"
          >
            {rebuilding ? '⏳ Rebuilding...' : '🔄 Rebuild Correlations'}
          </button>
          <a
            href="/api/export?type=csv&source=trends"
            className="px-3 py-2 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-white hover:border-neon-cyan transition-all"
          >
            📥 Export
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      {graph && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card glow-cyan">
            <p className="text-xs text-slate-500 uppercase">Connected Entities</p>
            <p className="text-2xl font-bold text-neon-cyan">{graph.stats.totalNodes}</p>
          </div>
          <div className="stat-card glow-purple">
            <p className="text-xs text-slate-500 uppercase">Correlations</p>
            <p className="text-2xl font-bold text-neon-purple">{graph.stats.totalEdges}</p>
          </div>
          <div className="stat-card glow-green">
            <p className="text-xs text-slate-500 uppercase">Avg Strength</p>
            <p className="text-2xl font-bold text-neon-green">{graph.stats.avgStrength}</p>
          </div>
        </div>
      )}

      {/* Correlation Matrix */}
      {graph && graph.types.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">📊 Correlation Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-slate-500">Source ↓ / Target →</th>
                  {graph.types.map(t => (
                    <th key={t} className="p-2 text-center">
                      <span className="text-lg">{TYPE_ICONS[t] || '📋'}</span>
                      <br />
                      <span className="text-xs text-slate-400 capitalize">{t}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {graph.types.map(row => (
                  <tr key={row}>
                    <td className="p-2 font-medium text-white capitalize">
                      {TYPE_ICONS[row] || '📋'} {row}
                    </td>
                    {graph.types.map(col => {
                      const count = graph.matrix[row]?.[col] || 0;
                      const intensity = Math.min(1, count / 20);
                      return (
                        <td key={col} className="p-2 text-center">
                          <span
                            className="inline-block px-3 py-1 rounded text-sm font-mono"
                            style={{
                              backgroundColor: count > 0
                                ? `rgba(6, 182, 212, ${0.1 + intensity * 0.5})`
                                : 'rgba(51, 65, 85, 0.3)',
                              color: count > 0 ? '#06b6d4' : '#475569',
                            }}
                          >
                            {count}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Network Visualization (simplified force-directed representation) */}
      {graph && graph.nodes.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">🕸️ Network Map</h2>
          <div className="relative bg-dark-900 rounded-lg p-6 min-h-[300px] overflow-hidden">
            <div className="flex flex-wrap gap-2 justify-center">
              {graph.nodes.slice(0, 40).map((node) => {
                const size = Math.max(40, Math.min(80, 30 + node.connections * 8));
                return (
                  <div
                    key={node.id}
                    className="flex flex-col items-center justify-center rounded-full border-2 transition-all hover:scale-110 cursor-pointer"
                    style={{
                      width: size,
                      height: size,
                      borderColor: TYPE_COLORS[node.type] || '#64748b',
                      backgroundColor: `${TYPE_COLORS[node.type] || '#64748b'}22`,
                    }}
                    title={`${node.label} (${node.type}) - ${node.connections} connections`}
                  >
                    <span className="text-xs">{TYPE_ICONS[node.type] || '📋'}</span>
                    <span className="text-[8px] text-slate-400 truncate max-w-[60px] text-center px-1">
                      {node.label.slice(0, 12)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-dark-600">
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-400 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-dark-700 border border-dark-500 text-white text-sm rounded-lg px-3 py-2"
        >
          <option value="all">All Types</option>
          <option value="trend">🔥 Trends</option>
          <option value="forum">🎮 Forums</option>
          <option value="app">📱 Apps</option>
          <option value="word">💬 Words</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Min Strength:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={minStrength}
            onChange={e => setMinStrength(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="text-xs text-slate-400 font-mono">{minStrength}</span>
        </div>
        <span className="text-xs text-slate-500">{filteredCorrelations.length} results</span>
      </div>

      {/* Correlation List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">📋 Correlation Details</h2>
        {filteredCorrelations.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No correlations found. Click &quot;Rebuild Correlations&quot; to detect cross-platform connections.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredCorrelations.map(c => {
              let meta: Record<string, unknown> = {};
              try { meta = c.metadata ? JSON.parse(c.metadata) : {}; } catch { /* ignore */ }
              const keywords = (meta.shared_keywords as string[]) || [];

              return (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors">
                  <div className="flex items-center gap-1 min-w-[100px]">
                    <span>{TYPE_ICONS[c.source_type] || '📋'}</span>
                    <span className="text-xs text-slate-400 capitalize">{c.source_type}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{c.source_name}</p>
                  </div>
                  <div className="flex flex-col items-center px-2">
                    <div className="h-px w-8 bg-neon-cyan/30" />
                    <span className="text-[10px] text-neon-cyan font-mono">{c.strength.toFixed(2)}</span>
                    <div className="h-px w-8 bg-neon-cyan/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{c.target_name}</p>
                  </div>
                  <div className="flex items-center gap-1 min-w-[100px] justify-end">
                    <span className="text-xs text-slate-400 capitalize">{c.target_type}</span>
                    <span>{TYPE_ICONS[c.target_type] || '📋'}</span>
                  </div>
                  {keywords.length > 0 && (
                    <div className="hidden lg:flex gap-1 ml-2">
                      {keywords.slice(0, 3).map(kw => (
                        <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-dark-800 rounded text-slate-500">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
