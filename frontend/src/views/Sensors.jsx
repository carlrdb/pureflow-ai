// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Sensor Monitor Page
// ════════════════════════════════════════════════════════════════════

import { SENSORS } from '../config';
import SensorCard from '../components/SensorCard';
import { SensorCardSkeleton } from '../components/Skeleton';

export default function Sensors({ sensorValues, sensorHistories, loading }) {
  return (
    <div className="p-8 animate-fadeIn">
      <div className="mb-7">
        <h2 className="font-display text-[26px] font-extrabold mb-1">Sensor Monitor</h2>
        <p className="text-pf-muted text-[13px]">
          Detailed view of all connected IoT sensors with historical sparklines and safe-range indicators.
        </p>
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
