// The Dreamer: movement with acceleration, a dash with afterimages, tile collision and
// pre-rendered glyph animation frames for every direction.

import { PLAYER, CELL_W, CELL_H, COLS, ROWS } from './config.js';
import { T, TERRAIN } from './terrain.js';
import { asciiSprite } from './glyphs.js';
import { drawPlayerArt, ART_W, FEET_Y } from './playerArt.js';

export const DIRS = ['down', 'left', 'right', 'up'];
const POSES = {
  idle0: { walk: 0, bob: 0, sway: 0 },
  idle1: { walk: 0, bob: 0.7, sway: 0.8 },
  walk0: { walk: 1, bob: 0, sway: 1 },
  walk1: { walk: 0, bob: 1, sway: 0 },
  walk2: { walk: -1, bob: 0, sway: -1 },
  walk3: { walk: 0, bob: 1, sway: 0 },
  dash: { walk: 0.8, bob: 0.5, sway: 3.5, dash: 1 },
};
export const SPRITE_OPTS = { cellW: 3.5, cellH: 5, font: 5.9, art: 2, bg: 0.46, boost: 1.45, lift: 36 };

export function buildPlayerFrames(equip, scale, opts = SPRITE_OPTS, poses = Object.keys(POSES)) {
  const frames = {};
  for (const d of DIRS) {
    frames[d] = {};
    for (const name of poses) {
      const c = asciiSprite(ART_W, 80, (ctx) => drawPlayerArt(ctx, d, POSES[name], equip), { ...opts, scale });
      frames[d][name] = { c, ax: (ART_W / 2) * scale, ay: FEET_Y * scale };
    }
  }
  return frames;
}

export class Player {
  constructor(world, start) {
    this.world = world;
    this.x = start.x; this.y = start.y;
    this.vx = 0; this.vy = 0;
    this.dir = start.dir && DIRS.includes(start.dir) ? start.dir : 'down';
    this.facing = { x: 0, y: 1 };
    this.anim = 0; this.idleT = 0;
    this.dash = { active: false, t: 0, cd: 0, dx: 0, dy: 1, trailT: 0 };
    this.trail = [];
    this.equip = {};
    this.frames = null; this.ghosts = null;
    this.moved = 0; this.footSide = 0;
    this.speed = 0;
    this.terrainHere = T.SAND;
    if (this.blockedAt(this.x, this.y)) { this.x = world.spawn.x; this.y = world.spawn.y; }
  }

  setEquip(eq) { this.equip = eq; }

  rebuild(scale) {
    this.scale = scale;
    this.frames = buildPlayerFrames(this.equip, scale);
    // afterimages only ever use the dash pose
    this.ghosts = buildPlayerFrames(this.equip, scale, { ...SPRITE_OPTS, bg: 0, tint: [150, 228, 255], boost: 1, lift: 0 }, ['dash']);
  }

  frameName() {
    if (this.dash.active) return 'dash';
    if (this.speed > 14) return 'walk' + (Math.floor(this.anim) % 4);
    return 'idle' + (Math.floor(this.idleT) % 2);
  }
  frame() { return this.frames[this.dir][this.frameName()]; }

  blockedAt(x, y) {
    const hw = PLAYER.halfW, fh = PLAYER.footH, w = this.world;
    const x0 = Math.floor((x - hw) / CELL_W), x1 = Math.floor((x + hw) / CELL_W);
    const y0 = Math.floor((y - fh) / CELL_H), y1 = Math.floor((y - 0.01) / CELL_H);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
        if (w.blocked[cy * COLS + cx]) return true;
      }
    }
    return false;
  }

  // Axis-separated movement in small steps, with a corner nudge so the player slides around edges.
  moveBy(dx, dy) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2.5));
    const sx = dx / steps, sy = dy / steps;
    let hitX = false, hitY = false;
    for (let k = 0; k < steps; k++) {
      if (sx) {
        if (!this.blockedAt(this.x + sx, this.y)) this.x += sx;
        else if (!sy && this.nudge(sx, 0)) { /* slid */ }
        else hitX = true;
      }
      if (sy) {
        if (!this.blockedAt(this.x, this.y + sy)) this.y += sy;
        else if (!sx && this.nudge(0, sy)) { /* slid */ }
        else hitY = true;
      }
    }
    if (hitX) this.vx *= 0.15;
    if (hitY) this.vy *= 0.15;
  }
  nudge(sx, sy) {
    for (const n of [2, -2, 4, -4, 6, -6]) {
      const ox = sy ? n : 0, oy = sx ? n : 0;
      if (!this.blockedAt(this.x + ox, this.y + oy) && !this.blockedAt(this.x + ox + sx, this.y + oy + sy)) {
        this.x += Math.sign(ox) * Math.min(Math.abs(ox), 1.2);
        this.y += Math.sign(oy) * Math.min(Math.abs(oy), 1.2);
        return true;
      }
    }
    return false;
  }

  update(dt, input, fx) {
    let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const len = Math.hypot(ix, iy);
    if (len > 0) { ix /= len; iy /= len; }

    const d = this.dash;
    d.cd = Math.max(0, d.cd - dt);
    if (!d.active && d.cd <= 0 && input.takeDash()) {
      d.active = true; d.t = 0; d.trailT = 0;
      d.dx = len > 0 ? ix : this.facing.x; d.dy = len > 0 ? iy : this.facing.y;
      d.cd = PLAYER.dashCooldown + PLAYER.dashTime;
      fx.dashBurst(this.x, this.y, d.dx, d.dy, this.terrainHere);
    }

    const ci = Math.floor((this.y - 2) / CELL_H) * COLS + Math.floor(this.x / CELL_W);
    this.terrainHere = this.world.terrain[ci] ?? T.SAND;
    const terr = TERRAIN[this.terrainHere];

    if (d.active) {
      d.t += dt;
      const k = Math.min(1, d.t / PLAYER.dashTime);
      const sp = PLAYER.dashSpeed * (1 - k * k * 0.65);
      this.vx = d.dx * sp; this.vy = d.dy * sp;
      d.trailT -= dt;
      if (d.trailT <= 0) {
        d.trailT = 0.024;
        this.trail.push({ x: this.x, y: this.y, dir: this.dir, name: 'dash', life: 0.28, max: 0.28 });
      }
      if (k >= 1) {
        d.active = false;
        this.vx = d.dx * PLAYER.walkSpeed * 0.85; this.vy = d.dy * PLAYER.walkSpeed * 0.85;
      }
    } else {
      const speedMul = terr.speed * (1 + (this.equip.speed || 0) / 100);
      const tvx = ix * PLAYER.walkSpeed * speedMul, tvy = iy * PLAYER.walkSpeed * speedMul;
      const rate = (len > 0 ? PLAYER.accel : PLAYER.friction) * dt;
      const ddx = tvx - this.vx, ddy = tvy - this.vy, dl = Math.hypot(ddx, ddy);
      if (dl <= rate) { this.vx = tvx; this.vy = tvy; }
      else { this.vx += (ddx / dl) * rate; this.vy += (ddy / dl) * rate; }
    }

    const ox = this.x, oy = this.y;
    this.moveBy(this.vx * dt, this.vy * dt);
    const moved = Math.hypot(this.x - ox, this.y - oy);
    this.speed = moved / Math.max(dt, 1e-4);

    if (len > 0 && !d.active) {
      this.facing.x = ix; this.facing.y = iy;
      const ax = Math.abs(ix), ay = Math.abs(iy);
      if (ax > ay + 0.01) this.dir = ix < 0 ? 'left' : 'right';
      else if (ay > ax + 0.01) this.dir = iy < 0 ? 'up' : 'down';
      else if (this.dir === 'up' || this.dir === 'down') this.dir = iy < 0 ? 'up' : 'down';
      else this.dir = ix < 0 ? 'left' : 'right';
    } else if (d.active) {
      const ax = Math.abs(d.dx), ay = Math.abs(d.dy);
      if (ax > ay + 0.01) this.dir = d.dx < 0 ? 'left' : 'right';
      else if (ay > ax + 0.01) this.dir = d.dy < 0 ? 'up' : 'down';
    }

    if (this.speed > 14) this.anim += dt * 8 * Math.min(1.4, this.speed / PLAYER.walkSpeed);
    else this.anim = 0;
    this.idleT += dt * 1.3;

    // footprints in sand, ripples in water
    this.moved += moved;
    if (this.moved > 15 && !d.active) {
      this.moved = 0; this.footSide ^= 1;
      const t = this.terrainHere;
      if (t === T.SAND || t === T.WETSAND || t === T.DUNE || t === T.MUD) fx.footprint(this.x + (this.footSide ? 3 : -3), this.y - 1, t);
      else if (t === T.SHALLOW || t === T.MARSH) fx.ripple(this.x, this.y - 1);
    }

    for (const g of this.trail) g.life -= dt;
    while (this.trail.length && this.trail[0].life <= 0) this.trail.shift();
  }

  idle(dt) {
    this.vx *= Math.max(0, 1 - dt * 12); this.vy *= Math.max(0, 1 - dt * 12);
    this.speed = 0; this.anim = 0;
    this.idleT += dt * 1.3;
    this.dash.cd = Math.max(0, this.dash.cd - dt);
    this.dash.active = false;
    for (const g of this.trail) g.life -= dt;
    while (this.trail.length && this.trail[0].life <= 0) this.trail.shift();
  }

  dashReady() { return 1 - this.dash.cd / (PLAYER.dashCooldown + PLAYER.dashTime); }
}
