// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Top Bar Header
// ════════════════════════════════════════════════════════════════════

import React from 'react';
import { cn } from '../lib/utils';
import { useClock } from '../hooks/useClock';

const TopBar = React.memo(function TopBar({
  title,
  replayActive,
  replayInfo,
  onToggleReplay,
  skeletonPreview,
  onToggleSkeleton,
}) {
  const time = useClock();

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-pf-border bg-pf-bg/85 backdrop-blur-[10px] sticky top-0 z-[5]">
      <div className="font-display text-xl font-bold">{title}</div>

      <div className="flex items-center gap-3.5">
        {/* Skeleton Preview Toggle */}
        <button
          onClick={onToggleSkeleton}
          className={cn(
            'font-mono text-[10px] font-semibold tracking-[1.5px] uppercase px-3.5 py-[5px] rounded-md border cursor-pointer transition-all duration-200 mr-2.5',
            skeletonPreview
              ? 'bg-sky-400/20 text-pf-accent border-sky-400/60 shadow-[0_0_12px_rgba(56,189,248,0.25)] animate-pulse'
              : 'bg-sky-400/[0.08] text-pf-muted border-pf-border hover:bg-sky-400/[0.12] hover:text-pf-accent hover:border-pf-accent',
          )}
        >
          {skeletonPreview ? 'SKELETON ON' : 'SKELETON PREVIEW'}
        </button>

        {/* Replay Toggle */}
        <button
          onClick={onToggleReplay}
          className={cn(
            'font-mono text-[10px] font-semibold tracking-[1.5px] uppercase px-3.5 py-[5px] rounded-md border cursor-pointer transition-all duration-250 mr-2.5',
            replayActive
              ? 'bg-green-400/15 text-pf-green border-green-400/40 animate-pulse'
              : 'bg-sky-400/[0.08] text-pf-muted border-pf-border hover:bg-sky-400/15 hover:text-pf-accent hover:border-pf-accent',
          )}
        >
          {replayActive ? 'REPLAY ON' : 'REPLAY OFF'}
        </button>

        {/* Replay Info */}
        {replayActive && replayInfo && (
          <div className="font-mono text-[10px] text-pf-accent tabular-nums mr-2">
            Row {replayInfo.row_index + 1} / {replayInfo.total_rows}
          </div>
        )}

        {/* Live pill */}
        <div className="flex items-center gap-1.5 bg-green-400/10 border border-green-400/25 rounded-full px-3 py-1 text-[11px] text-pf-green font-mono tracking-[1px]">
          <div className="w-1.5 h-1.5 rounded-full bg-pf-green animate-pulse" />
          <span>{replayActive ? 'REPLAY' : 'LIVE'}</span>
        </div>

        {/* Clock */}
        <div className="font-mono text-xs text-pf-muted tabular-nums">{time}</div>
      </div>
    </header>
  );
});

export default TopBar;
