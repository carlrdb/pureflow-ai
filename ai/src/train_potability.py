"""
PureFlow AI - Model 1: Water Potability XGBoost Classifier
Trains on: ai/dataset/xgboost_updated_water_potability-updated.csv
Expected Benchmark: Accuracy ~80%, F1 ~75%, 5-Fold CV ~86%
"""

import os
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
from sklearn.impute import SimpleImputer

np.random.seed(42)

DATA_PATH = os.path.join(os.path.dirname(__file__), "../dataset/xgboost_updated_water_potability-updated.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "../saved_models")
FIG_DIR = os.path.join(os.path.dirname(__file__), "../../docs/figures")


def train():
    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(FIG_DIR, exist_ok=True)

    print("=" * 60)
    print(">>> TRAINING MODEL 1: WATER POTABILITY (XGBOOST CLASSIFIER)")
    print("=" * 60)

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    print(f"[*] Loaded dataset: {df.shape[0]:,} rows x {df.shape[1]} columns")

    feature_cols = ["ph", "Solids", "Turbidity"]
    X = df[feature_cols]
    y = df["Potability"].astype(int)

    # 70 / 15 / 15 Stratified Split
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, random_state=42, stratify=y)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp)

    # Imputation fit on train only
    imputer = SimpleImputer(strategy="mean")
    X_train = pd.DataFrame(imputer.fit_transform(X_train), columns=feature_cols)
    X_val = pd.DataFrame(imputer.transform(X_val), columns=feature_cols)
    X_test = pd.DataFrame(imputer.transform(X_test), columns=feature_cols)

    # Class balance weighting
    neg = (y_train == 0).sum()
    pos = (y_train == 1).sum()
    scale_pos = neg / pos
    print(f"[*] Class Balance -> Not Potable (0): {neg} | Potable (1): {pos} | scale_pos_weight: {scale_pos:.2f}")

    # XGBoost Classifier with tuned hyperparameters
    model = xgb.XGBClassifier(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        gamma=0.1,
        scale_pos_weight=scale_pos,
        eval_metric="logloss",
        early_stopping_rounds=20,
        random_state=42,
    )

    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    print(f"[+] Optimal Training Iteration: {model.best_iteration}")

    # Evaluation on Test Set
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    # 5-Fold Cross Validation
    X_full = pd.DataFrame(SimpleImputer(strategy="mean").fit_transform(X), columns=feature_cols)
    cv_model = xgb.XGBClassifier(
        n_estimators=model.best_iteration,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        gamma=0.1,
        scale_pos_weight=scale_pos,
        eval_metric="logloss",
        random_state=42,
    )
    cv_scores = cross_val_score(cv_model, X_full, y, cv=5, scoring="f1")

    print("\n" + "-" * 40)
    print("POTABILITY EVALUATION RESULTS (Test Set)")
    print("-" * 40)
    print(f"  Accuracy       : {acc * 100:.2f}%  (Target: ~80%)")
    print(f"  Precision      : {prec * 100:.2f}%  (Target: ~73%)")
    print(f"  Recall         : {rec * 100:.2f}%  (Target: ~77%)")
    print(f"  F1-Score       : {f1 * 100:.2f}%  (Target: ~75%)")
    print(f"  5-Fold CV F1   : {cv_scores.mean() * 100:.2f}% +/- {cv_scores.std() * 100:.2f}%")
    print("-" * 40)
    print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=["Not Potable", "Potable"]))

    # Save artifacts
    model_path = os.path.join(MODEL_DIR, "potability_xgboost.json")
    imputer_path = os.path.join(MODEL_DIR, "potability_imputer.pkl")
    features_path = os.path.join(MODEL_DIR, "potability_feature_columns.pkl")

    model.save_model(model_path)
    joblib.dump(imputer, imputer_path)
    joblib.dump(feature_cols, features_path)
    print(f"[+] Saved model & artifacts to {MODEL_DIR}")

    # Generate & save Confusion Matrix (Figure 5 in thesis manuscript)
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax,
                xticklabels=["Not Potable", "Potable"],
                yticklabels=["Not Potable", "Potable"])
    ax.set_xlabel("Predicted Label", fontsize=11, fontweight="bold")
    ax.set_ylabel("Actual Ground Truth", fontsize=11, fontweight="bold")
    ax.set_title(f"Figure 5. Confusion Matrix (Accuracy: {acc*100:.1f}%)", fontsize=12, fontweight="bold")
    plt.tight_layout()

    fig_path = os.path.join(FIG_DIR, "figure5_potability_confusion_matrix.png")
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"[+] Saved thesis figure to {fig_path}")

    return {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1, "cv_f1": cv_scores.mean()}


if __name__ == "__main__":
    train()
