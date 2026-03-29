'use client';

import { useState, useEffect, useCallback } from 'react';

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
}

interface CalendarStats {
  totalEvents: number;
  upcomingEvents: number;
  upcomingWeek: number;
  activePatterns: number;
  recentMilestones: number;
  eventsByType: Array<{ event_type: string; count: number }>;
  eventsByRegion: Array<{ region: string; count: number }>;
  avgImpact: number;
  nextHighImpact: CalendarEvent | null;
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
}

interface Milestone {
  id: number;
  title: string;
  description: string | null;
  milestone_type: string;
  entity_type: string | null;
  entity_id: number | null;
  entity_name: string | null;
  metric: string | null;
  value: number;
  previous_value: number;
  threshold: number;
  significance: number;
  detected_at: string;
  event_title: string | null;
  event_date: string | null;
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
  entity_link?: { type: string; id: number; name: string } | null;
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

// ── Helpers ──────────────────────────────────────────────────────

const EVENT_TYPE_ICONS: Record<string, string> = {
  holiday: '🎄',
  conference: '🎤',
  sale: '🏷️',
  cultural: '🌍',
  gaming: '🎮',
  school: '🎒',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  holiday: 'bg-red-500/20 text-red-400 border-red-500/30',
  conference: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  sale: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cultural: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  gaming: 'bg-green-500/20 text-green-400 border-green-500/30',
  school: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

const MILESTONE_TYPE_ICONS: Record<string, string> = {
  threshold: '🎯',
  spike: '📈',
  streak: '🔥',
  record: '🏆',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function safeParse(json: string): unknown[] {
  try { return JSON.parse(json); } catch { return []; }
}

// ── Main Component ──────────────────────────────────────────────

export default function CalendarPage() {
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [patterns, setPatterns] = useState<SeasonalPattern[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar grid state
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Quick view
  const [quickView, setQuickView] = useState<'month' | 'week'>('month');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, eventsRes, patternsRes, milestonesRes, timelineRes, predsRes] = await Promise.all([
        fetch('/api/calendar/stats'),
        fetch('/api/calendar/events'),
        fetch('/api/calendar/patterns'),
        fetch('/api/calendar/milestones?limit=20'),
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
      console.error('Failed to load calendar data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Events for the current grid month
  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const eventsInMonth = events.filter(ev => {
    return ev.start_date >= monthStart && ev.start_date <= monthEnd;
  });

  // Group events by day
  const eventsByDay: Record<string, CalendarEvent[]> = {};
  for (const ev of eventsInMonth) {
    const day = ev.start_date;
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(ev);
  }

  // Selected day events
  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  // Quick view filter for upcoming alerts
  const today = now.toISOString().slice(0, 10);
  const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const monthFromNow = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const alertCutoff = quickView === 'week' ? weekFromNow : monthFromNow;
  const upcomingAlerts = events
    .filter(ev => ev.start_date >= today && ev.start_date <= alertCutoff)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 10);

  // ── Modal handlers ──────────────────────────────────────────

  async function handleSaveEvent() {
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
      fetchData();
    } catch (err) {
      console.error('Failed to save event:', err);
    }
  }

  async function handleDeleteEvent(id: number) {
    if (!confirm('Delete this event?')) return;
    try {
      await fetch(`/api/calendar/events?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  }

  // ── Calendar Grid ──────────────────────────────────────────

  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    setSelectedDay(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse text-lg">Loading Calendar Trends...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">📅 Calendar Trends</h1>
          <p className="text-slate-400 text-sm mt-1">Seasonal intelligence & engagement forecasting</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/correlations" className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all">🔗 Cross-Platform</a>
          <a href="/api/export?type=csv&source=calendar" className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-500 rounded-lg text-slate-300 hover:text-white hover:border-neon-cyan transition-all">📥 Export</a>
          <div className="flex bg-dark-700 rounded-lg p-0.5">
            <button
              onClick={() => setQuickView('week')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${quickView === 'week' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-slate-400 hover:text-white'}`}
            >
              This Week
            </button>
            <button
              onClick={() => setQuickView('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${quickView === 'month' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-slate-400 hover:text-white'}`}
            >
              This Month
            </button>
          </div>
          <button
            onClick={() => { setEditingEvent({ event_type: 'holiday', recurrence: 'once', region: 'global', impact_score: 50, color: '#3b82f6' }); setModalOpen(true); }}
            className="px-4 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg text-sm font-medium hover:bg-neon-cyan/30 transition"
          >
            + Add Event
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Upcoming Events" value={stats?.upcomingEvents || 0} subtitle={`${stats?.upcomingWeek || 0} this week`} icon="📆" color="cyan" />
        <StatCard title="Active Patterns" value={stats?.activePatterns || 0} subtitle={`${patterns.length} total detected`} icon="🔄" color="purple" />
        <StatCard title="Recent Milestones" value={stats?.recentMilestones || 0} subtitle="last 7 days" icon="🏆" color="amber" />
        <StatCard
          title="Next Predicted Spike"
          value={predictions.length > 0 ? `${Math.round(predictions[0].confidence * 100)}%` : 'N/A'}
          subtitle={predictions.length > 0 ? predictions[0].event_title.slice(0, 30) : 'No predictions'}
          icon="📈"
          color="green"
        />
      </div>

      {/* Main Grid: Calendar + Selected Day */}
      <div className="grid grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="col-span-2 bg-dark-800 rounded-xl border border-dark-500 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-dark-600 rounded-lg text-slate-400 hover:text-white transition">←</button>
            <h2 className="text-lg font-semibold text-white">{monthNames[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-dark-600 rounded-lg text-slate-400 hover:text-white transition">→</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 rounded-lg" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDay[dateStr] || [];
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDay;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(dateStr === selectedDay ? null : dateStr)}
                  className={`h-20 rounded-lg p-1.5 text-left transition-all border ${
                    isSelected ? 'border-neon-cyan bg-neon-cyan/10' :
                    isToday ? 'border-neon-cyan/50 bg-dark-700' :
                    dayEvents.length > 0 ? 'border-dark-400 bg-dark-700 hover:border-dark-300' :
                    'border-transparent hover:bg-dark-700/50'
                  }`}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-neon-cyan' : isSelected ? 'text-white' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 3).map((ev, j) => (
                      <div
                        key={j}
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ev.color || '#3b82f6' }}
                        title={ev.title}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-slate-500">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="mt-0.5 text-[10px] text-slate-400 truncate">{dayEvents[0].title}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Detail / Upcoming Alerts */}
        <div className="space-y-4">
          {selectedDay && selectedDayEvents.length > 0 ? (
            <div className="bg-dark-800 rounded-xl border border-dark-500 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">{formatDate(selectedDay)}</h3>
              <div className="space-y-2">
                {selectedDayEvents.map(ev => (
                  <div key={ev.id} className={`p-3 rounded-lg border ${EVENT_TYPE_COLORS[ev.event_type] || 'bg-dark-700 text-slate-300 border-dark-500'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span>{EVENT_TYPE_ICONS[ev.event_type] || '📌'}</span>
                        <span className="text-sm font-medium">{ev.title}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingEvent(ev); setModalOpen(true); }}
                          className="text-xs px-2 py-0.5 rounded bg-dark-600 text-slate-400 hover:text-white transition"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="text-xs px-2 py-0.5 rounded bg-dark-600 text-slate-400 hover:text-red-400 transition"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {ev.description && <p className="text-xs mt-1 opacity-80">{ev.description}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                      <span>Impact: {ev.impact_score}</span>
                      <span>•</span>
                      <span>{ev.region}</span>
                      <span>•</span>
                      <span>{ev.recurrence}</span>
                    </div>
                    {ev.categories && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(safeParse(ev.categories) as string[]).map((c, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-dark-900/50">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-dark-800 rounded-xl border border-dark-500 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                🔔 Upcoming Alerts
                <span className="text-xs text-slate-500 ml-2">({quickView === 'week' ? 'This Week' : 'This Month'})</span>
              </h3>
              {upcomingAlerts.length === 0 ? (
                <p className="text-xs text-slate-500">No upcoming events</p>
              ) : (
                <div className="space-y-2">
                  {upcomingAlerts.map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition">
                      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color || '#3b82f6' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">{ev.title}</div>
                        <div className="text-[10px] text-slate-500">{formatDate(ev.start_date)}</div>
                      </div>
                      <div className="flex-shrink-0">
                        <ImpactBadge score={ev.impact_score} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Event Type Breakdown */}
          <div className="bg-dark-800 rounded-xl border border-dark-500 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">📊 Events by Type</h3>
            <div className="space-y-2">
              {(stats?.eventsByType || []).map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{EVENT_TYPE_ICONS[t.event_type] || '📌'}</span>
                    <span className="text-xs text-slate-300 capitalize">{t.event_type}</span>
                  </div>
                  <span className="text-xs font-medium text-white">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-dark-800 rounded-xl border border-dark-500 p-4">
        <h3 className="text-sm font-semibold text-white mb-4">📍 Timeline</h3>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {timeline.map((entry, i) => {
              const isPast = entry.date < today;
              return (
                <div
                  key={`${entry.type}-${entry.id}-${i}`}
                  className={`flex-shrink-0 w-48 p-3 rounded-lg border transition ${
                    entry.type === 'prediction' ? 'border-purple-500/30 bg-purple-500/5' :
                    entry.type === 'milestone' ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-dark-400 bg-dark-700'
                  } ${isPast ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color || '#3b82f6' }} />
                    <span className="text-[10px] font-medium text-slate-500">{formatDate(entry.date)}</span>
                    {entry.type === 'prediction' && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400">predicted</span>}
                    {entry.type === 'milestone' && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">milestone</span>}
                  </div>
                  <div className="text-xs font-medium text-white truncate">{entry.title}</div>
                  {entry.description && <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{entry.description}</div>}
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex-1 h-1 rounded-full bg-dark-600 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, entry.impact)}%`, backgroundColor: entry.color || '#3b82f6' }} />
                    </div>
                    <span className="text-[9px] text-slate-500">{entry.impact}</span>
                  </div>
                </div>
              );
            })}
            {timeline.length === 0 && (
              <div className="text-xs text-slate-500 py-4">No timeline entries yet. Add events or run detection.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Patterns + Milestones */}
      <div className="grid grid-cols-2 gap-6">
        {/* Patterns Panel */}
        <div className="bg-dark-800 rounded-xl border border-dark-500 p-4">
          <h3 className="text-sm font-semibold text-white mb-4">🔄 Seasonal Patterns</h3>
          {patterns.length === 0 ? (
            <p className="text-xs text-slate-500">No patterns detected yet. Run the pattern detector.</p>
          ) : (
            <div className="space-y-3">
              {patterns.map(p => (
                <div key={p.id} className="p-3 rounded-lg bg-dark-700 border border-dark-500">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">{p.name}</span>
                    <ConfidenceBadge confidence={p.confidence} />
                  </div>
                  {p.description && <p className="text-[10px] text-slate-500 mb-2">{p.description}</p>}
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-500">Baseline</span>
                      <div className="text-slate-300 font-medium">{p.baseline.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-green-500">Peak</span>
                      <div className="text-green-400 font-medium">{p.peak_value.toLocaleString()}</div>
                      <div className="text-slate-600">{p.peak_period}</div>
                    </div>
                    <div>
                      <span className="text-red-500">Trough</span>
                      <div className="text-red-400 font-medium">{p.trough_value.toLocaleString()}</div>
                      <div className="text-slate-600">{p.trough_period}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                    <span className="capitalize">{p.pattern_type}</span>
                    <span>•</span>
                    <span>{p.metric}</span>
                    <span>•</span>
                    <span>{p.sample_size} samples</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Milestones Log */}
        <div className="bg-dark-800 rounded-xl border border-dark-500 p-4">
          <h3 className="text-sm font-semibold text-white mb-4">🏆 Engagement Milestones</h3>
          {milestones.length === 0 ? (
            <p className="text-xs text-slate-500">No milestones detected yet. Run the milestone tracker.</p>
          ) : (
            <div className="space-y-2">
              {milestones.map(m => (
                <div key={m.id} className="p-3 rounded-lg bg-dark-700 border border-dark-500">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{MILESTONE_TYPE_ICONS[m.milestone_type] || '📌'}</span>
                    <span className="text-xs font-medium text-white flex-1 truncate">{m.title}</span>
                    <span className="text-[10px] text-slate-500">{formatDate(m.detected_at.slice(0, 10))}</span>
                  </div>
                  {m.description && <p className="text-[10px] text-slate-500 mb-1">{m.description}</p>}
                  <div className="flex items-center gap-3 text-[10px]">
                    {m.entity_type && m.entity_name && (
                      <span className="px-1.5 py-0.5 rounded bg-dark-600 text-slate-400">
                        {m.entity_type}: {m.entity_name}
                      </span>
                    )}
                    {m.metric && (
                      <span className="text-slate-500">{m.metric}: {m.value.toLocaleString()}</span>
                    )}
                    <span className="ml-auto"><SignificanceBadge value={m.significance} /></span>
                  </div>
                  {m.event_title && (
                    <div className="mt-1 text-[10px] text-purple-400">
                      🔗 Linked to: {m.event_title} ({m.event_date ? formatDate(m.event_date) : 'N/A'})
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Editor Modal */}
      {modalOpen && editingEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="bg-dark-800 border border-dark-500 rounded-xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">{editingEvent.id ? 'Edit Event' : 'Create Event'}</h3>
            <div className="space-y-3">
              <ModalField label="Title" value={editingEvent.title || ''} onChange={v => setEditingEvent({ ...editingEvent, title: v })} />
              <ModalField label="Description" value={editingEvent.description || ''} onChange={v => setEditingEvent({ ...editingEvent, description: v })} textarea />
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Start Date" value={editingEvent.start_date || ''} onChange={v => setEditingEvent({ ...editingEvent, start_date: v })} type="date" />
                <ModalField label="End Date" value={editingEvent.end_date || ''} onChange={v => setEditingEvent({ ...editingEvent, end_date: v })} type="date" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <ModalSelect label="Type" value={editingEvent.event_type || 'holiday'} onChange={v => setEditingEvent({ ...editingEvent, event_type: v })} options={['holiday', 'conference', 'sale', 'cultural', 'gaming', 'school']} />
                <ModalSelect label="Recurrence" value={editingEvent.recurrence || 'once'} onChange={v => setEditingEvent({ ...editingEvent, recurrence: v })} options={['once', 'weekly', 'monthly', 'quarterly', 'yearly']} />
                <ModalField label="Region" value={editingEvent.region || 'global'} onChange={v => setEditingEvent({ ...editingEvent, region: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Impact Score ({editingEvent.impact_score || 50})</label>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={editingEvent.impact_score || 50}
                    onChange={e => setEditingEvent({ ...editingEvent, impact_score: parseInt(e.target.value) })}
                    className="w-full accent-neon-cyan"
                  />
                </div>
                <ModalField label="Color" value={editingEvent.color || '#3b82f6'} onChange={v => setEditingEvent({ ...editingEvent, color: v })} type="color" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setModalOpen(false); setEditingEvent(null); }} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition">Cancel</button>
              <button onClick={handleSaveEvent} className="px-4 py-2 rounded-lg text-sm bg-neon-cyan/20 text-neon-cyan font-medium hover:bg-neon-cyan/30 transition">
                {editingEvent.id ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StatCard({ title, value, subtitle, icon, color }: { title: string; value: string | number; subtitle: string; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: 'text-neon-cyan border-neon-cyan/20',
    purple: 'text-purple-400 border-purple-500/20',
    amber: 'text-amber-400 border-amber-500/20',
    green: 'text-green-400 border-green-500/20',
  };
  return (
    <div className={`bg-dark-800 rounded-xl border p-4 ${colorClasses[color] || 'border-dark-500'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-slate-400">{title}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
    </div>
  );
}

function ImpactBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-red-400 bg-red-500/20' : score >= 60 ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 bg-dark-600';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>{score}</span>;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? 'text-green-400 bg-green-500/20' : pct >= 50 ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 bg-dark-600';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>{pct}%</span>;
}

function SignificanceBadge({ value }: { value: number }) {
  const color = value >= 80 ? 'text-red-400' : value >= 60 ? 'text-amber-400' : 'text-slate-400';
  return <span className={`text-[10px] font-medium ${color}`}>⚡ {Math.round(value)}</span>;
}

function ModalField({ label, value, onChange, type, textarea }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan focus:outline-none resize-none"
        />
      ) : (
        <input
          type={type || 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan focus:outline-none"
        />
      )}
    </div>
  );
}

function ModalSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan focus:outline-none"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
