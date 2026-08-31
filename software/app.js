// ════════════════════════════════════════════════════════════════════
// PUREFLOW AI — WEB TELEMETRY & ML DASHBOARD
// Integrated with Python Flask Inference Server & ESP32 Telemetry
// ════════════════════════════════════════════════════════════════════

// ── CONNECTION CONFIGURATION ─────────────────────────────────────────
const SKIP_CONNECTION_CHECK = true;  // Set to true to bypass gate in presentations`
const BACKEND_API = "http://127.0.0.1:5000"; // AI Inference server URL
const ESP32_DIRECT_IP = "http://192.168.1.97"; // Direct ESP32 fallback

// ── SENSOR DEFINITIONS & BOUNDS ──────────────────────────────────────
const SENSORS = [
  { id: 'flow',      name: 'Water Flow',  model: 'YF-S201', unit: 'L/min', min: 0,   max: 30,   safeMin: 2,   safeMax: 25,  color: '#38bdf8', desc: 'Flow rate through main line' },
  { id: 'temp',      name: 'Temperature', model: 'DS18B20', unit: '°C',    min: 0,   max: 100,  safeMin: 15,  safeMax: 35,  color: '#fb923c', desc: 'Water temperature reading' },
  { id: 'turbidity', name: 'Turbidity', model: 'SEN0554', unit: 'NTU',   min: 0,   max: 100,  safeMin: 0,   safeMax: 5.0, color: '#a78bfa', desc: 'PNSDW 2017 max: 5.0 NTU' },
  { id: 'tds',       name: 'TDS',         model: 'SEN0244', unit: 'ppm',   min: 0,   max: 1000, safeMin: 0,   safeMax: 500, color: '#34d399', desc: 'PNSDW 2017 max: 500 ppm' },
  { id: 'ph',        name: 'pH Level',    model: 'SEN0161', unit: 'pH',    min: 0,   max: 14,   safeMin: 6.5, safeMax: 8.5, color: '#f472b6', desc: 'PNSDW allowable: 6.5–8.5' },
];

const HISTORY_LEN = 30;
let sensorValues = [14.5, 23.5, 4.2, 120.0, 7.35];
let sensorHistories = SENSORS.map(() => []);
let alertsData = [];
let systemTasks = [];
let latestMLOutput = null;

// ── STATUS HELPERS ───────────────────────────────────────────────────
function getStatus(v, s) {
  if (typeof v !== 'number') return 'unknown';
  if (v < s.safeMin || v > s.safeMax) return 'critical';
  const pct = (v - s.safeMin) / (s.safeMax - s.safeMin);
  if (pct > 0.85 || (s.safeMin > 0 && pct < 0.15)) return 'warning';
  return 'healthy';
}

const STATUS_LABEL = { healthy: 'Healthy', warning: 'Warning', critical: 'Critical', unknown: 'No Data' };

function fmt(v, s) {
  if (typeof v !== 'number') return '--';
  return (s.unit === 'pH' || s.unit === 'NTU') ? v.toFixed(2) : Math.round(v);
}

// ── SPARKLINE SVG GENERATOR ──────────────────────────────────────────
function makeSpark(history, s) {
  if (!history.length) return '<div class="sc-unit">No history</div>';
  const W = 200, H = 40, pad = 2;
  const range = s.max - s.min || 1;
  const pts = history.map((v, i) => {
    const x = (i / Math.max(1, history.length - 1)) * (W - pad * 2) + pad;
    const y = H - pad - ((Math.min(s.max, Math.max(s.min, v)) - s.min) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const safeY1 = H - pad - ((s.safeMax - s.min) / range) * (H - pad * 2);
  const safeY2 = H - pad - ((s.safeMin - s.min) / range) * (H - pad * 2);
  return `
    <svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <rect x="0" y="${safeY1}" width="${W}" height="${Math.abs(safeY2 - safeY1)}" fill="${s.color}" opacity="0.08"/>
      <polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>
    </svg>`;
}

// ── SENSOR CARD HTML ─────────────────────────────────────────────────
function sensorCardHTML(s, v, hist) {
  const status = getStatus(v, s);
  const pct = typeof v === 'number'
    ? Math.max(0, Math.min(100, ((v - s.min) / (s.max - s.min)) * 100))
    : 0;
  return `
    <div class="sensor-card ${status}" style="--c:${s.color}">
      <div class="sc-header">
        <div>
          <div class="sc-model">${s.name} (${s.model})</div>
        </div>
        <div class="sc-badge badge-${status}">${STATUS_LABEL[status]}</div>
      </div>
      <div class="sc-value">${fmt(v, s)}</div>
      <div class="sc-unit">${s.unit}</div>
      <div class="sc-bar-wrap"><div class="sc-bar" style="width:${pct}%"></div></div>
      <div class="sparkline-wrap">${makeSpark(hist, s)}</div>
      <div class="sc-footer">
        <span>PNSDW: ${s.safeMin}–${s.safeMax} ${s.unit}</span>
        <span>${s.desc}</span>
      </div>
    </div>`;
}

function renderSensors() {
  const home   = document.getElementById('home-sensor-grid');
  const detail = document.getElementById('sensor-detail-grid');
  let html = '';
  SENSORS.forEach((s, i) => {
    html += sensorCardHTML(s, sensorValues[i], sensorHistories[i]);
  });
  if (home) home.innerHTML = html;
  if (detail) detail.innerHTML = html;
}

// ── RENDER ALERTS & NOTIFICATIONS ────────────────────────────────────
function renderAlerts() {
  const alertEl = document.getElementById('alert-list');
  if (!alertEl) return;

  const SEV_LABEL = { crit: 'CRITICAL', warn: 'WARNING', info: 'INFO' };
  const SEV_STYLE = {
    crit: 'background:rgba(248,113,113,0.15);color:var(--red);border:1px solid rgba(248,113,113,0.3)',
    warn: 'background:rgba(251,191,36,0.12);color:var(--yellow);border:1px solid rgba(251,191,36,0.3)',
    info: 'background:rgba(56,189,248,0.1);color:var(--accent);border:1px solid rgba(56,189,248,0.25)',
  };

  if (!alertsData.length) {
    alertEl.innerHTML = '<div class="alert-item info"><div class="alert-body"><div class="alert-title">System Normal — No Active Alerts</div><div class="alert-desc">All sensor parameters and Autoencoder multivariate error are within PNSDW safe thresholds.</div></div></div>';
    return;
  }

  alertEl.innerHTML = alertsData.map(a => `
    <div class="alert-item ${a.sev}">
      <div class="alert-icon">${a.icon}</div>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.desc}</div>
      </div>
      <div class="alert-time">${a.time || 'Live'}</div>
      <div class="alert-sev" style="${SEV_STYLE[a.sev]}">${SEV_LABEL[a.sev]}</div>
    </div>`).join('');
}

// ── RENDER MAINTENANCE TIMELINE ──────────────────────────────────────
function urgencyStyles(urgency) {
  const map = {
    now:   { bg: 'rgba(248,113,113,0.12)', color: 'var(--red)',    border: 'rgba(248,113,113,0.3)', label: 'CRITICAL', anim: 'animation:pulse 1.3s infinite' },
    week:  { bg: 'rgba(251,191,36,0.1)',   color: 'var(--yellow)', border: 'rgba(251,191,36,0.3)',  label: 'REPLACE SOON',  anim: '' },
    month: { bg: 'rgba(56,189,248,0.08)',  color: 'var(--accent)', border: 'rgba(56,189,248,0.25)', label: 'UPCOMING',   anim: '' },
  };
  return map[urgency] || map.month;
}

function renderMaintenance() {
  const timelineEl = document.getElementById('maint-timeline');
  if (!timelineEl) return;

  if (!systemTasks.length) {
    timelineEl.innerHTML = '<div class="task-row"><div class="task-body"><div class="task-title">No scheduled tasks</div><div class="task-desc">Predicted maintenance schedule will automatically appear from the XGBoost RUL pipeline.</div></div></div>';
  } else {
    timelineEl.innerHTML = systemTasks.map((t, i) => {
      const u = urgencyStyles(t.urgency);
      return `
        <div class="task-row" style="--dc:${t.dc}">
          <div class="task-dot-col">
            <div class="task-dot"></div>
            ${i < systemTasks.length - 1 ? '<div class="task-line"></div>' : ''}
          </div>
          <div class="task-body">
            <div class="task-top">
              <div>
                <div class="task-date">${t.date}</div>
                <div class="task-title">${t.title}</div>
              </div>
              <div class="task-urg-badge" style="background:${u.bg};color:${u.color};border:1px solid ${u.border};${u.anim}">${u.label}</div>
            </div>
            <div class="task-desc">${t.desc}</div>
            <div class="task-tags">${t.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}</div>
          </div>
        </div>`;
    }).join('');
  }

  // Calendar
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  let html = days.map(d => `<div class="cal-day-label">${d}</div>`).join('');
  for (let i = 0; i < 3; i++) html += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= 30; d++) {
    html += `<div class="cal-cell ${d === 22 ? 'today' : ''} ${d === 15 || d === 28 ? 'has-task' : ''}">${d}</div>`;
  }
  const calEl = document.getElementById('calendar');
  if (calEl) calEl.innerHTML = html;
}

// ── ML BINDINGS & SUMMARY UPDATE ────────────────────────────────────
function updateSummary(mlData = null) {
  let score = 100;
  if (mlData && typeof mlData.health_score === 'number') {
    score = mlData.health_score;
  } else {
    const crits = sensorValues.filter((v, i) => getStatus(v, SENSORS[i]) === 'critical').length;
    const warns = sensorValues.filter((v, i) => getStatus(v, SENSORS[i]) === 'warning').length;
    score = Math.max(10, 100 - crits * 20 - warns * 8);
  }

  if (document.getElementById('health-score')) document.getElementById('health-score').textContent = score + '%';
  if (document.getElementById('sys-health-pct')) document.getElementById('sys-health-pct').textContent = score + '%';
  if (document.getElementById('home-alerts')) document.getElementById('home-alerts').textContent = String(alertsData.length);
  if (document.getElementById('alert-badge')) document.getElementById('alert-badge').textContent = String(alertsData.length);

  // Update Potability Badge
  if (mlData?.potability) {
    const isPot = mlData.potability.is_potable === 1;
    const badgeEl = document.getElementById('home-potability-badge');
    const subEl = document.getElementById('home-potability-sub');
    const maintPot = document.getElementById('maint-potable-val');

    if (badgeEl) {
      badgeEl.textContent = isPot ? "POTABLE" : "NON-POTABLE";
      badgeEl.className = isPot ? "stat-value green" : "stat-value red";
    }
    if (subEl) {
      subEl.textContent = isPot ? `PNSDW Compliant (${mlData.potability.confidence_pct}%)` : `Standard Violation (${mlData.potability.confidence_pct}%)`;
    }
    if (maintPot) {
      maintPot.textContent = isPot ? `POTABLE (${mlData.potability.confidence_pct}%)` : "NON-POTABLE";
      maintPot.className = isPot ? "sys-banner-cell-val green" : "sys-banner-cell-val red";
    }
  }

  // Update Filter RUL Widgets
  if (mlData?.rul) {
    const rulEl = document.getElementById('home-filter-rul');
    const stateEl = document.getElementById('home-filter-state');
    const maintRul = document.getElementById('maint-rul-val');
    const maintState = document.getElementById('maint-health-state');
    const nextService = document.getElementById('maint-next-service');

    if (rulEl) rulEl.textContent = `${mlData.rul.hours} hrs`;
    if (stateEl) stateEl.textContent = `${mlData.rul.health_state} (${mlData.rul.days} days)`;
    if (maintRul) maintRul.textContent = `${mlData.rul.hours}h (${mlData.rul.days}d)`;
    if (maintState) maintState.textContent = mlData.rul.health_state;
    if (nextService) nextService.textContent = mlData.rul.days > 0 ? `In ${mlData.rul.days} days` : "Immediate";
  }
}

// ── DATA INGESTION FROM AI BACKEND ──────────────────────────────────
function applyEnrichedDashboard(payload) {
  if (!payload) return;
  latestMLOutput = payload;

  const s = payload.sensors;
  if (s) {
    sensorValues = [s.flow, s.temp, s.turbidity, s.tds, s.ph];
    SENSORS.forEach((sensor, i) => {
      const v = sensorValues[i];
      if (typeof v === 'number') {
        sensorHistories[i] = [...sensorHistories[i].slice(-(HISTORY_LEN - 1)), v];
      }
    });
  }

  if (Array.isArray(payload.alerts)) alertsData = payload.alerts;
  if (Array.isArray(payload.maintenance_tasks)) systemTasks = payload.maintenance_tasks;

  renderSensors();
  renderAlerts();
  renderMaintenance();
  updateSummary(payload);
}

// ── DATA POLLING LOOP ───────────────────────────────────────────────
async function fetchTelemetry() {
  const statusEl = document.getElementById('system-status-indicator');
  try {
    // 1. Try fetching from Python ML Inference Server
    const response = await fetch(`${BACKEND_API}/api/dashboard-data`);
    if (response.ok) {
      const data = await response.json();
      applyEnrichedDashboard(data);
      if (statusEl) {
        statusEl.textContent = "AI SERVER ONLINE — LIVE INFERENCE";
        statusEl.style.color = "#4ade80";
      }
      return;
    }
  } catch (backendErr) {
    // 2. Fallback to direct ESP32 if Python server is not running
    try {
      const espResp = await fetch(`${ESP32_DIRECT_IP}/data`);
      if (espResp.ok) {
        const espData = await espResp.json();
        sensorValues = [
          espData.flow || 12.0,
          espData.temp || 24.0,
          espData.turbidity || 4.5,
          espData.tds || 140.0,
          espData.ph || 7.2
        ];
        renderSensors();
        updateSummary();
        if (statusEl) {
          statusEl.textContent = "ESP32 DIRECT ONLINE";
          statusEl.style.color = "#38bdf8";
        }
        return;
      }
    } catch (espErr) {
      if (statusEl) {
        statusEl.textContent = "SYSTEM OFFLINE (SIMULATION ACTIVE)";
        statusEl.style.color = "#fbbf24";
      }
    }
  }
}

// ── DEMO SCENARIO SIMULATOR (FOR THESIS DEFENSE) ────────────────────
window.pureFlowSimulate = async function(scenario = "normal") {
  console.log(`[PureFlow AI] Triggering Defense Scenario: ${scenario}`);
  try {
    const res = await fetch(`${BACKEND_API}/api/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
    if (res.ok) fetchTelemetry();
  } catch (e) {
    console.warn("Simulation API offline, running client-side mock:", scenario);
  }
};

// ── DATASET REPLAY TOGGLE ───────────────────────────────────────────
// Streams real rows from grey_water_management.csv through the ML pipeline
// so you can watch the models reacting to actual sensor data.

let replayActive = false;
let replayPollingInterval = null;
const REPLAY_INTERVAL_MS = 1500; // 1.5s per row — fast enough to see changes

async function startReplay() {
  try {
    const res = await fetch(`${BACKEND_API}/api/replay/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offset: 0 }),
    });
    if (!res.ok) { console.warn("Failed to start replay"); return; }

    replayActive = true;

    // Stop normal telemetry polling while replay is active
    if (dataPollingInterval) { clearInterval(dataPollingInterval); dataPollingInterval = null; }

    // Start replay polling loop
    fetchReplayRow();
    replayPollingInterval = setInterval(fetchReplayRow, REPLAY_INTERVAL_MS);

    // Update UI
    const btn = document.getElementById('replay-toggle-btn');
    btn.textContent = "REPLAY ON";
    btn.classList.remove('replay-off');
    btn.classList.add('replay-on');
    document.getElementById('replay-info').style.display = 'block';
    const pillLabel = document.getElementById('live-pill-label');
    if (pillLabel) pillLabel.textContent = 'REPLAY';
    const statusEl = document.getElementById('system-status-indicator');
    if (statusEl) { statusEl.textContent = "DATASET REPLAY ACTIVE"; statusEl.style.color = "#4ade80"; }

    console.log("[PureFlow AI] Dataset replay started — streaming CSV rows through ML pipeline");
  } catch (e) {
    console.warn("Could not start replay:", e);
  }
}

async function stopReplay() {
  try {
    await fetch(`${BACKEND_API}/api/replay/stop`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  } catch (e) { /* server may already be stopped */ }

  replayActive = false;
  if (replayPollingInterval) { clearInterval(replayPollingInterval); replayPollingInterval = null; }

  // Update UI
  const btn = document.getElementById('replay-toggle-btn');
  btn.textContent = "REPLAY OFF";
  btn.classList.remove('replay-on');
  btn.classList.add('replay-off');
  document.getElementById('replay-info').style.display = 'none';
  const pillLabel = document.getElementById('live-pill-label');
  if (pillLabel) pillLabel.textContent = 'LIVE';

  // Resume normal telemetry polling
  startPolling();

  console.log("[PureFlow AI] Dataset replay stopped — resuming normal telemetry");
}

async function fetchReplayRow() {
  try {
    const res = await fetch(`${BACKEND_API}/api/replay/next`);
    if (!res.ok) return;
    const data = await res.json();

    if (data.status === "replay_inactive") {
      stopReplay();
      return;
    }

    // Apply the enriched ML payload exactly like live data
    applyEnrichedDashboard(data);

    // Update replay progress counter
    if (data.replay_info) {
      const rowEl = document.getElementById('replay-row');
      const totalEl = document.getElementById('replay-total');
      if (rowEl) rowEl.textContent = String(data.replay_info.row_index + 1);
      if (totalEl) totalEl.textContent = String(data.replay_info.total_rows);
    }
  } catch (e) {
    console.warn("Replay fetch error:", e);
  }
}

// ── NAVIGATION & CLOCK ──────────────────────────────────────────────
const PAGE_META = {
  home:        { el: 'page-home',        title: 'System Overview' },
  sensors:     { el: 'page-sensors',     title: 'Sensor Monitor' },
  alerts:      { el: 'page-alerts',      title: 'Alerts & Notifications' },
  maintenance: { el: 'page-maintenance', title: 'Maintenance Schedule' },
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const pg = item.dataset.page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(PAGE_META[pg].el).classList.add('active');
    document.getElementById('page-title').textContent = PAGE_META[pg].title;
  });
});

function updateClock() {
  const clockEl = document.getElementById('clock');
  if (clockEl) clockEl.textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// ── INITIALIZATION ──────────────────────────────────────────────────
let dataPollingInterval = null;

function dismissGate() {
  const gate = document.getElementById('connection-gate');
  if (gate) {
    gate.classList.add('gate-hidden');
    setTimeout(() => gate.remove(), 600);
  }
  startPolling();
}

function startPolling() {
  if (dataPollingInterval) return;
  fetchTelemetry();
  dataPollingInterval = setInterval(fetchTelemetry, 2000);
}

function initGate() {
  const gate = document.getElementById('connection-gate');
  if (SKIP_CONNECTION_CHECK) {
    if (gate) gate.remove();
    startPolling();
    return;
  }
  document.getElementById('gate-retry-btn')?.addEventListener('click', fetchTelemetry);
  document.getElementById('gate-skip-btn')?.addEventListener('click', dismissGate);
}

// Wire up replay toggle button
document.getElementById('replay-toggle-btn')?.addEventListener('click', () => {
  if (replayActive) { stopReplay(); } else { startReplay(); }
});

// Start application
renderSensors();
renderAlerts();
renderMaintenance();
updateSummary();
initGate();
