// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — SVG Sparkline Component
// ════════════════════════════════════════════════════════════════════

import React from 'react';

import { HISTORY_LEN } from '../config';

const Sparkline = React.memo(function Sparkline({ history, sensor }) {
  if (!history.length) {
    return <div className="text-xs text-pf-muted">No history</div>;
  }

  const W = 100;
  const H = 30;
  const pad = 2;
  const range = sensor.max - sensor.min || 1;

  const pts = history
    .map((v, i) => {
      // Offset so the graph fills from right to left properly
      const offset = (HISTORY_LEN - history.length) + i;
      const x = (offset / (HISTORY_LEN - 1)) * (W - pad * 2) + pad;
      const clamped = Math.min(sensor.max, Math.max(sensor.min, v));
      const y = H - pad - ((clamped - sensor.min) / range) * (H - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const safeY1 = H - pad - ((sensor.safeMax - sensor.min) / range) * (H - pad * 2);
  const safeY2 = H - pad - ((sensor.safeMin - sensor.min) / range) * (H - pad * 2);

  return (
    <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="none">
      <rect
        x="0" y={safeY1}
        width={W} height={Math.abs(safeY2 - safeY1)}
        fill={sensor.color} opacity="0.08"
      />
      <polyline
        points={pts}
        fill="none" stroke={sensor.color}
        strokeWidth="2" strokeLinejoin="round"
      />
    </svg>
  );
});

export default Sparkline;
