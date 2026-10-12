"""Real implementations of the three SPIS metrics.

These are what the async ingestion worker would run once per uploaded image.
All three are scaled to 0-100 and combined into the Sensory Loading Score (SLS).
"""
from __future__ import annotations

from dataclasses import dataclass, asdict

import cv2
import numpy as np

WORK_SIZE = 512            # long side after downscaling; keeps cost and scale consistent across images
HF_CUTOFF = 0.25           # cycles per pixel; Nyquist is 0.5
EDGE_CAP = 0.15            # edge-pixel ratio that maps to a score of 100
W_SF, W_CE, W_ED = 0.40, 0.35, 0.25


@dataclass
class Metrics:
    hf_ratio: float        # raw: share of FFT magnitude above HF_CUTOFF
    entropy_bits: float    # raw: Shannon entropy of a 256-bin color histogram, 0-8
    edge_ratio: float      # raw: Canny edge pixels / total pixels
    sf: float              # Spatial Frequency, 0-100
    ce: float              # Color Entropy, 0-100
    ed: float              # Edge Density, 0-100
    sls: float             # Sensory Loading Score, 0-100

    def as_dict(self) -> dict:
        return asdict(self)


def prepare(img_bgr: np.ndarray) -> np.ndarray:
    """Downscale so the long side is WORK_SIZE. Never upscales."""
    if img_bgr.ndim == 2:
        img_bgr = cv2.cvtColor(img_bgr, cv2.COLOR_GRAY2BGR)
    elif img_bgr.shape[2] == 4:
        img_bgr = cv2.cvtColor(img_bgr, cv2.COLOR_BGRA2BGR)
    h, w = img_bgr.shape[:2]
    scale = WORK_SIZE / max(h, w)
    if scale < 1:
        img_bgr = cv2.resize(img_bgr, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA)
    return img_bgr


def spatial_frequency(gray: np.ndarray) -> float:
    """Share of spectral magnitude above HF_CUTOFF cycles/pixel, DC excluded.

    A Hann window suppresses the false high frequencies created by the image borders.
    """
    g = gray.astype(np.float64)
    g -= g.mean()
    h, w = g.shape
    g *= np.outer(np.hanning(h), np.hanning(w))
    mag = np.abs(np.fft.fft2(g))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    r = np.sqrt(fx ** 2 + fy ** 2)
    total = mag[r > 0].sum()
    if total == 0:
        return 0.0
    return float(mag[r >= HF_CUTOFF].sum() / total)


def color_entropy(img_bgr: np.ndarray) -> float:
    """Shannon entropy in bits of a 256-bin color histogram (3 bits R, 3 bits G, 2 bits B)."""
    b, g, r = img_bgr[..., 0] >> 6, img_bgr[..., 1] >> 5, img_bgr[..., 2] >> 5
    codes = (r.astype(np.int32) << 5) | (g.astype(np.int32) << 2) | b.astype(np.int32)
    counts = np.bincount(codes.ravel(), minlength=256).astype(np.float64)
    p = counts[counts > 0] / counts.sum()
    return float(max(0.0, -(p * np.log2(p)).sum()))


def edge_density(gray: np.ndarray) -> float:
    """Ratio of Canny edge pixels to all pixels, with thresholds set from the median intensity."""
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    med = float(np.median(blurred))
    lo, hi = int(max(0, 0.66 * med)), int(min(255, 1.33 * med))
    if hi <= lo:                       # flat or near-black image
        lo, hi = 50, 150
    edges = cv2.Canny(blurred, lo, hi)
    return float((edges > 0).mean())


def score(img_bgr: np.ndarray) -> Metrics:
    img = prepare(img_bgr)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hf, H, er = spatial_frequency(gray), color_entropy(img), edge_density(gray)
    sf, ce, ed = hf * 100, H / 8 * 100, min(er / EDGE_CAP, 1.0) * 100
    return Metrics(hf, H, er, sf, ce, ed, W_SF * sf + W_CE * ce + W_ED * ed)


def score_file(path: str) -> Metrics:
    img = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Could not read image: {path}")
    if img.dtype != np.uint8:
        img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    return score(img)
