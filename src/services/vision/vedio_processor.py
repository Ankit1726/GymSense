import os, cv2, av, threading, time
from pathlib import Path
import numpy as np
import mediapipe as mp

from streamlit_webrtc import VideoProcessorBase
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from src.detectors.squat import SquatDetector
from src.detectors.pushup import PushUpDetector
from src.detectors.biceps_curl import BicepsCurlDetector
from src.detectors.shoulder_press import ShoulderPressDetector
from src.detectors.lungs import LungesDetector
from src.services.config.workout_config import POSE_CONNECTIONS

INFER_FPS = 15  # pose detection runs at most this many times per second
INFER_MAX_WIDTH = 384  # frame is downscaled to this width ONLY for detection
LANDMARK_MAX_AGE_S = 0.5  # reuse last skeleton for this long between detections
VISIBILITY_MIN = 0.6  # landmark must be at least this visible to be drawn


MODEL_CANDIDATES = ["pose_landmarker_lite.task", "pose_landmarker_full.task"]
# One line of on-screen text per exercise
OVERLAY_TEXT = {
    "Squats": lambda m: f"DEPTH: {m['depth_status']}",
    "Push-ups": lambda m: f"BODY: {m['body_alignment']} | HIP: {m['hip_status']}",
    "Biceps Curls (Dumbbell)": lambda m: f"SWING: {m['swing_status']}",
    "Shoulder Press": lambda m: (
        f"EXT: {m['extension_status']} | BACK: {m['back_arch_status']}"
    ),
    "Lunges": lambda m: f"BALANCE: {m['balance_status']}",
}


def _find_model_path():
    models_dir = Path(__file__).resolve().parents[2] / "models"
    for name in MODEL_CANDIDATES:
        candidate = models_dir / name
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        f"No pose model found in {models_dir}. Expected one of: {MODEL_CANDIDATES}"
    )


# video processor class
class VideoProcessorClass(VideoProcessorBase):
    def __init__(self):
        self._lock = threading.Lock()
        self._latest_metrics = None
        self._exercise_type = "Squats"

        model_path = _find_model_path()
        base_option = python.BaseOptions(model_asset_path=str(model_path))

        options = vision.PoseLandmarkerOptions(
            base_options=base_option,
            running_mode=vision.RunningMode.VIDEO,
            min_pose_detection_confidence=0.6,
            min_pose_presence_confidence=0.6,
            min_tracking_confidence=0.6,
            output_segmentation_masks=False,
        )

        self._landmarker = vision.PoseLandmarker.create_from_options(options)

        self._detectors = {
            "Squats": SquatDetector(),
            "Push-ups": PushUpDetector(),
            "Biceps Curls (Dumbbell)": BicepsCurlDetector(),
            "Shoulder Press": ShoulderPressDetector(),
            "Lunges": LungesDetector(),
        }

        # detection throttling / caching state (only touched from recv thread)
        self._last_infer_time = 0.0
        self._last_timestamp_ms = 0
        self._last_landmarks = None
        self._last_landmarks_time = 0.0
        self._last_overlay_metrics = None

    # ---- thread-safe accessors used by the Streamlit side -----------------
    def set_latest_metrics(self, metrics):
        with self._lock:
            self._latest_metrics = metrics.copy()

    def get_latest_metrics(self):
        with self._lock:
            return None if self._latest_metrics is None else self._latest_metrics.copy()

    def set_exercise(self, exercise_type):
        with self._lock:
            self._exercise_type = exercise_type

    def get_exercise(self):
        with self._lock:
            return self._exercise_type

    # ---- drawing ----------------------------------------------------------
    def _draw_skeleton(self, img, landmarks):
        h, w = img.shape[:2]
        line_thickness = max(2, w // 120)
        dot_radius = max(3, w // 160)

        for start_idx, end_idx in POSE_CONNECTIONS:
            p1 = landmarks[start_idx]
            p2 = landmarks[end_idx]

            if p1.visibility > VISIBILITY_MIN and p2.visibility > VISIBILITY_MIN:
                cv2.line(
                    img,
                    (int(p1.x * w), int(p1.y * h)),
                    (int(p2.x * w), int(p2.y * h)),
                    (0, 255, 0),
                    line_thickness,
                )

        for lm in landmarks:
            if lm.visibility > VISIBILITY_MIN:
                cv2.circle(
                    img,
                    (int(lm.x * w), int(lm.y * h)),
                    dot_radius,
                    (255, 0, 0),
                    -1,
                )

    def _draw_no_pose_warnings(self, img):
        for text, y in (("NO POSE DETECTED", 50), ("PLEASE FACE THE CAMERA", 100)):
            cv2.putText(
                img,
                text,
                (30, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )

    def _draw_overlays(self, img, metrics, ex_type):
        formatter = OVERLAY_TEXT.get(ex_type)
        if formatter is None or metrics is None:
            return

        try:
            text = formatter(metrics)
        except KeyError:
            return  # metrics belong to a different exercise, skip this frame

        h = img.shape[0]
        cv2.putText(
            img,
            text,
            (20, h - 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2,
        )

    # ---- detection --------------------------------------------------------
    def _run_detection(self, image, now):
        """Run MediaPipe on a downscaled copy. Landmarks are normalized (0..1),
        so they can be drawn on the full-size frame unchanged."""
        h, w = image.shape[:2]

        if w > INFER_MAX_WIDTH:
            scale = INFER_MAX_WIDTH / w
            small = cv2.resize(
                image,
                (INFER_MAX_WIDTH, int(h * scale)),
                interpolation=cv2.INTER_AREA,
            )
        else:
            small = image

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=cv2.cvtColor(small, cv2.COLOR_BGR2RGB),
        )

        # VIDEO mode needs strictly increasing timestamps: use real time
        timestamp_ms = int(now * 1000)
        if timestamp_ms <= self._last_timestamp_ms:
            timestamp_ms = self._last_timestamp_ms + 1
        self._last_timestamp_ms = timestamp_ms

        return self._landmarker.detect_for_video(mp_image, timestamp_ms)

    def _handle_fresh_result(self, result, now):
        ex_type = self.get_exercise()

        if result.pose_landmarks:
            landmarks = result.pose_landmarks[0]
            self._last_landmarks = landmarks
            self._last_landmarks_time = now

            detector = self._detectors.get(ex_type)
            if detector:
                # detector only sees genuinely new landmarks (no duplicates)
                metrics = detector.process(landmarks)
                metrics["pose_detected"] = True
                self._last_overlay_metrics = metrics
                self.set_latest_metrics(metrics)
        else:
            self._last_landmarks = None
            self._last_overlay_metrics = None

            with self._lock:
                if self._latest_metrics is not None:
                    self._latest_metrics["pose_detected"] = False
                else:
                    self._latest_metrics = {"pose_detected": False}

    def recv(self, frame):
        image = np.asarray(
            cv2.flip(frame.to_ndarray(format="bgr24"), 1),
            dtype=np.uint8,
        )

        now = time.monotonic()

        if now - self._last_infer_time >= 1.0 / INFER_FPS:
            self._last_infer_time = now
            result = self._run_detection(image, now)
            self._handle_fresh_result(result, now)

        landmarks_fresh = (
            self._last_landmarks is not None
            and now - self._last_landmarks_time <= LANDMARK_MAX_AGE_S
        )

        if landmarks_fresh:
            self._draw_skeleton(image, self._last_landmarks)
            self._draw_overlays(image, self._last_overlay_metrics, self.get_exercise())
        else:
            self._draw_no_pose_warnings(image)

        return av.VideoFrame.from_ndarray(image, format="bgr24")
