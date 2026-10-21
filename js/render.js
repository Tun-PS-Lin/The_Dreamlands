// Renderer. Everything is drawn in device pixels on a 2D canvas:
//   1. ground: glyph chunks rendered once and cached (LRU), blitted with the camera offset
//   2. animated water glyphs, footprints, dust, reflections
//   3. y-sorted glyph sprites (props + player), with see-through when the player is behind
//   4. drifting fog, a half-resolution light map (darkness with light holes), additive glows
//   5. region tint, vignette and landmark labels

import { CELL_W, CELL_H, CHUNK, COLS, ROWS, WORLD_W, WORLD_H, GROUND_FONT, BG, SPRITE_CELL_W, SPRITE_CELL_H, SPRITE_FONT, FONT_FAMILY } from './config.js';
import { T, TERRAIN, REGION_INFO } from './terrain.js';
import { GlyphAtlas, makeCanvas, asciiSprite } from './glyphs.js';
import { hash2, valueNoise, mulberry32 } from './rng.js';
import { shade } from './color.js';
import { PROPS } from './props.js';
import { DECAL_COLORS } from './world.js';

const DEEP_CREST = ['rgb(52,92,128)', 'rgb(66,112,152)', 'rgb(86,136,178)', 'rgb(112,162,200)'];
const SPARK = ['rgba(190,220,255,0.6)', 'rgb(232,244,255)'];
const FOAM = ['rgba(205,228,238,0.65)', 'rgb(232,242,248)'];
const SHALLOW_CREST = 'rgb(108,160,190)';
const MARSH_CREST = ['rgb(58,128,116)', 'rgb(84,160,144)'];
const CHUNK_CACHE = 72;

export class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.world = world;
    this.chunks = new Map();
    this.propSprites = new Map();
    this.glows = new Map();
    this.cam = { x: 0, y: 0 };
    this.t = 0;
    this.scale = 0;
    this.darkness = 0.35; this.fogAmt = 0.5;
    this.tint = [255, 150, 105]; this.tintA = 0.06;
    this.regionInfo = REGION_INFO[1];
    this.phase = new Float32Array(COLS * ROWS);
    for (let i = 0; i < this.phase.length; i++) this.phase[i] = hash2(i % COLS, (i / COLS) | 0, 4242);
    this.buildWaterLists();
    const rnd = mulberry32(99);
    this.fog = Array.from({ length: 16 }, () => ({ x: rnd() * 2400, y: rnd() * 1400, vx: 6 + rnd() * 10, a: 0.35 + rnd() * 0.45, v: (rnd() * 3) | 0, k: 0.8 + rnd() * 0.9 }));
    this.labelFade = new Map();
    this.resize();
  }

  // ------------------------------------------------------------------ setup
  buildWaterLists() {
    const w = this.world;
    this.waterLists = new Map();
    const ncx = Math.ceil(COLS / CHUNK), ncy = Math.ceil(ROWS / CHUNK);
    for (let cy = 0; cy < ncy; cy++) for (let cx = 0; cx < ncx; cx++) {
      const arr = [];
      for (let y = cy * CHUNK; y < Math.min(ROWS, (cy + 1) * CHUNK); y++) {
        for (let x = cx * CHUNK; x < Math.min(COLS, (cx + 1) * CHUNK); x++) {
          const i = y * COLS + x;
          if (TERRAIN[w.terrain[i]].water) arr.push(i);
        }
      }
      this.waterLists.set(this.key(cx, cy), Int32Array.from(arr));
    }
  }

  key(cx, cy) { return (cx + 64) * 4096 + (cy + 64); }

  resize() {
    const cssW = Math.max(320, window.innerWidth), cssH = Math.max(240, window.innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let zoom = Math.min(2.2, Math.max(1, cssH / 920));
    zoom = Math.max(zoom, cssW / WORLD_W);
    this.dpr = dpr; this.zoom = zoom;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.devW = this.canvas.width; this.devH = this.canvas.height;
    const scale = Math.round(dpr * zoom * 100) / 100;
    this.viewW = this.devW / scale; this.viewH = this.devH / scale;
    if (scale !== this.scale) { this.scale = scale; this.rebuildScaled(); }
    this.light = makeCanvas(Math.ceil(this.devW / 2), Math.ceil(this.devH / 2));
    this.lctx = this.light.getContext('2d');
    this.buildVignette();
    this.clampCamera();
  }

  rebuildScaled() {
    const s = this.scale;
    this.atlas = new GlyphAtlas(CELL_W, CELL_H, GROUND_FONT, s);
    this.cw = Math.round(CELL_W * s); this.ch = Math.round(CELL_H * s);
    this.chunks.clear(); this.propSprites.clear(); this.glows.clear();
    this.labelFont = `600 ${(10.5 * s).toFixed(1)}px ${FONT_FAMILY}`;
    this.labelFontSm = `400 ${(9 * s).toFixed(1)}px ${FONT_FAMILY}`;

    const L = makeCanvas(256, 256), lc = L.getContext('2d');
    const g = lc.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    lc.fillStyle = g; lc.fillRect(0, 0, 256, 256);
    this.lightSprite = L;

    const S = makeCanvas(128, 64), sc = S.getContext('2d');
    const sg = sc.createRadialGradient(64, 32, 0, 64, 32, 64);
    sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(0.6, 'rgba(0,0,0,0.25)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    sc.setTransform(1, 0, 0, 0.5, 0, 16); sc.fillStyle = sg; sc.fillRect(0, 0, 128, 128);
    this.shadowSprite = S;

    const B = makeCanvas(512, 160), bc = B.getContext('2d');
    for (let k = 0; k < 6; k++) {
      const spread = 80 - k * 12;
      const bg = bc.createLinearGradient(0, 0, 512, 0);
      bg.addColorStop(0, 'rgba(255,255,255,0.22)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
      bc.fillStyle = bg;
      bc.beginPath(); bc.moveTo(0, 80); bc.lineTo(512, 80 - spread); bc.lineTo(512, 80 + spread); bc.closePath(); bc.fill();
    }
    this.beamSprite = B;

    this.fogSprites = [0, 1, 2].map((v) => this.makeFogSprite(v));
    if (this.onScale) this.onScale(s);
  }

  makeFogSprite(v) {
    const s = this.scale, W = 420, H = 220;
    const c = makeCanvas(W * s, H * s), g = c.getContext('2d');
    const rnd = mulberry32(700 + v);
    g.scale(s, s);
    for (let k = 0; k < 14; k++) {
      const x = 60 + rnd() * 300, y = 50 + rnd() * 120, r = 50 + rnd() * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(150,158,170,0.16)'); gr.addColorStop(1, 'rgba(150,158,170,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.font = `${GROUND_FONT}px ${FONT_FAMILY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let y = 5; y < H; y += CELL_H) for (let x = 3.5; x < W; x += CELL_W) {
      const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
      const n = valueNoise(x * 0.02 + v * 10, y * 0.03, 711);
      const a = Math.max(0, (1 - d) * 1.4 * n - 0.15);
      if (a < 0.05 || rnd() > 0.75) continue;
      g.fillStyle = `rgba(190,196,206,${Math.min(0.55, a).toFixed(2)})`;
      g.fillText(['.', ':', '~', '-', "'"][(rnd() * 5) | 0], x, y);
    }
    return c;
  }

  buildVignette() {
    const W = this.devW, H = this.devH;
    const c = makeCanvas(W, H), g = c.getContext('2d');
    const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.56);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,4,0.5)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    this.vignette = c;
  }

  glowSprite(rgb) {
    let c = this.glows.get(rgb);
    if (c) return c;
    c = makeCanvas(128, 128);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${rgb},0.9)`); gr.addColorStop(0.25, `rgba(${rgb},0.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    this.glows.set(rgb, c);
    return c;
  }

  // ------------------------------------------------------------------ camera
  sx(wx) { return Math.round(wx * this.scale) - this.camDX; }
  sy(wy) { return Math.round(wy * this.scale) - this.camDY; }

  clampCamera() {
    const c = this.cam;
    c.x = this.viewW >= WORLD_W ? (WORLD_W - this.viewW) / 2 : Math.max(0, Math.min(WORLD_W - this.viewW, c.x));
    c.y = this.viewH >= WORLD_H ? (WORLD_H - this.viewH) / 2 : Math.max(0, Math.min(WORLD_H - this.viewH, c.y));
  }

  snapCamera(p) {
    this.cam.x = p.x - this.viewW / 2; this.cam.y = p.y - 30 - this.viewH / 2;
    this.clampCamera();
  }

  updateCamera(dt, p) {
    const lead = 0.22;
    const tx = p.x + p.vx * lead - this.viewW / 2;
    const ty = p.y - 30 + p.vy * lead - this.viewH / 2;
    const k = 1 - Math.exp(-dt * 5.5);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    this.clampCamera();
  }

  updateAmbience(dt, regionId) {
    const info = REGION_INFO[regionId] || REGION_INFO[1];
    this.regionInfo = info;
    const k = 1 - Math.exp(-dt * 1.2);
    this.darkness += (info.dark - this.darkness) * k;
    this.fogAmt += (info.fog - this.fogAmt) * k;
    this.tintA += (info.tintA - this.tintA) * k;
    for (let i = 0; i < 3; i++) this.tint[i] += (info.tint[i] - this.tint[i]) * k;
  }

  // ------------------------------------------------------------------ ground chunks
  terrainAt(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return T.DEEP;
    return this.world.terrain[y * COLS + x];
  }

  cellBg(x, y, t) {
    const n = valueNoise(x * 0.07, y * 0.07, 505);
    const k = n < 0.38 ? 0.86 : n > 0.64 ? 1.14 : 1;
    return shade(TERRAIN[t].bg, k);
  }

  cellGlyph(x, y, t, i) {
    const def = TERRAIN[t];
    const gs = def.glyphs;
    const chr = gs[(hash2(x, y, 913) * gs.length) | 0];
    if (chr === ' ') return null;
    const fg = def.fg[(hash2(x, y, 914) * def.fg.length) | 0];
    let k = 0.8 + valueNoise(x * 0.11, y * 0.11, 915) * 0.38 + (hash2(x, y, 916) - 0.5) * 0.14;
    if (i >= 0 && (t === T.SAND || t === T.DUNE)) k *= 0.86 + Math.min(1, this.world.distWater[i] / 12) * 0.18;
    k = Math.round(k * 10) / 10;
    return [chr, shade(fg, k)];
  }

  renderChunk(cx, cy) {
    const s = this.scale, w = this.world;
    const ox = Math.round(cx * CHUNK * CELL_W * s), oy = Math.round(cy * CHUNK * CELL_H * s);
    const W = Math.round((cx + 1) * CHUNK * CELL_W * s) - ox + 1;
    const H = Math.round((cy + 1) * CHUNK * CELL_H * s) - oy + 1;
    const c = makeCanvas(W, H), g = c.getContext('2d', { alpha: false });
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    for (let row = 0; row < CHUNK; row++) {
      const y = cy * CHUNK + row;
      const py = Math.round(y * CELL_H * s) - oy;
      const ph = Math.round((y + 1) * CELL_H * s) - oy - py;
      let runStart = 0, runBg = null;
      for (let col = 0; col <= CHUNK; col++) {
        let bg = null;
        if (col < CHUNK) { const x = cx * CHUNK + col; bg = this.cellBg(x, y, this.terrainAt(x, y)); }
        if (bg !== runBg) {
          if (runBg) {
            const x0 = Math.round((cx * CHUNK + runStart) * CELL_W * s) - ox;
            const x1 = Math.round((cx * CHUNK + col) * CELL_W * s) - ox;
            g.fillStyle = runBg; g.fillRect(x0, py, x1 - x0, ph);
          }
          runBg = bg; runStart = col;
        }
      }
      for (let col = 0; col < CHUNK; col++) {
        const x = cx * CHUNK + col;
        const t = this.terrainAt(x, y);
        const inside = x >= 0 && y >= 0 && x < COLS && y < ROWS;
        const i = inside ? y * COLS + x : -1;
        const px = Math.round(x * CELL_W * s) - ox;
        if (i >= 0 && w.decal[i]) {
          this.atlas.draw(g, String.fromCharCode(w.decal[i]), DECAL_COLORS[w.decalCol[i]], px, py);
          continue;
        }
        const gl = this.cellGlyph(x, y, t, i);
        if (gl) this.atlas.draw(g, gl[0], gl[1], px, py);
      }
    }
    return c;
  }

  getChunk(cx, cy) {
    const k = this.key(cx, cy);
    let c = this.chunks.get(k);
    if (c) { this.chunks.delete(k); this.chunks.set(k, c); return c; }
    c = this.renderChunk(cx, cy);
    this.chunks.set(k, c);
    if (this.chunks.size > CHUNK_CACHE) this.chunks.delete(this.chunks.keys().next().value);
    return c;
  }

  chunkRange(pad = 0) {
    const cwPx = CHUNK * CELL_W, chPx = CHUNK * CELL_H;
    return {
      x0: Math.floor(this.cam.x / cwPx) - pad, x1: Math.floor((this.cam.x + this.viewW) / cwPx) + pad,
      y0: Math.floor(this.cam.y / chPx) - pad, y1: Math.floor((this.cam.y + this.viewH) / chPx) + pad,
    };
  }

  prewarm() {
    const r = this.chunkRange(1);
    for (let cy = r.y0; cy <= r.y1; cy++) for (let cx = r.x0; cx <= r.x1; cx++) this.getChunk(cx, cy);
  }

  drawGround() {
    const ctx = this.ctx, s = this.scale;
    const r = this.chunkRange(0);
    for (let cy = r.y0; cy <= r.y1; cy++) {
      for (let cx = r.x0; cx <= r.x1; cx++) {
        const c = this.getChunk(cx, cy);
        ctx.drawImage(c, Math.round(cx * CHUNK * CELL_W * s) - this.camDX, Math.round(cy * CHUNK * CELL_H * s) - this.camDY);
      }
    }
    // prefetch one neighbouring chunk per frame so scrolling never stalls
    const p = this.chunkRange(1);
    for (let cy = p.y0; cy <= p.y1; cy++) for (let cx = p.x0; cx <= p.x1; cx++) {
      if (!this.chunks.has(this.key(cx, cy))) { this.getChunk(cx, cy); return; }
    }
  }

  // ------------------------------------------------------------------ animated water
  drawWater() {
    const ctx = this.ctx, s = this.scale, t = this.t, at = this.atlas, w = this.world;
    const terr = w.terrain, dl = w.distLand, ph = this.phase;
    const vx0 = Math.floor(this.cam.x / CELL_W) - 1, vx1 = Math.ceil((this.cam.x + this.viewW) / CELL_W) + 1;
    const vy0 = Math.floor(this.cam.y / CELL_H) - 1, vy1 = Math.ceil((this.cam.y + this.viewH) / CELL_H) + 1;
    const r = this.chunkRange(0);
    const cw = this.cw, chh = this.ch;
    for (let cy = r.y0; cy <= r.y1; cy++) for (let cx = r.x0; cx <= r.x1; cx++) {
      const list = this.waterLists.get(this.key(cx, cy));
      if (!list) continue;
      for (let n = 0; n < list.length; n++) {
        const i = list[n];
        const y = (i / COLS) | 0, x = i - y * COLS;
        if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
        const tt = terr[i], p = ph[i];
        let chr = null, col = null;
        if (tt === T.DEEP) {
          const wv = Math.sin(x * 0.42 + y * 0.16 - t * 1.25 + p * 1.5) + Math.sin(x * 0.09 - y * 0.38 + t * 0.55) * 0.75;
          if (wv > 1.25) { chr = wv > 1.55 ? '~' : '-'; col = DEEP_CREST[Math.min(3, ((wv - 1.25) * 4.5) | 0)]; }
          else if (p < 0.008) { const sp = Math.sin(t * 1.9 + p * 900); if (sp > 0.55) { chr = sp > 0.85 ? '+' : '.'; col = SPARK[sp > 0.85 ? 1 : 0]; } }
        } else if (tt === T.SHALLOW) {
          const d = dl[i];
          const foam = Math.sin(t * 1.15 - d * 1.4 + x * 0.06 + p * 2.2);
          if (d <= 1 && foam > 0.25) { chr = foam > 0.7 ? 'o' : '~'; col = FOAM[foam > 0.7 ? 1 : 0]; }
          else { const wv = Math.sin(x * 0.5 + y * 0.2 - t * 1.6 + p * 2); if (wv > 0.82) { chr = '~'; col = SHALLOW_CREST; } }
        } else {
          const wv = Math.sin(x * 0.27 + t * 0.45 + p * 6) * Math.sin(y * 0.55 - t * 0.35);
          if (wv > 0.72) { chr = '-'; col = MARSH_CREST[wv > 0.86 ? 1 : 0]; }
        }
        if (!chr) continue;
        const px = Math.round(x * CELL_W * s) - this.camDX, py = Math.round(y * CELL_H * s) - this.camDY;
        ctx.fillStyle = TERRAIN[tt].bg;
        ctx.fillRect(px, py, cw, chh);
        at.draw(ctx, chr, col, px, py);
      }
    }
  }

  // ------------------------------------------------------------------ sprites
  propSprite(p) {
    const k = p.type + '|' + p.variant + '|' + (p.flip ? 1 : 0);
    let spr = this.propSprites.get(k);
    if (spr) return spr;
    const def = PROPS[p.type];
    const rnd = mulberry32(p.variant * 977 + p.type.length * 31 + 7);
    const c = asciiSprite(def.w, def.h, (ctx) => {
      if (p.flip) { ctx.translate(def.w, 0); ctx.scale(-1, 1); }
      def.draw(ctx, rnd, p.variant);
    }, { cellW: SPRITE_CELL_W, cellH: SPRITE_CELL_H, font: SPRITE_FONT, scale: this.scale, art: 2, bg: 0.34, boost: 1.18, lift: 14 });
    spr = { c, ax: (def.w / 2) * this.scale, ay: (def.h - 2) * this.scale };
    this.propSprites.set(k, spr);
    return spr;
  }

  drawReflection(player) {
    const ctx = this.ctx, s = this.scale, w = this.world;
    const cx = Math.floor(player.x / CELL_W);
    const fr = player.frame();
    if (!fr) return;
    const footRow = Math.floor((player.y + 3) / CELL_H);
    let any = false;
    for (let r = footRow; r < footRow + 6; r++) {
      const i = r * COLS + cx;
      if (r >= 0 && r < ROWS && TERRAIN[w.terrain[i]].water) { any = true; break; }
    }
    if (!any) return;
    const img = fr.c;
    const baseX = this.sx(player.x) - Math.round(fr.ax);
    const baseY = this.sy(player.y) + Math.round(1 * s);
    const sliceH = Math.max(2, Math.round(2 * s));
    ctx.globalAlpha = 0.3;
    for (let yy = 0; yy < fr.ay; yy += sliceH) {
      const wy = player.y + 1 + yy / s;
      const row = Math.floor(wy / CELL_H);
      if (row < 0 || row >= ROWS || !TERRAIN[w.terrain[row * COLS + cx]].water) continue;
      const srcY = Math.round(fr.ay - yy - sliceH);
      if (srcY < 0) break;
      const off = Math.round(Math.sin(this.t * 3 + yy * 0.15) * 1.5 * s);
      ctx.save();
      ctx.translate(baseX + off, baseY + yy + sliceH);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, srcY, img.width, sliceH, 0, 0, img.width, sliceH);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawSprites(player, dt) {
    const ctx = this.ctx, s = this.scale;
    const x0 = this.cam.x - 200, x1 = this.cam.x + this.viewW + 200;
    const y0 = this.cam.y - 40, y1 = this.cam.y + this.viewH + 260;
    const vis = [];
    for (const p of this.world.props) {
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      vis.push(p);
    }
    // shadows
    for (const p of vis) {
      const def = PROPS[p.type];
      const sw = Math.min(def.w, 120) * s * 0.9, sh = sw * 0.32;
      ctx.drawImage(this.shadowSprite, this.sx(p.x) - sw / 2, this.sy(p.y) - sh / 2, sw, sh);
    }
    const pw = 30 * s, phh = 10 * s;
    ctx.drawImage(this.shadowSprite, this.sx(player.x) - pw / 2, this.sy(player.y) - phh / 2, pw, phh);

    vis.push(player);
    vis.sort((a, b) => a.y - b.y);
    for (const o of vis) {
      if (o === player) { this.drawPlayer(player); continue; }
      const spr = this.propSprite(o);
      const def = PROPS[o.type];
      // fade props that hide the player
      const behind = player.y < o.y - 2 && player.y > o.y - def.h * 0.92 && Math.abs(player.x - o.x) < def.w * 0.42;
      const target = behind ? 0.42 : 1;
      o.fade += (target - o.fade) * Math.min(1, dt * 10);
      if (o.fade < 0.99) ctx.globalAlpha = o.fade;
      ctx.drawImage(spr.c, this.sx(o.x) - Math.round(spr.ax), this.sy(o.y) - Math.round(spr.ay));
      ctx.globalAlpha = 1;
    }
  }

  drawPlayer(player) {
    const ctx = this.ctx;
    for (const g of player.trail) {
      const fr = player.ghosts[g.dir][g.name];
      ctx.globalAlpha = Math.max(0, g.life / g.max) * 0.55;
      ctx.drawImage(fr.c, this.sx(g.x) - Math.round(fr.ax), this.sy(g.y) - Math.round(fr.ay));
    }
    ctx.globalAlpha = 1;
    const fr = player.frame();
    // soft rim light so the Dreamer always reads against the ground
    const g = this.glowSprite(player.equip.lantern ? '150,215,255' : '215,225,240');
    const gr = 34 * this.scale;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16;
    ctx.drawImage(g, this.sx(player.x) - gr, this.sy(player.y - 34) - gr * 1.25, gr * 2, gr * 2.5);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(fr.c, this.sx(player.x) - Math.round(fr.ax), this.sy(player.y) - Math.round(fr.ay));
  }

  // ------------------------------------------------------------------ atmosphere
  drawFog() {
    const ctx = this.ctx, s = this.scale;
    const spanX = this.viewW + 900, spanY = this.viewH + 500;
    for (const f of this.fog) {
      const img = this.fogSprites[f.v];
      const wx = ((((f.x + this.t * f.vx - this.cam.x * 1.12) % spanX) + spanX) % spanX) - 450 + this.cam.x;
      const wy = ((((f.y - this.cam.y * 1.12) % spanY) + spanY) % spanY) - 250 + this.cam.y;
      ctx.globalAlpha = Math.min(1, f.a * this.fogAmt);
      const w = img.width * f.k, h = img.height * f.k;
      ctx.drawImage(img, this.sx(wx) - w / 2, this.sy(wy) - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
  }

  flicker(l) {
    const t = this.t, ph = l.ph || 0, f = l.flick || 0;
    return 1 + Math.sin(t * 7.3 + ph) * f * 0.5 + Math.sin(t * 13.1 + ph * 2) * f * 0.5;
  }

  drawLighting(lights) {
    const ctx = this.ctx, s = this.scale, L = this.lctx;
    const lw = this.light.width, lh = this.light.height;
    L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1;
    L.clearRect(0, 0, lw, lh);
    L.fillStyle = `rgba(2,4,11,${this.darkness.toFixed(3)})`;
    L.fillRect(0, 0, lw, lh);
    L.globalCompositeOperation = 'destination-out';
    const margin = 300;
    const seen = [];
    for (const l of lights) {
      const x = this.sx(l.x), y = this.sy(l.y);
      const r = l.r * s;
      if (x < -r - margin || y < -r - margin || x > this.devW + r + margin || y > this.devH + r + margin) continue;
      const f = this.flicker(l);
      seen.push([l, x, y, f]);
      const rr = r * f * 0.5;
      L.globalAlpha = Math.min(1, l.int);
      L.drawImage(this.lightSprite, x / 2 - rr, y / 2 - rr, rr * 2, rr * 2);
      if (l.beam) {
        L.save();
        L.translate(x / 2, y / 2); L.rotate(this.t * 0.5);
        L.globalAlpha = 0.55;
        L.drawImage(this.beamSprite, 0, -80 * s * 0.5 * 1.4, 560 * s * 0.5 * 1.4, 160 * s * 0.5 * 1.4);
        L.restore();
      }
    }
    L.globalAlpha = 1; L.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.light, 0, 0, this.devW, this.devH);

    ctx.globalCompositeOperation = 'lighter';
    for (const [l, x, y, f] of seen) {
      if (!l.glow) continue;
      const r = l.r * 0.5 * s * f;
      ctx.globalAlpha = Math.min(1, l.glow * 0.5);
      ctx.drawImage(this.glowSprite(l.color), x - r, y - r, r * 2, r * 2);
      if (l.beam) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(this.t * 0.5);
        ctx.globalAlpha = 0.16;
        ctx.drawImage(this.beamSprite, 0, -80 * s * 1.4, 560 * s * 1.4, 160 * s * 1.4);
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  drawAmbient() {
    const ctx = this.ctx;
    if (this.tintA > 0.003) {
      const [r, g, b] = this.tint.map((v) => v | 0);
      const gr = ctx.createLinearGradient(0, this.devH, 0, 0);
      gr.addColorStop(0, `rgba(${r},${g},${b},${this.tintA.toFixed(3)})`);
      gr.addColorStop(0.75, `rgba(${r},${g},${b},0)`);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = gr; ctx.fillRect(0, 0, this.devW, this.devH);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(this.vignette, 0, 0);
  }

  drawLabels(player, discovered, dt) {
    const ctx = this.ctx, s = this.scale;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(1.6 * s).toFixed(1)}px`;
    for (const lm of this.world.landmarks) {
      let target = 0, lx = lm.x, ly = lm.y - lm.labelDy;
      if (lm.edge) {
        const d = player.y - (lm.y + 60);
        target = d < 0 ? 1 : d < 120 ? 1 - d / 120 : 0;
        lx = player.x; ly = Math.max(lm.y + 10, player.y - 150);
      } else {
        const d = Math.hypot(player.x - lm.x, player.y - lm.y);
        const r = lm.r * 1.25;
        target = d < r * 0.7 ? 1 : d < r ? 1 - (d - r * 0.7) / (r * 0.3) : 0;
      }
      let a = this.labelFade.get(lm.id) || 0;
      a += (target - a) * Math.min(1, dt * 4);
      this.labelFade.set(lm.id, a);
      if (a < 0.02) continue;
      const x = this.sx(lx), y = this.sy(ly);
      const name = lm.name.toUpperCase();
      ctx.font = this.labelFont;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillText('◇ ' + name, x + s, y + s);
      ctx.fillStyle = discovered.has(lm.id) ? '#ece4cf' : '#cfe9f2';
      ctx.fillText('◇ ' + name, x, y);
      const tw = ctx.measureText('◇ ' + name).width;
      ctx.fillStyle = 'rgba(236,228,207,0.45)';
      ctx.fillRect(x - tw / 2, y + 8 * s, tw, Math.max(1, Math.round(s * 0.6)));
    }
    ctx.globalAlpha = 1;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  // ------------------------------------------------------------------ frame
  render(game, dt) {
    const ctx = this.ctx;
    this.t = game.time;
    this.camDX = Math.round(this.cam.x * this.scale);
    this.camDY = Math.round(this.cam.y * this.scale);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, this.devW, this.devH);
    this.drawGround();
    this.drawWater();
    game.fx.drawGround(ctx, this);
    this.drawReflection(game.player);
    this.drawSprites(game.player, dt);
    this.drawFog();
    this.drawLighting(game.lights);
    game.wisps.draw(ctx, this, this.t);
    game.fx.drawAir(ctx, this, this.t);
    this.drawAmbient();
    this.drawLabels(game.player, game.hud.discovered, dt);
  }
}
