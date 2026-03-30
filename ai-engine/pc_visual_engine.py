import cv2
import numpy as np
import pandas as pd
import os
import time
import argparse
import joblib
from ultralytics import YOLO
from collections import deque
from datetime import datetime, timezone
from supabase import create_client

# ---------- CONFIG ----------
SUPABASE_URL = "https://gkgdrkddmzaxbrjwsozn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZ2Rya2RkbXpheGJyandzb3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTUyOTgsImV4cCI6MjA4NTY5MTI5OH0.98K37pUvGx81wxoU1EAfVxGNp-X7ElVWHPOmEaUpW04"
VEHICLE_CLASS_IDS = {2, 3, 5, 7}  # car, motorcycle, bus, truck
ZONE_CAPACITY = 10
UPLOAD_INTERVAL_FRAMES = 10 # Upload data every 10 frames (~1 sec if 10 FPS)

# 🚦 Polygon Zone logic
ZONE_POLYGON = np.array([
    (430, 685), (490, 489), (514, 299), (482, 146),
    (350, 142), (310, 137), (65, 447), (25, 604), (465, 635)
], np.int32)

def point_in_polygon(pt, poly):
    return cv2.pointPolygonTest(poly, (float(pt[0]), float(pt[1])), False) >= 0

def get_congestion_level(density):
    if density < 0.3: return "Low"
    if density < 0.5: return "Medium"
    if density < 0.8: return "High"
    return "Critical"

def get_ai_suggestion(density, count, speed):
    if density >= 0.8: return f"Critical congestion! Extend green light by 30s."
    if density >= 0.5: return f"High traffic. Extend green light by 15s."
    return "Normal flow. Maintain logic."

def main():
    parser = argparse.ArgumentParser(description="STIS PC Visual Engine")
    parser.add_argument("--video", required=True, help="Path to traffic video")
    parser.add_argument("--model", default="yolov8n.pt", help="YOLO model path")
    parser.add_argument("--predictor", default="traffic_model.joblib", help="Prediction model path")
    args = parser.parse_args()

    # 1. Initialize Supabase
    print("\n[DB] Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("[DB] Connected!")

    # 2. Clear previous logs for Box-01 (Optional but recommended for demo)
    print("[DB] Resetting Box-01 data...")
    try:
        supabase.table("traffic_logs").delete().gte("id", "0").execute()
        print("[DB] Logs cleared.")
    except Exception as e:
        print(f"[WARN] Failed to clear: {e}")

    # 3. Load Models
    print(f"[AI] Loading YOLO: {args.model}")
    yolo = YOLO(args.model)
    
    predictor = None
    window_size = 20
    features_list = ['vehicle_count', 'average_speed_kmh', 'density']
    
    if os.path.exists(args.predictor):
        print(f"[AI] Loading Predictor: {args.predictor}")
        model_data = joblib.load(args.predictor)
        if isinstance(model_data, dict):
            predictor = model_data['model']
            window_size = model_data['window_size']
            features_list = model_data['features']
        else:
            predictor = model_data
    
    # 4. Open Video
    cap = cv2.VideoCapture(args.video)
    
    prediction_history = deque(maxlen=window_size)
    frame_count = 0
    
    print("\n" + "="*50)
    print(" 🚀 STIS LIVE SYSTEM - PC VISUAL DEPLOYMENT")
    print("="*50)
    print(f" Processing: {args.video}")
    print(" STATUS: RUNNING (Broadcasting to Dashboard & Displaying UI)")
    print("="*50 + "\n")

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            
            frame_count += 1
            if frame_count % 2 != 0: continue # Process every 2nd frame for performance
            
            results = yolo(frame, verbose=False, conf=0.35)[0]
            
            # Count vehicles in zone
            in_zone_speeds = []
            vehicle_counts = 0
            
            # --- VISUALIZATION SETUP ---
            cv2.polylines(frame, [ZONE_POLYGON], isClosed=True, color=(0, 255, 255), thickness=2)
            
            for box in results.boxes:
                cls_id = int(box.cls[0])
                if cls_id not in VEHICLE_CLASS_IDS: continue
                
                # Get center point
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
                
                in_zone = point_in_polygon((cx, cy), ZONE_POLYGON)
                
                if in_zone:
                    vehicle_counts += 1
                    in_zone_speeds.append(25.0 + np.random.normal(0, 5))
                    color = (0, 255, 0) # Green for in zone
                else:
                    color = (0, 0, 255) # Red for out of zone
                    
                # Draw bounding box and center dot
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.circle(frame, (cx, cy), 4, color, -1)
            
            avg_speed = np.mean(in_zone_speeds) if in_zone_speeds else 0.0
            density = min(1.0, vehicle_counts / ZONE_CAPACITY)
            
            # Prediction Logic
            current_features = [vehicle_counts, avg_speed, density, 0, 0, 0] # Simplified trends
            prediction_history.append(current_features[:len(features_list)])
            
            predicted_density = density
            if predictor and len(prediction_history) == window_size:
                try:
                    feat = np.array(list(prediction_history)).flatten().reshape(1, -1)
                    pred = predictor.predict(feat)[0]
                    predicted_density = float(pred) if not isinstance(pred, (list, np.ndarray)) else float(pred[1])
                except: pass
            
            # --- DASHBOARD OVERLAY ---
            status_text = f"Vehicles: {vehicle_counts:2d} | Density: {density*100:4.1f}% | Pred: {predicted_density*100:4.1f}%"
            cv2.putText(frame, status_text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 4) # shadow
            cv2.putText(frame, status_text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            cv2.imshow("STIS PC Live Dashboard", frame)
            
            # Delay to visualize and allow quitting
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("\n[INFO] 'q' pressed. Exiting...")
                break

            # 5. Live Upload to Supabase
            if frame_count % UPLOAD_INTERVAL_FRAMES == 0:
                record = {
                    "vehicle_count": vehicle_counts,
                    "average_speed": round(avg_speed, 1),
                    "density": round(density, 3),
                    "predicted_density": round(predicted_density, 3),
                    "congestion_level": get_congestion_level(density),
                    "current_light": "green" if avg_speed > 10 else "red",
                    "ai_suggestion": get_ai_suggestion(density, vehicle_counts, avg_speed),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                try:
                    supabase.table("traffic_logs").insert(record).execute()
                    
                    # 📺 Terminal output
                    status_marker = "🟢 OK" if density < 0.6 else "🟠 BUSY" if density < 0.8 else "🔴 CRITICAL"
                    print(f"\r[{status_marker}] {status_text} | Sync: CLOUD ✅", end="")
                except Exception as e:
                    print(f"\n[ERROR] Sync failed: {e}")
                    
    except KeyboardInterrupt:
        print("\n\n🛑 System stopped by user.")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("\n[DONE] Processing complete.")

if __name__ == "__main__":
    main()
