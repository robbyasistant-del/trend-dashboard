'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalTrends: number;
  activeAlerts: number;
  upcomingEvents: number;
  trackedCompetitors: number;
}

interface VelocityAlert {
  id: number;
  entity_type: string;
  entity_name: string;
  velocity_score: number;
  acceleration: number;
  alert_level: string;
  is_read: number;
  detected_at: string;
}

interface TrendItem {
  id: number;
  title: string;
  viral_score: number;
  category: string;
  lifecycle: string;
  source: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  start_date: string;
  event_type: string;
  impact_score: number;
  color: string;
}

const NAV_CARDS = [
  { href: '/trends', label: 'Viral Trends', icon: '🔥', desc: 'Track viral content across platforms', color: 'from-red-500/20 to-orange-500/20', border: 'border-red-500/30' },
  { href: '/words', label: 'Word Trends', icon: '💬', desc: 'Monitor trending keywords & phrases', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
  { href: '/forums', label: 'Games Forums', icon: '🎮', desc: 'Forum sentiment & hot topics', color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30' },
  { href: '/apps-market', label: 'Apps Market', icon: '📱', desc: 'App rankings & market moves', color: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/30' },
  { href: '/regions', label: 'Region Analysis', icon: '🗺️', desc: 'Geographic trend distribution', color: 'from-amber-500/20 to-yellow-500/20', border: 'border-amber-500/30' },
  { href: '/calendar', label: 'Calendar Trends', icon: '📅', desc: 'Seasonal patterns & events', color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30' },
  { href: '/crons', label: 'Cron Settings', icon: '⚙️', desc: 'Automated data collection', color: 'from-slate-500/20 to-gray-500/20', border: 'border-slate-500/30' },
];

const ALERT_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const ALERT_ICONS: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '⚪',
};

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<VelocityAlert[]>([]);
  const [trending, setTrending] = useState<TrendItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, alertsRes, trendsRes, eventsRes] = await Promise.all([
          fetch('/api/velocity/stats').then(r => r.json()).catch(() => null),
          fetch('/api/velocity?unread_only=true&limit=5').then(r => r.json()).catch(() => []),
          fetch('/api/trends?limit=8').then(r => r.json()).catch(() => []),
          fetch('/api/calendar?limit=7').then(r => r.json()).catch(() => []),
        ]);

        // Build dashboard stats from various sources
        const trendCountRes = await fetch('/api/trends?limit=1').then(r => r.json()).catch(() => []);
        const competitorsRes = await fetch('/api/competitors?enabled_only=true&limit=1').then(r => r.json()).catch(() => []);

        setStats({
          totalTrends: Array.isArray(trendCountRes) ? trendCountRes.length : 0,
          activeAlerts: statsRes?.unread || 0,
          upcomingEvents: Array.isArray(eventsRes) ? eventsRes.length : 0,
          trackedCompetitors: Array.isArray(competitorsRes) ? competitorsRes.length : 0,
        });

        setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
        setTrending(Array.isArray(trendsRes) ? trendsRes.map((t: Record<string, unknown>) => ({
          id: t.id as number,
          title: t.title as string,
          viral_score: t.viral_score as number,
          category: (t.category as string) || 'general',
          lifecycle: (t.lifecycle as string) || 'emerging',
          source: 'trend',
        })) : []);
        setEvents(Array.isArray(eventsRes) ? eventsRes : []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Casual Games Intelligence — All sources at a glance</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/export?type=json&source=trends"
            className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-white hover:border-neon-cyan transition-all"
          >
            📥 Export JSON
          </a>
          <a
            href="/api/export?type=csv&source=trends"
            className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-white hover:border-neon-cyan transition-all"
          >
            📄 Export CSV
          </a>
        </div>
      </div>

      {/* Global Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🔥" label="Total Trends" value={stats?.totalTrends ?? 0} color="text-neon-cyan" glow="glow-cyan" />
        <StatCard icon="⚡" label="Active Alerts" value={stats?.activeAlerts ?? 0} color="text-amber-400" glow="glow-amber" highlight={stats?.activeAlerts ? stats.activeAlerts > 0 : false} />
        <StatCard icon="📅" label="Upcoming Events" value={stats?.upcomingEvents ?? 0} color="text-neon-green" glow="glow-green" />
        <StatCard icon="🏢" label="Tracked Competitors" value={stats?.trackedCompetitors ?? 0} color="text-neon-purple" glow="glow-purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Velocity Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              ⚡ Recent Alerts
            </h2>
            <span className="text-xs text-slate-500">{alerts.length} unread</span>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No active alerts</p>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 5).map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${ALERT_COLORS[alert.alert_level] || ALERT_COLORS.low} ${
                    alert.is_read === 0 ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <span className="text-lg">{ALERT_ICONS[alert.alert_level] || '⚪'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.entity_name}</p>
                    <p className="text-xs text-slate-500">
                      {alert.entity_type} • velocity: {alert.velocity_score.toFixed(1)} • {alert.alert_level}
                    </p>
                  </div>
                  <span className="text-xs text-slate-600 whitespace-nowrap">
                    {new Date(alert.detected_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Trending Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              🔥 Top Trending
            </h2>
            <Link href="/trends" className="text-xs text-neon-cyan hover:underline">View all →</Link>
          </div>
          {trending.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No trends yet</p>
          ) : (
            <div className="space-y-2">
              {trending.slice(0, 6).map((item, i) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-700 transition-colors">
                  <span className="text-xs font-bold text-slate-600 w-5 text-right">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.category || 'general'} • {item.lifecycle || 'emerging'}</p>
                  </div>
                  <span className={`score-badge ${
                    item.viral_score >= 70 ? 'score-high' : item.viral_score >= 40 ? 'score-med' : 'score-low'
                  }`}>
                    {item.viral_score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            📅 Upcoming Events (Next 7 Days)
          </h2>
          <Link href="/calendar" className="text-xs text-neon-cyan hover:underline">Calendar →</Link>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No upcoming events</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {events.slice(0, 8).map(ev => (
              <div key={ev.id} className="p-3 rounded-lg bg-dark-700 border border-dark-500 hover:border-neon-cyan/30 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ev.color || '#3b82f6' }} />
                  <span className="text-xs text-slate-500">{ev.start_date}</span>
                </div>
                <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase text-slate-600">{ev.event_type}</span>
                  <span className="text-xs text-neon-cyan">Impact: {ev.impact_score}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">🧭 Quick Navigation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {NAV_CARDS.map(card => (
            <Link
              key={card.href}
              href={card.href}
              className={`p-4 rounded-xl border ${card.border} bg-gradient-to-br ${card.color} hover:scale-[1.02] transition-all group`}
            >
              <div className="text-2xl mb-2">{card.icon}</div>
              <h3 className="text-sm font-bold text-white group-hover:text-neon-cyan transition-colors">{card.label}</h3>
              <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, glow, highlight }: {
  icon: string; label: string; value: number; color: string; glow: string; highlight?: boolean;
}) {
  return (
    <div className={`stat-card ${glow} ${highlight ? 'pulse-neon' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
