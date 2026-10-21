// Fen wisps: drifting lights that wander around a home point and shy away from the player.
// Purely atmospheric for now (they are also light sources).

import { valueNoise } from './rng.js';

export class Wisps {
  constructor(world) {
    this.list = world.wispSpots.map((s, k) => ({
      hx: s.x, hy: s.y, x: s.x, y: s.y, vx: 0, vy: 0,
      blue: s.blue, ph: k * 13.7, color: s.blue ? '130,215,255' : '255,185,90',
      core: s.blue ? '225,248,255' : '255,236,190',
    }));
  }

  update(dt, t, player) {
    for (const w of this.list) {
      const tx = w.hx + (valueNoise(t * 0.12 + w.ph, w.ph * 0.37) - 0.5) * 150;
      const ty = w.hy + (valueNoise(w.ph * 0.53, t * 0.1 + w.ph) - 0.5) * 110;
      let ax = (tx - w.x) * 1.6, ay = (ty - w.y) * 1.6;
      const dx = w.x - player.x, dy = w.y - (player.y - 30), d = Math.hypot(dx, dy);
      if (d < 120) { const f = (1 - d / 120) * 900; ax += (dx / (d || 1)) * f; ay += (dy / (d || 1)) * f; }
      w.vx += ax * dt; w.vy += ay * dt;
      const damp = Math.max(0, 1 - dt * 2.4);
      w.vx *= damp; w.vy *= damp;
      w.x += w.vx * dt; w.y += w.vy * dt;
    }
  }

  lights(t) {
    return this.list.map((w) => ({
      x: w.x, y: w.y, r: 75, int: 0.6, glow: 0.55, color: w.color,
      flick: 0.25, ph: w.ph,
    }));
  }

  draw(ctx, r, t) {
    const s = r.scale;
    ctx.globalCompositeOperation = 'lighter';
    for (const w of this.list) {
      const x = r.sx(w.x), y = r.sy(w.y - 18 - Math.sin(t * 1.7 + w.ph) * 4);
      if (x < -60 || y < -60 || x > r.devW + 60 || y > r.devH + 60) continue;
      const pulse = 0.75 + 0.25 * Math.sin(t * 3.1 + w.ph);
      const g = r.glowSprite(w.color);
      const rad = 26 * s * pulse;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(g, x - rad, y - rad, rad * 2, rad * 2);
      ctx.globalAlpha = 1;
      r.atlas.draw(ctx, '*', `rgb(${w.core})`, x - r.atlas.cw / 2, y - r.atlas.ch / 2);
      // faint trail of specks
      for (let k = 1; k <= 3; k++) {
        const tx = r.sx(w.x - w.vx * 0.05 * k), ty = r.sy(w.y - 18 - w.vy * 0.05 * k);
        r.atlas.draw(ctx, '.', `rgba(${w.color},${(0.6 - k * 0.15).toFixed(2)})`, tx - r.atlas.cw / 2, ty - r.atlas.ch / 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
