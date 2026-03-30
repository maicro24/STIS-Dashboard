

"""
STIS Traffic Density Prediction Model
Best Configuration: RF 300 trees + 6 features + predict 2 steps (0.5s ahead)
R2 = 0.74, MAE = 0.067
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, "..", "traffic_timeseries_FINAL.csv")
MODEL_NAME = os.path.join(SCRIPT_DIR, "traffic_model.joblib")
WINDOW_SIZE = 20       # 20 samples = 5 seconds lookback
PREDICT_STEPS = 2      # 2 samples = 0.5 seconds ahead
FEATURES = ['vehicle_count', 'average_speed_kmh', 'density', 'speed_variance', 'density_trend', 'flow_trend']

def prepare_data(df):
    data = df[FEATURES].values
    X, y = [], []
    for i in range(len(data) - WINDOW_SIZE - PREDICT_STEPS):
        X.append(data[i : i + WINDOW_SIZE].flatten())
        y.append(data[i + WINDOW_SIZE + PREDICT_STEPS - 1, 2])  # density only
    return np.array(X), np.array(y)

def train():
    if not os.path.exists(DATA_PATH):
        print(f"[ERROR] Data file not found: {DATA_PATH}")
        return

    print("=" * 60)
    print("  STIS Density Prediction Model - Training")
    print("=" * 60)

    df = pd.read_csv(DATA_PATH)
    print(f"\n[STEP 1] Dataset: {len(df)} samples")
    print(f"  Features: {FEATURES}")

    X, y = prepare_data(df)
    print(f"\n[STEP 2] Sliding Window")
    print(f"  Window: {WINDOW_SIZE} samples (5 sec)")
    print(f"  Predict: {PREDICT_STEPS} steps ahead (0.5 sec)")
    print(f"  Input shape: {X.shape}")
    print(f"  Total samples: {len(X)}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"\n[STEP 3] Train/Test Split")
    print(f"  Training: {len(X_train)} (80%)")
    print(f"  Testing:  {len(X_test)} (20%)")

    print(f"\n[STEP 4] Training Random Forest (300 trees)...")
    model = RandomForestRegressor(n_estimators=300, random_state=42)
    model.fit(X_train, y_train)

    preds_train = model.predict(X_train)
    preds_test = model.predict(X_test)
    
    r2_train = r2_score(y_train, preds_train)
    r2_test = r2_score(y_test, preds_test)
    mae_train = mean_absolute_error(y_train, preds_train)
    mae_test = mean_absolute_error(y_test, preds_test)

    within_5 = np.mean(np.abs(y_test - preds_test) <= 0.05) * 100
    within_10 = np.mean(np.abs(y_test - preds_test) <= 0.10) * 100
    within_20 = np.mean(np.abs(y_test - preds_test) <= 0.20) * 100

    print(f"\n[STEP 5] Results")
    print(f"  +-----------+---------+---------+")
    print(f"  | Metric    |  Train  |  Test   |")
    print(f"  +-----------+---------+---------+")
    print(f"  | R2        | {r2_train:.4f}  | {r2_test:.4f}  |")
    print(f"  | MAE       | {mae_train:.4f}  | {mae_test:.4f}  |")
    print(f"  +-----------+---------+---------+")
    print(f"")
    print(f"  Accuracy: +/-5%={within_5:.1f}%  +/-10%={within_10:.1f}%  +/-20%={within_20:.1f}%")

    joblib.dump({
        'model': model,
        'features': FEATURES,
        'window_size': WINDOW_SIZE,
        'predict_steps': PREDICT_STEPS,
        'r2_test': r2_test,
        'mae_test': mae_test,
    }, MODEL_NAME)
    print(f"Model saved: {MODEL_NAME}")

if __name__ == "__main__":
    train()
