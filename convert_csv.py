"""
STIS - Convert CSV to JSON for Web Dashboard
Converts traffic analysis CSV to JSON format with all fields
"""
import csv
import json
import os
import sys

# File paths
CSV_PATH = 'traffic_timeseries_FINAL.csv'
JSON_PATH = 'web-app/public/traffic_data.json'

def convert_csv_to_json():
    """Convert traffic CSV to JSON with full data validation"""
    
    # Check if CSV exists
    if not os.path.exists(CSV_PATH):
        print(f"❌ Error: {CSV_PATH} not found!")
        print("   Run the AI engine first: python ai-engine/main.py --video your_video.mp4")
        sys.exit(1)
    
    data = []
    errors = []
    
    try:
        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                try:
                    # Calculate congestion level from density
                    density = float(row.get('density', 0))
                    if density < 0.3:
                        level = 'Low'
                    elif density < 0.5:
                        level = 'Medium'
                    elif density < 0.8:
                        level = 'High'
                    else:
                        level = 'Critical'
                    
                    # Build data record with all available fields
                    record = {
                        'time_sec': float(row.get('time_sec', 0)),
                        'frame': int(row.get('frame', 0)),
                        'vehicle_count': int(row.get('vehicle_count', 0)),
                        'average_speed_kmh': float(row.get('average_speed_kmh', 0)),
                        'density': round(density, 3),
                        'congestion_level': row.get('congestion_level', level),
                        'speed_variance': float(row.get('speed_variance', 0)),
                        'ai_action': row.get('ai_action', 'MONITOR'),
                        'ai_message': row.get('ai_message', 'Monitoring traffic flow'),
                        'ai_priority': row.get('ai_priority', 'low'),
                        'ai_details': row.get('ai_details', '')
                    }
                    data.append(record)
                    
                except (ValueError, KeyError) as e:
                    errors.append(f"Row {row_num}: {e}")
                    continue
                    
    except FileNotFoundError:
        print(f"❌ Error: Cannot find {CSV_PATH}")
        sys.exit(1)
    except PermissionError:
        print(f"❌ Error: Cannot read {CSV_PATH} (file may be open in another program)")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        sys.exit(1)
    
    # Report any parsing errors
    if errors:
        print(f"⚠️  {len(errors)} rows had parsing issues (skipped):")
        for err in errors[:5]:  # Show first 5 errors
            print(f"   - {err}")
        if len(errors) > 5:
            print(f"   ... and {len(errors) - 5} more")
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
    
    # Write JSON
    try:
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=None)  # Compact JSON for faster loading
        
        print(f"✅ Successfully converted!")
        print(f"   📊 Records: {len(data)}")
        print(f"   📁 Output: {JSON_PATH}")
        
        if data:
            print(f"   ⏱️  Time range: {data[0]['time_sec']:.2f}s → {data[-1]['time_sec']:.2f}s")
            
    except PermissionError:
        print(f"❌ Error: Cannot write to {JSON_PATH} (file may be in use)")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error writing JSON: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 50)
    print("🚦 STIS - CSV to JSON Converter")
    print("=" * 50)
    convert_csv_to_json()
