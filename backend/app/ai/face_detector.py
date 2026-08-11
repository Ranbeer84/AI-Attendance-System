import numpy as np
from insightface.app import FaceAnalysis


class FaceDetector:
    """
    Thin wrapper around InsightFace's RetinaFace detection model.
    Returns bounding boxes, 5-point landmarks, and detection confidence
    for every face found in an image.
    """

    _app: FaceAnalysis | None = None  # shared across instances — loaded once per process

    def __init__(self, det_size: tuple[int, int] = (640, 640)):
        if FaceDetector._app is None:
            app = FaceAnalysis(name="buffalo_l", allowed_modules=["detection"])
            app.prepare(ctx_id=-1, det_size=det_size)  # ctx_id=-1 -> CPU. Use 0 for GPU.
            FaceDetector._app = app
        self.app = FaceDetector._app

    def detect_faces(self, image_bgr: np.ndarray) -> list[dict]:
        """
        image_bgr: an OpenCV-style BGR numpy array (H, W, 3)
        Returns a list of dicts: {bbox, kps, det_score}
        """
        faces = self.app.get(image_bgr)
        results = []
        for face in faces:
            results.append(
                {
                    "bbox": face.bbox.tolist(),        # [x1, y1, x2, y2]
                    "kps": face.kps.tolist(),           # 5 landmark points
                    "det_score": float(face.det_score),
                }
            )
        return results