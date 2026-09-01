// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Shared Utility Functions
// ════════════════════════════════════════════════════════════════════

/**
 * Determine sensor status from its value vs safe bounds.
 * @param {number} value  - current reading
 * @param {object} sensor - sensor definition from SENSORS
 * @returns {'healthy'|'warning'|'critical'|'unknown'}
 */
export function getStatus(value, sensor) {
  if (typeof value !== 'number') return 'unknown';
  if (value < sensor.safeMin || value > sensor.safeMax) return 'critical';
  const pct = (value - sensor.safeMin) / (sensor.safeMax - sensor.safeMin);
  if (pct > 0.85 || (sensor.safeMin > 0 && pct < 0.15)) return 'warning';
  return 'healthy';
}

export const STATUS_LABEL = {
  healthy:  'Healthy',
  warning:  'Warning',
  critical: 'Critical',
  unknown:  'No Data',
};

/**
 * Format a sensor value for display.
 */
export function fmt(value, sensor) {
  if (typeof value !== 'number') return '--';
  return (sensor.unit === 'pH' || sensor.unit === 'NTU')
    ? value.toFixed(2)
    : String(Math.round(value));
}

/**
 * Merge Tailwind class names, filtering out falsy values.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
