"""
PureFlow AI - Backend Inference & Telemetry API Server
Bridges ESP32 sensor telemetry, runs real-time inference across 3 ML models,
applies Chapter 3 Decision Tables (6 & 7), and serves the Web Dashboard.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder=os.path.abspath(os.path.join(os.path.dirname(__file__), "../../software")))
CORS(app)

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../saved_models"))

# Global model holders
potability_model = None
potability_imputer = None
rul_model = None
rul_constants = None
autoencoder_model = None
autoencoder_scaler = None
autoencoder_config = None

# In-memory telemetry state
latest_telemetry = {
    "flow": 12.5,
    "temp": 24.2,
    "turbidity": 8.5,
    "tds": 145.0,
    "ph": 7.35,
    "timestamp": datetime.now().isoformat(),
}

telemetry_history = {
    "flow": [],
    "temp": [],
    "turbidity": [],
    "tds": [],
    "ph": [],
}


def load_all_models():
    global potability_model, potability_imputer
    global rul_model, rul_constants
    global autoencoder_model, autoencoder_scaler, autoencoder_config

    print("[*] Loading trained PureFlow AI models from:", MODEL_DIR)

    # 1. Potability Model
    pot_model_path = os.path.join(MODEL_DIR, "potability_xgboost.json")
    pot_imputer_path = os.path.join(MODEL_DIR, "potability_imputer.pkl")
    if os.path.exists(pot_model_path) and os.path.exists(pot_imputer_path):
        potability_model = xgb.XGBClassifier()
        potability_model.load_model(pot_model_path)
        potability_imputer = joblib.load(pot_imputer_path)
        print("  [+] Model 1 (Water Potability XGBoost) loaded successfully.")

    # 2. RUL Model
    rul_model_path = os.path.join(MODEL_DIR, "rul_xgboost.json")
    rul_const_path = os.path.join(MODEL_DIR, "rul_constants.json")
    if os.path.exists(rul_model_path) and os.path.exists(rul_const_path):
        rul_model = xgb.XGBRegressor()
        rul_model.load_model(rul_model_path)
        with open(rul_const_path, "r") as f:
            rul_constants = json.load(f)
        print("  [+] Model 2 (Filter RUL XGBoost) loaded successfully.")

    # 3. Autoencoder Model
    ae_model_path = os.path.join(MODEL_DIR, "autoencoder_model.pkl")
    ae_scaler_path = os.path.join(MODEL_DIR, "autoencoder_scaler.pkl")
    ae_config_path = os.path.join(MODEL_DIR, "autoencoder_config.json")
    if os.path.exists(ae_model_path) and os.path.exists(ae_scaler_path):
        autoencoder_model = joblib.load(ae_model_path)
        autoencoder_scaler = joblib.load(ae_scaler_path)
        with open(ae_config_path, "r") as f:
            autoencoder_config = json.load(f)
        print("  [+] Model 3 (Anomaly Autoencoder) loaded successfully.")


def run_inference_pipeline(readings):
    """
    Executes the 3 ML models and applies Decision Tables 6 & 7.
    """
    flow = float(readings.get("flow", 12.0))
    temp = float(readings.get("temp", 24.0))
    turbidity = float(readings.get("turbidity", 5.0))
    tds = float(readings.get("tds", 150.0))
    ph = float(readings.get("ph", 7.2))

    results = {
        "sensors": {"flow": flow, "temp": temp, "turbidity": turbidity, "tds": tds, "ph": ph},
        "potability": {"is_potable": 1, "label": "POTABLE", "confidence_pct": 92.5},
        "rul": {"hours": 2450.0, "days": 102.1, "health_state": "Normal", "action": "Optimal operation"},
        "anomaly": {"is_anomaly": False, "reconstruction_error": 0.00001, "threshold": 0.000073},
        "alerts": [],
        "maintenance_tasks": [],
        "health_score": 100,
    }

    # --- 1. Water Potability Prediction ---
    if potability_model is not None and potability_imputer is not None:
        try:
            raw_input = pd.DataFrame([{"ph": ph, "Solids": tds, "Turbidity": turbidity}])
            imputed = potability_imputer.transform(raw_input)
            pred = int(potability_model.predict(imputed)[0])
            prob = float(potability_model.predict_proba(imputed)[0][pred]) * 100
            results["potability"] = {
                "is_potable": pred,
                "label": "POTABLE (PNSDW Compliant)" if pred == 1 else "NON-POTABLE",
                "confidence_pct": round(prob, 1),
            }
        except Exception as e:
            print("[!] Potability inference error:", e)

    # --- 2. Filter RUL Estimation ---
    if rul_model is not None and rul_constants is not None:
        try:
            TDS_MAX = rul_constants.get("TDS_MAX", 500.0)
            TURBIDITY_MAX = rul_constants.get("TURBIDITY_MAX", 10.0)
            FLOW_MAX = rul_constants.get("FLOW_MAX", 100.0)

            # Feature Engineering matching training
            input_df = pd.DataFrame([{
                "Flow Discharge (L/min)": flow,
                "Turbidity (NTU)": turbidity,
                "TDS (mg/l)": tds,
                "pH": ph,
                "Temperature (deg C)": temp,
                "TDS_x_Turbidity": tds * turbidity,
                "pH_deviation": abs(ph - 7.0),
                "Flow_per_TDS": flow / (tds + 1e-9),
                "Turbidity_per_Flow": turbidity / (flow + 1e-9),
                "Temp_x_TDS": temp * tds,
                "Degradation_Index": (tds / TDS_MAX + turbidity / TURBIDITY_MAX + abs(ph - 7.0) / 7.0) / 3.0,
            }])

            rul_hours = float(np.clip(rul_model.predict(input_df)[0], 0, 5000))
            rul_days = round(rul_hours / 24.0, 1)

            # Manuscript Table 6 Mapping
            if rul_hours > 300:
                health_state = "Normal"
                urgency = "month"
                action = "System operating within optimal parameters."
            elif 100 <= rul_hours <= 300:
                health_state = "Early Degradation"
                urgency = "week"
                action = "Monitor dashboard for increasing turbidity/pressure."
            elif 24 <= rul_hours < 100:
                health_state = "Replace Soon"
                urgency = "week"
                action = "Order replacement filter/parts."
            else:
                health_state = "Critical"
                urgency = "now"
                action = "Maintenance required immediately to prevent downtime."

            results["rul"] = {
                "hours": round(rul_hours, 1),
                "days": rul_days,
                "health_state": health_state,
                "urgency": urgency,
                "action": action,
            }
        except Exception as e:
            print("[!] RUL inference error:", e)

    # --- 3. Autoencoder Anomaly Detection ---
    if autoencoder_model is not None and autoencoder_scaler is not None:
        try:
            raw_vec = np.array([[tds, turbidity, ph, flow]])
            scaled_vec = autoencoder_scaler.transform(raw_vec)
            reconstructed = autoencoder_model.predict(scaled_vec)
            mse = float(np.mean(np.square(scaled_vec - reconstructed)))
            threshold = float(autoencoder_config.get("anomaly_threshold", 0.0001))
            is_anomaly = bool(mse > threshold)

            results["anomaly"] = {
                "is_anomaly": is_anomaly,
                "reconstruction_error": round(mse, 6),
                "threshold": round(threshold, 6),
            }
        except Exception as e:
            print("[!] Autoencoder inference error:", e)

    # --- 4. Evaluate Table 7 Fault & Anomaly Matrix ---
    now_str = datetime.now().strftime("%I:%M %p")
    alerts = []
    health_penalty = 0

    if results["potability"]["is_potable"] == 0:
        alerts.append({
            "sev": "crit",
            "icon": "⚠️",
            "title": "Water Potability Failure (PNSDW 2017)",
            "desc": "Water sample does not meet safe drinking standards under DOH AO 2017-0010.",
            "time": now_str,
        })
        health_penalty += 30

    if tds > 500:
        alerts.append({
            "sev": "crit",
            "icon": "🔴",
            "title": "TDS Limit Exceeded (> 500 ppm)",
            "desc": "Immediate Action: Replace RO membrane and verify post-filtration TDS.",
            "time": now_str,
        })
        health_penalty += 25

    if turbidity > 35:
        alerts.append({
            "sev": "warn",
            "icon": "🟡",
            "title": "Turbidity Spike Detected",
            "desc": "System Response: Check pre-filter stage; possible raw water sediment influx.",
            "time": now_str,
        })
        health_penalty += 15

    if flow < 2.0:
        alerts.append({
            "sev": "warn",
            "icon": "📉",
            "title": "Low Flow Rate Detected (< 2 L/min)",
            "desc": "Inspection Required: Check pump wear or clogged sediment filter cartridge.",
            "time": now_str,
        })
        health_penalty += 15

    if results["anomaly"]["is_anomaly"]:
        alerts.append({
            "sev": "warn",
            "icon": "🤖",
            "title": "Autoencoder Multivariate Anomaly Flagged",
            "desc": f"Unusual sensor covariance detected (MSE: {results['anomaly']['reconstruction_error']:.6f} > {results['anomaly']['threshold']:.6f}).",
            "time": now_str,
        })
        health_penalty += 15

    if results["rul"]["health_state"] == "Critical":
        alerts.append({
            "sev": "crit",
            "icon": "🔧",
            "title": "Filter RUL Critical (< 24 Hours)",
            "desc": "Urgent Action: Replace RO / Carbon filter cartridge immediately.",
            "time": now_str,
        })
        health_penalty += 20

    results["alerts"] = alerts
    results["health_score"] = max(10, 100 - health_penalty)

    # --- 5. Generate Maintenance Schedule (from RUL) ---
    rul_days = results["rul"]["days"]
    next_filter_date = (datetime.now() + timedelta(days=max(1, int(rul_days)))).strftime("%b %d, %Y")
    flush_date = (datetime.now() + timedelta(days=7)).strftime("%b %d, %Y")

    tasks = [
        {
            "date": next_filter_date,
            "title": f"RO Membrane Replacement ({results['rul']['health_state']})",
            "desc": f"Forecasted RUL: {results['rul']['hours']} hours ({rul_days} days). {results['rul']['action']}",
            "urgency": results["rul"]["urgency"],
            "dc": "#38bdf8",
            "tags": ["RO Membrane", "Filter Cartridge", "XGBoost RUL"],
        },
        {
            "date": flush_date,
            "title": "Routine Sensor Calibration & System Flush",
            "desc": "Calibrate SEN0554 Turbidity and SEN0244 TDS sensor probes.",
            "urgency": "month",
            "dc": "#34d399",
            "tags": ["Calibration", "Sensors", "PNSDW 2017"],
        },
    ]
    results["maintenance_tasks"] = tasks

    return results


# ── REST API ROUTES ──────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/telemetry", methods=["POST"])
def receive_telemetry():
    """
    Receives JSON from physical ESP32: {"flow": 12.5, "temp": 24.0, "turbidity": 8.0, "tds": 140.0, "ph": 7.2}
    """
    global latest_telemetry, telemetry_history
    data = request.get_json(force=True)
    latest_telemetry = {
        "flow": float(data.get("flow", latest_telemetry["flow"])),
        "temp": float(data.get("temp", latest_telemetry["temp"])),
        "turbidity": float(data.get("turbidity", latest_telemetry["turbidity"])),
        "tds": float(data.get("tds", latest_telemetry["tds"])),
        "ph": float(data.get("ph", latest_telemetry["ph"])),
        "timestamp": datetime.now().isoformat(),
    }

    # Update sparkline rolling history (max 30 samples)
    for key in ["flow", "temp", "turbidity", "tds", "ph"]:
        telemetry_history[key].append(latest_telemetry[key])
        if len(telemetry_history[key]) > 30:
            telemetry_history[key] = telemetry_history[key][-30:]

    return jsonify({"status": "success", "received": latest_telemetry})


@app.route("/api/dashboard-data", methods=["GET"])
def get_dashboard_data():
    """
    Returns full enriched dashboard payload for software/app.js.
    """
    enriched = run_inference_pipeline(latest_telemetry)
    enriched["history"] = telemetry_history
    enriched["status"] = "online"
    return jsonify(enriched)


@app.route("/api/simulate", methods=["POST"])
def simulate_scenario():
    """
    Allows triggering specific demo/defense scenarios:
    'normal', 'turbidity_spike', 'high_tds', 'acid_ph', 'filter_critical'
    """
    global latest_telemetry
    data = request.get_json(force=True) or {}
    scenario = data.get("scenario", "normal")

    scenarios = {
        "normal": {"flow": 14.5, "temp": 23.5, "turbidity": 4.2, "tds": 120.0, "ph": 7.35},
        "turbidity_spike": {"flow": 12.0, "temp": 24.0, "turbidity": 48.5, "tds": 210.0, "ph": 7.10},
        "high_tds": {"flow": 9.5, "temp": 25.0, "turbidity": 6.0, "tds": 580.0, "ph": 6.85},
        "acid_ph": {"flow": 13.0, "temp": 22.8, "turbidity": 5.1, "tds": 160.0, "ph": 5.20},
        "filter_critical": {"flow": 2.5, "temp": 26.0, "turbidity": 28.0, "tds": 490.0, "ph": 6.40},
    }

    if scenario in scenarios:
        latest_telemetry.update(scenarios[scenario])
        latest_telemetry["timestamp"] = datetime.now().isoformat()
        for key in ["flow", "temp", "turbidity", "tds", "ph"]:
            telemetry_history[key].append(latest_telemetry[key])
            if len(telemetry_history[key]) > 30:
                telemetry_history[key] = telemetry_history[key][-30:]

    return jsonify({"status": "scenario_applied", "scenario": scenario, "telemetry": latest_telemetry})


# ── DATASET REPLAY (MOCK SENSOR STREAM FROM CSV) ─────────────────────────────

DATASET_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../dataset/grey_water_management.csv"))
replay_state = {
    "active": False,
    "index": 0,
    "rows": [],
    "total": 0,
}


def _load_replay_dataset():
    """Load dataset rows into memory once, derive temperature column."""
    if replay_state["rows"]:
        return  # already loaded
    df = pd.read_csv(DATASET_PATH)
    # Derive temperature the same way as train_rul.py
    rng = np.random.RandomState(42)
    df["temp"] = (20 + 0.015 * df["TDS (mg/l)"] - 0.3 * df["Turbidity (NTU)"]
                  + rng.normal(0, 0.5, len(df))).clip(5, 40)
    rows = []
    for _, r in df.iterrows():
        rows.append({
            "flow": round(float(r["Flow Discharge (L/min)"]), 2),
            "temp": round(float(r["temp"]), 2),
            "turbidity": round(float(r["Turbidity (NTU)"]), 3),
            "tds": round(float(r["TDS (mg/l)"]), 2),
            "ph": round(float(r["pH"]), 3),
        })
    replay_state["rows"] = rows
    replay_state["total"] = len(rows)
    print(f"[*] Loaded {len(rows):,} replay rows from {DATASET_PATH}")


@app.route("/api/replay/start", methods=["POST"])
def replay_start():
    """Start or restart dataset replay from row 0 (or a given offset)."""
    _load_replay_dataset()
    data = request.get_json(force=True) or {}
    replay_state["active"] = True
    replay_state["index"] = int(data.get("offset", 0)) % replay_state["total"]
    return jsonify({"status": "replay_started", "total_rows": replay_state["total"],
                    "starting_at": replay_state["index"]})


@app.route("/api/replay/stop", methods=["POST"])
def replay_stop():
    """Stop dataset replay."""
    replay_state["active"] = False
    return jsonify({"status": "replay_stopped", "stopped_at": replay_state["index"]})


@app.route("/api/replay/next", methods=["GET"])
def replay_next():
    """
    Return the next dataset row, advance the pointer, update telemetry state,
    and run full ML inference so the dashboard sees real model reactions.
    """
    global latest_telemetry, telemetry_history

    if not replay_state["active"] or not replay_state["rows"]:
        return jsonify({"status": "replay_inactive"}), 200

    idx = replay_state["index"]
    row = replay_state["rows"][idx]

    # Advance pointer (wrap around)
    replay_state["index"] = (idx + 1) % replay_state["total"]

    # Update global telemetry as if ESP32 sent this reading
    latest_telemetry = {**row, "timestamp": datetime.now().isoformat()}
    for key in ["flow", "temp", "turbidity", "tds", "ph"]:
        telemetry_history[key].append(latest_telemetry[key])
        if len(telemetry_history[key]) > 30:
            telemetry_history[key] = telemetry_history[key][-30:]

    # Run full inference pipeline on this real dataset row
    enriched = run_inference_pipeline(latest_telemetry)
    enriched["history"] = telemetry_history
    enriched["status"] = "replay"
    enriched["replay_info"] = {
        "row_index": idx,
        "total_rows": replay_state["total"],
        "progress_pct": round((idx / replay_state["total"]) * 100, 2),
    }
    return jsonify(enriched)


@app.route("/api/replay/status", methods=["GET"])
def replay_status():
    """Check current replay state."""
    return jsonify({
        "active": replay_state["active"],
        "index": replay_state["index"],
        "total": replay_state["total"],
    })


# ── STATIC FILE CATCH-ALL (must be LAST route) ──────────────────────────────
@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    load_all_models()
    print("\n========================================================")
    print("  PUREFLOW AI SERVER ONLINE: http://127.0.0.1:5000")
    print("========================================================\n")
    app.run(host="0.0.0.0", port=5000, debug=False)

