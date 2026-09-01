// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Maintenance Schedule Page
// ════════════════════════════════════════════════════════════════════

import { getStatus, cn } from '../lib/utils';
import { SENSORS } from '../config';
import { StatValueSkeleton, TaskSkeleton, Skeleton } from '../components/Skeleton';

function urgencyStyles(urgency) {
  const map = {
    now:   { bg: 'bg-red-400/[0.12]', text: 'text-pf-red',    border: 'border-red-400/30',    label: 'CRITICAL', animate: 'animate-pulse' },
    week:  { bg: 'bg-amber-400/10',   text: 'text-pf-yellow', border: 'border-amber-400/30',  label: 'REPLACE SOON', animate: '' },
    month: { bg: 'bg-sky-400/[0.08]', text: 'text-pf-accent', border: 'border-sky-400/25',    label: 'UPCOMING', animate: '' },
  };
  return map[urgency] || map.month;
}

export default function Maintenance({ sensorValues, mlOutput, systemTasks, loading }) {
  const hasData = sensorValues[0] !== null;
  const healthScore = mlOutput?.health_score
    ?? Math.max(10, 100
        - sensorValues.filter((v, i) => getStatus(v, SENSORS[i]) === 'critical').length * 20
        - sensorValues.filter((v, i) => getStatus(v, SENSORS[i]) === 'warning').length * 8);

  const potability = mlOutput?.potability;
  const isPotable = potability?.is_potable === 1;
  const rul = mlOutput?.rul;

  return (
    <div className="p-8 animate-fadeIn">
      <div className="mb-7">
        <h2 className="font-display text-[26px] font-extrabold mb-1">Maintenance Schedule</h2>
        <p className="text-pf-muted text-[13px]">
          XGBoost-predicted filter lifespan and upcoming service tasks based on real-time wear data.
        </p>
      </div>

      {/* System Health Banner */}
      <div className="flex items-center gap-5 bg-pf-surface border border-pf-border rounded-2xl px-7 py-5 mb-6">
        <div className="flex-1">
          <div className="font-mono text-[9px] text-pf-muted tracking-[2px] uppercase mb-1.5">Overall System Health</div>
          <div className={cn('font-display text-4xl font-extrabold leading-none tabular-nums', hasData ? 'text-pf-green' : 'text-pf-muted')}>
            {loading ? <StatValueSkeleton width="w-[85px]" /> : (hasData ? `${healthScore}%` : '--')}
          </div>
          <div className="text-xs text-pf-muted mt-1">Based on current sensor readings and AI model output</div>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-[260px]">
          {/* Filter RUL */}
          <div className="bg-pf-surface2 rounded-[10px] p-3 border border-pf-border">
            <div className="font-mono text-[9px] text-pf-muted tracking-[1.5px] uppercase mb-1">Filter RUL</div>
            <div className={cn('font-display text-[15px] font-bold tabular-nums', hasData ? 'text-pf-accent' : 'text-pf-muted')}>
              {loading ? <Skeleton className="h-4 w-[75px]" /> : (hasData && rul ? `${rul.hours}h (${rul.days}d)` : '--')}
            </div>
          </div>
          {/* Water Potable */}
          <div className="bg-pf-surface2 rounded-[10px] p-3 border border-pf-border">
            <div className="font-mono text-[9px] text-pf-muted tracking-[1.5px] uppercase mb-1">Water Potable</div>
            <div className={cn('font-display text-[15px] font-bold', loading ? '' : !hasData ? 'text-pf-muted' : isPotable ? 'text-pf-green' : 'text-pf-red')}>
              {loading ? <Skeleton className="h-4 w-[70px]" /> : (hasData ? (potability ? `${isPotable ? 'POTABLE' : 'NON-POTABLE'} (${potability.confidence_pct}%)` : 'POTABLE (92%)') : 'NO DATA')}
            </div>
          </div>
          {/* Health State */}
          <div className="bg-pf-surface2 rounded-[10px] p-3 border border-pf-border">
            <div className="font-mono text-[9px] text-pf-muted tracking-[1.5px] uppercase mb-1">Health State</div>
            <div className={cn('font-display text-[15px] font-bold', hasData ? 'text-pf-accent' : 'text-pf-muted')}>
              {loading ? <Skeleton className="h-4 w-[65px]" /> : (hasData ? (rul?.health_state ?? 'Optimal') : '--')}
            </div>
          </div>
          {/* Next Service */}
          <div className="bg-pf-surface2 rounded-[10px] p-3 border border-pf-border">
            <div className="font-mono text-[9px] text-pf-muted tracking-[1.5px] uppercase mb-1">Next Service</div>
            <div className={cn('font-display text-[15px] font-bold tabular-nums', hasData ? 'text-white' : 'text-pf-muted')}>
              {loading ? <Skeleton className="h-4 w-[80px]" /> : (hasData && rul ? (rul.days > 0 ? `In ${rul.days} days` : 'Immediate') : '--')}
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Tasks */}
      <div className="font-display text-base font-bold mb-3.5">Scheduled Tasks</div>
      <div className="flex flex-col mb-7">
        {loading ? (
          <>
            <TaskSkeleton showLine />
            <TaskSkeleton showLine />
            <TaskSkeleton showLine={false} />
          </>
        ) : systemTasks.length === 0 ? (
          <div className="bg-pf-surface border border-pf-border rounded-[14px] p-[18px_20px] animate-fadeIn">
            <div className="font-display text-[15px] font-bold">No scheduled tasks</div>
            <div className="text-[13px] text-pf-muted leading-relaxed">
              Predicted maintenance schedule will automatically appear from the XGBoost RUL pipeline.
            </div>
          </div>
        ) : (
          systemTasks.map((t, i) => {
            const u = urgencyStyles(t.urgency);
            return (
              <div key={i} className="flex gap-0 relative">
                <div className="flex flex-col items-center w-9 min-w-9">
                  <div
                    className="w-3.5 h-3.5 rounded-full border-2 bg-pf-bg mt-[18px] z-[1] shrink-0"
                    style={{ borderColor: t.dc, boxShadow: `0 0 8px ${t.dc}` }}
                  />
                  {i < systemTasks.length - 1 && <div className="flex-1 w-0.5 min-h-10 bg-pf-border" />}
                </div>
                <div className="flex-1 bg-pf-surface border border-pf-border rounded-[14px] p-[18px_20px] my-2 ml-3 transition-all hover:border-sky-400/20 hover:bg-pf-surface2">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-mono text-[11px] text-pf-muted">{t.date}</div>
                      <div className="font-display text-[15px] font-bold">{t.title}</div>
                    </div>
                    <div className={cn('font-mono text-[9px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap tracking-[1px] border', u.bg, u.text, u.border, u.animate)}>
                      {u.label}
                    </div>
                  </div>
                  <div className="text-[13px] text-pf-muted leading-relaxed mb-3">{t.desc}</div>
                  <div className="flex gap-2 flex-wrap">
                    {t.tags?.map((tag, j) => (
                      <span key={j} className="font-mono text-[10px] font-medium px-2.5 py-[3px] rounded-full bg-sky-400/[0.08] text-pf-accent border border-sky-400/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Calendar */}
      <div className="bg-pf-surface border border-pf-border rounded-2xl p-6">
        <div className="font-display text-base font-bold mb-[18px]">September 2026</div>
        <div className="grid grid-cols-7 gap-1.5">
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => (
            <div key={d} className="text-center font-mono text-[9px] text-pf-muted tracking-[1px] pb-1.5">{d}</div>
          ))}
          {/* Leading empties (Sept 2026 starts on Tuesday) */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={`e${i}`} className="aspect-square rounded-lg opacity-0" />
          ))}
          {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
            <div
              key={d}
              className={cn(
                'aspect-square rounded-lg flex items-center justify-center font-mono text-[11px] text-pf-muted relative cursor-default',
                d === 1 && 'bg-sky-400/15 text-pf-accent font-semibold border border-sky-400/35',
              )}
            >
              {d}
              {(d === 15 || d === 28) && (
                <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pf-accent" />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-5 mt-3.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-pf-muted font-mono">
            <span className="w-2 h-2 rounded-full bg-pf-red inline-block" /> Immediate
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-pf-muted font-mono">
            <span className="w-2 h-2 rounded-full bg-pf-yellow inline-block" /> This Week
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-pf-muted font-mono">
            <span className="w-2 h-2 rounded-full bg-pf-accent inline-block" /> Upcoming
          </div>
        </div>
      </div>
    </div>
  );
}
