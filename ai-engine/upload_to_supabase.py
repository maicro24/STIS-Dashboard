

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime, timezone, timedelta
from collections import deque
from supabase import create_client

# ---------- CONFIG ----------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, "..", "traffic_timeseries_FINAL.csv")
MODEL_PATH = os.path.join(SCRIPT_DIR, "traffic_model.joblib")

SUPABASE_URL = "https://gkgdrkddmzaxbrjwsozn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZ2Rya2RkbXpheGJyandzb3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTUyOTgsImV4cCI6MjA4NTY5MTI5OH0.98K37pUvGx81wxoU1EAfVxGNp-X7ElVWHPOmEaUpW04"

# ---------- HELPERS ----------

def get_congestion_level(density):
    if density < 0.3: return "Low"
    elif density < 0.5: return "Medium"
    elif density < 0.8: return "High"
    return "Critical"

def get_light_from_speed(speed):
    if speed >= 10: return "green"
    elif speed < 5: return "red"
    return "orange"

def get_ai_suggestion(density, vehicle_count, speed):
    if density >= 0.8:
        return f"Critical congestion! Extend green light by 30s. {vehicle_count} vehicles, speed {speed:.1f} km/h"
    elif density >= 0.5:
        return f"High traffic. Consider extending green light by 15s. {vehicle_count} vehicles in zone."
    elif density >= 0.3:
        return "Moderate traffic. Continue monitoring."
    return "Low traffic. Consider reducing green light duration."

# ---------- MAIN ----------

def main():
    print("=" * 55)
    print("  STIS - Upload Traffic Data to Supabase")
    print("  (Density Prediction Only, Box-01)")
    print("=" * 55)

    # 1. Load data
    if not os.path.exists(DATA_PATH):
        print(f"[ERROR] Data file not found: {DATA_PATH}")
        return
    
    df = pd.read_csv(DATA_PATH)
    print(f"[DATA] Loaded {len(df)} rows from CSV")

    # 2. Load prediction model
    predictor = None
    window_size = 20
    features_list = ['vehicle_count', 'average_speed_kmh', 'density']
    
    if os.path.exists(MODEL_PATH):
        model_data = joblib.load(MODEL_PATH)
        # Check if new format (dict) or old format (model directly)
        if isinstance(model_data, dict):
            predictor = model_data['model']
            window_size = model_data['window_size']
            features_list = model_data['features']
            print(f"[MODEL] Prediction model loaded (R2: {model_data.get('r2_test', 0):.2f})")
        else:
            predictor = model_data
            print(f"[MODEL] Legacy prediction model loaded")
    else:
        print("[WARN] No prediction model found. Will use raw values.")

    # 3. Connect to Supabase
    print("[DB] Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("[DB] Connected!")

    # 4. Delete existing data
    print("[DB] Clearing existing traffic_logs...")
    try:
        supabase.table("traffic_logs").delete().gte("id", "00000000-0000-0000-0000-000000000000").execute()
        print("[DB] Cleared!")
    except Exception as e:
        print(f"[WARN] Could not clear: {e}")

    # 5. Prepare data with density prediction only
    prediction_history = deque(maxlen=window_size)
    base_time = datetime.now(timezone.utc) - timedelta(hours=3)

    rows_to_insert = []
    sample_step = max(1, len(df) // 300)
    sampled_df = df.iloc[::sample_step].reset_index(drop=True)
    print(f"[DATA] Sampling {len(sampled_df)} rows (every {sample_step})")

    for idx, row in sampled_df.iterrows():
        # Get all required features for this row
        current_features = [float(row[f]) if f != 'vehicle_count' else int(row[f]) for f in features_list]
        
        # Base values for DB
        vehicle_count = int(row['vehicle_count'])
        speed = float(row['average_speed_kmh'])
        density = float(row['density'])

        # Update prediction history
        prediction_history.append(current_features)

        # Predict DENSITY ONLY
        predicted_density = density
        if predictor and len(prediction_history) == window_size:
            try:
                features_flat = np.array(list(prediction_history)).flatten().reshape(1, -1)
                # Model predicts density directly (single output in new model, array in legacy)
                pred = predictor.predict(features_flat)[0]
                if isinstance(pred, (list, np.ndarray)):
                    predicted_density = float(pred[1]) # Legacy
                else:
                    predicted_density = float(pred)    # New format
                
                predicted_density = max(0.0, min(1.0, round(predicted_density, 3)))
            except Exception as e:
                pass

        timestamp = base_time + timedelta(seconds=float(row['time_sec']))

        record = {
            "created_at": timestamp.isoformat(),
            "vehicle_count": vehicle_count,
            "average_speed": round(speed, 2),
            "density": round(density, 3),
            "congestion_level": get_congestion_level(density),
            "current_light": get_light_from_speed(speed),
            "timer_remaining": max(5, int(30 - density * 25)),
            "ai_suggestion": get_ai_suggestion(density, vehicle_count, speed),
        }
        rows_to_insert.append(record)

    # 6. Upload in batches
    BATCH_SIZE = 50
    total = len(rows_to_insert)
    uploaded = 0

    print(f"\n[UPLOAD] Uploading {total} records...")

    for i in range(0, total, BATCH_SIZE):
        batch = rows_to_insert[i:i + BATCH_SIZE]
        try:
            supabase.table("traffic_logs").insert(batch).execute()
            uploaded += len(batch)
            print(f"   {uploaded}/{total} ({uploaded*100//total}%)")
        except Exception as e:
            print(f"   [ERROR] Batch {i}: {e}")
            for record in batch:
                try:
                    supabase.table("traffic_logs").insert(record).execute()
                    uploaded += 1
                except:
                    pass

    print(f"\n[DONE] {uploaded}/{total} records uploaded!")
    print("[INFO] Refresh the dashboard to see the data.")

if __name__ == "__main__":
    main()
