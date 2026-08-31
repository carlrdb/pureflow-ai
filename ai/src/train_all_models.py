"""
PureFlow AI - Master Training Script
Executes training for all 3 thesis models:
  1. Water Potability Classifier (XGBoost)
  2. Filter Remaining Useful Life Regressor (XGBoost)
  3. Real-Time Anomaly Detector (Deep Autoencoder)

Saves all model binaries into ai/saved_models/ and thesis plots into docs/figures/
"""

import time
import os
import sys

# Ensure local imports work
sys.path.insert(0, os.path.dirname(__file__))

import train_potability
import train_rul
import train_autoencoder


def run_master_pipeline():
    start_time = time.time()
    print("\n" + "=" * 70)
    print("  PUREFLOW AI -- FULL MODEL TRAINING & EVALUATION PIPELINE")
    print("=" * 70 + "\n")

    # 1. Train Potability
    pot_results = train_potability.train()
    print("\n")

    # 2. Train RUL
    rul_results = train_rul.train()
    print("\n")

    # 3. Train Autoencoder
    ae_results = train_autoencoder.train()
    print("\n")

    elapsed = time.time() - start_time

    # Print Master Summary Table (Chapter 4 Thesis Table 5 Format)
    print("=" * 70)
    print("MASTER THESIS MODEL PERFORMANCE SUMMARY (TABLE 5)")
    print("=" * 70)
    print(f"{'Model Component':<32} | {'Evaluation Metric':<20} | {'Achieved Result'}")
    print("-" * 70)
    print(f"{'1. Water Potability (XGBoost)':<32} | {'Accuracy':<20} | {pot_results['accuracy']*100:.2f}% (Target: ~80%)")
    print(f"{'':<32} | {'Precision':<20} | {pot_results['precision']*100:.2f}% (Target: ~73%)")
    print(f"{'':<32} | {'Recall':<20} | {pot_results['recall']*100:.2f}% (Target: ~77%)")
    print(f"{'':<32} | {'F1-Score':<20} | {pot_results['f1']*100:.2f}% (Target: ~75%)")
    print(f"{'':<32} | {'5-Fold CV F1':<20} | {pot_results['cv_f1']*100:.2f}% (Target: ~86%)")
    print("-" * 70)
    print(f"{'2. RUL Estimation (XGBoost)':<32} | {'R2 Score':<20} | {rul_results['r2']*100:.2f}% (Target: ~98%)")
    print(f"{'':<32} | {'5-Fold CV R2':<20} | {rul_results['cv_r2']*100:.2f}% (Target: ~98%)")
    print(f"{'':<32} | {'MAE (Mean Abs Error)':<20} | {rul_results['mae']:.2f} hours (Target: ~74.7h)")
    print(f"{'':<32} | {'RMSE':<20} | {rul_results['rmse']:.2f} hours (Target: ~91.4h)")
    print(f"{'':<32} | {'MAPE':<20} | {rul_results['mape']:.2f}% (Target: ~3.1%)")
    print("-" * 70)
    print(f"{'3. Anomaly Detection (Autoencoder)':<32} | {'Reconstruction MSE':<20} | {ae_results['mean_mse']:.6f} (< 0.0005)")
    print(f"{'':<32} | {'Threshold (mu+3sigma)':<20} | {ae_results['threshold']:.6f}")
    print(f"{'':<32} | {'Test Anomalies':<20} | {ae_results['anomaly_pct']:.2f}% flagged")
    print("=" * 70)
    print(f"[+] Total Pipeline Execution Time: {elapsed:.2f} seconds")
    print(f"[+] Saved Model Binaries in: pureflow-ai/ai/saved_models/")
    print(f"[+] Saved Thesis Defense Figures in: pureflow-ai/docs/figures/\n")


if __name__ == "__main__":
    run_master_pipeline()
