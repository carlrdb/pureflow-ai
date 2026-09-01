// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — API Service Layer
//
// All /api/* requests go through the Vite dev proxy (5173 → 5000).
// Only ESP32 direct checks use an absolute URL (different host).
// ════════════════════════════════════════════════════════════════════

import { ESP32_DIRECT_IP } from '../config';

/** Shared timeout for all polling fetches (prevents hanging connections). */
const POLL_TIMEOUT_MS = 5000;

/**
 * Fetch enriched dashboard data from the Python ML inference server.
 * Falls back to direct ESP32 data, then returns null.
 * All fetches are guarded with AbortSignal.timeout to prevent hanging.
 */
export async function fetchDashboardData() {
  // 1. Try Python ML backend (via Vite proxy)
  try {
    const res = await fetch('/api/dashboard-data', {
      signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = await res.json();
      return { source: 'backend', data };
    }
  } catch { /* fall through */ }

  // 2. Fallback: direct ESP32
  try {
    const res = await fetch(`${ESP32_DIRECT_IP}/data`, {
      signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
    });
    if (res.ok) {
      const raw = await res.json();
      return {
        source: 'esp32',
        data: {
          sensors: {
            flow: raw.flow ?? 12.0,
            temp: raw.temp ?? 24.0,
            turbidity: raw.turbidity ?? 4.5,
            tds: raw.tds ?? 140.0,
            ph: raw.ph ?? 7.2,
          },
        },
      };
    }
  } catch { /* fall through */ }

  return { source: 'offline', data: null };
}

/**
 * Validate that the ESP32 hardware is actually connected.
 *
 * Strategy:
 *   1. Try reaching the ESP32 directly on the LAN
 *   2. If that fails, check the Backend API's esp32_age_seconds —
 *      a small age means the ESP32 recently pushed data through the server
 *   3. Returns true only when ESP32 connectivity is confirmed
 */
const ESP32_FRESH_THRESHOLD_SECONDS = 30;

export async function checkEsp32Connected() {
  // 1. Try direct ESP32
  try {
    const res = await fetch(`${ESP32_DIRECT_IP}/data`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) return true;
  } catch { /* not reachable directly */ }

  // 2. Check backend for fresh ESP32 telemetry (via Vite proxy)
  try {
    const res = await fetch('/api/dashboard-data', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const age = data.esp32_age_seconds ?? Infinity;
      return age < ESP32_FRESH_THRESHOLD_SECONDS;
    }
  } catch { /* backend not reachable either */ }

  return false;
}

/**
 * POST to the simulate endpoint for thesis defense demos.
 */
export async function triggerSimulation(scenario = 'normal') {
  try {
    await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
      signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
    });
  } catch {
    // Simulation API offline — silently fail
  }
}

// ── Replay API ─────────────────────────────────────────────────────

export async function startReplayStream(offset = 0) {
  try {
    const res = await fetch('/api/replay/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset }),
      signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function stopReplayStream() {
  try {
    await fetch('/api/replay/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
    });
  } catch { /* may already be stopped */ }
}

export async function fetchReplayRow() {
  try {
    const res = await fetch('/api/replay/next', {
      signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'replay_inactive') return null;
    return data;
  } catch {
    return null;
  }
}
