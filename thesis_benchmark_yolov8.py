import cv2
import time
import json
from ultralytics import YOLO

# ==========================================
# STIS THESIS BENCHMARK CONFIGURATION
# ==========================================
VIDEO_PATH = "two_roads.mp4"       # Your target video file name
MODEL_PATH = "yolov8n.pt"          # The YOLOv8 model weights
OUTPUT_JSON = "metrics_report.json" # Output file for empirical data

# COCO Class IDs for traffic vehicles: 
# 2 (car), 3 (motorcycle), 5 (bus), 7 (truck)
VEHICLE_CLASSES = {2, 3, 5, 7}

def run_benchmark():
    print(f"Loading YOLOv8 model from {MODEL_PATH}...")
    
    # Load the official or custom model
    model = YOLO(MODEL_PATH)
    
    # Open the video feed
    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        print(f"❌ Error: Cannot open video file '{VIDEO_PATH}'. Please ensure the file is in the same directory.")
        return

    # Extract source video properties
    total_frames_video = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS)

    print(f"Video loaded successfully: {VIDEO_PATH}")
    print(f"Total Source Frames: {total_frames_video} @ {video_fps:.2f} native FPS")
    print("Starting benchmark processing. This may take a few moments...\n")

    # Storage for analytical metrics
    metrics = {
        "frames_processed": 0,
        "total_inference_time_ms": 0.0,
        "confidence_scores": [],
        "frame_metrics": [],
        "unique_vehicle_ids": set()
    }
    
    # Track the entire wall-clock time for overall FPS
    start_time_total = time.time()
    
    while True:
        success, frame = cap.read()
        if not success:
            break
            
        metrics["frames_processed"] += 1
        
        if metrics["frames_processed"] >= 300:
            print(f"Reached 300 frames. Stopping early for quick benchmark...")
            break
            
        # Run YOLOv8 Tracking
        results = model.track(frame, classes=list(VEHICLE_CLASSES), persist=True, verbose=False)
        result = results[0]
        
        # result.speed['inference'] contains YOLOv8's internal core inference time in ms
        inference_time = result.speed['inference']
        metrics["total_inference_time_ms"] += inference_time
        
        frame_vehicle_count = 0
        
        # Extract vehicle confidence scores and track unique entities
        if result.boxes is not None and result.boxes.id is not None:
            boxes = result.boxes
            for i in range(len(boxes)):
                cls = int(boxes.cls[i].item())
                if cls in VEHICLE_CLASSES:
                    frame_vehicle_count += 1
                    conf = float(boxes.conf[i].item())
                    metrics["confidence_scores"].append(conf)
                    
                    # Store unique tracking IDs using a Python Set (automatically prevents duplicates)
                    track_id = int(boxes.id[i].item())
                    metrics["unique_vehicle_ids"].add(track_id)
        
        # Progress reporting in terminal
        if metrics["frames_processed"] % 50 == 0:
            print(f"Processed {metrics['frames_processed']}/{total_frames_video} frames...")

    # Stop clock
    end_time_total = time.time()
    cap.release()
    
    # ==========================================
    # CALCULATE AGGREGATE METRICS
    # ==========================================
    total_time_seconds = end_time_total - start_time_total
    
    # Overall pipeline FPS (includes video decoding + inference + tracking)
    avg_fps = metrics["frames_processed"] / total_time_seconds if total_time_seconds > 0 else 0
    
    # Average core inference time isolating the neural network processing speed
    avg_inference_time = (metrics["total_inference_time_ms"] / metrics["frames_processed"]) if metrics["frames_processed"] > 0 else 0
    
    # Average confidence evaluating the model's certainty
    avg_confidence = (sum(metrics["confidence_scores"]) / len(metrics["confidence_scores"])) if metrics["confidence_scores"] else 0
    
    total_unique_vehicles = len(metrics["unique_vehicle_ids"])
    
    # Compile the final structured report
    final_report = {
        "metadata": {
            "video_file": VIDEO_PATH,
            "model_version": MODEL_PATH,
            "total_frames_processed": metrics["frames_processed"],
            "total_processing_time_sec": round(total_time_seconds, 2),
        },
        "performance_metrics": {
            "average_fps": round(avg_fps, 2),
            "average_inference_time_ms": round(avg_inference_time, 2)
        },
        "accuracy_and_detection": {
            "average_confidence_percentage": round(avg_confidence * 100, 2),
            "total_unique_vehicles_detected": total_unique_vehicles
        }
    }
    
    # Export to JSON
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(final_report, f, indent=4)
        
    # ==========================================
    # FORMAL ACADEMIC TERMINAL SUMMARY
    # ==========================================
    print("\n" + "="*60)
    print(" STIS THESIS: YOLOv8 PERFORMANCE BENCHMARK REPORT")
    print("="*60)
    print(f"▶ Target Video        : {VIDEO_PATH}")
    print(f"▶ AI Model File       : {MODEL_PATH}")
    print(f"▶ Total Runtime       : {total_time_seconds:.2f} seconds")
    print(f"▶ Frames Processed    : {metrics['frames_processed']}")
    print("-" * 60)
    print(f"▶ Total Vehicles ID'd : {total_unique_vehicles} unique physical vehicles tracked")
    print(f"▶ Mean Confidence     : {avg_confidence * 100:.2f}% accuracy certainty")
    print(f"▶ Mean Inference Time : {avg_inference_time:.1f} ms per frame (computation speed)")
    print(f"▶ Average Pipeline FPS: {avg_fps:.1f} frames/sec (end-to-end throughput)")
    print("="*60)
    print(f"✅ Detailed technical metrics exported to: {OUTPUT_JSON}")
    print("="*60 + "\n")

if __name__ == "__main__":
    run_benchmark()
