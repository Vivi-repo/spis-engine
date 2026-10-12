"""Benchmark SLS against SAVOIAS crowd-sourced visual complexity scores.

SAVOIAS (Saraee, Jalal & Betke, 2018): 1,420 images in 7 categories, ranked from 37,000+
pairwise human comparisons by 1,600+ contributors. https://github.com/esaraee/Savoias-Dataset

The dataset is for research and educational use and may not be redistributed, so it lives in
validation/datasets/ (git-ignored). Only code and aggregate results are published.

Setup:  git clone --depth 1 https://github.com/esaraee/Savoias-Dataset.git datasets/savoias
Run:    python savoias_benchmark.py

Pass mark, fixed before the first run: Spearman ρ >= 0.5 per category.
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

import numpy as np
import openpyxl
from scipy.stats import pearsonr, spearmanr

from spis_metrics import score_file

HERE = Path(__file__).parent
ROOT = HERE / 'datasets' / 'savoias'
CACHE = HERE / 'output' / 'savoias_scores.csv'
PASS = 0.5

# folder name -> (ground-truth file, label)
CATEGORIES = {
    'Advertisement': ('global_ranking_ad.xlsx', 'Advertisements'),
    'Visualizations': ('global_ranking_vis.xlsx', 'Infographics & visualizations'),
    'Interior Design': ('global_ranking_interior_design.xlsx', 'Interior design'),
    'Art': ('global_ranking_art.xlsx', 'Art'),
    'Scenes': ('global_ranking_scenes.xlsx', 'Scenes'),
    'Objects': ('global_ranking_objects.xlsx', 'Objects'),
    'Suprematism': ('global_ranking_sup.xlsx', 'Suprematism (abstract)'),
}
# Pearson r the SAVOIAS README reports for existing complexity measures, where given.
PAPER_BASELINE_R = {'Advertisement': 0.56, 'Objects': 0.30, 'Suprematism': 0.84}


def load_ground_truth(folder: str) -> list[float]:
    ws = openpyxl.load_workbook(ROOT / 'Ground truth' / 'xlsx' / CATEGORIES[folder][0], read_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    assert rows[0][0] == 'gt', f'unexpected header in {folder}'
    return [float(r[0]) for r in rows[1:] if r and r[0] is not None]


def find_image(folder: str, idx: int) -> Path:
    for ext in ('.jpg', '.png', '.jpeg'):
        p = ROOT / 'Images' / folder / f'{idx}{ext}'
        if p.exists():
            return p
    raise FileNotFoundError(f'{folder}/{idx}.*')


def build_scores() -> list[dict]:
    if CACHE.exists():
        with open(CACHE, encoding='utf8') as f:
            return [{k: (v if k == 'category' else float(v)) for k, v in r.items()} for r in csv.DictReader(f)]
    rows = []
    for folder in CATEGORIES:
        gt = load_ground_truth(folder)
        for idx, g in enumerate(gt):
            m = score_file(str(find_image(folder, idx)))
            rows.append({'category': folder, 'idx': idx, 'gt': g, 'sf': m.sf, 'ce': m.ce, 'ed': m.ed, 'sls': m.sls})
        print(f'  scored {folder}: {len(gt)} images', file=sys.stderr)
    CACHE.parent.mkdir(exist_ok=True)
    with open(CACHE, 'w', newline='', encoding='utf8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader(); w.writerows(rows)
    return rows


def main() -> None:
    if not ROOT.exists():
        raise SystemExit(f'Dataset not found at {ROOT}. See the setup line at the top of this file.')
    rows = build_scores()

    lines = [
        '# SLS vs SAVOIAS human complexity ratings',
        '',
        f'{len(rows)} images in 7 categories. Ground truth: crowd-sourced visual complexity from 37,000+ pairwise comparisons '
        '([Saraee, Jalal & Betke, 2018](https://arxiv.org/abs/1810.01771)).',
        '',
        f'Pass mark, fixed before the first run: Spearman ρ ≥ {PASS} per category.',
        '',
        '## SLS by category',
        '',
        '| Category | n | Spearman ρ | Pearson r | Pass | Baseline reported in SAVOIAS README (Pearson r) |',
        '|---|---|---|---|---|---|',
    ]
    per_cat = {}
    for folder, (_, label) in CATEGORIES.items():
        sub = [r for r in rows if r['category'] == folder]
        gt = np.array([r['gt'] for r in sub]); sls = np.array([r['sls'] for r in sub])
        rho, r = spearmanr(sls, gt).statistic, pearsonr(sls, gt).statistic
        per_cat[folder] = {'rho': rho, 'sub': sub, 'gt': gt}
        base = PAPER_BASELINE_R.get(folder)
        lines.append(f'| {label} | {len(sub)} | {rho:.2f} | {r:.2f} | {"yes" if rho >= PASS else "no"} | '
                     f'{f"{base:.2f}" if base is not None else "not reported"} |')
    mean_rho = float(np.mean([v['rho'] for v in per_cat.values()]))
    passed = sum(v['rho'] >= PASS for v in per_cat.values())
    lines += ['', f'**Mean ρ across categories: {mean_rho:.2f}. Passed in {passed} of 7 categories.**', '']

    lines += ['## Each metric on its own (Spearman ρ)', '',
              '| Category | Spatial Frequency | Color Entropy | Edge Density | SLS | Equal weights |',
              '|---|---|---|---|---|---|']
    for folder, (_, label) in CATEGORIES.items():
        sub, gt = per_cat[folder]['sub'], per_cat[folder]['gt']
        col = {k: np.array([r[k] for r in sub]) for k in ('sf', 'ce', 'ed', 'sls')}
        eq = (col['sf'] + col['ce'] + col['ed']) / 3
        vals = [spearmanr(col[k], gt).statistic for k in ('sf', 'ce', 'ed', 'sls')] + [spearmanr(eq, gt).statistic]
        lines.append(f'| {label} | ' + ' | '.join(f'{v:.2f}' for v in vals) + ' |')

    lines += [
        '',
        '## Caveats',
        '',
        '* SAVOIAS measures *visual complexity*, not how *overwhelming* an image feels. They are related, not the same.',
        '* Ground-truth scores are relative within each category, so results are reported per category rather than pooled.',
        '* Paper baselines are Pearson r; compare them with the Pearson column.',
        '* These weights were not tuned on SAVOIAS. Tuning them here and reporting the result here would overstate accuracy.',
    ]
    report = '\n'.join(lines) + '\n'
    (HERE / 'output' / 'SAVOIAS_REPORT.md').write_text(report, encoding='utf8')
    sys.stdout.reconfigure(encoding='utf-8')
    print(report)


if __name__ == '__main__':
    main()
