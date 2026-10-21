// HUD: party frame, circular minimap with fog of war, hotbar with dash cooldown,
// region and discovery toasts, control hints and a performance readout.

import { COLS, ROWS, CELL_W, CELL_H } from './config.js';
import { TERRAIN, REGION_INFO, R, T } from './terrain.js';
import { asciiSprite, makeCanvas } from './glyphs.js';
import { lin, rad, ell, glow, TAU } from './draw.js';

const MAP_PX = 3; // minimap source pixels per cell

function runeArt(kind) {
  return (ctx) => {
    const col = { spiral: '#7fe3ff', cross: '#e8e2d2', flame: '#ff9a5a', dots: '#8fd3ee', eye: '#b49af2', reed: '#9cc58a', moon: '#c9d4ff', peak: '#e3bb68' }[kind];
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    const c = 20;
    ctx.beginPath();
    if (kind === 'spiral') { for (let a = 0; a < TAU * 2.1; a += 0.15) { const r = 1 + a * 2.2; const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    else if (kind === 'cross') { ctx.moveTo(c, 5); ctx.lineTo(c, 35); ctx.moveTo(10, 16); ctx.lineTo(30, 16); ctx.stroke(); }
    else if (kind === 'flame') { ctx.moveTo(c, 4); ctx.quadraticCurveTo(34, 20, 28, 30); ctx.quadraticCurveTo(c, 40, 12, 30); ctx.quadraticCurveTo(6, 20, c, 4); ctx.fill(); }
    else if (kind === 'dots') { for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; ell(ctx, c + Math.cos(a) * 12, c + Math.sin(a) * 12, 2.6, 2.6); ctx.fill(); } ell(ctx, c, c, 3.5, 3.5); ctx.fill(); }
    else if (kind === 'eye') { ell(ctx, c, c, 14, 14); ctx.stroke(); ell(ctx, c, c, 5, 5); ctx.fill(); }
    else if (kind === 'reed') { ctx.moveTo(c, 36); ctx.lineTo(c, 8); ctx.moveTo(c, 18); ctx.lineTo(10, 6); ctx.moveTo(c, 18); ctx.lineTo(30, 6); ctx.stroke(); }
    else if (kind === 'moon') { ctx.arc(c, c, 14, 0.5, TAU - 0.5); ctx.arc(c + 7, c, 11, TAU - 0.9, 0.9, true); ctx.fill(); }
    else if (kind === 'peak') { ctx.moveTo(5, 34); ctx.lineTo(c, 6); ctx.lineTo(35, 34); ctx.closePath(); ctx.fill(); }
  };
}

function portraitArt(ctx) {
  ctx.fillStyle = lin(ctx, 4, 0, 40, 0, ['#70747e', '#4c505a', '#26282e']);
  ctx.beginPath(); ctx.moveTo(22, 2); ctx.bezierCurveTo(33, 7, 38, 24, 40, 44); ctx.lineTo(4, 44); ctx.bezierCurveTo(6, 24, 11, 7, 22, 2); ctx.fill();
  ctx.fillStyle = '#06070a'; ell(ctx, 22, 24, 8, 9.5); ctx.fill();
  ctx.fillStyle = '#a8dcff'; ctx.fillRect(18, 22.5, 2.2, 1.8); ctx.fillRect(24, 22.5, 2.2, 1.8);
}

export class HUD {
  constructor(world, save) {
    this.world = world;
    this.discovered = new Set(save?.discovered || []);
    this.region = -1;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.el = document.getElementById('hud');
    this.perfOn = save?.perf ?? true;
    this.buildParty();
    this.buildHotbar();
    this.buildMinimap(save?.fog);
    this.regionToast = document.getElementById('region-toast');
    this.discoverToast = document.getElementById('discover-toast');
    this.perfEl = document.getElementById('perf');
    this.perfEl.style.display = this.perfOn ? '' : 'none';
    this.miniRegion = document.getElementById('mini-region');
    this.fpsAcc = 0; this.fpsN = 0; this.msAcc = 0; this.fpsT = 0;
    this.miniTick = 0;
  }

  // ---------------------------------------------------------------- party frame
  buildParty() {
    const p = document.getElementById('party');
    const c = asciiSprite(44, 46, portraitArt, { cellW: 2.6, cellH: 3.8, font: 4.2, scale: this.dpr * 1.1, art: 3, bg: 0.45, boost: 1.25, lift: 20 });
    c.className = 'portrait';
    p.querySelector('.portrait-wrap').append(c);
    this.bars = {};
    for (const k of ['hp', 'mp', 'luc']) this.bars[k] = p.querySelector(`.bar.${k}`);
  }
  setStats(st) {
    this.bars.hp.querySelector('.val').textContent = `${st.hp}/${st.hp}`;
    this.bars.mp.querySelector('.val').textContent = `${st.mp}/${st.mp}`;
    this.bars.luc.querySelector('.val').textContent = `${st.lucidity}/${st.lucidity}`;
  }

  // ---------------------------------------------------------------- hotbar
  buildHotbar() {
    const bar = document.getElementById('hotbar');
    const dash = document.createElement('div');
    dash.className = 'hot dash';
    dash.innerHTML = '<span class="hot-key">SPACE</span><span class="hot-glyph">&raquo;</span><span class="hot-name">dash</span>';
    bar.append(dash);
    this.dashEl = dash;
    const sep = document.createElement('div'); sep.className = 'hot-sep'; bar.append(sep);
    this.hot = [];
    ['spiral', 'cross', 'flame', 'dots', 'eye', 'reed', 'moon', 'peak'].forEach((k, i) => {
      const s = document.createElement('div');
      s.className = 'hot locked';
      s.title = 'Not yet learned';
      const c = asciiSprite(40, 40, runeArt(k), { cellW: 2.5, cellH: 3.4, font: 3.9, scale: this.dpr * 1.05, art: 3, bg: 0.3, boost: 1.3, lift: 25 });
      c.className = 'rune';
      s.append(c);
      const key = document.createElement('span'); key.className = 'hot-key'; key.textContent = i + 1; s.append(key);
      bar.append(s);
      this.hot.push(s);
    });
  }
  pressHotbar(i) {
    const s = this.hot[i];
    if (!s) return;
    s.classList.remove('press'); void s.offsetWidth; s.classList.add('press');
    this.toastSmall('Not yet learned', s);
  }
  toastSmall(text, anchor) {
    let t = this.smallToast;
    if (!t) { t = this.smallToast = document.createElement('div'); t.className = 'small-toast'; this.el.append(t); }
    t.textContent = text;
    const r = anchor.getBoundingClientRect();
    t.style.left = r.left + r.width / 2 + 'px'; t.style.top = r.top - 10 + 'px';
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  }

  // ---------------------------------------------------------------- minimap
  buildMinimap(fogData) {
    this.mini = document.getElementById('minimap');
    this.miniSize = 168;
    this.mini.width = this.mini.height = Math.round(this.miniSize * this.dpr);
    this.mctx = this.mini.getContext('2d');
    // terrain map, drawn as a dot matrix
    const m = makeCanvas(COLS * MAP_PX, ROWS * MAP_PX), g = m.getContext('2d');
    g.fillStyle = '#04060c'; g.fillRect(0, 0, m.width, m.height);
    const w = this.world;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const t = w.terrain[y * COLS + x];
      const way = t === T.PATH || t === T.PLANK;
      g.fillStyle = way ? '#d8b878' : TERRAIN[t].mini;
      if (way || t === T.WALL || t === T.ROCK) g.fillRect(x * MAP_PX, y * MAP_PX, MAP_PX, MAP_PX);
      else g.fillRect(x * MAP_PX, y * MAP_PX, MAP_PX - 1, MAP_PX - 1);
    }
    for (const p of w.props) {
      if (p.type === 'shrub' || p.type === 'boulder') continue;
      g.fillStyle = p.type === 'deadTree' ? '#4a443c' : '#c9c2b0';
      g.fillRect(p.bx * MAP_PX - 1, p.by * MAP_PX - 2, MAP_PX + 1, MAP_PX + 1);
    }
    this.mapCanvas = m;
    // fog of war: 1px per cell, opaque until revealed
    this.fog = makeCanvas(COLS, ROWS);
    this.fctx = this.fog.getContext('2d');
    this.fctx.fillStyle = '#04060c'; this.fctx.fillRect(0, 0, COLS, ROWS);
    if (fogData) {
      const img = new Image();
      img.onload = () => { this.fctx.clearRect(0, 0, COLS, ROWS); this.fctx.drawImage(img, 0, 0); };
      img.src = fogData;
    }
    const rs = makeCanvas(64, 64), rg = rs.getContext('2d');
    const gr = rg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.65, 'rgba(0,0,0,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    rg.fillStyle = gr; rg.fillRect(0, 0, 64, 64);
    this.revealSprite = rs;
    this.lastReveal = null;
  }

  reveal(px, py) {
    const cx = px / CELL_W, cy = py / CELL_H;
    if (this.lastReveal && Math.hypot(cx - this.lastReveal[0], cy - this.lastReveal[1]) < 1.5) return;
    this.lastReveal = [cx, cy];
    const r = 30;
    this.fctx.globalCompositeOperation = 'destination-out';
    this.fctx.drawImage(this.revealSprite, cx - r, cy - r * 0.75, r * 2, r * 1.5);
    this.fctx.globalCompositeOperation = 'source-over';
  }

  fogData() { return this.fog.toDataURL(); }

  drawMinimap(player, t) {
    const g = this.mctx, S = this.mini.width, d = this.dpr;
    const ppc = 1.25 * d; // device px per cell
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2 * d, 0, TAU); g.clip();
    g.fillStyle = '#04060c'; g.fillRect(0, 0, S, S);
    const pcx = player.x / CELL_W, pcy = player.y / CELL_H;
    g.imageSmoothingEnabled = true;
    g.setTransform(ppc / MAP_PX, 0, 0, ppc / MAP_PX, S / 2 - pcx * ppc, S / 2 - pcy * ppc);
    g.drawImage(this.mapCanvas, 0, 0);
    g.setTransform(ppc, 0, 0, ppc, S / 2 - pcx * ppc, S / 2 - pcy * ppc);
    g.drawImage(this.fog, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    // discovered landmarks
    for (const lm of this.world.landmarks) {
      if (!this.discovered.has(lm.id) || lm.edge) continue;
      const x = S / 2 + (lm.x / CELL_W - pcx) * ppc, y = S / 2 + (lm.y / CELL_H - pcy) * ppc;
      g.save(); g.translate(x, y); g.rotate(Math.PI / 4);
      g.fillStyle = '#e3bb68'; g.strokeStyle = '#05070e'; g.lineWidth = d;
      g.fillRect(-2.6 * d, -2.6 * d, 5.2 * d, 5.2 * d); g.strokeRect(-2.6 * d, -2.6 * d, 5.2 * d, 5.2 * d);
      g.restore();
    }
    // player arrow
    const ang = Math.atan2(player.facing.y, player.facing.x);
    g.save(); g.translate(S / 2, S / 2); g.rotate(ang);
    g.fillStyle = 'rgba(127,232,255,0.18)'; g.beginPath(); g.arc(0, 0, 9 * d, 0, TAU); g.fill();
    g.fillStyle = '#7fe8ff'; g.strokeStyle = '#05070e'; g.lineWidth = d;
    g.beginPath(); g.moveTo(6 * d, 0); g.lineTo(-4 * d, -4 * d); g.lineTo(-2 * d, 0); g.lineTo(-4 * d, 4 * d); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.restore();
    // ring and ticks
    g.strokeStyle = 'rgba(232,226,210,0.7)'; g.lineWidth = 1.2 * d;
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2 * d, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(232,226,210,0.25)'; g.lineWidth = d;
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 6 * d, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(232,226,210,0.8)'; g.lineWidth = 1.4 * d;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU - Math.PI / 2;
      g.beginPath();
      g.moveTo(S / 2 + Math.cos(a) * (S / 2 - 2 * d), S / 2 + Math.sin(a) * (S / 2 - 2 * d));
      g.lineTo(S / 2 + Math.cos(a) * (S / 2 - 10 * d), S / 2 + Math.sin(a) * (S / 2 - 10 * d));
      g.stroke();
    }
  }

  // ---------------------------------------------------------------- toasts
  showRegion(id) {
    const info = REGION_INFO[id];
    if (!info) return;
    const t = this.regionToast;
    t.querySelector('.rt-tier').textContent = info.tier;
    t.querySelector('.rt-name').textContent = info.name;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    this.miniRegion.innerHTML = `<b>${info.name}</b><span>${info.tier}</span>`;
  }

  discover(lm) {
    this.discovered.add(lm.id);
    const t = this.discoverToast;
    t.innerHTML = `<div class="dt-k">◇ DISCOVERED</div><div class="dt-name">${lm.name}</div><div class="dt-desc">${lm.desc}</div>`;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  }

  // ---------------------------------------------------------------- per frame
  update(dt, game) {
    const p = game.player, w = this.world;
    const i = Math.floor((p.y - 2) / CELL_H) * COLS + Math.floor(p.x / CELL_W);
    let reg = w.region[i];
    if (reg === R.SEA || reg === undefined) reg = this.region >= 0 ? this.region : R.SHORE;
    this.currentRegion = reg;
    if (reg !== this.region) {
      if (this.region === -1 || !this.regionHold || game.time - this.regionHold > 2.5) {
        this.region = reg; this.regionHold = game.time;
        if (!game.suppressToast) this.showRegion(reg);
      }
    }
    for (const lm of w.landmarks) {
      if (game.suppressToast || this.discovered.has(lm.id)) continue;
      const hit = lm.edge ? p.y < lm.y + 80 : Math.hypot(p.x - lm.x, p.y - lm.y) < lm.r;
      if (hit) this.discover(lm);
    }
    this.reveal(p.x, p.y);
    if ((this.miniTick ^= 1)) this.drawMinimap(p, game.time);
    const k = p.dashReady();
    this.dashEl.style.setProperty('--cd', (1 - k).toFixed(3));
    this.dashEl.classList.toggle('ready', k >= 1);
    this.dashEl.classList.toggle('active', p.dash.active);
  }

  setDim(on) { this.el.classList.toggle('dim', on); }

  togglePerf() { this.perfOn = !this.perfOn; this.perfEl.style.display = this.perfOn ? '' : 'none'; }

  perf(dt, ms) {
    this.fpsAcc += dt; this.fpsN++; this.msAcc += ms;
    if (this.fpsAcc >= 0.5) {
      if (this.perfOn) this.perfEl.textContent = `FPS ${Math.round(this.fpsN / this.fpsAcc)} · ${(this.msAcc / this.fpsN).toFixed(1)} ms`;
      this.fpsAcc = 0; this.fpsN = 0; this.msAcc = 0;
    }
  }
}
