"""Sanity checks: each metric must respond to the property it claims to measure."""
import numpy as np
import pytest

import spis_metrics as m

RNG = np.random.default_rng(0)
FLAT = np.full((256, 256, 3), 128, np.uint8)
NOISE = RNG.integers(0, 256, (256, 256, 3), dtype=np.uint8)


def stripes(period: int, size: int = 256) -> np.ndarray:
    row = ((np.arange(size) // (period // 2)) % 2 * 255).astype(np.uint8)
    return np.dstack([np.tile(row, (size, 1))] * 3)


def test_flat_image_scores_zero():
    r = m.score(FLAT)
    assert r.sf == pytest.approx(0, abs=1e-9)
    assert r.ce == pytest.approx(0, abs=1e-9)
    assert r.ed == 0
    assert r.sls == pytest.approx(0, abs=1e-9)


def test_noise_is_near_maximum():
    r = m.score(NOISE)
    assert r.ce > 99          # 256 bins filled evenly -> ~8 bits
    assert r.ed == 100        # edge cap reached
    assert r.sf > 70


def test_finer_patterns_raise_spatial_frequency():
    assert m.score(stripes(4)).sf > m.score(stripes(16)).sf > m.score(stripes(64)).sf


def test_more_colors_raise_entropy():
    two = np.zeros((128, 128, 3), np.uint8); two[:, 64:] = 255
    assert m.score(two).entropy_bits == pytest.approx(1.0, abs=1e-6)
    assert m.score(NOISE).entropy_bits > m.score(two).entropy_bits


def test_more_edges_raise_edge_density():
    assert m.score(stripes(8)).edge_ratio > m.score(stripes(64)).edge_ratio


def test_sls_uses_spis_weights():
    r = m.score(NOISE)
    assert r.sls == pytest.approx(0.40 * r.sf + 0.35 * r.ce + 0.25 * r.ed)


def test_downscales_large_images_only():
    assert max(m.prepare(np.zeros((2000, 1000, 3), np.uint8)).shape[:2]) == m.WORK_SIZE
    assert m.prepare(np.zeros((100, 80, 3), np.uint8)).shape[:2] == (100, 80)
