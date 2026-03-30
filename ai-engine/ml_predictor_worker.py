import os
import time
import pandas as pd
import numpy as np
import joblib
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# ==========================================
# CONFIGURATION
# ==========================================
# Load environment variables if using .env file
load_dotenv()

# Supabase connection details
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://gkgdrkddmzaxbrjwsozn.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZ2Rya2RkbXpheGJyandzb3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTUyOTgsImV4cCI6MjA4NTY5MTI5OH0.98K37pUvGx81wxoU1EAfVxGNp-X7ElVWHPOmEaUpW04") # Replace with your actual anon/service-role key

# Model Path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "traffic_model.joblib")

# How many recent rows to fetch for the sequence
SEQUENCE_LENGTH = 20
# Prediction interval (in seconds)
RUN_INTERVAL = 30

def determine_status(density_pct):
    """Determine the text status based on predicted density percentage."""
    if density_pct < 50:
        return "Low"
    elif density_pct < 75:
        return "Moderate"
    elif density_pct < 90:
        return "High"
    else:
        return "Severe Congestion"

def main():
    print("Starting STIS ML Predictor Worker...")
    
    # 1. Initialize Supabase Client
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Connected to Supabase.")
    except Exception as e:
        print(f"Failed to connect to Supabase: {e}")
        return

    # 2. Load the pre-trained Traffic Model
    try:
        print(f"Loading model from {MODEL_PATH}...")
        model_data = joblib.load(MODEL_PATH)
        
        # Handle dict wrapping or raw model
        if isinstance(model_data, dict):
            model = model_data.get('model', model_data)
        else:
            model = model_data
            
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    print("Worker is running. Press Ctrl+C to stop.")
    
    while True:
        try:
            # 3. Fetch recent historical data from traffic_logs
            # We fetch the latest N rows, ordered descending, then reverse them to chronological order
            response = supabase.table("traffic_logs") \
                .select("created_at, vehicle_count, average_speed, density") \
                .order("created_at", desc=True) \
                .limit(SEQUENCE_LENGTH) \
                .execute()
                
            data = response.data
            
            if not data or len(data) < 5:
                print("Not enough historical data for prediction. Waiting...")
                time.sleep(RUN_INTERVAL)
                continue
                
            # Convert to Pandas DataFrame and reverse to chronological order
            df = pd.DataFrame(data).iloc[::-1].reset_index(drop=True)
            
            # 4. Feature Engineering Pipeline (Placeholder for your specific transformations)
            # -----------------------------------------------------------------------------
            # Example: Extract features the model expects (e.g., [vehicle_count, avg_speed, density, trend1, trend2, trend3])
            
            latest_count = df['vehicle_count'].iloc[-1] or 0
            latest_speed = df['average_speed'].iloc[-1] or 0.0
            latest_density = df['density'].iloc[-1] or 0.0
            
            # Placeholder: construct exactly what the model expects (adjust based on your actual model training) 
            # Assuming a 6-feature array for this example based on earlier files
            features = np.array([
                latest_count, 
                latest_speed, 
                latest_density,
                df['vehicle_count'].mean(), # Rolling mean example
                df['average_speed'].min(),  # Historical min example
                0                           # Placeholder
            ]).reshape(1, -1)
            # -----------------------------------------------------------------------------
            
            # 5. Make Prediction
            pred_raw = model.predict(features)[0]
            
            # Ensure it's a percentage (0-100)
            if pred_raw <= 1.0: # If model outputs 0.0-1.0 scale
                density_pct = min(100.0, max(0.0, pred_raw * 100))
            else:
                density_pct = min(100.0, max(0.0, float(pred_raw)))
                
            status = determine_status(density_pct)
            
            # 6. Push final result to 'predictions' table
            pred_record = {
                "predicted_density": round(density_pct, 1),
                "status": status,
                "target_date": datetime.utcnow().isoformat()
            }
            
            # Attempt insert
            supabase.table("predictions").insert(pred_record).execute()
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Predicted Density: {density_pct:.1f}% | Status: {status}")
            
        except Exception as e:
            print(f"Error during prediction cycle: {e}")
            
        # Wait before next cycle
        time.sleep(RUN_INTERVAL)

if __name__ == "__main__":
    main()
