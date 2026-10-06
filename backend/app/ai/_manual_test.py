"""
Throwaway manual test script — NOT part of the API, NOT meant to be committed.

Confirms the detect -> embed pipeline actually works before it gets wired
into the API endpoint.

Usage:
    cd backend
    python -m app.ai._manual_test path/to/a/clear/face/photo.jpg
"""
import sys

import cv2
import numpy as np

from app.ai.face_detector import FaceDetector
from app.ai.face_embedder import FaceEmbedder


def main(image_path: str) -> None:
    image = cv2.imread(image_path)
    if image is None:
        print(f"Could not load image at: {image_path}")
        return

    print("Loading models (first run downloads ~300MB, be patient)...")
    detector = FaceDetector()
    embedder = FaceEmbedder()

    faces = detector.detect_faces(image)
    print(f"\nDetected {len(faces)} face(s)")

    for i, face in enumerate(faces):
        print(f"\n--- Face {i} ---")
        print(f"bbox: {face['bbox']}")
        print(f"det_score: {face['det_score']:.4f}")

        kps = np.array(face["kps"], dtype=np.float32)
        embedding = embedder.get_embedding(image, kps)

        print(f"embedding shape: {embedding.shape}")
        print(f"embedding L2 norm (should be ~1.0): {np.linalg.norm(embedding):.4f}")
        print(f"first 8 values: {embedding[:8]}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m app.ai._manual_test path/to/face.jpg")
        sys.exit(1)
    main(sys.argv[1])