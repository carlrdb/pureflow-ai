// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Telemetry Hook (polling, replay, skeleton state)
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { SENSORS, HISTORY_LEN, POLL_INTERVAL_MS, REPLAY_INTERVAL_MS } from '../config';
import {
  fetchDashboardData,
  startReplayStream,
  stopReplayStream,
  fetchReplayRow,
} from '../services/api';

const INITIAL_VALUES = [14.5, 23.5, 4.2, 120.0, 7.35];

/**
 * Helper: push a value onto a fixed-length history ring buffer.
 * Returns the SAME array reference when nothing changed (avoids re-render).
 */
function pushHistory(hist, value) {
  if (typeof value !== 'number') return hist;
  const next = hist.length >= HISTORY_LEN
    ? [...hist.slice(-(HISTORY_LEN - 1)), value]
    : [...hist, value];
  return next;
}

export function useTelemetry() {
  // ── Core sensor state
  const [sensorValues, setSensorValues] = useState(INITIAL_VALUES);
  const [sensorHistories, setSensorHistories] = useState(() =>
    SENSORS.map(() => []),
  );
  const [alertsData, setAlertsData] = useState([]);
  const [systemTasks, setSystemTasks] = useState([]);
  const [mlOutput, setMlOutput] = useState(null);

  // ── UI state
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [replayActive, setReplayActive] = useState(false);
  const [replayInfo, setReplayInfo] = useState(null);

  // ── Refs for intervals & mounted guard
  const pollRef = useRef(null);
  const replayRef = useRef(null);
  const initialLoadRef = useRef(false);
  const mountedRef = useRef(true);

  // Track mounted state to prevent setState on unmounted component
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Apply a payload from the backend
  const applyPayload = useCallback((payload) => {
    if (!payload || !mountedRef.current) return;
    setMlOutput(payload);

    const s = payload.sensors;
    if (s) {
      const newValues = [s.flow, s.temp, s.turbidity, s.tds, s.ph];
      setSensorValues(newValues);
      setSensorHistories((prev) =>
        prev.map((hist, i) => pushHistory(hist, newValues[i])),
      );
    }

    if (Array.isArray(payload.alerts)) setAlertsData(payload.alerts);
    if (Array.isArray(payload.maintenance_tasks)) setSystemTasks(payload.maintenance_tasks);
    setLoading(false);
  }, []);

  // ── Single telemetry fetch
  const poll = useCallback(async () => {
    const { source, data } = await fetchDashboardData();
    if (!mountedRef.current) return;

    if (source === 'backend' && data) {
      const age = data.esp32_age_seconds ?? 0;
      const isStale = age > 10;
      setConnectionStatus(isStale ? 'backend_stale' : 'backend');

      if (isStale) {
        // Strip stale proxy readings so UI shows "No Data" instead of frozen values
        data.sensors = { flow: null, temp: null, turbidity: null, tds: null, ph: null };
        data.potability = null;
        data.rul = null;
        data.health_score = null;
      }

      if (!initialLoadRef.current) {
        // Hold skeleton briefly for smooth visual transition
        setTimeout(() => {
          if (!mountedRef.current) return;
          initialLoadRef.current = true;
          applyPayload(data);
        }, 600);
      } else {
        applyPayload(data);
      }
    } else if (source === 'esp32' && data) {
      const s = data.sensors;
      const newValues = [s.flow, s.temp, s.turbidity, s.tds, s.ph];
      setSensorValues(newValues);
      setSensorHistories((prev) =>
        prev.map((hist, i) => pushHistory(hist, newValues[i])),
      );
      setLoading(false);
      setConnectionStatus('esp32');
    } else {
      setConnectionStatus('offline');
      if (!initialLoadRef.current) {
        setTimeout(() => {
          if (!mountedRef.current) return;
          initialLoadRef.current = true;
          setLoading(false);
        }, 600);
      }
    }
  }, [applyPayload]);

  // ── Start / stop live polling
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [poll]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Replay controls
  const stopReplay = useCallback(async () => {
    if (replayRef.current) {
      clearInterval(replayRef.current);
      replayRef.current = null;
    }
    await stopReplayStream();
    if (!mountedRef.current) return;
    setReplayActive(false);
    setReplayInfo(null);
    startPolling();
  }, [startPolling]);

  const startReplay = useCallback(async () => {
    const ok = await startReplayStream(0);
    if (!ok || !mountedRef.current) return;
    setReplayActive(true);
    stopPolling();

    const fetchRow = async () => {
      const row = await fetchReplayRow();
      if (!mountedRef.current) return;
      if (!row) {
        stopReplay();
        return;
      }
      applyPayload(row);
      if (row.replay_info) setReplayInfo(row.replay_info);
    };

    fetchRow();
    replayRef.current = setInterval(fetchRow, REPLAY_INTERVAL_MS);
  }, [applyPayload, stopPolling, stopReplay]);

  // ── Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (replayRef.current) clearInterval(replayRef.current);
    };
  }, [stopPolling]);

  return {
    // Data
    sensorValues,
    sensorHistories,
    alertsData,
    systemTasks,
    mlOutput,
    // UI state
    loading,
    setLoading,
    connectionStatus,
    setConnectionStatus,
    replayActive,
    replayInfo,
    // Actions
    startPolling,
    stopPolling,
    startReplay,
    stopReplay,
  };
}
