# main.py - STIS AI Engine
# Frame-Perfect Traffic Analysis with Strict Zone Filtering
# Outputs time-indexed data for frame-perfect web dashboard sync

import argparse
import cv2
import numpy as np
import pandas as pd
import json
from ultralytics import YOLO
import os
from collections import deque
import joblib  # Added for prediction model

# ---------- CONFIG ----------
VEHICLE_CLASS_IDS = {2, 3, 5, 7}  # car, motorcycle, bus, truck
DEFAULT_CONF = 0.35
DEFAULT_IMGSZ = 640

# Prediction Config
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
PREDICTION_MODEL_PATH = os.path.join(MODEL_DIR, "traffic_model.joblib")
WINDOW_SIZE = 20


OUTPUT_JSON = "ui/traffic_data.json"
OUTPUT_VIDEO = "ui/traffic_out.mp4"
OUTPUT_CSV = "traffic_stats.csv"

# 🚦 ZONE OF INTEREST - STRICT filtering: ONLY vehicles inside this polygon count
ZONE_POLYGON = np.array([
    (430, 685),
    (490, 489),
    (514, 299),
    (482, 146),
    (350, 142),
    (310, 137),
    (65, 447),
    (25, 604),
    (465, 635)
], np.int32)

# Estimated capacity of this zone
ZONE_CAPACITY = 10
# ----------------------------

def point_in_polygon(pt, poly):
    """Strict point-in-polygon test"""
    return cv2.pointPolygonTest(poly, (float(pt[0]), float(pt[1])), False) >= 0

def get_congestion_level(density):
    """Determine congestion level based on density"""
    if density < 0.3:
        return "Low"
    elif density < 0.5:
        return "Medium"
    elif density < 0.8:
        return "High"
    else:
        return "Critical"

def get_ai_recommendation(density, vehicle_count, avg_speed):
    """Generate AI recommendation based on current metrics"""
    if density >= 0.8:
        return {
            "action": "EXTEND_GREEN",
            "message": f"Critical congestion! Extend green light by 30 seconds.",
            "priority": "critical",
            "details": f"{vehicle_count} vehicles detected, speed {avg_speed:.1f} km/h"
        }
    elif density >= 0.5:
        return {
            "action": "EXTEND_GREEN",
            "message": f"High traffic. Consider extending green light by 15 seconds.",
            "priority": "high",
            "details": f"Traffic flow slowing - {vehicle_count} vehicles in zone"
        }
    elif density >= 0.3:
        return {
            "action": "MONITOR",
            "message": "Moderate traffic. Continue monitoring.",
            "priority": "medium",
            "details": "Traffic flow within acceptable parameters"
        }
    else:
        return {
            "action": "OPTIMIZE",
            "message": "Low traffic. Consider reducing green light duration.",
            "priority": "low",
            "details": "Opportunity to optimize signal timing for cross traffic"
        }

def main():
    parser = argparse.ArgumentParser(description="STIS AI Traffic Analysis Engine")
    parser.add_argument("--video", "-v", required=True, help="Path to input video")
    parser.add_argument("--model", "-m", default="yolov8n.pt", help="Path to YOLO model")
    parser.add_argument("--conf", type=float, default=DEFAULT_CONF, help="Confidence threshold")
    parser.add_argument("--imgsz", type=int, default=DEFAULT_IMGSZ, help="Input image size")
    parser.add_argument("--sample-rate", type=float, default=0.1, help="Data sample rate in seconds (default: 0.1s = 10 samples/sec)")
    parser.add_argument("--max-frames", type=int, default=0, help="Maximum frames to process (0 for all)")
    args = parser.parse_args()

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {args.video}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps

    # Calculate frames per sample based on sample rate
    frames_per_sample = max(1, int(args.sample_rate * fps))

    # Ensure output directories exist
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)

    # Prepare output video
    output_video = OUTPUT_VIDEO
    if os.path.exists(output_video):
        try:
            os.remove(output_video)
        except PermissionError as e:
            print(f"⚠️  Cannot remove existing video (file in use): {e}")
            output_video = "../web-app/public/traffic_out_new.mp4"

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_video, fourcc, fps, (width, height))

    model = YOLO(args.model)

    print("=" * 60)
    print("🚀 STIS AI Engine - Frame-Perfect Traffic Analysis")
    print("=" * 60)
    print(f"   Input Video: {args.video}")
    print(f"   Model: {args.model}")
    print(f"   FPS: {fps:.2f}")
    print(f"   Resolution: {width}x{height}")
    print(f"   Total Frames: {total_frames}")
    print(f"   Duration: {duration:.2f} seconds")
    print(f"   Sample Rate: {args.sample_rate}s ({1/args.sample_rate:.1f} samples/sec)")
    print(f"   Output Video: {output_video}")
    print(f"   Output JSON: {OUTPUT_JSON}")
    print("=" * 60)

    # Load prediction model if exists
    predictor = None
    if os.path.exists(PREDICTION_MODEL_PATH):
        try:
            predictor = joblib.load(PREDICTION_MODEL_PATH)
            print(f"🔮 Traffic Predictor loaded: {PREDICTION_MODEL_PATH}")
        except Exception as e:
            print(f"⚠️  Could not load predictor: {e}")

    results_stream = model.track(
        source=args.video,
        conf=args.conf,
        imgsz=args.imgsz,
        persist=True,
        stream=True
    )

    data_rows = []
    frame_idx = 0
    prev_positions = {}
    speed_buffer = deque(maxlen=10)
    # History for prediction features (vehicle_count, average_speed_kmh, density)
    prediction_history = deque(maxlen=WINDOW_SIZE)

    for res in results_stream:
        if args.max_frames > 0 and frame_idx >= args.max_frames:
            break
            
        frame_idx += 1
        img = res.orig_img
        boxes = res.boxes
        # Calculate precise time for this frame
        time_sec = round((frame_idx - 1) / fps, 3)

        # ===== STRICT ZONE FILTERING =====
        zone_vehicle_count = 0
        zone_speeds = []
        current_positions = {}

        for box in boxes:
            cls = int(box.cls.cpu().numpy()[0])
            if cls not in VEHICLE_CLASS_IDS:
                continue

            xy = box.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = map(int, xy)
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)

            # ⚠️ STRICT ZONE CHECK - Only count if centroid is INSIDE the polygon
            is_in_zone = point_in_polygon((cx, cy), ZONE_POLYGON)
            
            if not is_in_zone:
                # Draw outside vehicles in gray (not counted)
                cv2.rectangle(img, (x1, y1), (x2, y2), (100, 100, 100), 1)
                continue

            # Vehicle is INSIDE zone - count it
            zone_vehicle_count += 1
            conf = float(box.conf.cpu().numpy()[0]) * 100

            track_id = None
            if hasattr(box, "id") and box.id is not None:
                try:
                    track_id = int(box.id.cpu().numpy()[0])
                except (AttributeError, IndexError, TypeError, ValueError):
                    track_id = None  # Tracking not available for this detection

            # Speed estimation for tracked vehicles
            if track_id is not None:
                current_positions[track_id] = (cx, cy)
                if track_id in prev_positions:
                    px, py = prev_positions[track_id]
                    dist = np.sqrt((cx - px)**2 + (cy - py)**2)
                    speed_px = dist * fps  # pixels per second
                    speed_kmh = speed_px * 0.1  # Convert to approximate km/h
                    zone_speeds.append(speed_kmh)

            # Draw IN-ZONE vehicles with neon cyan
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 255), 2)
            
            # Glow effect for in-zone vehicles
            overlay = img.copy()
            cv2.rectangle(overlay, (x1-2, y1-2), (x2+2, y2+2), (0, 245, 255), 4)
            cv2.addWeighted(overlay, 0.3, img, 0.7, 0, img)
            
            # Show track ID and Accuracy if available
            label = f"#{track_id} Acc:{conf:.0f}%" if track_id else f"Acc:{conf:.0f}%"
            cv2.putText(img, label, (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        prev_positions = current_positions

        # ===== CALCULATE METRICS (Zone-Only) =====
        avg_speed = np.mean(zone_speeds) if zone_speeds else 0.0
        speed_var = np.var(zone_speeds) if zone_speeds else 0.0
        
        # Smooth speed with buffer
        speed_buffer.append(avg_speed)
        smoothed_speed = np.mean(speed_buffer)

        # Density = vehicles / capacity (capped at 1.0)
        density = min(1.0, zone_vehicle_count / ZONE_CAPACITY)
        congestion = get_congestion_level(density)
        
        # AI Recommendation for this frame
        ai_rec = get_ai_recommendation(density, zone_vehicle_count, smoothed_speed)

        # ===== DRAW ZONE OVERLAY =====
        overlay = img.copy()
        zone_color = (0, 40, 20) if density < 0.5 else (0, 20, 40) if density < 0.8 else (20, 0, 40)
        cv2.fillPoly(overlay, [ZONE_POLYGON], zone_color)
        cv2.addWeighted(overlay, 0.3, img, 0.7, 0, img)
        
        # Zone border color based on congestion
        border_color = (0, 255, 100) if density < 0.3 else (0, 255, 255) if density < 0.5 else (0, 165, 255) if density < 0.8 else (0, 0, 255)
        cv2.polylines(img, [ZONE_POLYGON], True, border_color, 3)

        # ===== HUD OVERLAY =====
        # Background for HUD
        cv2.rectangle(img, (10, 10), (280, 160), (0, 0, 0), -1)
        cv2.rectangle(img, (10, 10), (280, 160), border_color, 2)
        
        cv2.putText(img, "STIS AI Engine", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 245, 255), 2)
        cv2.putText(img, f"Time: {time_sec:.2f}s", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(img, f"Vehicles in Zone: {zone_vehicle_count}", (20, 85), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(img, f"Avg Speed: {smoothed_speed:.1f} km/h", (20, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(img, f"Congestion: {congestion}", (20, 135), cv2.FONT_HERSHEY_SIMPLEX, 0.5, border_color, 2)
        cv2.putText(img, f"Frame: {frame_idx}/{total_frames}", (20, 155), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 150), 1)

        writer.write(img)

        # ===== SAVE DATA ROW (at sample rate) =====
        if frame_idx % frames_per_sample == 0 or frame_idx == 1:
            # Update prediction history
            current_features = [zone_vehicle_count, smoothed_speed, density]
            prediction_history.append(current_features)
            
            # Run prediction if history is full
            predicted_count = zone_vehicle_count
            predicted_density = density
            if predictor and len(prediction_history) == WINDOW_SIZE:
                try:
                    # Flatten history window for model input
                    features_flat = np.array(list(prediction_history)).flatten().reshape(1, -1)
                    pred = predictor.predict(features_flat)[0]
                    predicted_count = max(0, round(float(pred[0]), 2))
                    predicted_density = max(0.0, min(1.0, float(pred[1])))
                except Exception as e:
                    pass

            data_rows.append({
                "time_sec": time_sec,
                "frame": frame_idx,
                "vehicle_count": zone_vehicle_count,
                "predicted_vehicle_count": predicted_count,  # Added
                "average_speed_kmh": round(smoothed_speed, 2),
                "density": round(density, 3),
                "predicted_density": round(predicted_density, 3),  # Added
                "congestion_level": congestion,
                "speed_variance": round(speed_var, 2),
                "ai_action": ai_rec["action"],
                "ai_message": ai_rec["message"],
                "ai_priority": ai_rec["priority"],
                "ai_details": ai_rec["details"]
            })

        # Progress indicator
        if frame_idx % 100 == 0:
            progress = (frame_idx / total_frames) * 100
            print(f"   ⏳ Processing: {progress:.1f}% ({frame_idx}/{total_frames})")

    writer.release()
    cap.release()

    # ===== FINAL SAVE =====
    if data_rows:
        # Save CSV
        df = pd.DataFrame(data_rows)
        df.to_csv(OUTPUT_CSV, index=False)
        print(f"\n📊 CSV saved: {OUTPUT_CSV}")
        
        # Save JSON (compact for web)
        with open(OUTPUT_JSON, 'w') as f:
            json.dump(data_rows, f)
        print(f"📊 JSON saved: {OUTPUT_JSON}")
        print(f"   → {len(data_rows)} data points")
        print(f"   → Time range: 0.0s to {data_rows[-1]['time_sec']:.2f}s")

    print(f"\n✅ Processing complete!")
    print(f"   Video: {output_video}")
    print(f"   Frames: {frame_idx}")
    print(f"   Data points: {len(data_rows)}")
    print("\n⚠️  Convert video for browser compatibility:")
    print("   ffmpeg -i traffic_out.mp4 -c:v libx264 -crf 22 traffic_web.mp4")
    print("   OR use VLC: Media → Convert/Save → H.264")
    print("\n🌐 Start dashboard: cd ../web-app && npm run dev")

if __name__ == "__main__":
    main()
