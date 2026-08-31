# PureFlow AI — Thesis Implementation & Model Integration Plan

> **Manuscript Title:** *PureFlow AI: IoT-based Predictive Maintenance System for Water Refilling Stations using XGBoost and Autoencoder Algorithms*  
> **Institution:** Colegio de Muntinlupa — Computer Engineering Department  
> **Authors:** Mandy Mae F. Abosejo, Carl Renzo D. Borras, Gian Lloyd T. Mustar  
> **Adviser:** Engr. Ricrey E. Marquez  

---

## 🎯 Project Overview & Thesis Objectives

**PureFlow AI** is an IoT-based predictive maintenance and real-time water quality monitoring system designed specifically for small-scale commercial water refilling stations in Muntinlupa City. 

The system collects multivariate sensor telemetry via an **ESP32 microcontroller**, processes data through three distinct **Machine Learning models**, and visualizes actionable health states, remaining useful life (RUL), and automated fault alerts on a **Web Dashboard**.

```
[ IoT Sensors ] ──▶ [ ESP32 Microcontroller ] ──▶ [ Python AI Inference Server ] ──▶ [ Centralized Web Dashboard ]
  • Turbidity          • Data acquisition            • Autoencoder (Anomaly)           • Live Sensor Monitoring
  • TDS                • Local validation            • XGBoost (Potability)            • Health Score & RUL Gauge
  • pH                 • Wi-Fi HTTP Stream           • XGBoost (Filter RUL)            • Maintenance Calendar
  • Temperature                                      • Decision Logic (Tables 6 & 7)   • Automated Fault Alerts
  • Flow Rate
```

---

## 📂 Project Directory Structure

```plaintext
pureflow-ai/
├── ai/
│   ├── dataset/                                   # Verified thesis datasets
│   │   ├── autoencoder_grey_water_management.csv  # 19,656 rows × 4 cols
│   │   ├── grey_water_management.csv              # 19,656 rows × 7 cols
│   │   └── xgboost_updated_water_potability-updated.csv # 9,154 rows × 4 cols
│   ├── notebooks/                                 # Jupyter / Colab notebooks
│   │   ├── autoencoder_training.ipynb             # Anomaly detection research
│   │   ├── rulestimation.ipynb                    # RUL regression research
│   │   └── waterpotability.ipynb                  # Potability classification research
│   ├── saved_models/                              # Exported model binaries & scalers
│   └── src/                                       # Production training & inference scripts
│       ├── train_all_models.py                    # Unified training script
│       └── server.py                              # Flask / REST inference API
│
├── software/                                      # Web Dashboard Telemetry UI
│   ├── index.html                                 # Dashboard interface & connection gate
│   ├── style.css                                  # Custom dark styling & animations
│   └── app.js                                     # Real-time polling & telemetry bridge
│
├── esp32/                                         # Microcontroller Firmware & Tools
│   ├── firmaware/                                 # Arduino sketches
│   │   ├── TEst_update_for_tds/
│   │   └── Turbidity_and_temp_sensor/
│   └── CP210x_Universal_Windows_Driver/           # USB-to-UART bridge driver
│
├── New CpE12 - COEN313 POD Manuscript.docx        # Full Capstone Manuscript
├── THESIS_IMPLEMENTATION_PLAN.md                  # This Master Plan
└── README.md
```

---

## 📊 Dataset & Model Specifications

> 💡 **Note on Metrics & Figures:** The numbers, confusion matrices, and scatter plots in the current manuscript draft represent **preliminary baseline estimates and are not set in stone**. The training pipeline dynamically calculates and logs the empirical metrics, confusion matrices, ROC/PR curves, and RUL regression errors so they can be easily updated in the final manuscript.

### 1. Water Potability Classification (XGBoost Classifier)
* **Notebook:** `ai/notebooks/waterpotability.ipynb`
* **Dataset:** `ai/dataset/xgboost_updated_water_potability-updated.csv` (9,154 rows × 4 cols)
* **Features:** `ph`, `Solids` (TDS ppm), `Turbidity` (NTU)
* **Target:** `Potability` (`0` = Non-potable, `1` = Potable)
* **Preliminary Draft Baseline (Table 5 — *Subject to dynamic evaluation*):**
  * Accuracy: **~0.80** | Precision: **~0.73** | Recall: **~0.77** | F1-Score: **~0.75**
* **Output Artifacts:** `potability_xgboost.json`, `potability_imputer.pkl`, `potability_features.pkl`

---

### 2. Remaining Useful Life (RUL) Estimation (XGBoost Regressor)
* **Notebook:** `ai/notebooks/rulestimation.ipynb`
* **Dataset:** `ai/dataset/grey_water_management.csv` (19,656 rows × 7 cols)
* **Raw Features:** `Flow Discharge (L/min)`, `Turbidity (NTU)`, `TDS (mg/l)`, `pH`, `Filter Life Span (hours)`
* **Engineered Features:** `Temperature (°C)`, `TDS_x_Turbidity`, `pH_deviation`, `Flow_per_TDS`, `Turbidity_per_Flow`, `Temp_x_TDS`, `Degradation_Index`
* **Target:** `RUL (hours)` = `Filter Life Span * (1 - stress_score)`
* **Preliminary Draft Baseline (Table 5 — *Subject to dynamic evaluation*):**
  * MAE: **~74.71 hours** | RMSE: **~91.45 hours** | $R^2$: **~0.98**
* **Output Artifacts:** `rul_xgboost.json`, `rul_constants.json`, `rul_features.pkl`

---

### 3. Anomaly Detection (Deep Autoencoder)
* **Notebook:** `ai/notebooks/autoencoder_training.ipynb`
* **Dataset:** `ai/dataset/autoencoder_grey_water_management.csv` (19,656 rows × 4 cols)
* **Features:** `TDS (mg/l)`, `Turbidity (NTU)`, `pH`, `Flow Discharge (L/min)`
* **Architecture:** Symmetric Deep Autoencoder (Input 4 $\rightarrow$ Dense 32 $\rightarrow$ Dense 16 $\rightarrow$ Bottleneck 8 $\rightarrow$ Dense 16 $\rightarrow$ Dense 32 $\rightarrow$ Output 4)
* **Threshold Formulation:** $\text{Threshold} = \mu_{\text{train\_MSE}} + 3 \times \sigma_{\text{train\_MSE}}$
* **Output Artifacts:** `autoencoder_model.keras`, `autoencoder_scaler.pkl`, `autoencoder_threshold.json`

---

## 📑 Manuscript Decision Tables (Rules Engine)

### Table 6. XGBoost RUL Health State Matrix
| Health State | RUL Output (Hours) | Action Required | Dashboard Indicator |
| :--- | :--- | :--- | :--- |
| **Normal** | $> 300\text{ Hours}$ | System operating within optimal parameters. | 🟢 Green Badge / Healthy |
| **Early Degradation** | $100 - 300\text{ Hours}$ | Monitor dashboard for increasing turbidity/pressure. | 🟡 Yellow Badge / Warning |
| **Replace Soon** | $24 - 100\text{ Hours}$ | Order replacement filter / parts. | 🟠 Orange Badge / Urgent |
| **Critical** | $< 24\text{ Hours}$ | Maintenance required immediately to prevent downtime. | 🔴 Red Badge / Critical Pulse |

---

### Table 7. Predictive Maintenance Fault & Anomaly Flow
| Anomaly Type | Trigger Condition | System Response / Action |
| :--- | :--- | :--- |
| **Turbidity Spike** | $\text{Turbidity} > \text{Threshold}$ | Check pre-filter; possible high raw water sediment. |
| **TDS Rise** | $\text{TDS} > 500\text{ ppm}$ | Immediate action: Replace RO membrane and verify PNSDW compliance. |
| **Flow Rate Decline** | $\text{Flow} < \text{Minimum L/min}$ | Check for pipe blockages or pump wear. |
| **Multivariate Anomaly** | $\text{Autoencoder MSE} > \text{Threshold}$ | Flag unexpected operational deviation / sensor fault. |

---

## 🛠️ Master To-Do Roadmap for Future Sessions

### ✅ Completed
- [x] Verified dataset availability and integrity in `ai/dataset/`.
- [x] Confirmed column schema alignment with thesis manuscript.
- [x] Documented complete thesis architecture and decision rules.

---

### ⏳ Next Steps

#### Phase 1: Local Model Training & Export (`ai/src/train_all_models.py`)
1. Create a consolidated training script that reads the local CSV files in `ai/dataset/`.
2. Train all 3 models (Autoencoder, XGBoost RUL, XGBoost Potability).
3. Validate training metrics against Table 5 in manuscript.
4. Export all model weights and transformers to `ai/saved_models/`.

#### Phase 2: Python Inference Backend (`ai/src/server.py`)
1. Create a Flask/FastAPI server with CORS enabled.
2. Load serialized models at startup into memory.
3. Expose `POST /api/telemetry` to receive real-time or simulated sensor frames.
4. Expose `GET /api/dashboard-data` returning:
   - Live sensor values & sparkline history
   - Water Potability status (Potable / Non-potable)
   - Calculated RUL in hours & Health State (Table 6)
   - Autoencoder Anomaly score & flag
   - Active alerts list (Table 7)
   - Maintenance schedule events

#### Phase 3: Web Dashboard Integration (`software/`)
1. Update `software/app.js` to poll the Flask server endpoint `/api/dashboard-data`.
2. Connect UI components to live model inferences.
3. Keep offline fallback `SKIP_CONNECTION_CHECK` for easy demo presentations.

#### Phase 4: ESP32 Hardware Telemetry Stream (`esp32/`)
1. Consolidate sensor read loops into `main.ino` for the 5 sensors (Turbidity SEN0554, TDS SEN0244, pH SEN0161, Temperature DS18B20, Flow YF-S201).
2. Stream JSON data via Wi-Fi HTTP client/server to the Python backend.

#### Phase 5: Thesis Defense Material Preparation
1. Generate Figures 5 & 6 (Confusion matrix and RUL actual vs predicted plots) from the trained models.
2. Collect response latency data and usability evaluation forms for Chapter 4/5.
