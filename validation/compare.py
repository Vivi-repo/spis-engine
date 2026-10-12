"""Compare SLS against human ratings of how overwhelming each image feels.

Put one CSV per rater in validation/ratings/ (copy output/ratings_template.csv, fill in 1-7).
Then run:  python compare.py

Writes output/REPORT.md and prints a summary.
"""
from __future__ import annotations

import csv
import itertools
import sys
from pathlib import Path

import numpy as np
from scipy.stats import spearmanr

HERE = Path(__file__).parent
WEIGHTS = {'SPIS weights (0.40 / 0.35 / 0.25)': (0.40, 0.35, 0.25), 'Equal weights': (1 / 3, 1 / 3, 1 / 3)}


def load_scores(path: Path) -> dict[str, dict]:
    with open(path, encoding='utf8') as f:
        return {r['id']: {k: (v if k in ('id', 'file') else float(v)) for k, v in r.items()} for r in csv.DictReader(f)}


def load_ratings(folder: Path, ids: set[str]) -> dict[str, dict[str, float]]:
    raters = {}
    for p in sorted(folder.glob('*.csv')):
        with open(p, encoding='utf8') as f:
            vals = {r['id'].strip(): float(r['rating']) for r in csv.DictReader(f) if r.get('rating', '').strip()}
        bad = [k for k, v in vals.items() if k not in ids or not 1 <= v <= 7]
        if bad:
            raise SystemExit(f'{p.name}: unknown IDs or ratings outside 1-7: {bad[:5]}')
        if vals:
            raters[p.stem] = vals
    return raters


def bootstrap_ci(x: np.ndarray, y: np.ndarray, n: int = 4000, seed: int = 0) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    stats = []
    for _ in range(n):
        idx = rng.integers(0, len(x), len(x))
        if np.ptp(x[idx]) == 0 or np.ptp(y[idx]) == 0:
            continue
        stats.append(spearmanr(x[idx], y[idx]).statistic)
    return float(np.percentile(stats, 2.5)), float(np.percentile(stats, 97.5))


def strength(rho: float) -> str:
    a = abs(rho)
    return 'strong' if a >= 0.7 else 'moderate' if a >= 0.4 else 'weak'


def main() -> None:
    scores = load_scores(HERE / 'output' / 'scores.csv')
    raters = load_ratings(HERE / 'ratings', set(scores))
    if not raters:
        raise SystemExit('No ratings yet. Copy output/ratings_template.csv into ratings/<name>.csv and fill in 1-7.')

    ids = sorted(i for i in scores if any(i in r for r in raters.values()))
    human = np.array([np.mean([r[i] for r in raters.values() if i in r]) for i in ids])
    sf, ce, ed, sls = (np.array([scores[i][k] for i in ids]) for k in ('sf', 'ce', 'ed', 'sls'))

    # How much do people agree with each other? This is the ceiling for any automatic score.
    pair_rhos = []
    for a, b in itertools.combinations(raters.values(), 2):
        common = [i for i in ids if i in a and i in b]
        if len(common) >= 5:
            pair_rhos.append(spearmanr([a[i] for i in common], [b[i] for i in common]).statistic)
    agreement = float(np.mean(pair_rhos)) if pair_rhos else None

    main_rho = spearmanr(sls, human)
    lo, hi = bootstrap_ci(sls, human)
    per_metric = {name: spearmanr(v, human).statistic for name, v in
                  [('Spatial Frequency', sf), ('Color Entropy', ce), ('Edge Density', ed)]}
    weight_rhos = {name: spearmanr(w[0] * sf + w[1] * ce + w[2] * ed, human).statistic for name, w in WEIGHTS.items()}

    rank_sls = np.argsort(np.argsort(-sls)) + 1
    rank_hum = np.argsort(np.argsort(-human)) + 1
    gaps = sorted(zip(ids, rank_sls, rank_hum, sls, human), key=lambda t: -abs(t[1] - t[2]))[:5]

    lines = [
        '# SPIS scoring vs human ratings',
        '',
        f'{len(ids)} images, {len(raters)} raters ({", ".join(raters)}). Ratings: 1 = calm, 7 = very overwhelming.',
        '',
        '## Result',
        '',
        f'* **SLS vs mean human rating:** Spearman ρ = **{main_rho.statistic:.2f}** ({strength(main_rho.statistic)}), '
        f'95% bootstrap CI {lo:.2f} to {hi:.2f}, p = {main_rho.pvalue:.3g}.',
        (f'* **Rater agreement:** mean pairwise ρ = {agreement:.2f}. People agree with each other about this much, '
         f'so an automatic score shouldn\'t be expected to beat it.') if agreement is not None
        else '* **Rater agreement:** needs at least 2 raters who rated the same images.',
        '',
        '## Each metric on its own',
        '',
        '| Metric | ρ vs humans |',
        '|---|---|',
        *[f'| {k} | {v:.2f} |' for k, v in per_metric.items()],
        '',
        '## Weighting',
        '',
        '| Combination | ρ vs humans |',
        '|---|---|',
        *[f'| {k} | {v:.2f} |' for k, v in weight_rhos.items()],
        '',
        'With a small image set, treat differences under about 0.1 as noise. Don\'t fit new weights on the same images you test on.',
        '',
        '## Biggest disagreements',
        '',
        '| ID | File | SLS rank | Human rank | SLS | Mean rating |',
        '|---|---|---|---|---|---|',
        *[f'| {i} | {scores[i]["file"]} | {a} | {b} | {s:.1f} | {h:.2f} |' for i, a, b, s, h in gaps],
        '',
        'These are the images to look at first when improving a metric.',
    ]
    report = '\n'.join(lines) + '\n'
    (HERE / 'output' / 'REPORT.md').write_text(report, encoding='utf8')
    sys.stdout.reconfigure(encoding='utf-8')   # Windows consoles default to cp1252, which lacks ρ
    print(report)


if __name__ == '__main__':
    main()
