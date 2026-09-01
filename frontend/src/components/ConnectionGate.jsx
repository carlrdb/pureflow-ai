// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Connection Gate Overlay
// Blocks the dashboard until ESP32 / backend is validated.
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { SKIP_CONNECTION_CHECK } from '../config';
import { checkEsp32Connected } from '../services/api';

const STATES = { checking: 'checking', failed: 'failed', success: 'success' };

export default function ConnectionGate({ onReady }) {
  const [state, setState] = useState(STATES.checking);

  const attemptConnection = useCallback(async () => {
    setState(STATES.checking);
    const ok = await checkEsp32Connected();
    if (ok) {
      setState(STATES.success);
      setTimeout(onReady, 800);
    } else {
      setState(STATES.failed);
    }
  }, [onReady]);

  useEffect(() => {
    if (SKIP_CONNECTION_CHECK) {
      onReady();
      return;
    }
    attemptConnection();
  }, [onReady, attemptConnection]);

  if (SKIP_CONNECTION_CHECK) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-pf-bg flex items-center justify-center transition-opacity duration-500">
      <div className="text-center max-w-[420px] px-10 py-12 bg-pf-surface border border-pf-border rounded-2xl shadow-[0_0_60px_rgba(56,189,248,0.08)]">
        {/* Logo */}
        <div className="w-14 h-14 bg-gradient-to-br from-sky-600 to-sky-400 rounded-[14px] flex items-center justify-center text-[28px] mx-auto mb-4 shadow-[0_0_24px_rgba(56,189,248,0.4)]">
          💧
        </div>
        <div className="font-display text-2xl font-extrabold text-white mb-1">PureFlow AI</div>
        <div className="font-mono text-[11px] text-pf-muted tracking-[2px] uppercase mb-8">
          Predictive Maintenance
        </div>

        {/* Checking */}
        {state === STATES.checking && (
          <div className="mt-2">
            <div className="w-9 h-9 border-[3px] border-pf-border border-t-pf-accent rounded-full mx-auto mb-4 animate-spin" />
            <div className="text-sm text-pf-text font-medium mb-1.5">Searching for ESP32 device…</div>
          </div>
        )}

        {/* Failed */}
        {state === STATES.failed && (
          <div className="mt-2">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-sm text-pf-red font-medium mb-1.5">ESP32 Not Found</div>
            <div className="text-xs text-pf-muted leading-[1.8] my-3 mx-0 text-left p-3.5 bg-red-500/[0.06] border border-red-500/15 rounded-[10px]">
              Could not reach the ESP32 device. Make sure:<br />
              • The ESP32 is powered on and connected to WiFi<br />
              • You are on the same network as the ESP32<br />
              • The IP address is correct
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={attemptConnection}
                className="w-full py-3 px-5 bg-pf-accent text-[#04080f] rounded-[10px] font-semibold text-[13px] cursor-pointer hover:bg-sky-600 hover:-translate-y-px transition-all"
              >
                Retry Connection
              </button>
              <button
                onClick={onReady}
                className="w-full py-3 px-5 bg-transparent text-pf-muted border border-pf-border rounded-[10px] font-semibold text-[13px] cursor-pointer hover:text-pf-text hover:border-sky-400/25 transition-all"
              >
                Skip — Open Dashboard Anyway
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {state === STATES.success && (
          <div className="mt-2">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-sm text-pf-green font-medium mb-1.5">ESP32 Connected</div>
            <div className="text-xs text-pf-muted">Launching dashboard…</div>
          </div>
        )}
      </div>
    </div>
  );
}
