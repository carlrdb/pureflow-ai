# PureFlow AI

**PureFlow AI** is an IoT-based predictive maintenance and water quality monitoring system designed for small-scale commercial water refilling stations. 

Using an **ESP32 microcontroller** with real-time sensors (TDS, pH, Turbidity, Flow Rate, Temperature), the platform detects operational anomalies via an **Autoencoder** and predicts water potability and Remaining Useful Life (RUL) of filtration components using **XGBoost**.

### Core Features
* **Real-time IoT Telemetry:** Continuous water quality and equipment monitoring.
* **Edge Anomaly Detection:** Autoencoder model flags abnormal deviations and filter degradation.
* **Predictive Maintenance:** XGBoost models forecast filter lifespan and monitor potability compliance.
* **Web Dashboard:** Centralized view for real-time readings, maintenance schedules, and fault alerts.
