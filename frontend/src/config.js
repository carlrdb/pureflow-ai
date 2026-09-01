// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Configuration & Sensor Definitions
// ════════════════════════════════════════════════════════════════════

export const SKIP_CONNECTION_CHECK = true;  // Set to true to skip backend connection check (useful for development)

export const BACKEND_API = 'http://127.0.0.1:5000';
export const ESP32_DIRECT_IP = 'http://192.168.1.97';

export const HISTORY_LEN = 30;
export const POLL_INTERVAL_MS = 2000;
export const REPLAY_INTERVAL_MS = 1500;

export const SENSORS = [
  { id: 'flow',      name: 'Water Flow',  model: 'YF-S201', unit: 'L/min', min: 0,   max: 30,   safeMin: 2,   safeMax: 25,  color: '#38bdf8', desc: 'Flow rate through main line' },
  { id: 'temp',      name: 'Temperature', model: 'DS18B20', unit: '°C',    min: 0,   max: 100,  safeMin: 15,  safeMax: 35,  color: '#fb923c', desc: 'Water temperature reading' },
  { id: 'turbidity', name: 'Turbidity',   model: 'SEN0554', unit: 'NTU',   min: 0,   max: 100,  safeMin: 0,   safeMax: 5.0, color: '#a78bfa', desc: 'PNSDW 2017 max: 5.0 NTU' },
  { id: 'tds',       name: 'TDS',         model: 'SEN0244', unit: 'ppm',   min: 0,   max: 1000, safeMin: 0,   safeMax: 500, color: '#34d399', desc: 'PNSDW 2017 max: 500 ppm' },
  { id: 'ph',        name: 'pH Level',    model: 'SEN0161', unit: 'pH',    min: 0,   max: 14,   safeMin: 6.5, safeMax: 8.5, color: '#f472b6', desc: 'PNSDW allowable: 6.5–8.5' },
];

export const PAGE_META = {
  home:        { title: 'System Overview' },
  sensors:     { title: 'Sensor Monitor' },
  alerts:      { title: 'Alerts & Notifications' },
  maintenance: { title: 'Maintenance Schedule' },
};
