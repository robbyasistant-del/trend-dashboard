'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home Dashboard', icon: '📊', active: true },
  { href: '/trends', label: 'Viral Trends', icon: '🔥', active: true },
  { href: '/regions', label: 'Region Analysis', icon: '🗺️', active: true },
  { href: '/calendar', label: 'Calendar Trends', icon: '📅', active: true },
  { href: '/words', label: 'Words Trends', icon: '💬', active: true },
  { href: '/forums', label: 'Games Forums', icon: '🎮', active: true },
  { href: '/apps-market', label: 'Apps Market', icon: '📱', active: true },
  { divider: true },
  { href: '/correlations', label: 'Cross-Platform', icon: '🔗', active: true },
  { href: '/velocity', label: 'Velocity Alerts', icon: '⚡', active: true },
  { href: '/competitors', label: 'Competitor Watch', icon: '🏢', active: true },
  { divider: true },
  { href: '/crons', label: 'Crons Settings', icon: '⚙️', active: true },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-dark-800 border-r border-dark-500 flex flex-col z-50">
      {/* Brand */}
      <div className="p-5 border-b border-dark-500">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-lg">
            📊
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Trends Dashboard</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Casual Games Intel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => {
          if ('divider' in item) return <div key={i} className="my-3 border-t border-dark-500" />;
          const isActive = item.href === '/'
            ? pathname === '/'
            : (pathname === item.href || pathname?.startsWith(item.href + '/'));
          const isEnabled = item.active;

          return (
            <Link
              key={item.href}
              href={isEnabled ? item.href : '#'}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-dark-600 text-neon-cyan glow-cyan'
                  : isEnabled
                    ? 'text-slate-400 hover:text-white hover:bg-dark-700'
                    : 'text-slate-600 cursor-not-allowed'
              }`}
              onClick={e => { if (!isEnabled) e.preventDefault(); }}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {!isEnabled && (
                <span className="text-[9px] uppercase tracking-wider text-slate-600 bg-dark-900 px-1.5 py-0.5 rounded">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-500">
        <div className="text-[10px] text-slate-600 text-center">
          Powered by OpenClaw Agents
        </div>
      </div>
    </aside>
  );
}
