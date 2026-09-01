// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Alerts & Notifications Page
// ════════════════════════════════════════════════════════════════════

import { cn } from '../lib/utils';
import { AlertSkeleton } from '../components/Skeleton';

const SEV_LABEL = { crit: 'CRITICAL', warn: 'WARNING', info: 'INFO' };
const SEV_STYLE = {
  crit: 'bg-red-400/15 text-pf-red border border-red-400/30',
  warn: 'bg-amber-400/[0.12] text-pf-yellow border border-amber-400/30',
  info: 'bg-sky-400/10 text-pf-accent border border-sky-400/25',
};
const BORDER_LEFT = {
  crit: 'border-l-[3px] border-l-pf-red',
  warn: 'border-l-[3px] border-l-pf-yellow',
  info: 'border-l-[3px] border-l-pf-accent',
};

export default function Alerts({ alertsData, loading }) {
  return (
    <div className="p-8 animate-fadeIn">
      <div className="mb-7">
        <h2 className="font-display text-[26px] font-extrabold mb-1">Alerts &amp; Notifications</h2>
        <p className="text-pf-muted text-[13px]">
          System anomalies, threshold violations, and maintenance warnings from the AI anomaly detection model.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {loading ? (
          <>
            <AlertSkeleton />
            <AlertSkeleton />
            <AlertSkeleton />
          </>
        ) : alertsData.length === 0 ? (
          <div className="flex items-center gap-4 bg-pf-surface border border-pf-border border-l-[3px] border-l-pf-accent rounded-xl px-5 py-4 animate-fadeIn">
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold mb-[3px]">System Normal — No Active Alerts</div>
              <div className="text-xs text-pf-muted">
                All sensor parameters and Autoencoder multivariate error are within PNSDW safe thresholds.
              </div>
            </div>
          </div>
        ) : (
          alertsData.map((a, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-4 bg-pf-surface border border-pf-border rounded-xl px-5 py-4 transition-colors hover:bg-pf-surface2',
                BORDER_LEFT[a.sev],
              )}
            >
              <div className="text-xl w-8 text-center">{a.icon}</div>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold mb-[3px]">{a.title}</div>
                <div className="text-xs text-pf-muted">{a.desc}</div>
              </div>
              <div className="font-mono text-[10px] text-pf-muted whitespace-nowrap">{a.time || 'Live'}</div>
              <div className={cn('font-mono text-[9px] font-semibold px-2 py-[3px] rounded-full tracking-[1px] whitespace-nowrap', SEV_STYLE[a.sev])}>
                {SEV_LABEL[a.sev]}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
