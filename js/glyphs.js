// Glyph rendering: a cached glyph atlas for the ground, and an "asciify" pipeline that turns
// vector art into glyph sprites (each cell's average colour picks a glyph by brightness).

import { FONT_FAMILY, RAMP, SPRITE_RAMP } from './config.js';
import { hash2 } from './rng.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export class GlyphAtlas {
  constructor(cellW, cellH, fontPx, scale) {
    this.cw = Math.max(1, Math.round(cellW * scale));
    this.ch = Math.max(1, Math.round(cellH * scale));
    this.size = 2048;
    this.canvas = makeCanvas(this.size, this.size);
    this.ctx = this.canvas.getContext('2d');
    this.font = `${(fontPx * scale).toFixed(2)}px ${FONT_FAMILY}`;
    this.cols = Math.floor(this.size / this.cw);
    this.rows = Math.floor(this.size / this.ch);
    this.map = new Map();
    this.n = 0;
    this.prep();
  }
  prep() {
    const c = this.ctx;
    c.font = this.font;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
  }
  get(chr, color) {
    const key = chr + color;
    let e = this.map.get(key);
    if (e !== undefined) return e;
    if (this.n >= this.cols * this.rows) { // full: start over (cached chunks are already baked)
      this.ctx.clearRect(0, 0, this.size, this.size);
      this.map.clear(); this.n = 0; this.prep();
    }
    const i = this.n++;
    const x = (i % this.cols) * this.cw, y = Math.floor(i / this.cols) * this.ch;
    this.ctx.fillStyle = color;
    this.ctx.fillText(chr, x + this.cw / 2, y + this.ch / 2 + this.ch * 0.04);
    e = { x, y };
    this.map.set(key, e);
    return e;
  }
  draw(ctx, chr, color, dx, dy) {
    const e = this.get(chr, color);
    ctx.drawImage(this.canvas, e.x, e.y, this.cw, this.ch, dx, dy, this.cw, this.ch);
  }
}

// Average each cw x ch block of a source canvas into one glyph cell.
export function asciify(src, cw, ch) {
  const W = src.width, H = src.height;
  const cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
  const d = src.getContext('2d').getImageData(0, 0, W, H).data;
  const cells = new Array(cols * rows).fill(null);
  for (let r = 0; r < rows; r++) {
    const y0 = Math.floor(r * ch), y1 = Math.min(H, Math.floor((r + 1) * ch));
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor(c * cw), x1 = Math.min(W, Math.floor((c + 1) * cw));
      let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        let k = (y * W + x0) * 4;
        for (let x = x0; x < x1; x++, k += 4) {
          const a = d[k + 3];
          sr += d[k] * a; sg += d[k + 1] * a; sb += d[k + 2] * a; sa += a; n++;
        }
      }
      if (!n) continue;
      const cov = sa / (255 * n);
      if (cov < 0.14) continue;
      const R = sr / sa, G = sg / sa, B = sb / sa;
      cells[r * cols + c] = { r: R, g: G, b: B, cov, l: (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255 };
    }
  }
  return { cells, cols, rows };
}

const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

// Render an asciified grid to a canvas at device scale.
//   opts.bg     strength of the dark cell backing (gives objects a solid silhouette)
//   opts.boost  glyph colour multiplier; opts.lift adds a brightness floor
//   opts.tint   [r,g,b] to recolour everything (used for dash afterimages)
export function renderAscii(grid, outW, outH, fontPx, scale, opts = {}) {
  const { cells, cols, rows } = grid;
  const cw = outW * scale, chh = outH * scale;
  const cv = makeCanvas(cols * cw, rows * chh);
  const ctx = cv.getContext('2d');
  ctx.font = `${(fontPx * scale).toFixed(2)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bgK = opts.bg ?? 0.32, boost = opts.boost ?? 1.2, lift = opts.lift ?? 16, tint = opts.tint;
  const ramp = opts.ramp || SPRITE_RAMP;
  const last = ramp.length - 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const e = cells[r * cols + c];
      if (!e) continue;
      let R = e.r, G = e.g, B = e.b;
      if (tint) { const l = 0.35 + e.l * 0.9; R = tint[0] * l; G = tint[1] * l; B = tint[2] * l; }
      const x = c * cw, y = r * chh;
      const cov = Math.min(1, e.cov);
      if (bgK > 0) {
        ctx.fillStyle = `rgba(${cl(R * bgK)},${cl(G * bgK)},${cl(B * bgK)},${(cov * 0.92).toFixed(3)})`;
        ctx.fillRect(x, y, cw + 0.6, chh + 0.6);
      }
      const jitter = Math.round((hash2(c, r, 77) - 0.5) * 2.4);
      let li = Math.round(Math.pow(e.l, 0.8) * last * 1.05) + jitter;
      li = Math.max(cov > 0.5 ? 3 : 1, Math.min(last, li));
      ctx.fillStyle = `rgba(${cl(R * boost + lift)},${cl(G * boost + lift)},${cl(B * boost + lift)},${Math.min(1, cov * 1.25).toFixed(3)})`;
      ctx.fillText(ramp[li], x + cw / 2, y + chh / 2);
    }
  }
  return cv;
}

// Paint art with drawFn at `art`x resolution, then asciify and render it.
// opts: { cellW, cellH, font, scale, art, bg, boost, lift, tint }
export function asciiSprite(w, h, drawFn, opts) {
  const art = opts.art ?? 2;
  const src = makeCanvas(w * art, h * art);
  const sctx = src.getContext('2d', { willReadFrequently: true });
  sctx.scale(art, art);
  drawFn(sctx);
  const grid = asciify(src, opts.cellW * art, opts.cellH * art);
  return renderAscii(grid, opts.cellW, opts.cellH, opts.font, opts.scale, opts);
}
