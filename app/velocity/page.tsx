'use client';

import { useEffect, useState } from 'react';

interface VelocityAlert {
  id: number;
  entity_type: string;
  entity_id: number;
  entity_name: string;
  velocity_score: number;
  acceleration: number;
  previous_score: number;
  alert_level: string;
  is_read: number;
  detected_at: string;
}

interface VelocityStats {
  total: number;
  unread: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  avgVelocity: number;
  topEntity: { entity_name: string; velocity_score: number } | null;
}

const LEVEL_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const LEVEL_ICONS: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '⚪',
};

const TYPE_ICONS: Record<string, string> = {
  trend: '🔥',
  app: '📱',
  forum: '🎮',
  word: '💬',
};

export default function VelocityPage() {
  const [alerts, setAlerts] = useState<VelocityAlert[]>([]);
  const [stats, setStats] = useState<VelocityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [alertsRes, statsRes] = await Promise.all([
        fetch('/api/velocity?limit=100').then(r => r.json()).catch(() => []),
        fetch('/api/velocity/stats').then(r => r.json()).catch(() => null),
      ]);
      setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load velocity data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    setScanning(true);
    try {
      await fetch('/api/velocity/scan', { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setScanning(false);
    }
  }

  async function handleMarkRead(id: number) {
    try {
      await fetch(`/api/velocity/${id}/read`, { method: 'POST' });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: 1 } : a));
      if (stats) setStats({ ...stats, unread: Math.max(0, stats.unread - 1) });
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (filterLevel !== 'all' && a.alert_level !== filterLevel) return false;
    if (filterType !== 'all' && a.entity_type !== filterType) return false;
    if (showUnreadOnly && a.is_read === 1) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚡</div>
          <p className="text-slate-400">Loading velocity alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            ⚡ Velocity Alerts
            {stats && stats.unread > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full animate-pulse">
                {stats.unread} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">Early detection of rapidly moving trends, apps & topics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 text-sm bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded-lg hover:bg-neon-cyan/20 disabled:opacity-50 transition-all"
          >
            {scanning ? '⏳ Scanning...' : '🔍 Run Velocity Scan'}
          </button>
          <a
            href="/api/export?type=json&source=trends"
            className="px-3 py-2 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-white hover:border-neon-cyan transition-all"
          >
            📥 Export
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="stat-card glow-cyan">
            <p className="text-[10px] text-slate-500 uppercase">Total</p>
            <p className="text-xl font-bold text-neon-cyan">{stats.total}</p>
          </div>
          <div className="stat-card glow-amber">
            <p className="text-[10px] text-slate-500 uppercase">Unread</p>
            <p className="text-xl font-bold text-amber-400">{stats.unread}</p>
          </div>
          <div className="stat-card" style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)' }}>
            <p className="text-[10px] text-slate-500 uppercase">Critical</p>
            <p className="text-xl font-bold text-red-400">{stats.critical}</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] text-slate-500 uppercase">High</p>
            <p className="text-xl font-bold text-orange-400">{stats.high}</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] text-slate-500 uppercase">Medium</p>
            <p className="text-xl font-bold text-yellow-400">{stats.medium}</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] text-slate-500 uppercase">Low</p>
            <p className="text-xl font-bold text-slate-400">{stats.low}</p>
          </div>
          <div className="stat-card glow-green">
            <p className="text-[10px] text-slate-500 uppercase">Avg Velocity</p>
            <p className="text-xl font-bold text-neon-green">{stats.avgVelocity}</p>
          </div>
        </div>
      )}

      {/* Top Entity Highlight */}
      {stats?.topEntity && (
        <div className="card bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚀</span>
            <div>
              <p className="text-xs text-slate-500 uppercase">Fastest Moving Entity</p>
              <p className="text-lg font-bold text-white">{stats.topEntity.entity_name}</p>
              <p className="text-sm text-neon-cyan">Velocity: {stats.topEntity.velocity_score}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          className="bg-dark-700 border border-dark-500 text-white text-sm rounded-lg px-3 py-2"
        >
          <option value="all">All Levels</option>
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">⚪ Low</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-dark-700 border border-dark-500 text-white text-sm rounded-lg px-3 py-2"
        >
          <option value="all">All Types</option>
          <option value="trend">🔥 Trends</option>
          <option value="app">📱 Apps</option>
          <option value="forum">🎮 Forums</option>
          <option value="word">💬 Words</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={e => setShowUnreadOnly(e.target.checked)}
            className="rounded"
          />
          Unread only
        </label>
        <span className="text-xs text-slate-500">{filteredAlerts.length} alerts</span>
      </div>

      {/* Alert Feed */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">📋 Alert Feed</h2>
        {filteredAlerts.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No velocity alerts found. Run a velocity scan to detect fast-moving entities.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  LEVEL_COLORS[alert.alert_level] || LEVEL_COLORS.low
                } ${alert.is_read === 0 ? 'opacity-100' : 'opacity-50'}`}
              >
                <span className="text-lg">{LEVEL_ICONS[alert.alert_level] || '⚪'}</span>
                <span className="text-lg">{TYPE_ICONS[alert.entity_type] || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{alert.entity_name}</p>
                  <p className="text-xs text-slate-500">
                    {alert.entity_type} • velocity: {alert.velocity_score.toFixed(1)} • accel: {alert.acceleration.toFixed(1)}%
                    {alert.previous_score > 0 && ` • prev: ${alert.previous_score}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    alert.alert_level === 'critical' ? 'bg-red-500/30 text-red-300' :
                    alert.alert_level === 'high' ? 'bg-orange-500/30 text-orange-300' :
                    alert.alert_level === 'medium' ? 'bg-yellow-500/30 text-yellow-300' :
                    'bg-slate-500/30 text-slate-300'
                  }`}>
                    {alert.alert_level}
                  </span>
                  <span className="text-xs text-slate-600 whitespace-nowrap">
                    {new Date(alert.detected_at).toLocaleDateString()}
                  </span>
                  {alert.is_read === 0 && (
                    <button
                      onClick={() => handleMarkRead(alert.id)}
                      className="text-xs text-slate-500 hover:text-neon-cyan transition-colors"
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
