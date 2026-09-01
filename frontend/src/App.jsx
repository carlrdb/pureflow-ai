// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — Main Application Entry
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { PAGE_META } from './config';
import { useTelemetry } from './hooks/useTelemetry';
import { triggerSimulation } from './services/api';

// Components
import ConnectionGate from './components/ConnectionGate';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

// Views
import Overview from './views/Overview';
import Sensors from './views/Sensors';
import Alerts from './views/Alerts';
import Maintenance from './views/Maintenance';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [gateDismissed, setGateDismissed] = useState(false);
  const [skeletonPreview, setSkeletonPreview] = useState(false);

  const {
    sensorValues,
    sensorHistories,
    alertsData,
    systemTasks,
    mlOutput,
    loading,
    setLoading,
    connectionStatus,
    replayActive,
    replayInfo,
    startPolling,
    startReplay,
    stopReplay,
  } = useTelemetry();

  // Expose global methods for testing/defense demo
  useEffect(() => {
    window.pureFlowSimulate = triggerSimulation;
    window.pureFlowSkeleton = (enable) => {
      setSkeletonPreview(enable);
      setLoading(enable);
    };
  }, [setLoading]);

  // Keyboard shortcut 'S' for skeleton toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 's' && e.target.tagName !== 'INPUT') {
        const nextState = !skeletonPreview;
        setSkeletonPreview(nextState);
        setLoading(nextState);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skeletonPreview, setLoading]);

  const handleGateReady = useCallback(() => {
    setGateDismissed(true);
    startPolling();
  }, [startPolling]);

  const handleToggleReplay = useCallback(() => {
    if (replayActive) {
      stopReplay();
    } else {
      startReplay();
    }
  }, [replayActive, startReplay, stopReplay]);

  const handleToggleSkeleton = useCallback(() => {
    const nextState = !skeletonPreview;
    setSkeletonPreview(nextState);
    setLoading(nextState);
    if (!nextState && !replayActive) {
       startPolling();
    }
  }, [skeletonPreview, setLoading, replayActive, startPolling]);

  const handleNavigate = useCallback((pageKey) => {
    setActivePage(pageKey);
  }, []);

  const pageTitle = PAGE_META[activePage]?.title || 'Dashboard';

  return (
    <>
      <ConnectionGate onReady={handleGateReady} />

      {gateDismissed && (
        <div className="flex h-screen w-full bg-pf-bg text-pf-text overflow-hidden">
          <Sidebar
            activePage={activePage}
            onNavigate={handleNavigate}
            alertCount={alertsData.length}
            connectionStatus={connectionStatus}
          />

          <main className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden">
            <TopBar
              title={pageTitle}
              replayActive={replayActive}
              replayInfo={replayInfo}
              onToggleReplay={handleToggleReplay}
              skeletonPreview={skeletonPreview}
              onToggleSkeleton={handleToggleSkeleton}
            />

            <div className="flex-1 relative">
              {activePage === 'home' && (
                <Overview
                  sensorValues={sensorValues}
                  sensorHistories={sensorHistories}
                  mlOutput={mlOutput}
                  loading={loading}
                />
              )}
              {activePage === 'sensors' && (
                <Sensors
                  sensorValues={sensorValues}
                  sensorHistories={sensorHistories}
                  loading={loading}
                />
              )}
              {activePage === 'alerts' && (
                <Alerts
                  alertsData={alertsData}
                  loading={loading}
                />
              )}
              {activePage === 'maintenance' && (
                <Maintenance
                  sensorValues={sensorValues}
                  mlOutput={mlOutput}
                  systemTasks={systemTasks}
                  loading={loading}
                />
              )}
            </div>
          </main>
        </div>
      )}
    </>
  );
}
