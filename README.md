# SPIS Engine

## The Problem

Some users don't leave a feed because they're done. They leave because it overwhelmed them.

* Infinite grids have no natural pauses.
* Dense text, high contrast and busy patterns arrive back to back.
* Users who are sensitive to sensory input, common in autism and ADHD, can't filter the repeats out.
* Load builds instead of fading.
* They close the app at a point they didn't choose, often mid-interest.
* That's a worse experience for them, and a lost session for the platform.

The goal isn't to make anyone scroll longer. It's to stop overload from pushing people out.

**Sensory-Paced Infinite Scroll (SPIS)** is post-ranking middleware that adds calm pauses to visual feeds.

**Live demo:** https://spis-engine.vercel.app

## The Solution

A thin layer that sits after ranking.

* Scores every image once, when it's uploaded.
* Flags pins with a Sensory Loading Score above a set limit (default 65).
* Places a calm rest-break tile right after each flagged pin.
* Keeps every ranked pin, in the same order.
* Doesn't touch the recommendation model. No new features, no retraining, no re-ranking.

## Core Metric Formulas

An async OpenCV/SciPy worker computes three scores per image at upload.

| Metric | Method | Measures | Scale |
|---|---|---|---|
| Spatial Frequency | Fast Fourier Transform, share of high-frequency magnitude | pixel clutter, fine patterns, small text | 0–100 |
| Color Entropy | Shannon entropy of a 256-bin histogram | palette chaos | 0–8 bits → 0–100 |
| Edge Density | Canny edge pixels ÷ canvas area | how tightly packed the composition is | 0–15% → 0–100 |

```
SLS = (0.40 × Spatial Frequency) + (0.35 × Color Entropy) + (0.25 × Edge Density)
```

## Validation

The demo simulates scores. [`validation/`](validation/) computes them for real with OpenCV and tests them against people.

Benchmark: 1,420 images from [SAVOIAS](https://github.com/esaraee/Savoias-Dataset), each with a visual complexity score from 37,000+ crowd-sourced comparisons.

| Category | Spearman ρ, SLS vs humans |
|---|---|
| Interior design | 0.70 |
| Advertisements | 0.68 |
| Infographics | 0.65 |
| Art | 0.60 |
| Suprematism (abstract) | 0.58 |
| Objects | 0.42 |
| Scenes | 0.41 |

* **Pass mark, set before the run:** ρ ≥ 0.5. Passed in 5 of 7 categories. Mean ρ 0.58.
* **Ads and objects:** higher than the existing measures in the SAVOIAS README (Pearson 0.69 vs 0.56, and 0.42 vs 0.30).
* **Abstract art:** lower (0.56 vs 0.84).
* **Weak spot:** Spatial Frequency carries the most weight (0.40) but predicts almost nothing (ρ −0.10 to 0.40). It measures the share of fine detail and ignores contrast. Color Entropy and Edge Density do the work.
* **Next step:** fix Spatial Frequency, then retest on a separate dataset, not this one.
* **Caveat:** this measures visual complexity, which is close to "overwhelming" but not the same.

Full report: [validation/output/SAVOIAS_REPORT.md](validation/output/SAVOIAS_REPORT.md).

## Zero-Disruption Architecture

```
Recommendation engine ──► SPIS proxy ──► Client worker ──► Paced feed
   top 500, unchanged      + 32 B/pin      plans breaks        same order
                               ▲
                     metric store (written once at upload)
```

* **Proxy:** attaches a fixed 32-byte record to each pin in the existing JSON response (44 characters base64).
* **0 ms of server compute** per request. No pixel work at request time.
* **Only serving cost:** reading those 32 bytes alongside the pin metadata the API already fetches. Budget: under 1.2 ms p99.
* **Client:** a Web Worker reads the scores and plans rest-break slots off the main thread. The UI thread only renders.
* **Fail-open:** if the proxy is down, pins pass through untouched and the feed renders unpaced.

## Enterprise Impact

* **Fewer forced exits:** in simulation at the default limit of 65, overload hits after 84 pins instead of 34.
* **Recovered inventory:** +8.4 ad windows for each session that would otherwise have ended in overload, in simulation. Revenue depends on what share of sessions end that way, which has to be measured first.
* **Right success metric:** overload-driven exits and self-reported overwhelm first. Session length is secondary.
* **No added serving compute:** scoring runs once at upload, about 15 ms of CPU per image, roughly $170 to backfill 1B pins.
* **Storage:** about $8 a month per billion pins, stored as a field on the existing pin record in DynamoDB.
* **Ad context (hypothesis):** each record carries a theme-cluster byte that ad matching could use. Not modeled yet.

## Run It

```bash
npm install
npm run dev     # local demo
npm test        # 20 tests: scoring, pacing order, fatigue model, 32-byte encoding, cost math
npm run build
```

React 18, Vite, Tailwind CSS, Lucide.

## Acknowledgements & Methodology

This project was conceptualized and directed by the author. Claude (Anthropic) was used as an architectural sounding board and engineering co-pilot to speed up frontend prototyping and to check the scoring formulas and cost estimates.

* Formulas, pacing order and the 32-byte encoding are covered by unit tests.
* Storage and compute costs were checked against public cloud pricing.
* The fatigue and attention models are design assumptions for the demo, not clinical models.

Independent concept prototype. Not affiliated with or endorsed by Pinterest, Inc. Scores, latencies and revenue figures in the demo are simulated from a seeded queue.
