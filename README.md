# SPIS Engine

**Sensory-Paced Infinite Scroll.** Post-ranking middleware that paces visual feeds so users don't hit sensory overload and leave.

**Live demo:** _add your Vercel URL here_

## The Problem

Infinite visual grids pile on stimulus with no pause.

* Dense text, high contrast, busy patterns, back to back.
* Users with sensory gating differences can't filter the repeats out.
* Load builds instead of fading.
* They hit overload and close the app.
* The session ends early, and every ad slot after that point goes unserved.

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

* **Longer sessions:** 2.4 to 7.4 minutes in simulation at the default limit of 65.
* **More ad inventory:** +8.4 ad windows per session in simulation.
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
