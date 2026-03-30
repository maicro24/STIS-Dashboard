import cv2
import numpy as np
import os
import argparse
from ultralytics import YOLO
from datetime import datetime, timezone
from supabase import create_client

# ---------- CONFIG ----------
SUPABASE_URL = "https://gkgdrkddmzaxbrjwsozn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZ2Rya2RkbXpheGJyandzb3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTUyOTgsImV4cCI6MjA4NTY5MTI5OH0.98K37pUvGx81wxoU1EAfVxGNp-X7ElVWHPOmEaUpW04"

VEHICLE_CLASS_IDS = {2, 3, 5, 7}  # car, motorcycle, bus, truck
ZONE_CAPACITY = 10
UPLOAD_INTERVAL_FRAMES = 15  # Upload ~every 0.5-1s depending on FPS

# 🚦 THE EXACT ZONE FROM YOUR PROJECT
ZONE_POLYGON = np.array([
    (430, 685), (490, 489), (514, 299), (482, 146),
    (350, 142), (310, 137), (65, 447), (25, 604), (465, 635)
], np.int32)

# ---------- HELPERS ----------
def point_in_polygon(pt, poly):
    return cv2.pointPolygonTest(poly, (float(pt[0]), float(pt[1])), False) >= 0

def get_congestion_level(density):
    if density < 0.3: return "Low"
    if density < 0.5: return "Medium"
    if density < 0.8: return "High"
    return "Critical"

def get_ai_suggestion(density, count, speed):
    if density >= 0.8: return "Critical congestion! Extend green light by 30s."
    if density >= 0.5: return "High traffic. Extend green light by 15s."
    return "Normal flow. Maintain logic."

# ---------- STYLING / UI ----------
def draw_glow_polygon(img, poly, color, thickness=2, glow_thickness=6):
    """Draws a stunning neon glow effect on a polygon."""
    overlay = img.copy()
    cv2.polylines(overlay, [poly], isClosed=True, color=color, thickness=glow_thickness)
    cv2.addWeighted(overlay, 0.4, img, 0.6, 0, img)
    cv2.polylines(img, [poly], isClosed=True, color=(255, 255, 255), thickness=thickness)

def draw_hud(frame, vehicle_counts, density, avg_speed, congestion_level):
    """Draws a professional, high-fidelity HUD for TV presentation."""
    overlay = frame.copy()
    
    # 1. Main Background Panel (Semi-transparent black)
    panel_x1, panel_y1 = 30, 30
    panel_x2, panel_y2 = 480, 240
    cv2.rectangle(overlay, (panel_x1, panel_y1), (panel_x2, panel_y2), (15, 15, 20), -1)
    
    # 2. Draw border
    border_color = (0, 255, 150) if density < 0.5 else (0, 165, 255) if density < 0.8 else (0, 0, 255)
    cv2.rectangle(overlay, (panel_x1, panel_y1), (panel_x2, panel_y2), border_color, 2)
    
    # Apply standard alpha blending for the panel
    cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

    # 3. Add Texts (Crisp and clear for camera recording)
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(frame, "STIS AI - LIVE TRAFFIC ENGINE", (panel_x1 + 15, panel_y1 + 40), font, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, "---------------------------------", (panel_x1 + 15, panel_y1 + 65), font, 0.6, (100, 100, 100), 1)

    # Vehicles count
    cv2.putText(frame, f"Vehicles in Zone : {vehicle_counts}", (panel_x1 + 15, panel_y1 + 105), font, 0.8, (0, 220, 255), 2)
    
    # Speed
    cv2.putText(frame, f"Avg Speed        : {avg_speed:.1f} km/h", (panel_x1 + 15, panel_y1 + 145), font, 0.8, (255, 150, 0), 2)
    
    # Density / Congestion
    status_text = f"Status           : {congestion_level}"
    cv2.putText(frame, status_text, (panel_x1 + 15, panel_y1 + 185), font, 0.8, border_color, 2)
    
    # Progress bar for density
    bar_x = panel_x1 + 15
    bar_y = panel_y1 + 210
    bar_w = 420
    bar_h = 10
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (50, 50, 50), -1)
    fill_w = int(bar_w * density)
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + fill_w, bar_y + bar_h), border_color, -1)


# ---------- MAIN SYSTEM ----------
def main():
    parser = argparse.ArgumentParser(description="STIS Presentation Engine (High Pixel)")
    parser.add_argument("--video", required=True, help="Path to traffic video")
    parser.add_argument("--model", default="yolov8n.pt", help="YOLO model path")
    args = parser.parse_args()

    # 1. Connect Support
    print("\n[DB] Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        print("[DB] Clearing previous 'traffic_logs' to ensure a fresh session...")
        supabase.table("traffic_logs").delete().gte("id", "0").execute()
    except Exception as e:
        print(f"[WARN] Error clearing logs: {e}")

    # 2. Load Model
    print(f"\n[AI] Loading Powerful YOLO Model: {args.model}")
    yolo = YOLO(args.model)

    # 3. Media Capture
    cap = cv2.VideoCapture(args.video)
    
    # Setup fullscreen window for beautiful presentation
    window_name = "STIS Neural Vision (Presentation Mode)"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    print("\n=======================================================")
    print(" 🌟 STIS PATENT PRESENTATION SYSTEM LAUNCHING 🌟 ")
    print("=======================================================")
    print(" -> Press 'Q' to quit anytime.")
    print(" -> Max visuals initialized.")
    print(" -> Synced to Cloud DB directly.")

    frame_count = 0
    in_zone_speeds = []

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: 
                # Loop video for endless presentation
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            
            frame_count += 1
            if frame_count % 2 != 0: continue # Optimizing for Raspberry/PC smooth playback
            
            results = yolo(frame, verbose=False, conf=0.4)[0]
            vehicle_counts = 0
            
            # Draw beautiful bounding boxes
            for box in results.boxes:
                cls_id = int(box.cls[0])
                if cls_id not in VEHICLE_CLASS_IDS: continue
                
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
                
                # Check if in zone
                in_zone = point_in_polygon((cx, cy), ZONE_POLYGON)
                
                if in_zone:
                    vehicle_counts += 1
                    # Box Styling - Cyberpunk Neon Green for active targets
                    color = (0, 255, 100) 
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    # Core center dot
                    cv2.circle(frame, (cx, cy), 3, (255, 255, 255), -1)
                    
                    # Simulation: Assign dynamic speed for demo professionalism
                    speed_mock = 20.0 + np.random.normal(0, 3) + max(0, 10 - vehicle_counts)
                    in_zone_speeds.append(speed_mock)
                else:
                    # Faded out box for outer vehicles to show AI sees everything
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (80, 80, 80), 1)

            # Cleanup speed array logic
            if len(in_zone_speeds) > 30:
                in_zone_speeds = in_zone_speeds[-30:]

            avg_speed = np.mean(in_zone_speeds) if in_zone_speeds else 0.0
            density = min(1.0, vehicle_counts / ZONE_CAPACITY)
            congestion_level = get_congestion_level(density)
            
            # --- SUPERIOR VISUALS ---
            # Glow polygon (Cyberpunk cyan border)
            poly_color = (255, 220, 0) if density > 0.6 else (0, 255, 255)
            draw_glow_polygon(frame, ZONE_POLYGON, poly_color, thickness=2, glow_thickness=8)
            
            # Dark transparent polygon fill for depth
            overlay = frame.copy()
            cv2.fillPoly(overlay, [ZONE_POLYGON], (poly_color[0]*0.2, poly_color[1]*0.2, poly_color[2]*0.2))
            cv2.addWeighted(overlay, 0.2, frame, 0.8, 0, frame)

            # Draw HUD
            draw_hud(frame, vehicle_counts, density, avg_speed, congestion_level)

            # Show Result
            cv2.imshow(window_name, frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            # --- UPLOAD TO SUPABASE DIRECTLY WITHOUT PREDICTION ---
            if frame_count % UPLOAD_INTERVAL_FRAMES == 0:
                timer = max(10, int(30 - density * 25))
                record = {
                    "vehicle_count": vehicle_counts,
                    "average_speed": round(avg_speed, 1),
                    "density": round(density, 3),
                    "congestion_level": congestion_level,
                    "current_light": "green" if avg_speed > 10 else "red",
                    "timer_remaining": timer,
                    "ai_suggestion": get_ai_suggestion(density, vehicle_counts, avg_speed),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                try:
                    supabase.table("traffic_logs").insert(record).execute()
                    print(f"\r[SYNC] Cloud Uploaded -> Vehicles: {vehicle_counts:2d} | Congestion: {congestion_level:8s} | 🟢 OK", end="")
                except Exception as e:
                    print(f"\n[ERROR] Sync failed: {e}")

    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("\n[INFO] Safe shutdown complete.")

if __name__ == "__main__":
    main()
