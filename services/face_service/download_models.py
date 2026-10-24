import os
import urllib.request
import sys

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

MODEL_URLS = {
    "face_detection_yunet_2023mar.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "face_recognition_sface_2021dec.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
}

def ensure_models_exist():
    os.makedirs(MODELS_DIR, exist_ok=True)
    for filename, url in MODEL_URLS.items():
        dest_path = os.path.join(MODELS_DIR, filename)
        if not os.path.exists(dest_path) or os.path.getsize(dest_path) < 10000:
            print(f"[FaceService] Downloading model: {filename} from {url}...")
            try:
                urllib.request.urlretrieve(url, dest_path)
                print(f"[FaceService] Downloaded {filename} successfully ({os.path.getsize(dest_path)} bytes).")
            except Exception as e:
                print(f"[FaceService] Error downloading {filename}: {e}", file=sys.stderr)
                if os.path.exists(dest_path):
                    os.remove(dest_path)
                return False
    return True

if __name__ == "__main__":
    success = ensure_models_exist()
    if success:
        print("[FaceService] All face recognition models are ready!")
    else:
        print("[FaceService] Failed to download some models. Please check your internet connection.", file=sys.stderr)
