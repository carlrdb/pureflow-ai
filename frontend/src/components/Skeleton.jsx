// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Skeleton Loading Primitives
// ════════════════════════════════════════════════════════════════════

import { cn } from '../lib/utils';

/** Base shimmer block */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md',
        'bg-white/[0.04] border border-white/[0.025]',
        'animate-shimmer',
        className,
      )}
      {...props}
    />
  );
}

/** Skeleton shaped like a sensor card */
export function SensorCardSkeleton({ color = '#38bdf8' }) {
  return (
    <div className="relative rounded-2xl border border-pf-border bg-pf-surface p-5 overflow-hidden cursor-wait">
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl animate-pulse"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.5 }}
      />
      {/* Header row */}
      <div className="flex justify-between items-start mb-3.5">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-5 w-15 rounded-full" />
      </div>
      {/* Value */}
      <Skeleton className="h-9 w-20 mb-1" />
      {/* Unit */}
      <Skeleton className="h-3 w-8 mb-3.5" />
      {/* Progress bar */}
      <Skeleton className="h-1 w-full mb-3" />
      {/* Sparkline area */}
      <Skeleton className="h-10 w-full rounded-lg mb-2.5" />
      {/* Footer */}
      <div className="flex justify-between">
        <Skeleton className="h-2.5 w-22" />
        <Skeleton className="h-2.5 w-26" />
      </div>
    </div>
  );
}

/** Skeleton shaped like an alert row */
export function AlertSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-pf-surface border border-pf-border rounded-xl px-5 py-4">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-2.5 w-4/5" />
      </div>
      <Skeleton className="h-2.5 w-10" />
      <Skeleton className="h-5.5 w-17 rounded-full" />
    </div>
  );
}

/** Skeleton shaped like a stat card value */
export function StatValueSkeleton({ width = 'w-20' }) {
  return <Skeleton className={`h-8 ${width} inline-block`} />;
}

/** Skeleton shaped like a maintenance timeline task */
export function TaskSkeleton({ showLine = true }) {
  return (
    <div className="flex gap-0 relative">
      {/* Dot column */}
      <div className="flex flex-col items-center w-9 min-w-9">
        <Skeleton className="w-3.5 h-3.5 rounded-full mt-[18px] shrink-0" />
        {showLine && <div className="flex-1 w-0.5 min-h-10 bg-pf-border" />}
      </div>
      {/* Body */}
      <div className="flex-1 bg-pf-surface border border-pf-border rounded-[14px] p-[18px_20px] my-2 ml-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <Skeleton className="h-2.5 w-20 mb-1.5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
          <Skeleton className="h-5.5 w-21 rounded-full" />
        </div>
        <Skeleton className="h-3 w-[88%] mt-3 mb-1.5" />
        <Skeleton className="h-3 w-3/5 mb-3.5" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-19 rounded-full" />
        </div>
      </div>
    </div>
  );
}
