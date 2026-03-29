'use client';

import { useEffect, useState } from 'react';

interface CronConfig {
  id: number; name: string; description: string; prompt: string; schedule: string;
  agent: string; source_type: string; target_dashboard: string | null; enabled: number;
  last_run: string; created_at: string; updated_at: string;
}

// Dashboard sections from sidebar — used for cron→dashboard relationship labels
const DASHBOARD_OPTIONS = [
  { value: 'trends',      label: 'Viral Trends',     icon: '🔥' },
  { value: 'regions',     label: 'Region Analysis',  icon: '🗺️' },
  { value: 'calendar',    label: 'Calendar Trends',  icon: '📅' },
  { value: 'words',       label: 'Words Trends',     icon: '💬' },
  { value: 'forums',      label: 'Games Forums',     icon: '🎮' },
  { value: 'apps-market', label: 'Apps Market',      icon: '📱' },
] as const;

function getDashboard(key: string | null) {
  return DASHBOARD_OPTIONS.find(d => d.value === key) || null;
}

interface CronRun {
  id: number; cron_config_id: number; cron_name?: string; cron_dashboard?: string | null;
  status: string; output: string; output_file: string | null;
  items_processed: number; error: string;
  started_at: string; completed_at: string; created_at: string;
}

interface RunStats {
  total: number; success: number; errors: number; pending: number; totalItems: number;
}

const SCHEDULE_PRESETS = [
  { label: 'Every 15 min', value: '*/15 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily 9 AM', value: '0 9 * * *' },
  { label: 'Twice daily', value: '0 9,18 * * *' },
  { label: 'Weekly Mon 9 AM', value: '0 9 * * 1' },
];

const AGENT_OPTIONS = ['default', 'claude-sonnet', 'gpt-4o', 'gemini-flash', 'kimi-k2'];

// ── Helpers ────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  if (diff < 0) return 'just now';
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function duration(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  if (mins < 60) return `${mins}m ${remSecs}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  success: { label: 'Success', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  error:   { label: 'Error',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',     dot: 'bg-red-400' },
  pending: { label: 'Pending', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400 animate-pulse' },
  running: { label: 'Running', color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',   dot: 'bg-blue-400 animate-pulse' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

// ── Components ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-16">
      <p className="text-4xl mb-4">⚙️</p>
      <p className="text-slate-400 text-lg mb-2">No cron jobs configured yet</p>
      <p className="text-slate-600 text-sm">Create your first agent cron to start collecting trend data</p>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color?: string }) {
  return (
    <div className="bg-dark-800 border border-dark-500 rounded-lg px-4 py-3 flex items-center gap-3 min-w-0">
      <span className="text-lg">{icon}</span>
      <div className="min-w-0">
        <div className={`text-lg font-semibold ${color || 'text-white'}`}>{value}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function CronsPage() {
  const [configs, setConfigs] = useState<CronConfig[]>([]);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [runStats, setRunStats] = useState<RunStats | null>(null);
  const [editing, setEditing] = useState<Partial<CronConfig> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'configs' | 'runs'>('configs');

  // Run History filters & state
  const [filterCron, setFilterCron] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedRun, setExpandedRun] = useState<number | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [cfgRes, runsRes] = await Promise.all([
        fetch('/api/crons'),
        fetch('/api/crons/runs?stats=true&limit=100'),
      ]);
      setConfigs(await cfgRes.json());
      const runsData = await runsRes.json();
      if (runsData.runs) {
        setRuns(runsData.runs);
        setRunStats(runsData.stats);
      } else {
        setRuns(runsData);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function saveConfig() {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/crons', {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    fetchData();
  }

  async function deleteConfig(id: number) {
    if (!confirm('Delete this cron configuration?')) return;
    await fetch(`/api/crons?id=${id}`, { method: 'DELETE' });
    fetchData();
  }

  async function toggleEnabled(config: CronConfig) {
    await fetch('/api/crons', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: config.id, enabled: config.enabled ? 0 : 1 }),
    });
    fetchData();
  }

  async function processInbox() {
    const res = await fetch('/api/ingest/process', { method: 'POST' });
    const data = await res.json();
    alert(`Processed: ${data.processed} files${data.errors?.length ? `\nErrors: ${data.errors.join(', ')}` : ''}`);
    fetchData();
  }

  // Filter runs client-side
  const filteredRuns = runs.filter(r => {
    if (filterCron !== 'all' && String(r.cron_config_id) !== filterCron) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const successRate = runStats && runStats.total > 0
    ? Math.round((runStats.success / runStats.total) * 100)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">⚙️ Crons Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure agent crons that generate trend data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={processInbox} className="px-4 py-2 bg-dark-600 hover:bg-dark-500 border border-dark-500 rounded-lg text-sm text-slate-300">
            📥 Process Inbox
          </button>
          <button onClick={() => setEditing({ enabled: 1, agent: 'default', schedule: '0 */6 * * *' })}
            className="px-4 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/30 rounded-lg text-sm text-neon-cyan font-medium">
            + New Cron
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-dark-800 p-1 rounded-lg w-fit">
        {(['configs', 'runs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-dark-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            {t === 'configs' ? 'Configurations' : `Run History${runStats ? ` (${runStats.total})` : ''}`}
          </button>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">{editing.id ? 'Edit' : 'New'} Cron Configuration</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Name</label>
                <input className="w-full" placeholder="e.g. Reddit Casual Games Scanner" value={editing.name || ''}
                  onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Description</label>
                <input className="w-full" placeholder="Brief description" value={editing.description || ''}
                  onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Prompt (what the agent will do)</label>
                <textarea className="w-full h-28 resize-none" placeholder="Search Reddit for trending casual game discussions..."
                  value={editing.prompt || ''} onChange={e => setEditing(p => ({ ...p!, prompt: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Schedule</label>
                  <select className="w-full" value={editing.schedule || ''}
                    onChange={e => setEditing(p => ({ ...p!, schedule: e.target.value }))}>
                    <option value="">Select preset...</option>
                    {SCHEDULE_PRESETS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Agent</label>
                  <select className="w-full" value={editing.agent || 'default'}
                    onChange={e => setEditing(p => ({ ...p!, agent: e.target.value }))}>
                    {AGENT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Source Type</label>
                  <input className="w-full" placeholder="e.g. reddit, twitter, appstore" value={editing.source_type || ''}
                    onChange={e => setEditing(p => ({ ...p!, source_type: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Target Dashboard</label>
                  <select className="w-full" value={editing.target_dashboard || ''}
                    onChange={e => setEditing(p => ({ ...p!, target_dashboard: e.target.value || null }))}>
                    <option value="">None</option>
                    {DASHBOARD_OPTIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveConfig}
                className="flex-1 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/30 rounded-lg text-sm text-neon-cyan font-medium">
                {editing.id ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setEditing(null)}
                className="px-4 py-2 bg-dark-600 hover:bg-dark-500 rounded-lg text-sm text-slate-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : tab === 'configs' ? (
        /* ═══════════════════════════════════════════════════════
           CONFIGURATIONS TAB
           ═══════════════════════════════════════════════════════ */
        configs.length === 0 ? <EmptyState /> : (
          <div className="space-y-3">
            {configs.map(cfg => (
              <div key={cfg.id} className="card flex items-center gap-4">
                <div className={`toggle-switch ${cfg.enabled ? 'active' : ''}`}
                  onClick={() => toggleEnabled(cfg)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{cfg.name}</h3>
                    {cfg.target_dashboard && (() => {
                      const dash = getDashboard(cfg.target_dashboard);
                      return dash ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-0.5 rounded-full text-neon-cyan">
                          <span>{dash.icon}</span>
                          <span>{dash.label}</span>
                        </span>
                      ) : null;
                    })()}
                    <span className="text-xs bg-dark-600 px-2 py-0.5 rounded text-slate-400">{cfg.agent}</span>
                    {cfg.source_type && <span className="text-xs bg-dark-600 px-2 py-0.5 rounded text-slate-400">{cfg.source_type}</span>}
                  </div>
                  {cfg.description && <p className="text-sm text-slate-500 truncate">{cfg.description}</p>}
                  <div className="flex gap-3 text-xs text-slate-600 mt-1">
                    <span>⏰ {cfg.schedule}</span>
                    {cfg.last_run && <span>Last: {new Date(cfg.last_run).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(cfg)} className="p-2 hover:bg-dark-600 rounded-lg text-slate-500 hover:text-white text-sm">✏️</button>
                  <button onClick={() => deleteConfig(cfg.id)} className="p-2 hover:bg-dark-600 rounded-lg text-slate-500 hover:text-red-400 text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ═══════════════════════════════════════════════════════
           RUN HISTORY TAB (enhanced)
           ═══════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {/* Stats bar */}
          {runStats && runStats.total > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon="📊" label="Total Runs" value={runStats.total} />
              <StatCard icon="✅" label="Success Rate" value={`${successRate}%`} color={successRate >= 80 ? 'text-emerald-400' : successRate >= 50 ? 'text-amber-400' : 'text-red-400'} />
              <StatCard icon="❌" label="Errors" value={runStats.errors} color={runStats.errors > 0 ? 'text-red-400' : 'text-slate-400'} />
              <StatCard icon="📦" label="Items Processed" value={runStats.totalItems.toLocaleString()} />
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Cron:</label>
              <select className="text-xs bg-dark-800 border border-dark-500 rounded-md px-2 py-1.5 text-slate-300"
                value={filterCron} onChange={e => setFilterCron(e.target.value)}>
                <option value="all">All crons</option>
                {configs.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Status:</label>
              <select className="text-xs bg-dark-800 border border-dark-500 rounded-md px-2 py-1.5 text-slate-300"
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="success">✅ Success</option>
                <option value="error">❌ Error</option>
                <option value="pending">⏳ Pending</option>
                <option value="running">🔄 Running</option>
              </select>
            </div>
            <span className="text-xs text-slate-600 ml-auto">
              {filteredRuns.length} run{filteredRuns.length !== 1 ? 's' : ''}
              {(filterCron !== 'all' || filterStatus !== 'all') ? ' (filtered)' : ''}
            </span>
          </div>

          {/* Runs list */}
          {filteredRuns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-slate-400">
                {runs.length === 0 ? 'No runs yet' : 'No runs match your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRuns.map(run => {
                const sc = getStatusConfig(run.status);
                const isExpanded = expandedRun === run.id;
                const dash = getDashboard(run.cron_dashboard || null);

                return (
                  <div key={run.id} className="card p-0 overflow-hidden">
                    {/* Main row — clickable to expand */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-dark-700/50 transition-colors"
                      onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                    >
                      {/* Status dot */}
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />

                      {/* Cron name + dashboard badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {run.cron_name || `Cron #${run.cron_config_id}`}
                          </span>
                          {dash && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-neon-cyan/10 border border-neon-cyan/20 px-1.5 py-0.5 rounded-full text-neon-cyan flex-shrink-0">
                              <span>{dash.icon}</span>
                              <span className="hidden sm:inline">{dash.label}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span title={run.started_at ? new Date(run.started_at).toLocaleString() : ''}>
                            {relativeTime(run.started_at || run.created_at)}
                          </span>
                          <span>⏱ {duration(run.started_at, run.completed_at)}</span>
                          {run.items_processed > 0 && (
                            <span>📦 {run.items_processed} item{run.items_processed !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={`text-xs border px-2 py-0.5 rounded-full flex-shrink-0 ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>

                      {/* Output file link */}
                      {run.output_file && (
                        <a
                          href={run.output_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-neon-cyan hover:underline flex-shrink-0"
                          onClick={e => e.stopPropagation()}
                          title="Open output file"
                        >
                          📄
                        </a>
                      )}

                      {/* Expand chevron */}
                      <span className={`text-slate-600 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-dark-500 px-4 py-3 bg-dark-900/50 space-y-3">
                        {/* Metadata grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-slate-600 block">Run ID</span>
                            <span className="text-slate-300 font-mono">#{run.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 block">Started</span>
                            <span className="text-slate-300">{run.started_at ? new Date(run.started_at).toLocaleString() : '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 block">Completed</span>
                            <span className="text-slate-300">{run.completed_at ? new Date(run.completed_at).toLocaleString() : '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 block">Duration</span>
                            <span className="text-slate-300">{duration(run.started_at, run.completed_at)}</span>
                          </div>
                        </div>

                        {/* Output file */}
                        {run.output_file && (
                          <div>
                            <span className="text-xs text-slate-600 block mb-1">📄 Output File</span>
                            <a href={run.output_file} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-neon-cyan hover:underline break-all font-mono bg-dark-800 px-2 py-1 rounded inline-block">
                              {run.output_file}
                            </a>
                          </div>
                        )}

                        {/* Output */}
                        {run.output && (
                          <div>
                            <span className="text-xs text-slate-600 block mb-1">📝 Output</span>
                            <pre className="text-xs text-slate-300 bg-dark-800 rounded-lg p-3 overflow-x-auto max-h-64 whitespace-pre-wrap font-mono border border-dark-500">
                              {run.output}
                            </pre>
                          </div>
                        )}

                        {/* Error */}
                        {run.error && (
                          <div>
                            <span className="text-xs text-red-400 block mb-1">⚠️ Error</span>
                            <pre className="text-xs text-red-300 bg-red-500/5 border border-red-500/20 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap font-mono">
                              {run.error}
                            </pre>
                          </div>
                        )}

                        {/* No output/error */}
                        {!run.output && !run.error && (
                          <p className="text-xs text-slate-600 italic">No output or error details recorded for this run.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
