# SLS vs SAVOIAS human complexity ratings

1420 images in 7 categories. Ground truth: crowd-sourced visual complexity from 37,000+ pairwise comparisons ([Saraee, Jalal & Betke, 2018](https://arxiv.org/abs/1810.01771)).

Pass mark, fixed before the first run: Spearman ρ ≥ 0.5 per category.

## SLS by category

| Category | n | Spearman ρ | Pearson r | Pass | Baseline reported in SAVOIAS README (Pearson r) |
|---|---|---|---|---|---|
| Advertisements | 200 | 0.68 | 0.69 | yes | 0.56 |
| Infographics & visualizations | 200 | 0.65 | 0.66 | yes | not reported |
| Interior design | 100 | 0.70 | 0.70 | yes | not reported |
| Art | 420 | 0.60 | 0.61 | yes | not reported |
| Scenes | 200 | 0.41 | 0.43 | no | not reported |
| Objects | 200 | 0.42 | 0.42 | no | 0.30 |
| Suprematism (abstract) | 100 | 0.58 | 0.56 | yes | 0.84 |

**Mean ρ across categories: 0.58. Passed in 5 of 7 categories.**

## Each metric on its own (Spearman ρ)

| Category | Spatial Frequency | Color Entropy | Edge Density | SLS | Equal weights |
|---|---|---|---|---|---|
| Advertisements | 0.19 | 0.58 | 0.58 | 0.68 | 0.67 |
| Infographics & visualizations | 0.06 | 0.43 | 0.59 | 0.65 | 0.64 |
| Interior design | 0.40 | 0.73 | 0.58 | 0.70 | 0.67 |
| Art | 0.07 | 0.61 | 0.58 | 0.60 | 0.61 |
| Scenes | -0.04 | 0.53 | 0.39 | 0.41 | 0.41 |
| Objects | 0.09 | 0.29 | 0.41 | 0.42 | 0.41 |
| Suprematism (abstract) | -0.10 | 0.79 | 0.54 | 0.58 | 0.61 |

## Caveats

* SAVOIAS measures *visual complexity*, not how *overwhelming* an image feels. They are related, not the same.
* Ground-truth scores are relative within each category, so results are reported per category rather than pooled.
* Paper baselines are Pearson r; compare them with the Pearson column.
* These weights were not tuned on SAVOIAS. Tuning them here and reporting the result here would overstate accuracy.
