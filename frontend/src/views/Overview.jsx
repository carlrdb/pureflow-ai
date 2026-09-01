// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Overview Page (Home)
// ════════════════════════════════════════════════════════════════════

import { SENSORS } from '../config';
import { getStatus, cn } from '../lib/utils';
import SensorCard from '../components/SensorCard';
import { SensorCardSkeleton, StatValueSkeleton } from '../components/Skeleton';

export default function Overview({ sensorValues, sensorHistories, mlOutput, loading }) {
  const alertCount = mlOutput?.alerts?.length ?? 0;
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
      {/* Header */}
      <div className="mb-7">
        <h2 className="font-display text-[26px] font-extrabold mb-1">System Overview</h2>
        <p className="text-pf-muted text-[13px]">Real-time water quality metrics and predictive maintenance status for your filtration system.</p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-7">
        {/* System Health */}
        <div className="bg-pf-surface border border-pf-border rounded-[14px] px-5 py-[18px] w-full min-h-[160px] h-[160px] flex flex-col justify-between overflow-hidden">
          <div className="font-mono text-[9px] tracking-[2px] text-pf-muted uppercase mb-1">System Health</div>
          <div className={cn('h-[56px] flex items-center font-display text-[30px] font-extrabold leading-none tabular-nums', hasData ? 'text-pf-green' : 'text-pf-muted')}>
            {loading ? <StatValueSkeleton width="w-[75px]" /> : (hasData ? `${healthScore}%` : '--')}
          </div>
          <div className="h-[20px] text-[11px] text-pf-muted truncate">Autoencoder Anomaly Score</div>
        </div>

        {/* Water Potability */}
        <div className="bg-pf-surface border border-pf-border rounded-[14px] px-5 py-[18px] w-full min-h-[160px] h-[160px] flex flex-col justify-between overflow-hidden">
          <div className="font-mono text-[9px] tracking-[2px] text-pf-muted uppercase mb-1">Water Potability</div>
          <div className={cn('h-[56px] flex items-center text-2xl font-bold break-normal whitespace-nowrap tabular-nums', loading ? '' : !hasData ? 'text-pf-muted' : isPotable ? 'text-pf-green' : 'text-pf-red')}>
            {loading ? <StatValueSkeleton width="w-[115px]" /> : (hasData ? (isPotable ? 'POTABLE' : 'NON-POTABLE') : 'NO DATA')}
          </div>
          <div className="h-[20px] text-[11px] text-pf-muted truncate">
            {loading ? <div className="animate-shimmer bg-white/[0.04] h-3 w-32 rounded mt-1" /> : (hasData && potability ? `${isPotable ? 'PNSDW Compliant' : 'Standard Violation'} (${potability.confidence_pct}%)` : 'Awaiting sensor data...')}
          </div>
        </div>

        {/* Filter Life */}
        <div className="bg-pf-surface border border-pf-border rounded-[14px] px-5 py-[18px] w-full min-h-[160px] h-[160px] flex flex-col justify-between overflow-hidden">
          <div className="font-mono text-[9px] tracking-[2px] text-pf-muted uppercase mb-1">Filter Life (RUL)</div>
          <div className={cn('h-[56px] flex items-center font-display text-[30px] font-extrabold leading-none tabular-nums', hasData ? 'text-pf-accent' : 'text-pf-muted')}>
            {loading ? <StatValueSkeleton width="w-[90px]" /> : (hasData && rul ? `${rul.hours} hrs` : '--')}
          </div>
          <div className="h-[20px] text-[11px] text-pf-muted truncate">
            {loading ? <div className="animate-shimmer bg-white/[0.04] h-3 w-28 rounded mt-1" /> : (hasData && rul ? `${rul.health_state} (${rul.days} days)` : 'Awaiting sensor data...')}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-pf-surface border border-pf-border rounded-[14px] px-5 py-[18px] w-full min-h-[160px] h-[160px] flex flex-col justify-between overflow-hidden">
          <div className="font-mono text-[9px] tracking-[2px] text-pf-muted uppercase mb-1">Active Alerts</div>
          <div className="h-[56px] flex items-center font-display text-[30px] font-extrabold leading-none text-pf-red tabular-nums">
            {loading ? <StatValueSkeleton width="w-9" /> : alertCount}
          </div>
          <div className="h-[20px] text-[11px] text-pf-muted truncate">Requires attention</div>
        </div>
      </div>

      {/* Live Sensor Readings */}
      <div className="mb-7">
        <h2 className="font-display text-lg font-extrabold mb-1">Live Sensor Readings</h2>
        <p className="text-pf-muted text-[13px]">Updating every 2 seconds from ESP32 telemetry.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
        {loading
          ? SENSORS.map((s) => <SensorCardSkeleton key={s.id} color={s.color} />)
          : SENSORS.map((s, i) => (
              <SensorCard
                key={s.id}
                sensor={s}
                value={sensorValues[i]}
                history={sensorHistories[i]}
              />
            ))
        }
      </div>
    </div>
  );
}
