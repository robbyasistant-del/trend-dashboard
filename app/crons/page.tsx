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
  id: number; cron_config_id: number; cron_name?: string; status: string;
  output: string; items_processed: number; error: string;
  started_at: string; completed_at: string;
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

function EmptyState() {
  return (
    <div className="text-center py-16">
      <p className="text-4xl mb-4">⚙️</p>
      <p className="text-slate-400 text-lg mb-2">No cron jobs configured yet</p>
      <p className="text-slate-600 text-sm">Create your first agent cron to start collecting trend data</p>
    </div>
  );
}

export default function CronsPage() {
  const [configs, setConfigs] = useState<CronConfig[]>([]);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [editing, setEditing] = useState<Partial<CronConfig> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'configs' | 'runs'>('configs');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [cfgRes, runsRes] = await Promise.all([fetch('/api/crons'), fetch('/api/crons/runs')]);
      setConfigs(await cfgRes.json());
      setRuns(await runsRes.json());
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
            {t === 'configs' ? 'Configurations' : 'Run History'}
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
        runs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No runs yet</div>
        ) : (
          <div className="space-y-2">
            {runs.map(run => (
              <div key={run.id} className="card flex items-center gap-4 py-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  run.status === 'success' ? 'bg-neon-green' : run.status === 'error' ? 'bg-red-500' : 'bg-neon-amber pulse-neon'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white">{run.cron_name || `Cron #${run.cron_config_id}`}</span>
                  <span className="text-xs text-slate-500 ml-2">{run.items_processed} items</span>
                </div>
                <span className="text-xs text-slate-600">{run.completed_at ? new Date(run.completed_at).toLocaleString() : 'Running...'}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
