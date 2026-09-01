// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Sidebar Navigation
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { key: 'home',        icon: '🏠', label: 'Overview',    group: 'Monitoring' },
  { key: 'sensors',     icon: '📡', label: 'Sensors',     group: 'Monitoring' },
  { key: 'alerts',      icon: '🔔', label: 'Alerts',      group: 'System' },
  { key: 'maintenance', icon: '🔧', label: 'Maintenance', group: 'System' },
];

const STATUS_TEXT = {
  connecting:    'CONNECTING…',
  backend:       'AI & ESP32 ONLINE',
  backend_stale: 'AI ONLINE — ESP32 OFFLINE',
  esp32:         'ESP32 DIRECT ONLINE (NO AI)',
  offline:       'SYSTEM OFFLINE (SIMULATION)',
};

const STATUS_COLOR = {
  connecting:    'text-pf-yellow',
  backend:       'text-pf-green',
  backend_stale: 'text-pf-red',
  esp32:         'text-pf-accent',
  offline:       'text-pf-yellow',
};

const Sidebar = React.memo(function Sidebar({ activePage, onNavigate, alertCount, connectionStatus }) {
  return (
    <aside className="w-60 min-w-60 bg-pf-surface border-r border-pf-border flex flex-col relative z-10">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-pf-border">
        <div className="w-9 h-9 bg-gradient-to-br from-sky-600 to-sky-400 rounded-[10px] flex items-center justify-center text-lg mb-2.5 shadow-[0_0_18px_rgba(56,189,248,0.35)]">
          💧
        </div>
        <div className="font-display text-lg font-extrabold text-white">PureFlow AI</div>
        <div className="font-mono text-[9px] text-pf-muted tracking-[2px] uppercase mt-0.5">
          Predictive Maintenance
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 flex-1 flex flex-col gap-1">
        {NAV_ITEMS.map((item, index) => {
          const showGroup = index === 0 || item.group !== NAV_ITEMS[index - 1].group;
          return (
            <div key={item.key}>
              {showGroup && (
                <div className="font-mono text-[9px] text-pf-muted tracking-[2px] uppercase px-2 pt-2 pb-1 mt-2">
                  {item.group}
                </div>
              )}
              <button
                onClick={() => onNavigate(item.key)}
                className={cn(
                  'flex items-center gap-[11px] w-full px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium border transition-all duration-150 cursor-pointer',
                  activePage === item.key
                    ? 'bg-sky-400/10 text-pf-accent border-sky-400/20'
                    : 'text-pf-muted border-transparent hover:bg-sky-400/[0.06] hover:text-pf-text',
                )}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {item.key === 'alerts' && alertCount > 0 && (
                  <span className="ml-auto bg-pf-red text-white text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full animate-pulse">
                    {alertCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer: Connection Status */}
      <div className="px-5 py-4 border-t border-pf-border">
        <div className="font-mono text-[9px] text-pf-muted tracking-[2px] uppercase mb-1.5">
          System Status
        </div>
        <div className={cn('font-mono text-[11px] font-semibold', STATUS_COLOR[connectionStatus] ?? 'text-pf-yellow')}>
          {STATUS_TEXT[connectionStatus] ?? 'CONNECTING…'}
        </div>
      </div>
    </aside>
  );
});

export default Sidebar;
