'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────

interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  recurrence: string;
  region: string;
  impact_score: number;
  categories: string;
  tags: string;
  color: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

interface SeasonalPattern {
  id: number;
  name: string;
  description: string | null;
  pattern_type: string;
  metric: string;
  baseline: number;
  peak_value: number;
  peak_period: string;
  trough_value: number;
  trough_period: string;
  confidence: number;
  sample_size: number;
  data_json: string;
}

interface Milestone {
  id: number;
  title: string;
  description: string | null;
  milestone_type: string;
  entity_type: string;
  entity_name: string;
  metric: string;
  value: number;
  previous_value: number;
  threshold: number;
  significance: number;
  detected_at: string;
  event_title?: string;
  event_date?: string;
}

interface TimelineEntry {
  id: number;
  date: string;
  title: string;
  description: string | null;
  type: 'event' | 'milestone' | 'prediction';
  subtype: string;
  impact: number;
  color: string;
}

interface CalendarStats {
  totalEvents: number;
  upcomingEvents: number;
  upcomingWeek: number;
  activePatterns: number;
  recentMilestones: number;
  eventsByType: Array<{ event_type: string; count: number }>;
  avgImpact: number;
  nextHighImpact: CalendarEvent | null;
}

interface Prediction {
  event_id: number | null;
  event_title: string;
  predicted_date: string;
  metric: string;
  predicted_value: number;
  confidence: number;
  basis: string;
  type: string;
}

// ── Helpers ────────────────────────────────────────────────────

const EVENT_TYPE_COLORS: Record<string, string> = {
  holiday: '#ef4444',
  gaming: '#22c55e',
  sales: '#3b82f6',
  conference: '#eab308',
  seasonal: '#06b6d4',
  default: '#8b5cf6',
};

const EVENT_TYPE_DOTS: Record<string, string> = {
  holiday: '🔴',
  gaming: '🟢',
  sales: '🔵',
  conference: '🟡',
  seasonal: '🟣',
};

function getImpactLabel(score: number): { label: string; className: string } {
  if (score >= 80) return { label: 'High', className: 'bg-red-500/20 text-red-400 border border-red-500/30' };
  if (score >= 50) return { label: 'Medium', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
  return { label: 'Low', className: 'bg-green-500/20 text-green-400 border border-green-500/30' };
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function parseSafeJson(str: string | null | undefined): unknown {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

function formatMetricValue(value: number, metric: string): string {
  if (metric.includes('revenue') || metric === 'ecpm' || metric === 'ad_spend') {
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
    return '$' + value.toFixed(2);
  }
  if (metric.includes('retention') || metric === 'genre_share') return (value * 100).toFixed(1) + '%';
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toLocaleString();
}

// ── Main Page Component ────────────────────────────────────────

export default function CalendarPage() {
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [patterns, setPatterns] = useState<SeasonalPattern[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);

  // Active tab for sections
  const [activeSection, setActiveSection] = useState<'timeline' | 'alerts' | 'patterns' | 'milestones'>('timeline');

  // ── Data Fetching ──────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, eventsRes, patternsRes, milestonesRes, timelineRes, predsRes] = await Promise.all([
        fetch('/api/calendar/stats'),
        fetch('/api/calendar/events'),
        fetch('/api/calendar/patterns'),
        fetch('/api/calendar/milestones'),
        fetch('/api/calendar/timeline'),
        fetch('/api/calendar/predictions'),
      ]);
      const [s, e, p, m, t, pr] = await Promise.all([
        statsRes.json(), eventsRes.json(), patternsRes.json(),
        milestonesRes.json(), timelineRes.json(), predsRes.json(),
      ]);
      setStats(s);
      setEvents(Array.isArray(e) ? e : []);
      setPatterns(Array.isArray(p) ? p : []);
      setMilestones(Array.isArray(m) ? m : []);
      setTimeline(Array.isArray(t) ? t : []);
      setPredictions(Array.isArray(pr) ? pr : []);
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Calendar Grid Logic ────────────────────────────────────

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Map events to days
  const eventsByDay = new Map<number, CalendarEvent[]>();
  for (const ev of events) {
    const evDate = new Date(ev.start_date + 'T00:00:00');
    if (evDate.getFullYear() === viewYear && evDate.getMonth() === viewMonth) {
      const day = evDate.getDate();
      const existing = eventsByDay.get(day) || [];
      existing.push(ev);
      eventsByDay.set(day, existing);
    }
  }

  const isToday = (day: number) =>
    viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
    setSelectedDay(null);
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(null);
  };

  // ── Event CRUD ─────────────────────────────────────────────

  const openAddEvent = (day?: number) => {
    const startDate = day
      ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : new Date().toISOString().slice(0, 10);
    setEditingEvent({ title: '', event_type: 'holiday', start_date: startDate, impact_score: 50, region: 'global', recurrence: 'once' });
    setModalOpen(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEvent({ ...ev });
    setModalOpen(true);
  };

  const saveEvent = async () => {
    if (!editingEvent?.title || !editingEvent?.start_date) return;
    try {
      if (editingEvent.id) {
        await fetch('/api/calendar/events', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingEvent),
        });
      } else {
        await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingEvent),
        });
      }
      setModalOpen(false);
      setEditingEvent(null);
      fetchAll();
    } catch (err) {
      console.error('Failed to save event:', err);
    }
  };

  const deleteEvent = async () => {
    if (!editingEvent?.id) return;
    try {
      await fetch(`/api/calendar/events?id=${editingEvent.id}`, { method: 'DELETE' });
      setModalOpen(false);
      setEditingEvent(null);
      fetchAll();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  // ── Upcoming events (next 30 days) ─────────────────────────

  const nowStr = new Date().toISOString().slice(0, 10);
  const upcomingEvents = events
    .filter(e => e.start_date >= nowStr && daysUntil(e.start_date) <= 30)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  // Selected day events
  const selectedDayEvents = selectedDay ? (eventsByDay.get(selectedDay) || []) : [];

  // ── Loading State ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">📅 Calendar Trends</h1>
            <p className="text-sm text-slate-400 mt-1">Loading calendar data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card animate-pulse h-28" />
          ))}
        </div>
        <div className="card animate-pulse h-96" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">📅 Calendar Trends</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track events, seasonal patterns &amp; engagement milestones
          </p>
        </div>
        <button
          onClick={() => openAddEvent()}
          className="px-4 py-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Add Event
        </button>
      </div>

      {/* ── Stats Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Upcoming Events"
          value={stats?.upcomingEvents ?? 0}
          sub="Next 30 days"
          gradient="from-blue-500 to-cyan-500"
          icon="📆"
        />
        <StatCard
          label="Active Patterns"
          value={stats?.activePatterns ?? 0}
          sub="Confidence ≥ 50%"
          gradient="from-purple-500 to-pink-500"
          icon="🔄"
        />
        <StatCard
          label="Recent Milestones"
          value={stats?.recentMilestones ?? 0}
          sub="Last 7 days"
          gradient="from-amber-500 to-orange-500"
          icon="🎯"
        />
        <StatCard
          label="Next Predicted Spike"
          value={stats?.nextHighImpact ? formatDate(stats.nextHighImpact.start_date as string) : 'N/A'}
          sub={stats?.nextHighImpact ? (stats.nextHighImpact.title as string) : 'No upcoming spikes'}
          gradient="from-emerald-500 to-teal-500"
          icon="🔮"
          isText
        />
      </div>

      {/* ── Calendar Grid + Selected Day ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-dark-600 rounded-lg text-slate-400 hover:text-white transition-colors">
              ◀
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">{monthName}</h2>
              <button onClick={goToToday} className="text-xs px-2 py-1 bg-dark-600 text-slate-400 hover:text-white rounded transition-colors">
                Today
              </button>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-dark-600 rounded-lg text-slate-400 hover:text-white transition-colors">
              ▶
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 rounded-lg" />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsByDay.get(day) || [];
              const isTodayCell = isToday(day);
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`h-20 rounded-lg p-1.5 text-left transition-all border ${
                    isSelected
                      ? 'border-neon-cyan bg-dark-600 ring-1 ring-neon-cyan/50'
                      : isTodayCell
                        ? 'border-neon-cyan/50 bg-dark-700'
                        : 'border-transparent hover:border-dark-400 hover:bg-dark-700'
                  }`}
                >
                  <div className={`text-xs font-medium ${isTodayCell ? 'text-neon-cyan' : 'text-slate-400'}`}>
                    {day}
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((ev, idx) => (
                      <span key={idx} className="text-[10px]" title={ev.title}>
                        {EVENT_TYPE_DOTS[ev.event_type] || '⚪'}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-slate-500">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-dark-500">
            {Object.entries(EVENT_TYPE_DOTS).map(([type, dot]) => (
              <span key={type} className="flex items-center gap-1 text-xs text-slate-400">
                {dot} {type}
              </span>
            ))}
          </div>
        </div>

        {/* Selected Day / Quick Info */}
        <div className="card">
          {selectedDay && selectedDayEvents.length > 0 ? (
            <>
              <h3 className="text-sm font-semibold text-white mb-3">
                {new Date(viewYear, viewMonth, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div className="space-y-3">
                {selectedDayEvents.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => openEditEvent(ev)}
                    className="w-full text-left p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors border border-dark-500"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ev.color || EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.default }} />
                      <span className="text-sm font-medium text-white">{ev.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="capitalize">{ev.event_type}</span>
                      <span>•</span>
                      <span>Impact: {ev.impact_score}</span>
                      <span>•</span>
                      <span>{ev.region}</span>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ev.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : selectedDay ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm mb-3">No events on this day</p>
              <button
                onClick={() => openAddEvent(selectedDay)}
                className="text-xs px-3 py-1.5 bg-dark-600 text-neon-cyan rounded-lg hover:bg-dark-500 transition-colors"
              >
                + Add Event
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">📊 Quick Stats</h3>
              <div className="space-y-2">
                <QuickStat label="Total Events" value={stats?.totalEvents ?? 0} />
                <QuickStat label="This Week" value={stats?.upcomingWeek ?? 0} />
                <QuickStat label="Avg Impact" value={stats?.avgImpact ?? 0} />
                <QuickStat label="Event Types" value={stats?.eventsByType?.length ?? 0} />
              </div>
              {stats?.nextHighImpact && (
                <div className="mt-4 p-3 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg border border-red-500/20">
                  <p className="text-xs text-slate-400 mb-1">🔥 Next High-Impact</p>
                  <p className="text-sm font-medium text-white">{stats.nextHighImpact.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(stats.nextHighImpact.start_date as string)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Section Tabs ──────────────────────────────────── */}
      <div className="flex gap-2 border-b border-dark-500 pb-1">
        {([
          { key: 'timeline', label: '🕐 Timeline', },
          { key: 'alerts', label: '🔔 Upcoming Alerts' },
          { key: 'patterns', label: '🔄 Patterns' },
          { key: 'milestones', label: '🎯 Milestones' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeSection === tab.key
                ? 'bg-dark-700 text-neon-cyan border-b-2 border-neon-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Timeline Section ──────────────────────────────── */}
      {activeSection === 'timeline' && (
        <div className="card overflow-hidden">
          <h3 className="text-sm font-semibold text-white mb-4">Event Timeline</h3>
          {timeline.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No timeline entries</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Timeline bar */}
                <div className="relative pl-8">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-dark-500" />
                  <div className="space-y-4">
                    {timeline.slice(0, 30).map((entry, idx) => {
                      const marker = entry.type === 'event' ? '✅' : entry.type === 'milestone' ? '🎯' : '🔮';
                      const isPast = entry.date < nowStr;
                      return (
                        <div key={`${entry.type}-${entry.id}-${idx}`} className="relative flex gap-3">
                          <div className="absolute -left-5 w-6 h-6 flex items-center justify-center text-sm z-10 bg-dark-800 rounded-full">
                            {marker}
                          </div>
                          <div className={`flex-1 p-3 rounded-lg border transition-colors ${
                            isPast
                              ? 'bg-dark-700/50 border-dark-500/50'
                              : 'bg-dark-700 border-dark-500 hover:border-dark-400'
                          }`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${isPast ? 'text-slate-400' : 'text-white'}`}>
                                {entry.title}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                                  entry.type === 'event' ? 'bg-blue-500/20 text-blue-400' :
                                  entry.type === 'milestone' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-purple-500/20 text-purple-400'
                                }`}>{entry.type}</span>
                                <span className="text-xs text-slate-500">{formatDate(entry.date)}</span>
                              </div>
                            </div>
                            {entry.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{entry.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Upcoming Alerts ───────────────────────────────── */}
      {activeSection === 'alerts' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Upcoming Events (Next 30 Days)</h3>
          {upcomingEvents.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No upcoming events in the next 30 days</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(ev => {
                const days = daysUntil(ev.start_date);
                const impact = getImpactLabel(ev.impact_score);
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-4 p-3 bg-dark-700 rounded-lg border border-dark-500 hover:border-dark-400 transition-colors cursor-pointer"
                    onClick={() => openEditEvent(ev)}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: (EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.default) + '20' }}>
                      {EVENT_TYPE_DOTS[ev.event_type] || '⚪'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{ev.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${impact.className}`}>{impact.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="capitalize">{ev.event_type}</span>
                        <span>•</span>
                        <span>{ev.region}</span>
                        <span>•</span>
                        <span>{formatDate(ev.start_date)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-bold ${days <= 3 ? 'text-red-400' : days <= 7 ? 'text-yellow-400' : 'text-slate-300'}`}>
                        {days}
                      </div>
                      <div className="text-[10px] text-slate-500">days</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Patterns Panel ────────────────────────────────── */}
      {activeSection === 'patterns' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patterns.length === 0 ? (
              <div className="col-span-2 card">
                <p className="text-slate-500 text-sm text-center py-8">No seasonal patterns detected</p>
              </div>
            ) : patterns.map(p => {
              const dataJson = parseSafeJson(p.data_json) as Record<string, unknown> | null;
              let sparkData: Array<{ name: string; value: number }> = [];

              if (dataJson) {
                if (Array.isArray(dataJson.monthly)) {
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  sparkData = (dataJson.monthly as number[]).map((v: number, i: number) => ({
                    name: months[i] || `M${i + 1}`,
                    value: v,
                  }));
                } else if (Array.isArray(dataJson.daily)) {
                  sparkData = (dataJson.daily as string[]).map((d: string) => {
                    const [name, val] = d.split(':');
                    return { name, value: parseInt(val) || 0 };
                  });
                } else if (dataJson.quarterly && typeof dataJson.quarterly === 'object') {
                  sparkData = Object.entries(dataJson.quarterly as Record<string, number>).map(([k, v]) => ({
                    name: k,
                    value: v,
                  }));
                } else if (Array.isArray(dataJson.weekly)) {
                  sparkData = (dataJson.weekly as string[]).map((d: string) => {
                    const [name, val] = d.split(':');
                    return { name, value: parseInt(val) || 0 };
                  });
                }
              }

              return (
                <div key={p.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-white">{p.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 capitalize">{p.pattern_type}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-slate-400">{p.metric}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Confidence</span>
                      <div className="text-sm font-bold text-white">{Math.round(p.confidence * 100)}%</div>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="w-full bg-dark-600 rounded-full h-1.5 mb-3">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple"
                      style={{ width: `${Math.round(p.confidence * 100)}%` }}
                    />
                  </div>

                  {/* Peak / Trough */}
                  <div className="flex justify-between text-xs mb-3">
                    <div>
                      <span className="text-slate-500">Peak: </span>
                      <span className="text-green-400">{formatMetricValue(p.peak_value, p.metric)} ({p.peak_period})</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Trough: </span>
                      <span className="text-red-400">{formatMetricValue(p.trough_value, p.metric)} ({p.trough_period})</span>
                    </div>
                  </div>

                  {/* Sparkline */}
                  {sparkData.length > 0 && (
                    <div className="h-16 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id={`grad-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="value" stroke="#06b6d4" fill={`url(#grad-${p.id})`} strokeWidth={1.5} />
                          <ReTooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                            labelStyle={{ color: '#94a3b8' }}
                            itemStyle={{ color: '#06b6d4' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {p.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.description}</p>
                  )}
                  <div className="text-[10px] text-slate-600 mt-1">Sample size: {p.sample_size}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Milestones Log ────────────────────────────────── */}
      {activeSection === 'milestones' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Engagement Milestones</h3>
          {milestones.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No milestones recorded</p>
          ) : (
            <div className="space-y-3">
              {milestones.map(m => {
                const changePct = m.previous_value > 0
                  ? ((m.value - m.previous_value) / m.previous_value * 100)
                  : 0;
                const isUp = changePct > 0;
                return (
                  <div key={m.id} className="flex items-center gap-4 p-3 bg-dark-700 rounded-lg border border-dark-500">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-amber-500/10">
                      {m.milestone_type === 'threshold' ? '📊' : m.milestone_type === 'spike' ? '📈' : '🏆'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">{m.title}</span>
                        {changePct !== 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isUp ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                        <span className="capitalize">{m.entity_type || 'unknown'}</span>
                        <span>•</span>
                        <span>{m.entity_name}</span>
                        <span>•</span>
                        <span className="capitalize">{m.milestone_type}</span>
                        {m.event_title && (
                          <>
                            <span>•</span>
                            <span className="text-neon-cyan">🔗 {m.event_title}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-white">
                        {formatMetricValue(m.value, m.metric || '')}
                      </div>
                      <div className="text-[10px] text-slate-500">{m.metric}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Predictions Summary ───────────────────────────── */}
      {predictions.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">🔮 Predictions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {predictions.slice(0, 6).map((pred, idx) => (
              <div key={idx} className="p-3 bg-dark-700 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs">{pred.type === 'event_based' ? '📅' : '🔄'}</span>
                  <span className="text-sm font-medium text-white truncate">{pred.event_title}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{formatDate(pred.predicted_date)}</span>
                  <span className="text-purple-400">{Math.round(pred.confidence * 100)}% conf.</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{pred.basis}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Event Editor Modal ────────────────────────────── */}
      {modalOpen && editingEvent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-dark-800 border border-dark-500 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                {editingEvent.id ? 'Edit Event' : 'New Event'}
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Event Name *</label>
                  <input
                    type="text"
                    value={editingEvent.title || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-neon-cyan focus:outline-none"
                    placeholder="Event name"
                  />
                </div>

                {/* Type + Category row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Type</label>
                    <select
                      value={editingEvent.event_type || 'holiday'}
                      onChange={e => setEditingEvent({ ...editingEvent, event_type: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-neon-cyan focus:outline-none"
                    >
                      <option value="holiday">Holiday</option>
                      <option value="gaming">Gaming Event</option>
                      <option value="sales">Sales</option>
                      <option value="conference">Conference</option>
                      <option value="seasonal">Seasonal</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Region</label>
                    <input
                      type="text"
                      value={editingEvent.region || 'global'}
                      onChange={e => setEditingEvent({ ...editingEvent, region: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-neon-cyan focus:outline-none"
                      placeholder="global"
                    />
                  </div>
                </div>

                {/* Dates row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Start Date *</label>
                    <input
                      type="date"
                      value={editingEvent.start_date || ''}
                      onChange={e => setEditingEvent({ ...editingEvent, start_date: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-neon-cyan focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={editingEvent.end_date || ''}
                      onChange={e => setEditingEvent({ ...editingEvent, end_date: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-neon-cyan focus:outline-none"
                    />
                  </div>
                </div>

                {/* Impact + Recurrence */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Impact Score (0-100)</label>
                    <input
                      type="number"
                      min={0} max={100}
                      value={editingEvent.impact_score ?? 50}
                      onChange={e => setEditingEvent({ ...editingEvent, impact_score: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-neon-cyan focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Recurrence</label>
                    <select
                      value={editingEvent.recurrence || 'once'}
                      onChange={e => setEditingEvent({ ...editingEvent, recurrence: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-neon-cyan focus:outline-none"
                    >
                      <option value="once">Once</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Description</label>
                  <textarea
                    value={editingEvent.description || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-neon-cyan focus:outline-none h-20 resize-none"
                    placeholder="Event description..."
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={(() => {
                      try {
                        const tags = JSON.parse(editingEvent.tags || '[]');
                        return Array.isArray(tags) ? tags.join(', ') : '';
                      } catch { return ''; }
                    })()}
                    onChange={e => setEditingEvent({
                      ...editingEvent,
                      tags: JSON.stringify(e.target.value.split(',').map(t => t.trim()).filter(Boolean)),
                    })}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-neon-cyan focus:outline-none"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-dark-500">
                <div>
                  {editingEvent.id && (
                    <button
                      onClick={deleteEvent}
                      className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setModalOpen(false); setEditingEvent(null); }}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-dark-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEvent}
                    disabled={!editingEvent.title || !editingEvent.start_date}
                    className="px-4 py-2 text-sm text-white bg-gradient-to-r from-neon-cyan to-neon-purple rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {editingEvent.id ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub Components ───────────────────────────────────────────

function StatCard({ label, value, sub, gradient, icon, isText }: {
  label: string; value: string | number; sub: string; gradient: string; icon: string; isText?: boolean;
}) {
  return (
    <div className="card relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">{label}</span>
          <span className="text-lg">{icon}</span>
        </div>
        <div className={`font-bold ${isText ? 'text-lg' : 'text-2xl'} text-white`}>
          {value}
        </div>
        <p className="text-xs text-slate-500 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 bg-dark-700 rounded-lg">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}
