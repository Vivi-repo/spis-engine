# Validation: does SLS match how people feel?

The demo simulates its scores. This folder computes them for real with OpenCV and checks them against human ratings.

**Question:** do images with a higher Sensory Loading Score feel more overwhelming to people?

**Pass mark, set before collecting ratings:** Spearman ρ ≥ 0.5 between SLS and the mean human rating.

## Setup

```bash
cd validation
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
pytest -q                       # 7 sanity checks on the metrics
```

## Run the test

1. **Collect 25 to 40 images** in `validation/images/`. Cover the whole range, from a plain product shot to a dense infographic. Your own photos and screenshots work. Images stay out of git.
   For a dry run, `python score_images.py --export-samples` adds 17 sample photos from scikit-image.
2. **Score them:** `python score_images.py`
   This writes `output/scores.csv`, `output/contact_sheet.png` and `output/ratings_template.csv`. Images get blind IDs in shuffled order.
3. **Get 3 to 5 people to rate them.** Send each one the contact sheet and the template, with this message:
   > Rate how overwhelming each image feels to look at, from 1 (calm) to 7 (very overwhelming). Go with your first reaction and don't compare notes with anyone.
4. **Save each person's file** as `ratings/<initials>.csv`. Don't show them the scores first.
5. **Compare:** `python compare.py`
   This prints the result and writes `output/REPORT.md`.

## Reading the report

* **ρ (SLS vs humans):** 0.7 or more is strong, 0.4 to 0.7 moderate, under 0.4 weak.
* **Confidence interval:** with about 30 images it will be wide. Report it with the number.
* **Rater agreement:** how much people agree with each other. SLS can't be expected to beat this.
* **Each metric alone:** shows which signal carries the score.
* **Biggest disagreements:** the images to study when improving a metric.

Don't fit new weights on the same images you test on. If you want to tune weights, collect a second set of images and test on that.

## Benchmark on published human ratings (SAVOIAS)

No time to collect ratings? This runs SLS against [SAVOIAS](https://github.com/esaraee/Savoias-Dataset): 1,420 images in 7 categories, scored for visual complexity from 37,000+ crowd-sourced pairwise comparisons ([Saraee, Jalal & Betke, 2018](https://arxiv.org/abs/1810.01771)).

```bash
git clone --depth 1 https://github.com/esaraee/Savoias-Dataset.git datasets/savoias
python savoias_benchmark.py      # about a minute; writes output/SAVOIAS_REPORT.md
```

The dataset is licensed for research and educational use only and can't be redistributed. It stays in `datasets/`, which git ignores, and only aggregate results are committed.

**Result:** mean Spearman ρ 0.58 across categories. It passes ρ ≥ 0.5 in 5 of 7 categories, falling short on scenes (0.41) and objects (0.42). See [output/SAVOIAS_REPORT.md](output/SAVOIAS_REPORT.md).

## Known limitations

* **Spatial Frequency ignores contrast.** It measures the *share* of high frequencies, so faint noise on a dark, nearly flat photo scores high. In the samples, the moon scores 39 and a bold checkerboard scores 19. **SAVOIAS confirmed it:** on its own it reaches ρ −0.10 to 0.40, despite carrying the largest weight.
* **Color Entropy can't tell ordered colors from chaotic ones.** A smooth color wheel scores 76.
* **Grayscale images top out at 3 bits of color entropy** (CE 37.5), because the histogram uses 8 gray levels.
* **Edge Density saturates on fine textures.** Grass and gravel both hit the 15% cap.

A contrast-aware Spatial Frequency is the next fix. Test it on a different dataset from the one that revealed the problem.
