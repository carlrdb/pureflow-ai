// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Sensor Card Component
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { getStatus, STATUS_LABEL, fmt, cn } from '../lib/utils';
import Sparkline from './Sparkline';

const BADGE_STYLES = {
  healthy:  'bg-green-400/[0.12] text-pf-green border border-green-400/30',
  warning:  'bg-amber-400/[0.12] text-pf-yellow border border-amber-400/30 animate-pulse',
  critical: 'bg-red-400/[0.12] text-pf-red border border-red-400/30 animate-pulse',
  unknown:  'bg-white/5 text-pf-muted border border-white/10',
};

const SensorCard = React.memo(function SensorCard({ sensor, value, history }) {
  const status = getStatus(value, sensor);
  const pct =
    typeof value === 'number'
      ? Math.max(0, Math.min(100, ((value - sensor.min) / (sensor.max - sensor.min)) * 100))
      : 0;

  return (
    <div
      className={cn(
        'relative w-full min-h-[220px] h-[220px] flex flex-col justify-between p-4 rounded-xl bg-pf-surface border',
        status === 'critical' ? 'border-red-400/35' : status === 'warning' ? 'border-amber-400/35' : 'border-pf-border',
      )}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-70"
        style={{ background: sensor.color }}
      />

      {/* Header */}
      <div className="flex justify-between items-start mb-3.5 shrink-0">
        <div className="font-mono text-[9px] text-pf-muted tracking-[2px] uppercase">
          {sensor.name} ({sensor.model})
        </div>
        <div className={cn('font-mono text-[9px] font-semibold px-2 py-[3px] rounded-full tracking-[1px]', BADGE_STYLES[status])}>
          {STATUS_LABEL[status]}
        </div>
      </div>

      {/* Value */}
      <div className="font-mono tabular-nums text-4xl font-semibold leading-none mb-[3px] shrink-0" style={{ color: sensor.color }}>
        {fmt(value, sensor)}
      </div>
      <div className="text-xs text-pf-muted mb-3.5">{sensor.unit}</div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5 rounded overflow-hidden mb-3">
        <div
          className="h-full rounded transition-[width] duration-800 ease-out"
          style={{ width: `${pct}%`, background: sensor.color }}
        />
      </div>

      {/* Sparkline */}
      <div className="h-8 mb-2 shrink-0">
        <Sparkline history={history} sensor={sensor} />
      </div>

      {/* Footer */}
      <div className="h-[32px] flex justify-between items-center text-[10px] leading-tight text-slate-400 shrink-0 gap-2">
        <span className="truncate">PNSDW: {sensor.safeMin}–{sensor.safeMax} {sensor.unit}</span>
        <span className="truncate text-right">{sensor.desc}</span>
      </div>
    </div>
  );
});

export default SensorCard;
