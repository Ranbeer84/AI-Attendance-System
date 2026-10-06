import os

import numpy as np
from insightface.model_zoo import model_zoo
from insightface.utils import face_align

# Same buffalo_l pack face_detector.py already downloaded — just the
# recognition (ArcFace) model file within it.
RECOGNITION_MODEL_PATH = os.path.expanduser(
    "~/.insightface/models/buffalo_l/w600k_r50.onnx"
)


class FaceEmbedder:
    """
    Thin wrapper around InsightFace's ArcFace recognition model.
    Takes a raw image + 5-point landmarks (from FaceDetector), aligns the
    face crop, and returns a 512-dim embedding vector.
    """

    _rec_model = None

    def __init__(self):
        if FaceEmbedder._rec_model is None:
            # Loading the recognition ONNX model directly via model_zoo,
            # instead of via FaceAnalysis(allowed_modules=["recognition"]).
            # FaceAnalysis.__init__ always asserts a detection model is
            # present in self.models regardless of allowed_modules, so that
            # call raised AssertionError. model_zoo.get_model loads just
            # the one model file we actually need, with the same get_feat()
            # interface, and avoids loading a redundant detection model
            # (FaceDetector already owns that).
            model = model_zoo.get_model(
                RECOGNITION_MODEL_PATH, providers=["CPUExecutionProvider"]
            )
            model.prepare(ctx_id=-1)
            FaceEmbedder._rec_model = model
        self.rec_model = FaceEmbedder._rec_model

    def get_embedding(self, image_bgr: np.ndarray, kps: np.ndarray) -> np.ndarray:
        """
        image_bgr: full original image (BGR numpy array)
        kps: 5x2 array of landmark points for ONE face (from detector output)
        Returns a normalized 512-dim float32 embedding.
        """
        aligned_face = face_align.norm_crop(image_bgr, landmark=kps, image_size=112)
        embedding = self.rec_model.get_feat(aligned_face)
        embedding = embedding.flatten().astype(np.float32)
        # ArcFace embeddings are compared via cosine similarity — normalizing
        # here means a plain dot product later gives the cosine similarity directly.
        embedding = embedding / np.linalg.norm(embedding)
        return embedding