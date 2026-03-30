import cv2
import numpy as np
import onnxruntime as ort
import time
from datetime import datetime, timezone
from supabase import create_client

# ==========================================
# 1. CONFIGURATION & SUPABASE SETUP
# ==========================================
SUPABASE_URL = "https://gkgdrkddmzaxbrjwsozn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZ2Rya2RkbXpheGJyandzb3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTUyOTgsImV4cCI6MjA4NTY5MTI5OH0.98K37pUvGx81wxoU1EAfVxGNp-X7ElVWHPOmEaUpW04"

print("[DB] Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# تفريغ البيانات القديمة (اختياري، يمكنك إزالته إذا أردت الاحتفاظ بالبيانات)
try:
    supabase.table("traffic_logs").delete().gte("id", "0").execute()
    print("[DB] Logs cleared.")
except Exception as e:
    print(f"[WARN] Failed to clear: {e}")

# ==========================================
# 2. ZONE & TRAFFIC LOGIC
# ==========================================
ZONE_CAPACITY = 10
UPLOAD_INTERVAL_FRAMES = 15

# إحداثيات الزون الخاصة بك
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
    if density >= 0.8: return "Critical congestion! Extend green light by 30s."
    if density >= 0.5: return "High traffic. Extend green light by 15s."
    return "Normal flow. Maintain logic."

print("========================================")
print(" STIS Edge AI System - ONNX Engine ")
print("========================================")

# ==========================================
# 3. ONNX MODEL & VIDEO CAPTURE SETUP
# ==========================================
print("[INFO] Loading YOLOv8 ONNX Model...")
session = ort.InferenceSession("yolov8n.onnx", providers=['CPUExecutionProvider'])
input_name = session.get_inputs()[0].name

video_path = "two_roads.mp4"
cap = cv2.VideoCapture(video_path)
print(f"[INFO] Opening video: {video_path}")

frame_count = 0
in_zone_speeds = []

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        print("[INFO] Video ended looping...")
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        continue
    
    frame_count += 1
    
    # لتخفيف الضغط على الرأس بيري، يمكنك تحليل صورة كل إطارين
    if frame_count % 2 != 0: continue

    img_h, img_w = frame.shape[:2]
    
    # 3. تجهيز الصورة لنموذج ONNX
    img = cv2.resize(frame, (640, 640))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.transpose((2, 0, 1))
    img = np.expand_dims(img, axis=0).astype(np.float32) / 255.0

    # 4. التنبؤ السريع بطريقة ONNX
    outputs = session.run(None, {input_name: img})
    predictions = np.squeeze(outputs[0]).T 

    boxes = []
    scores = []
    
    # استخراج المربعات التي تتجاوز نسبة التأكد 0.5 للسيارات
    for row in predictions:
        classes_scores = row[4:]
        class_id = np.argmax(classes_scores)
        if class_id in [2, 3, 5, 7]: 
            score = classes_scores[class_id]
            if score > 0.5:
                xc, yc, w, h = row[0], row[1], row[2], row[3]
                x1 = int((xc - w/2) / 640 * img_w)
                y1 = int((yc - h/2) / 640 * img_h)
                x2 = int((xc + w/2) / 640 * img_w)
                y2 = int((yc + h/2) / 640 * img_h)
                boxes.append([x1, y1, x2 - x1, y2 - y1])
                scores.append(float(score))

    # إزالة المربعات المتداخلة
    indices = cv2.dnn.NMSBoxes(boxes, scores, 0.5, 0.4)
    
    # 5. تحليل الزون وحساب البيانات
    vehicle_counts = 0
    
    # رسم الزون الأساسي
    cv2.polylines(frame, [ZONE_POLYGON], isClosed=True, color=(255, 255, 0), thickness=3)

    if len(indices) > 0:
        for i in indices.flatten():
            x, y, w, h = boxes[i]
            cx, cy = x + w//2, y + h//2
            
            # التحقق مما إذا كانت السيارة داخل الزون
            in_zone = point_in_polygon((cx, cy), ZONE_POLYGON)
            
            if in_zone:
                vehicle_counts += 1
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.circle(frame, (cx, cy), 4, (0, 255, 0), -1)
                
                # سرعة وهمية للعرض لأن onnx هنا لا يدعم التتبع بشكل مدمج
                speed_mock = 20.0 + np.random.normal(0, 3) + max(0, 10 - vehicle_counts)
                in_zone_speeds.append(speed_mock)
            else:
                cv2.rectangle(frame, (x, y), (x + w, y + h), (100, 100, 100), 1)

    # 6. تحديث الإحصائيات
    if len(in_zone_speeds) > 30: in_zone_speeds = in_zone_speeds[-30:]
    avg_speed = np.mean(in_zone_speeds) if in_zone_speeds else 0.0
    density = min(1.0, vehicle_counts / ZONE_CAPACITY)
    congestion_level = get_congestion_level(density)

    # طباعة الإحصائيات على الشاشة
    cv2.putText(frame, "STIS Edge AI (ONNX Engine)", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.putText(frame, f"Vehicles in Zone: {vehicle_counts}", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    cv2.putText(frame, f"Density: {density*100:.1f}%", (20, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
    
    # 7. رفع البيانات لـ Supabase بدفعات
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
            print(f"\r[SYNC] OK -> Vehicles: {vehicle_counts:2d} | Congestion: {congestion_level:8s}", end="")
        except Exception as e:
            print(f"\n[ERROR] Sync failed: {e}")

    # العرض النهائي
    cv2.imshow("STIS Edge AI (ONNX Engine)", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("\n[INFO] System Stopped Safely.")
