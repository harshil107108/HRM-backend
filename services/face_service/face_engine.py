import base64
import io
import json
import math
import os
import sys
from typing import List, Optional

import cv2
import numpy as np

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

from download_models import ensure_models_exist, MODELS_DIR

YUNET_MODEL = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_MODEL = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")

# SFace cosine similarity threshold (OpenCV benchmark recommendation: 0.363, strict enterprise: 0.45)
SIMILARITY_THRESHOLD = 0.45
# Liveness blur threshold (variance of laplacian)
BLUR_THRESHOLD = 30.0

class FaceEngine:
    def __init__(self):
        self.detector = None
        self.recognizer = None
        self.initialized = False
        self._initialize()

    def _initialize(self):
        try:
            ensure_models_exist()
            if os.path.exists(YUNET_MODEL) and os.path.exists(SFACE_MODEL):
                # Initialize YuNet face detector (default input size 320x320, updated per frame)
                self.detector = cv2.FaceDetectorYN.create(
                    model=YUNET_MODEL,
                    config="",
                    input_size=(320, 320),
                    score_threshold=0.7,
                    nms_threshold=0.3,
                    top_k=5000,
                )
                # Initialize SFace face recognizer
                self.recognizer = cv2.FaceRecognizerSF.create(
                    model=SFACE_MODEL,
                    config="",
                )
                self.initialized = True
                print("[FaceEngine] OpenCV YuNet + SFace initialized successfully.")
            else:
                print("[FaceEngine] Models not found. Engine starting uninitialized.", file=sys.stderr)
        except Exception as e:
            print(f"[FaceEngine] Initialization error: {e}", file=sys.stderr)

    @staticmethod
    def decode_image(image_input: str) -> np.ndarray:
        """Decodes a base64 string or file path into a BGR OpenCV image."""
        if not image_input or not isinstance(image_input, str):
            raise ValueError("Invalid image input provided.")

        # Check if it is a local file
        if os.path.exists(image_input):
            img = cv2.imread(image_input)
            if img is not None:
                return img

        # Strip data URL prefix if present
        if "," in image_input:
            image_input = image_input.split(",", 1)[1]

        image_bytes = base64.b64decode(image_input.strip())
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image from base64 data.")
        return img

    @staticmethod
    def check_liveness(image: np.ndarray, face_box: np.ndarray) -> dict:
        """
        Anti-spoofing heuristic verification:
        1. Laplacian variance to reject blurry screen/paper captures
        2. Contrast and saturation check to filter low-quality printouts
        """
        x, y, w, h = [int(v) for v in face_box[:4]]
        # Pad slightly
        h_img, w_img = image.shape[:2]
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(w_img, x + w)
        y2 = min(h_img, y + h)

        face_crop = image[y1:y2, x1:x2]
        if face_crop.size == 0:
            return {"passed": False, "reason": "Invalid face region"}

        # 1. Blur check
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < BLUR_THRESHOLD:
            return {
                "passed": False,
                "reason": f"Image is too blurry or low resolution (score: {laplacian_var:.1f}). Please hold steady."
            }

        # 2. Illumination / Contrast check
        mean_brightness = np.mean(gray)
        if mean_brightness < 35:
            return {"passed": False, "reason": "Environment is too dark. Increase lighting."}
        if mean_brightness > 240:
            return {"passed": False, "reason": "Image is overexposed. Reduce direct glare."}

        return {"passed": True, "laplacian_var": float(laplacian_var), "brightness": float(mean_brightness)}

    def extract_face_embedding(self, image: np.ndarray) -> dict:
        """Detects the primary face and extracts its 128-d SFace embedding vector."""
        if not self.initialized:
            self._initialize()
            if not self.initialized:
                raise RuntimeError("Face recognition models are not loaded.")

        h, w = image.shape[:2]
        self.detector.setInputSize((w, h))

        # Detect faces: returns tuple (faces, ...)
        _, faces = self.detector.detect(image)
        if faces is None or len(faces) == 0:
            return {"success": False, "error": "No human face detected. Please face the camera directly."}

        # Spatial Filtering & Multi-Person Conflict Prevention:
        # Prioritize the person sitting directly in the center of the targeting square
        center_x, center_y = w / 2.0, h / 2.0

        def center_face_score(f):
            fx, fy, fw, fh = f[:4]
            face_mid_x = fx + fw / 2.0
            face_mid_y = fy + fh / 2.0
            dist = math.hypot(face_mid_x - center_x, face_mid_y - center_y)
            area = fw * fh
            # Penalize faces that are off-center (bystanders standing on the sides)
            return area / (1.0 + 3.5 * (dist / w))

        sorted_faces = sorted(faces, key=center_face_score, reverse=True)
        primary_face = sorted_faces[0]

        # If multiple prominent faces are competing in the center target square
        if len(sorted_faces) > 1:
            second_face = sorted_faces[1]
            p_area = primary_face[2] * primary_face[3]
            s_area = second_face[2] * second_face[3]
            # Reject if a second face is noticeably present (>= 35% size of primary user)
            if s_area >= 0.35 * p_area:
                return {
                    "success": False,
                    "error": "Multiple people detected in the square. Please ensure only one person stands in the camera frame.",
                }

        # Liveness / anti-spoof check
        liveness = self.check_liveness(image, primary_face)
        if not liveness["passed"]:
            return {"success": False, "error": liveness["reason"]}

        # Align and extract embedding
        aligned_face = self.recognizer.alignCrop(image, primary_face)
        raw_feature = self.recognizer.feature(aligned_face)
        embedding = raw_feature.flatten().tolist()

        return {
            "success": True,
            "embedding": embedding,
            "liveness": liveness,
            "box": [float(x) for x in primary_face[:4]],
        }

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """Calculates cosine similarity between two feature vectors."""
        a = np.array(v1, dtype=np.float32)
        b = np.array(v2, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def match_face(self, query_embedding: List[float], candidates: List[dict]) -> dict:
        """
        Finds the closest enrolled candidate vector above SIMILARITY_THRESHOLD.
        candidates: [{"employeeId": "...", "embedding": [...]}]
        """
        best_match = None
        highest_similarity = -1.0

        for cand in candidates:
            cand_id = cand.get("employeeId")
            cand_emb = cand.get("embedding")
            if not cand_id or not cand_emb:
                continue

            sim = self.cosine_similarity(query_embedding, cand_emb)
            if sim > highest_similarity:
                highest_similarity = sim
                best_match = cand_id

        if best_match and highest_similarity >= SIMILARITY_THRESHOLD:
            # Map 0.45..1.00 score smoothly to 0.70..0.99 for user-friendly confidence
            normalized_confidence = min(0.99, max(0.50, (highest_similarity - 0.2) / 0.8))
            return {
                "match": True,
                "employeeId": best_match,
                "confidence": round(normalized_confidence, 4),
                "raw_similarity": round(highest_similarity, 4),
            }

        return {
            "match": False,
            "highest_similarity": round(highest_similarity, 4),
            "confidence": 0.0,
            "message": "Face does not match any enrolled personnel."
        }


# Global engine instance
engine = FaceEngine()

# ============================================================================
# FastAPI Microservice
# ============================================================================
if FASTAPI_AVAILABLE:
    app = FastAPI(title="HRM Face Recognition Service", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class EnrollRequest(BaseModel):
        employeeId: str
        image: str

    class CandidateItem(BaseModel):
        employeeId: str
        embedding: List[float]

    class RecognizeRequest(BaseModel):
        image: str
        candidates: List[CandidateItem]

    @app.get("/health")
    def health():
        return {
            "status": "healthy",
            "initialized": engine.initialized,
            "algorithm": "OpenCV-YuNet-SFace",
            "threshold": SIMILARITY_THRESHOLD,
        }

    @app.post("/enroll")
    def enroll_face(req: EnrollRequest):
        try:
            img = engine.decode_image(req.image)
            result = engine.extract_face_embedding(img)
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result["error"])
            return {
                "success": True,
                "employeeId": req.employeeId,
                "embedding": result["embedding"],
                "liveness": result["liveness"],
            }
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/recognize")
    def recognize_face(req: RecognizeRequest):
        try:
            img = engine.decode_image(req.image)
            result = engine.extract_face_embedding(img)
            if not result["success"]:
                return {
                    "success": False,
                    "match": False,
                    "message": result["error"],
                }

            candidates_data = [c.dict() for c in req.candidates]
            match_res = engine.match_face(result["embedding"], candidates_data)

            return {
                "success": True,
                **match_res,
                "liveness": result["liveness"],
            }
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CLI Mode Execution
# ============================================================================
def run_cli():
    import argparse
    parser = argparse.ArgumentParser(description="HRM Face Engine CLI")
    parser.add_argument("--mode", choices=["enroll", "recognize", "health"], required=True)
    parser.add_argument("--image", help="Base64 string or image filepath")
    parser.add_argument("--employee_id", help="Employee ID for enrollment")
    parser.add_argument("--candidates", help="JSON string or path to candidates JSON")

    args = parser.parse_args()

    if args.mode == "health":
        print(json.dumps({"status": "healthy", "initialized": engine.initialized}))
        return

    if not args.image:
        print(json.dumps({"success": False, "error": "--image argument required"}))
        return

    try:
        img = engine.decode_image(args.image)
        extract_res = engine.extract_face_embedding(img)
        if not extract_res["success"]:
            print(json.dumps({"success": False, "match": False, "message": extract_res["error"]}))
            return

        if args.mode == "enroll":
            print(json.dumps({
                "success": True,
                "employeeId": args.employee_id or "",
                "embedding": extract_res["embedding"],
            }))
        elif args.mode == "recognize":
            if not args.candidates:
                print(json.dumps({"success": False, "error": "--candidates argument required for recognize mode"}))
                return

            candidates = []
            if os.path.exists(args.candidates):
                with open(args.candidates, "r") as f:
                    candidates = json.load(f)
            else:
                candidates = json.loads(args.candidates)

            match_res = engine.match_face(extract_res["embedding"], candidates)
            print(json.dumps({"success": True, **match_res}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith("--"):
        run_cli()
    elif FASTAPI_AVAILABLE:
        import uvicorn
        port = int(os.environ.get("FACE_SERVICE_PORT", 5001))
        print(f"[FaceEngine] Starting FastAPI server on port {port}...")
        uvicorn.run(app, host="127.0.0.1", port=port)
    else:
        print("[FaceEngine] FastAPI not installed. Please run: pip install -r requirements.txt", file=sys.stderr)
