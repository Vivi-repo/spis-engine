"""Score every image in a folder and prepare a blind rating kit.

Usage:
  python score_images.py                    # scores validation/images/
  python score_images.py --export-samples   # first copies scikit-image's sample photos into images/samples/

Writes to validation/output/:
  scores.csv            metrics per image, keyed by a blind ID
  contact_sheet.png     every image with its blind ID, in shuffled order, to send to raters
  ratings_template.csv  blank sheet for one rater (id, rating)
"""
from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path

import cv2
import numpy as np

from spis_metrics import score_file

HERE = Path(__file__).parent
EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff'}
SAMPLES = ['astronaut', 'brick', 'camera', 'cat', 'checkerboard', 'coffee', 'coins', 'colorwheel', 'grass',
           'gravel', 'hubble_deep_field', 'immunohistochemistry', 'logo', 'moon', 'page', 'rocket', 'text']


def export_samples(dest: Path) -> None:
    from skimage import data
    dest.mkdir(parents=True, exist_ok=True)
    for name in SAMPLES:
        img = np.asarray(getattr(data, name)())
        if img.dtype == bool:
            img = (img * 255).astype(np.uint8)
        if img.ndim == 3:
            img = cv2.cvtColor(img[..., :3], cv2.COLOR_RGB2BGR)
        cv2.imencode('.png', img)[1].tofile(str(dest / f'{name}.png'))
    print(f'Exported {len(SAMPLES)} sample images to {dest}')


def contact_sheet(rows: list[dict], out: Path, thumb: int = 240, cols: int = 5) -> None:
    pad, label_h = 12, 34
    n = len(rows)
    nrows = (n + cols - 1) // cols
    sheet = np.full((nrows * (thumb + label_h + pad) + pad, cols * (thumb + pad) + pad, 3), 255, np.uint8)
    for k, row in enumerate(rows):
        img = cv2.imdecode(np.fromfile(row['path'], dtype=np.uint8), cv2.IMREAD_COLOR)
        h, w = img.shape[:2]
        s = thumb / max(h, w)
        img = cv2.resize(img, (max(1, round(w * s)), max(1, round(h * s))), interpolation=cv2.INTER_AREA)
        r, c = divmod(k, cols)
        y0, x0 = pad + r * (thumb + label_h + pad), pad + c * (thumb + pad)
        oy, ox = (thumb - img.shape[0]) // 2, (thumb - img.shape[1]) // 2
        sheet[y0 + oy:y0 + oy + img.shape[0], x0 + ox:x0 + ox + img.shape[1]] = img
        cv2.putText(sheet, row['id'], (x0, y0 + thumb + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2, cv2.LINE_AA)
    cv2.imencode('.png', sheet)[1].tofile(str(out))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--images', type=Path, default=HERE / 'images')
    ap.add_argument('--out', type=Path, default=HERE / 'output')
    ap.add_argument('--export-samples', action='store_true')
    ap.add_argument('--seed', type=int, default=7, help='controls the blind shuffle order')
    args = ap.parse_args()

    if args.export_samples:
        export_samples(args.images / 'samples')
    paths = sorted(p for p in args.images.rglob('*') if p.suffix.lower() in EXTS)
    if not paths:
        raise SystemExit(f'No images found in {args.images}. Add some, or run with --export-samples.')

    random.Random(args.seed).shuffle(paths)   # blind order: IDs carry no hint of the score
    rows = []
    for k, p in enumerate(paths, 1):
        m = score_file(str(p))
        rows.append({'id': f'IMG{k:02d}', 'file': str(p.relative_to(args.images)), 'path': str(p),
                     **{key: round(v, 4) for key, v in m.as_dict().items()}})

    args.out.mkdir(parents=True, exist_ok=True)
    fields = ['id', 'file', 'hf_ratio', 'entropy_bits', 'edge_ratio', 'sf', 'ce', 'ed', 'sls']
    with open(args.out / 'scores.csv', 'w', newline='', encoding='utf8') as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        w.writeheader(); w.writerows(rows)
    with open(args.out / 'ratings_template.csv', 'w', newline='', encoding='utf8') as f:
        w = csv.writer(f); w.writerow(['id', 'rating'])
        for row in rows: w.writerow([row['id'], ''])
    contact_sheet(rows, args.out / 'contact_sheet.png')

    print(f'Scored {len(rows)} images -> {args.out}')
    for row in sorted(rows, key=lambda r: r['sls']):
        print(f"  {row['id']}  SLS {row['sls']:5.1f}  (SF {row['sf']:5.1f}  CE {row['ce']:5.1f}  ED {row['ed']:5.1f})  {row['file']}")


if __name__ == '__main__':
    main()
