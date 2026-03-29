'use client';

import { useEffect, useState } from 'react';

interface Competitor {
  id: number;
  name: string;
  type: string;
  website: string | null;
  description: string | null;
  tracked_since: string;
  enabled: number;
  app_count?: number;
  total_downloads?: number;
  avg_rating?: number;
  market_share?: number;
  snapshot_date?: string;
}

interface CompetitorSnapshot {
  id: number;
  competitor_id: number;
  app_count: number;
  total_downloads: number;
  avg_rating: number;
  market_share: number;
  snapshot_date: string;
}

interface CompetitorDetail {
  competitor: Competitor;
  latestSnapshot: CompetitorSnapshot | null;
  snapshotCount: number;
}

export default function CompetitorsPage() {
  const [leaderboard, setLeaderboard] = useState<Competitor[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CompetitorDetail | null>(null);
  const [history, setHistory] = useState<CompetitorSnapshot[]>([]);
  const [formData, setFormData] = useState({ name: '', type: 'studio', website: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [lbRes, compRes] = await Promise.all([
        fetch('/api/competitors/leaderboard').then(r => r.json()).catch(() => []),
        fetch('/api/competitors').then(r => r.json()).catch(() => []),
      ]);
      setLeaderboard(Array.isArray(lbRes) ? lbRes : []);
      setCompetitors(Array.isArray(compRes) ? compRes : []);
    } catch (err) {
      console.error('Failed to load competitors:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      if (editingId) {
        await fetch(`/api/competitors/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch('/api/competitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', type: 'studio', website: '', description: '' });
      await fetchData();
    } catch (err) {
      console.error('Save failed:', err);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this competitor?')) return;
    try {
      await fetch(`/api/competitors/${id}`, { method: 'DELETE' });
      await fetchData();
      if (detail && (detail.competitor as Competitor).id === id) setDetail(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  async function handleViewDetail(id: number) {
    try {
      const [detailRes, historyRes] = await Promise.all([
        fetch(`/api/competitors/${id}`).then(r => r.json()).catch(() => null),
        fetch(`/api/competitors/${id}/history`).then(r => r.json()).catch(() => ({ snapshots: [] })),
      ]);
      setDetail(detailRes);
      setHistory(historyRes?.snapshots || []);
    } catch (err) {
      console.error('Failed to load detail:', err);
    }
  }

  function openEdit(comp: Competitor) {
    setEditingId(comp.id);
    setFormData({
      name: comp.name,
      type: comp.type || 'studio',
      website: comp.website || '',
      description: comp.description || '',
    });
    setShowModal(true);
  }

  function openAdd() {
    setEditingId(null);
    setFormData({ name: '', type: 'studio', website: '', description: '' });
    setShowModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🏢</div>
          <p className="text-slate-400">Loading competitors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Competitor Watch</h1>
          <p className="text-sm text-slate-400 mt-1">Track competing studios, publishers & developers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openAdd}
            className="px-4 py-2 text-sm bg-neon-green/10 border border-neon-green/30 text-neon-green rounded-lg hover:bg-neon-green/20 transition-all"
          >
            + Add Competitor
          </button>
          <a
            href="/api/export?type=csv&source=apps"
            className="px-3 py-2 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-white hover:border-neon-cyan transition-all"
          >
            📥 Export
          </a>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">🏆 Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No competitors tracked yet. Add competitors to start monitoring.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 text-xs uppercase border-b border-dark-500">
                  <th className="p-3">#</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Apps</th>
                  <th className="p-3 text-right">Downloads</th>
                  <th className="p-3 text-right">Avg Rating</th>
                  <th className="p-3 text-right">Market Share</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((comp, i) => (
                  <tr key={comp.id} className="border-b border-dark-600 hover:bg-dark-700 transition-colors">
                    <td className="p-3">
                      <span className={`text-lg ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-600' : 'text-slate-500'}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => handleViewDetail(comp.id)} className="text-white font-medium hover:text-neon-cyan transition-colors text-left">
                        {comp.name}
                      </button>
                      {comp.website && <p className="text-[10px] text-slate-600 truncate max-w-[200px]">{comp.website}</p>}
                    </td>
                    <td className="p-3"><span className="text-xs px-2 py-0.5 bg-dark-800 rounded text-slate-400">{comp.type}</span></td>
                    <td className="p-3 text-right font-mono text-slate-300">{(comp.app_count || 0).toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-slate-300">{(comp.total_downloads || 0).toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-neon-cyan">{(comp.avg_rating || 0).toFixed(1)}</td>
                    <td className="p-3 text-right font-mono text-neon-green">{(comp.market_share || 0).toFixed(1)}%</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(comp)} className="text-xs text-slate-500 hover:text-white transition-colors" title="Edit">✏️</button>
                        <button onClick={() => handleDelete(comp.id)} className="text-xs text-slate-500 hover:text-red-400 transition-colors" title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {detail && detail.competitor && (
        <div className="card bg-gradient-to-br from-dark-700 to-dark-800 border-neon-cyan/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              🏢 {detail.competitor.name}
            </h2>
            <button onClick={() => setDetail(null)} className="text-slate-500 hover:text-white text-sm">✕ Close</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-500">Type: <span className="text-slate-300">{detail.competitor.type}</span></p>
              {detail.competitor.website && <p className="text-xs text-slate-500">Website: <span className="text-neon-cyan">{detail.competitor.website}</span></p>}
              {detail.competitor.description && <p className="text-xs text-slate-500 mt-1">{detail.competitor.description}</p>}
              <p className="text-xs text-slate-500 mt-1">Tracked since: {new Date(detail.competitor.tracked_since).toLocaleDateString()}</p>
              <p className="text-xs text-slate-500">Snapshots: {detail.snapshotCount}</p>
            </div>
            {detail.latestSnapshot && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-dark-900 rounded">
                  <p className="text-[10px] text-slate-500">Apps</p>
                  <p className="text-lg font-bold text-neon-cyan">{detail.latestSnapshot.app_count}</p>
                </div>
                <div className="p-2 bg-dark-900 rounded">
                  <p className="text-[10px] text-slate-500">Downloads</p>
                  <p className="text-lg font-bold text-neon-green">{detail.latestSnapshot.total_downloads.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-dark-900 rounded">
                  <p className="text-[10px] text-slate-500">Rating</p>
                  <p className="text-lg font-bold text-amber-400">{detail.latestSnapshot.avg_rating.toFixed(1)}</p>
                </div>
                <div className="p-2 bg-dark-900 rounded">
                  <p className="text-[10px] text-slate-500">Market Share</p>
                  <p className="text-lg font-bold text-neon-purple">{detail.latestSnapshot.market_share.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </div>

          {/* History Timeline */}
          {history.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">📈 Snapshot History</h3>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {history.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 text-xs p-2 bg-dark-900 rounded">
                    <span className="text-slate-500 w-20">{s.snapshot_date}</span>
                    <span className="text-slate-300">Apps: {s.app_count}</span>
                    <span className="text-neon-green">DL: {s.total_downloads.toLocaleString()}</span>
                    <span className="text-amber-400">⭐ {s.avg_rating.toFixed(1)}</span>
                    <span className="text-neon-purple">{s.market_share.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Competitors Grid */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">📋 All Competitors ({competitors.length})</h2>
        {competitors.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No competitors added yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {competitors.map(comp => (
              <div
                key={comp.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer hover:border-neon-cyan/30 ${
                  comp.enabled ? 'bg-dark-700 border-dark-500' : 'bg-dark-800 border-dark-600 opacity-50'
                }`}
                onClick={() => handleViewDetail(comp.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white">{comp.name}</h3>
                  <span className={`w-2 h-2 rounded-full ${comp.enabled ? 'bg-neon-green' : 'bg-slate-600'}`} />
                </div>
                <p className="text-xs text-slate-500">{comp.type}</p>
                {comp.description && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{comp.description}</p>}
                <p className="text-[10px] text-slate-600 mt-2">Since {new Date(comp.tracked_since).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-dark-800 border border-dark-500 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">
              {editingId ? '✏️ Edit Competitor' : '➕ Add Competitor'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none"
                  placeholder="e.g. Supercell"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none"
                >
                  <option value="studio">Studio</option>
                  <option value="publisher">Publisher</option>
                  <option value="developer">Developer</option>
                  <option value="platform">Platform</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none resize-none"
                  rows={3}
                  placeholder="Brief description..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="px-4 py-2 text-sm bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded-lg hover:bg-neon-cyan/20 disabled:opacity-50 transition-all"
              >
                {editingId ? 'Save Changes' : 'Add Competitor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
