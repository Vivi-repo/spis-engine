import { mulberry32 } from '../lib/random';

/* ───────────────────────── Procedural pin artwork ─────────────────────────
   Visual noise in each image is driven by its own metrics: stripe frequency ← SF,
   palette spread ← CE, shape and edge count ← ED. */
export const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;
export function drawPin(cv, it) {
  const W = 360, H = Math.round(360 * it.aspect);
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const r = mulberry32(it.seed);
  const h0 = r() * 360;
  const spread = (it.ce / 100) * 360;
  const nCol = 2 + Math.round((it.ce / 100) * 10);
  const sat = 30 + it.ce * 0.6;
  const pal = Array.from({ length: nCol }, () => hsl(h0 + (r() - 0.5) * spread, sat, 30 + r() * 40));

  if (it.isBreak) return drawBreak(c, W, H, it, r, h0);

  const calm = ['ceramic', 'mountain', 'linen', 'quote'].includes(it.kind);
  if (calm) return drawCalm(c, W, H, it, r, h0);

  c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);

  // High-frequency texture
  if (it.kind === 'opart') {
    const p = 3 + (1 - (it.sf - 90) / 10) * 4;
    const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4);
    for (let rad = Math.hypot(W, H); rad > 0; rad -= p) {
      c.beginPath(); c.arc(cx, cy, rad, 0, 7); c.fillStyle = (Math.round(rad / p) % 2) ? '#111' : '#f4f4f4'; c.fill();
    }
    c.globalCompositeOperation = 'difference';
    for (let x = 0; x < W; x += p * 2) { c.fillStyle = '#ddd'; c.fillRect(x, 0, p, H); }
    c.globalCompositeOperation = 'source-over';
  } else if (it.sf > 40) {
    const p = 14 - ((it.sf - 40) / 60) * 11.5;
    c.save(); c.translate(W / 2, H / 2); c.rotate(r() * Math.PI);
    c.globalAlpha = 0.15 + (it.sf / 100) * 0.45;
    for (let x = -H; x < H; x += p * 2) { c.fillStyle = pal[1 % nCol]; c.fillRect(x, -H, p, H * 2); }
    c.restore(); c.globalAlpha = 1;
  }

  // Edges: hard-edged shapes
  const shapes = Math.round((it.ed / 100) * (it.kind === 'collage' ? 90 : 55));
  for (let i = 0; i < shapes; i++) {
    c.fillStyle = pal[Math.floor(r() * nCol)];
    c.strokeStyle = r() > 0.5 ? '#000' : '#fff'; c.lineWidth = 1 + r() * 2;
    const x = r() * W, y = r() * H, s = 8 + r() * 70, t = r();
    c.beginPath();
    if (t < 0.4) c.rect(x, y, s, s * (0.4 + r()));
    else if (t < 0.7) c.arc(x, y, s / 2, 0, 7);
    else { c.moveTo(x, y); c.lineTo(x + s, y + s * 0.3); c.lineTo(x + s * 0.2, y + s); c.closePath(); }
    c.fill(); if (r() < it.ed / 110) c.stroke();
  }

  // Text-heavy overlays
  const ink = '#0b0b0b', paper = '#fbfbf6';
  if (it.kind === 'info' || it.kind === 'recipe') {
    c.fillStyle = paper; c.globalAlpha = 0.86; c.fillRect(18, 18, W - 36, H - 36); c.globalAlpha = 1;
    c.fillStyle = ink; c.font = '700 30px "IBM Plex Sans", sans-serif';
    c.fillText(it.kind === 'info' ? '47 HACKS' : 'LASAGNA', 30, 58);
    c.font = '9px "IBM Plex Mono", monospace';
    const words = ['batch', 'focus', 'inbox', 'timer', 'zero', 'stack', 'layer', 'ricotta', 'simmer', 'prep', 'sprint', 'review'];
    for (let y = 80; y < H - 30; y += 11) {
      c.fillStyle = r() > 0.8 ? pal[Math.floor(r() * nCol)] : ink;
      let line = (Math.floor((y - 80) / 11) + 1) + '. ';
      while (line.length < 52) line += words[Math.floor(r() * words.length)] + ' ';
      c.fillText(line, 30, y);
    }
  }
  if (it.kind === 'neon') {
    c.font = '800 64px "IBM Plex Sans", sans-serif'; c.textAlign = 'center';
    c.lineWidth = 6; c.strokeStyle = '#000'; c.fillStyle = hsl(h0 + 180, 100, 60);
    c.strokeText('-70%', W / 2, H * 0.45); c.fillText('-70%', W / 2, H * 0.45);
    c.font = '800 34px "IBM Plex Sans", sans-serif'; c.fillStyle = '#fff';
    c.strokeText('FLASH SALE', W / 2, H * 0.62); c.fillText('FLASH SALE', W / 2, H * 0.62);
    c.textAlign = 'start';
  }
  if (it.kind === 'collage') {
    c.font = '700 22px "IBM Plex Sans", sans-serif';
    ['vibes', 'MOOD', 'y2k', 'obsessed', 'SAVE', '✶'].forEach(w => {
      c.save(); c.translate(r() * W * 0.8, 30 + r() * (H - 40)); c.rotate((r() - 0.5) * 0.8);
      c.fillStyle = '#fff'; c.fillRect(-4, -20, c.measureText(w).width + 8, 26);
      c.fillStyle = '#000'; c.fillText(w, 0, 0); c.restore();
    });
  }
  if (it.kind === 'glitch') {
    c.font = '800 54px "IBM Plex Mono", monospace'; c.fillStyle = '#fff'; c.fillText('RAVE//03', 14, H * 0.55);
    for (let i = 0; i < 26; i++) {
      const y = r() * H, hh = 2 + r() * 14, dx = (r() - 0.5) * 60;
      c.drawImage(cv, 0, y, W, hh, dx, y, W, hh);
    }
    c.globalCompositeOperation = 'screen'; c.fillStyle = 'rgba(255,0,80,.25)'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  }
  if (it.kind === 'street' || it.kind === 'boho') {
    c.fillStyle = 'rgba(0,0,0,.18)';
    for (let i = 0; i < 6; i++) c.fillRect(r() * W, r() * H, 40 + r() * 80, 60 + r() * 120);
  }
}

export function drawCalm(c, W, H, it, r, h0) {
  const h = it.kind === 'mountain' ? 205 : it.kind === 'ceramic' ? 30 : it.kind === 'linen' ? 38 : 160;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, hsl(h, 22, 90)); g.addColorStop(1, hsl(h + 10, 18, 80));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (it.kind === 'mountain') {
    [[0.55, 70], [0.65, 60], [0.78, 50]].forEach(([base, l], k) => {
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) c.lineTo(x, H * base - Math.sin(x / 60 + k * 2 + r()) * 26 - k * 4);
      c.lineTo(W, H); c.closePath(); c.fillStyle = hsl(h + k * 6, 16, l); c.fill();
    });
  } else if (it.kind === 'ceramic') {
    c.fillStyle = hsl(h, 14, 70); c.fillRect(0, H * 0.74, W, H * 0.26);
    c.fillStyle = hsl(h + 5, 18, 58);
    c.beginPath(); c.ellipse(W / 2, H * 0.6, 62, 82, 0, 0, 7); c.fill();
    c.fillRect(W / 2 - 22, H * 0.34, 44, 40);
    c.strokeStyle = hsl(110, 18, 40); c.lineWidth = 3; c.beginPath(); c.moveTo(W / 2, H * 0.34); c.quadraticCurveTo(W / 2 + 30, H * 0.15, W / 2 + 10, H * 0.06); c.stroke();
  } else if (it.kind === 'linen') {
    c.strokeStyle = hsl(h, 16, 72); c.lineWidth = 2;
    for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(0, H * (0.4 + k * 0.09)); c.bezierCurveTo(W * 0.3, H * (0.35 + k * 0.1), W * 0.7, H * (0.48 + k * 0.08), W, H * (0.42 + k * 0.09)); c.stroke(); }
    c.fillStyle = hsl(h, 20, 94); c.fillRect(W * 0.12, H * 0.22, W * 0.32, H * 0.14); c.fillRect(W * 0.56, H * 0.22, W * 0.32, H * 0.14);
  } else {
    c.fillStyle = hsl(h, 20, 28); c.font = 'italic 500 34px "Bricolage Grotesque", sans-serif'; c.textAlign = 'center';
    c.fillText('slow down.', W / 2, H / 2); c.fillRect(W / 2 - 20, H / 2 + 22, 40, 2); c.textAlign = 'start';
  }
}

export function drawBreak(c, W, H, it, r) {
  const h = 190 + r() * 60;
  if (it.kind === 'gradient') {
    const g = c.createRadialGradient(W * 0.35, H * 0.3, 10, W * 0.5, H * 0.5, H);
    g.addColorStop(0, hsl(h, 45, 90)); g.addColorStop(0.55, hsl(h + 30, 35, 82)); g.addColorStop(1, hsl(h + 60, 30, 76));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  } else if (it.kind === 'landscape') {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, hsl(h, 40, 90)); g.addColorStop(1, hsl(30, 45, 88));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = hsl(40, 60, 92); c.beginPath(); c.arc(W * 0.68, H * 0.38, 34, 0, 7); c.fill();
    [[0.62, 80], [0.72, 74], [0.84, 68]].forEach(([b, l], k) => {
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 24) c.lineTo(x, H * b - Math.sin(x / 90 + k) * 14);
      c.lineTo(W, H); c.closePath(); c.fillStyle = hsl(h - 40 + k * 10, 18, l); c.fill();
    });
  } else {
    c.fillStyle = hsl(h, 14, 95); c.fillRect(0, 0, W, H);
    c.fillStyle = hsl(h, 14, 55); c.fillRect(40, H * 0.46, 56, 2);
    c.font = '500 22px "Bricolage Grotesque", sans-serif'; c.fillStyle = hsl(h, 18, 30);
    c.fillText('Take a breath.', 40, H * 0.42);
    c.font = '13px "IBM Plex Sans", sans-serif'; c.fillStyle = hsl(h, 10, 45);
    c.fillText('More ideas below.', 40, H * 0.54);
  }
}
