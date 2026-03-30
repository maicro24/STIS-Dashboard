import cv2
import numpy as np
from ultralytics import YOLO

# ==========================================
# LA ZONE DE SURVEILLANCE STIS (POLYGON)
# ==========================================
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

def point_in_polygon(pt, poly):
    """Vérifie si un point est strictement à l'intérieur de la zone"""
    return cv2.pointPolygonTest(poly, (float(pt[0]), float(pt[1])), False) >= 0

def show_zone_video():
    print("Chargement du modèle YOLOv8...")
    model = YOLO("yolov8n.pt")
    
    video_path = "two_roads.mp4"
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"Erreur : Impossible d'ouvrir la vidéo {video_path}")
        return

    print("Ouverture de la fenêtre vidéo AVEC LA ZONE DE SURVEILLANCE. Appuyez sur 'q' pour fermer.")
    
    # Classes autorisées : 2 (voiture), 3 (moto), 5 (bus), 7 (camion)
    vehicle_classes = [2, 3, 5, 7]

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            print("Fin de la vidéo.")
            break
            
        # 1. Dessiner la zone de surveillance (ROI) en Bleu transparent/clair sur l'image
        cv2.polylines(frame, [ZONE_POLYGON], isClosed=True, color=(255, 0, 0), thickness=3)

        # 2. Effectuer le suivi YOLOv8
        results = model.track(frame, classes=vehicle_classes, persist=True, verbose=False)
        result = results[0]
        
        vehicles_in_zone = 0
        
        # 3. Analyser chaque véhicule détecté
        if result.boxes is not None and result.boxes.id is not None:
            boxes = result.boxes
            for i in range(len(boxes)):
                # Coordonnées de la bounding box
                x1, y1, x2, y2 = map(int, boxes.xyxy[i].cpu().numpy())
                
                # Le centre inférieur du véhicule (les roues touchant le sol)
                # C'est la meilleure façon de vérifier s'il est "sur" la route dans la zone
                cx = (x1 + x2) // 2
                cy = y2 
                
                # Vérifier si ce centre de véhicule est dans le polygone
                in_zone = point_in_polygon((cx, cy), ZONE_POLYGON)
                
                if in_zone:
                    vehicles_in_zone += 1
                    # Couleur verte si LE VEHICULE EST DANS LA ZONE
                    color = (0, 255, 0) 
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    cv2.circle(frame, (cx, cy), 5, (0, 0, 255), -1) # Point rouge au centre bas
                    # Afficher ID
                    track_id = int(boxes.id[i].item())
                    cv2.putText(frame, f"IN-ZONE ID:{track_id}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                else:
                    # Couleur grise si LE VEHICULE EST HORS DE LA ZONE
                    color = (150, 150, 150)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)

        # 4. Afficher le compteur dans le coin supérieur
        cv2.putText(frame, f"Vehicules Dans La Zone: {vehicles_in_zone}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 3)

        # 5. Redimensionner l'image pour l'adapter à l'écran
        display_frame = cv2.resize(frame, (1024, 768))

        # 6. Afficher la vidéo à l'écran
        cv2.imshow("Evaluation de la Zone STIS - Appuyez sur 'q' pour quitter", display_frame)
        
        # Quitter si l'utilisateur appuie sur la touche 'q'
        if cv2.waitKey(1) & 0xFF == ord("q"):
            print("Fermeture par l'utilisateur.")
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    show_zone_video()
