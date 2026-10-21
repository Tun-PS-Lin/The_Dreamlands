// Lightweight particles: footprints, dash dust, water ripples and drifting motes.
// Everything is drawn as glyphs through the ground atlas, with alpha baked into the colour key.

import { CELL_W, CELL_H, COLS } from './config.js';
import { T, R } from './terrain.js';

const FOOT_COL = { [T.SAND]: '70,56,40', [T.WETSAND]: '45,36,27', [T.DUNE]: '62,52,38', [T.MUD]: '28,26,18' };
const DUST_COL = { [T.SAND]: '205,182,146', [T.DUNE]: '190,175,135', [T.WETSAND]: '150,135,112', [T.PATH]: '170,150,115', [T.PLANK]: '170,140,100', [T.SHALLOW]: '190,225,240', [T.MARSH]: '140,210,190', [T.MUD]: '120,110,80' };
const q = (a) => Math.round(Math.max(0, Math.min(1, a)) * 5) / 5;

export class Effects {
  constructor(world) {
    this.world = world;
    this.foot = [];
    this.dust = [];
    this.ripples = [];
    this.motes = [];
  }

  footprint(x, y, t) {
    this.foot.push({ x, y, life: 10, col: FOOT_COL[t] || '60,50,40' });
    if (this.foot.length > 90) this.foot.shift();
  }

  ripple(x, y) {
    this.ripples.push({ x, y, t: 0 });
    if (this.ripples.length > 24) this.ripples.shift();
  }

  dashBurst(x, y, dx, dy, t) {
    const col = DUST_COL[t] || '180,170,150';
    const water = t === T.SHALLOW || t === T.MARSH;
    for (let k = 0; k < 12; k++) {
      const a = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 1.8;
      const sp = 30 + Math.random() * 70;
      this.dust.push({
        x: x + (Math.random() - 0.5) * 8, y: y - Math.random() * 4,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6,
        life: 0.35 + Math.random() * 0.3, max: 0.65, col,
        ch: water ? (Math.random() < 0.5 ? '~' : 'o') : ['.', ',', "'", '`', ':'][(Math.random() * 5) | 0],
      });
    }
  }

  update(dt, r) {
    for (const f of this.foot) f.life -= dt;
    while (this.foot.length && this.foot[0].life <= 0) this.foot.shift();
    for (const p of this.dust) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 4; p.vy *= 1 - dt * 4; }
    this.dust = this.dust.filter((p) => p.life > 0);
    for (const p of this.ripples) p.t += dt;
    this.ripples = this.ripples.filter((p) => p.t < 0.9);

    // motes: drifting white specks that keep the screen alive (fireflies over grass and marsh)
    const vx0 = r.cam.x - 40, vy0 = r.cam.y - 40, vw = r.viewW + 80, vh = r.viewH + 80;
    const want = Math.round((r.viewW * r.viewH) / 26000);
    while (this.motes.length < want) this.motes.push(this.spawnMote(vx0, vy0, vw, vh));
    if (this.motes.length > want) this.motes.length = want;
    for (let k = 0; k < this.motes.length; k++) {
      const m = this.motes[k];
      m.ph += dt;
      m.x += (Math.sin(m.ph * 0.7 + m.seed) * 9 + m.drift) * dt;
      m.y += Math.cos(m.ph * 0.5 + m.seed * 2) * 6 * dt - 3 * dt;
      if (m.x < vx0 || m.x > vx0 + vw || m.y < vy0 || m.y > vy0 + vh) this.motes[k] = this.spawnMote(vx0, vy0, vw, vh);
    }
  }

  spawnMote(x, y, w, h) {
    const mx = x + Math.random() * w, my = y + Math.random() * h;
    const i = Math.floor(my / CELL_H) * COLS + Math.floor(mx / CELL_W);
    const reg = this.world.region[i];
    const fens = reg === R.FENS;
    return { x: mx, y: my, ph: Math.random() * 10, seed: Math.random() * 10, drift: (Math.random() - 0.3) * 6, fens };
  }

  drawGround(ctx, r) {
    const at = r.atlas;
    for (const f of this.foot) {
      const a = q(Math.min(1, f.life / 3) * 0.9);
      if (!a) continue;
      at.draw(ctx, '.', `rgba(${f.col},${a})`, r.sx(f.x) - at.cw / 2, r.sy(f.y) - at.ch / 2);
    }
    for (const p of this.ripples) {
      const k = p.t / 0.9, a = q((1 - k) * 0.8);
      if (!a) continue;
      const rad = 4 + k * 14;
      for (let n = 0; n < 6; n++) {
        const ang = (n / 6) * Math.PI * 2;
        at.draw(ctx, n % 2 ? '-' : '~', `rgba(170,215,225,${a})`, r.sx(p.x + Math.cos(ang) * rad) - at.cw / 2, r.sy(p.y + Math.sin(ang) * rad * 0.45) - at.ch / 2);
      }
    }
    for (const p of this.dust) {
      const a = q(p.life / p.max);
      if (!a) continue;
      at.draw(ctx, p.ch, `rgba(${p.col},${a})`, r.sx(p.x) - at.cw / 2, r.sy(p.y) - at.ch / 2);
    }
  }

  drawAir(ctx, r, t) {
    const at = r.atlas;
    for (const m of this.motes) {
      const tw = 0.5 + 0.5 * Math.sin(m.ph * 2.2 + m.seed * 3);
      const a = q(tw * (m.fens ? 0.75 : 0.5));
      if (!a) continue;
      const col = m.fens ? `rgba(200,255,225,${a})` : `rgba(235,232,220,${a})`;
      at.draw(ctx, tw > 0.85 ? '+' : '.', col, r.sx(m.x) - at.cw / 2, r.sy(m.y) - at.ch / 2);
    }
  }
}
