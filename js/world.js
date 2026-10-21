// Procedural world for the outer turn of the Coil: the Shore of Lost Hours (south)
// and the Lantern Fens (north), walled by the Thornwild and surrounded by the Inverted Sea.
// Pure data, no DOM, so it can also run in Node for previews.

import { COLS, ROWS, CELL_W, CELL_H } from './config.js';
import { T, R, TERRAIN } from './terrain.js';
import { fbm, hash2, mulberry32 } from './rng.js';
import { PROPS, propLights } from './props.js';

export const DECAL_COLORS = ['#dcb65e', '#ece2c8', '#c9ced6', '#c06454', '#e8b0a6', '#dfe3d6', '#8fd3ee', '#b9a6e8'];

// Lost objects washed up on the beach, as short glyph strings: [glyphs, colour index].
const LOST_OBJECTS = [
  ['o-=', 0], ['o-m', 0], ['[=]', 1], ['[x]', 1], ['o-o', 2], ['&', 3], ['@', 4], ['6', 4],
  ['%', 3], ['()', 5], ['{}', 5], ['o', 2],
];

export function generateWorld(seed = 1931) {
  const N = COLS * ROWS;
  const I = (x, y) => y * COLS + x;
  const inB = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const land = new Uint8Array(N);
  const terrain = new Uint8Array(N);
  const region = new Uint8Array(N);
  const blocked = new Uint8Array(N);
  const decal = new Uint8Array(N);
  const decalCol = new Uint8Array(N);
  const rand = mulberry32(seed * 7 + 3);

  const LH = { x: 247, y: 366 }; // lighthouse promontory

  // ---------------------------------------------------------------- land mask
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const n = fbm(x * 0.028, y * 0.028, seed) * 2 - 1;
      const n2 = fbm(x * 0.09, y * 0.09, seed + 5) * 2 - 1;
      const west = 15 + n * 7 + n2 * 3 + Math.max(0, y - 250) * 0.42;
      const east = COLS - 17 + n * 6 + n2 * 3 - Math.max(0, y - 235) * 0.33;
      const cx = (x - 160) / 115;
      const south = 391 - 28 * cx * cx + n * 8 + n2 * 3;
      let L = x > west && x < east && y < south;
      const px = (x - LH.x) / 15, py = (y - LH.y) / 10;
      if (px * px + py * py < 1 + n2 * 0.12) L = true;
      land[I(x, y)] = L ? 1 : 0;
    }
  }

  function bfs(isSource, maxD = 80) {
    const d = new Int16Array(N).fill(32000);
    const q = new Int32Array(N);
    let h = 0, t = 0;
    for (let i = 0; i < N; i++) if (isSource(i)) { d[i] = 0; q[t++] = i; }
    while (h < t) {
      const i = q[h++];
      const nd = d[i] + 1;
      if (nd > maxD) continue;
      const x = i % COLS, y = (i / COLS) | 0;
      if (x > 0 && d[i - 1] > nd) { d[i - 1] = nd; q[t++] = i - 1; }
      if (x < COLS - 1 && d[i + 1] > nd) { d[i + 1] = nd; q[t++] = i + 1; }
      if (y > 0 && d[i - COLS] > nd) { d[i - COLS] = nd; q[t++] = i - COLS; }
      if (y < ROWS - 1 && d[i + COLS] > nd) { d[i + COLS] = nd; q[t++] = i + COLS; }
    }
    return d;
  }
  const distWater = bfs((i) => !land[i]);
  const distLand = bfs((i) => land[i]);

  const boundaryY = new Float32Array(COLS); // fens (north) / shore (south) border
  const forestY = new Float32Array(COLS);   // thornwild edge
  for (let x = 0; x < COLS; x++) {
    boundaryY[x] = 236 + (fbm(x * 0.045, 7.3, seed + 9) - 0.5) * 26;
    forestY[x] = 13 + (fbm(x * 0.07, 1.7, seed + 8) - 0.5) * 12;
  }

  // ---------------------------------------------------------------- base terrain
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = I(x, y);
      if (!land[i]) {
        terrain[i] = distLand[i] <= 2 ? T.SHALLOW : T.DEEP;
        region[i] = R.SEA;
        continue;
      }
      const dw = distWater[i];
      const by = boundaryY[x], fy = forestY[x];
      const g = fbm(x * 0.13, y * 0.13, seed + 12);
      if (y < fy || (y < fy + 5 && g > 0.62)) { terrain[i] = T.FOREST; region[i] = R.THORN; continue; }
      if (y < by) {
        region[i] = R.FENS;
        const f = fbm(x * 0.045, y * 0.05, seed + 11);
        let m = f + (g - 0.5) * 0.22;
        if (y < fy + 10) m -= 0.06;
        if (y > by - 14) m -= (y - (by - 14)) * 0.01;
        if (dw <= 1) terrain[i] = T.MUD;
        else if (m > 0.615) terrain[i] = T.MARSHDEEP;
        else if (m > 0.54) terrain[i] = T.MARSH;
        else if (m > 0.505) terrain[i] = T.REEDS;
        else terrain[i] = g > 0.69 ? T.REEDS : T.MUD;
      } else {
        region[i] = R.SHORE;
        const bw = 11 + fbm(x * 0.06, y * 0.06, seed + 13) * 8;
        const h = fbm(x * 0.11, y * 0.11, seed + 22);
        if (dw <= 1) terrain[i] = T.WETSAND;
        else if (dw <= bw) terrain[i] = T.SAND;
        else if (dw <= bw + 9) terrain[i] = T.DUNE;
        else terrain[i] = h > 0.63 ? T.DUNE : T.HEATH;
        const r = fbm(x * 0.085, y * 0.085, seed + 21);
        if (r > 0.735 && dw > 2) terrain[i] = T.ROCK;
        else if (r > 0.69 && dw > 1) terrain[i] = T.ROCKGROUND;
        if (y < by + 12) {
          const k = (by + 12 - y) / 12;
          if (hash2(x, y, seed + 30) < k * 0.55 + (g - 0.5)) terrain[i] = g > 0.55 ? T.REEDS : T.MUD;
        }
      }
      const px = (x - LH.x) / 15, py = (y - LH.y) / 10;
      if (px * px + py * py < 1.1) {
        terrain[i] = (dw <= 1 && hash2(x, y, seed + 31) < 0.5) ? T.ROCK : T.ROCKGROUND;
      }
    }
  }

  // ---------------------------------------------------------------- helpers
  const setT = (x, y, t) => { if (inB(x, y)) terrain[I(x, y)] = t; };
  const getT = (x, y) => (inB(x, y) ? terrain[I(x, y)] : T.DEEP);
  function disc(cx, cy, r, fn) {
    const rr = Math.ceil(r);
    for (let y = cy - rr; y <= cy + rr; y++) for (let x = cx - rr; x <= cx + rr; x++) {
      if (!inB(x, y)) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) fn(x, y, d);
    }
  }
  // Stamp a brush along a polyline, with a little noise wobble. Returns sampled centre points.
  function stroke(pts, r, fn, wob = 0, ws = 0) {
    const out = [];
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, ay] = pts[s], [bx, by] = pts[s + 1];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const steps = Math.ceil(len * 2);
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        let px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
        if (wob) {
          const fade = Math.min(1, Math.min(t, 1 - t) * 6 + (s > 0 && s < pts.length - 2 ? 1 : 0));
          const nx = -(by - ay) / len, ny = (bx - ax) / len;
          const o = (fbm(px * 0.08, py * 0.08, ws) - 0.5) * wob * 2 * fade;
          px += nx * o; py += ny * o;
        }
        const cx = Math.round(px), cy = Math.round(py);
        disc(cx, cy, r, fn);
        if (!out.length || out[out.length - 1][0] !== cx || out[out.length - 1][1] !== cy) out.push([cx, cy]);
      }
    }
    return out;
  }
  const coastY = (x) => { for (let y = 300; y < ROWS; y++) if (!land[I(x, y)]) return y; return ROWS - 1; };

  // ---------------------------------------------------------------- Velmoor (harbour)
  const VX = 150, VY = coastY(VX);
  disc(VX, VY - 16, 32, (x, y) => { const t = getT(x, y); if (t === T.ROCK || t === T.ROCKGROUND) setT(x, y, T.SAND); });
  for (let y = VY - 21; y <= VY - 16; y++) for (let x = 128; x <= 172; x++) setT(x, y, T.PLANK);
  const piers = [133, 149, 165];
  for (const px of piers) {
    for (let y = VY - 16; y <= VY + 10; y++) for (let x = px; x <= px + 2; x++) { setT(x, y, T.PLANK); region[I(x, y)] = R.SHORE; }
    for (let y = VY + 8; y <= VY + 10; y++) for (let x = px - 1; x <= px + 3; x++) { setT(x, y, T.PLANK); region[I(x, y)] = R.SHORE; }
  }

  // ---------------------------------------------------------------- Tidegate Ruins
  const RX = 60, RY = 300;
  disc(RX, RY, 15, (x, y) => { if (getT(x, y) === T.ROCK) setT(x, y, T.ROCKGROUND); });
  for (let y = RY - 6; y <= RY + 6; y++) for (let x = RX - 8; x <= RX + 8; x++) {
    if (!inB(x, y) || !land[I(x, y)]) continue;
    const edge = y === RY - 6 || y === RY + 6 || x === RX - 8 || x === RX + 8;
    if (edge) {
      const door = (x === RX + 8 && Math.abs(y - RY) <= 1) || (y === RY + 6 && Math.abs(x - RX) <= 1) || (y === RY - 6 && Math.abs(x - RX + 3) <= 1);
      setT(x, y, !door && hash2(x, y, seed + 40) < 0.8 ? T.WALL : T.STONE);
    } else setT(x, y, hash2(x, y, seed + 41) < 0.85 ? T.STONE : T.HEATH);
  }

  // ---------------------------------------------------------------- Bell Graves
  const BX = 88, BY = coastY(BX) - 22;
  disc(BX, BY, 10, (x, y) => { const t = getT(x, y); if (t === T.ROCK || t === T.ROCKGROUND || t === T.HEATH) setT(x, y, T.DUNE); });

  // ---------------------------------------------------------------- shore paths
  const pathFn = (x, y) => {
    const t = getT(x, y);
    if (land[I(x, y)] && t !== T.PLANK && t !== T.WALL && t !== T.STONE) setT(x, y, T.PATH);
  };
  const bMid = Math.round(boundaryY[VX]);
  stroke([[150, VY - 21], [147, VY - 42], [157, VY - 70], [142, VY - 100], [151, VY - 128], [150, bMid - 2]], 1.2, pathFn, 2.5, seed + 50);
  stroke([[172, VY - 19], [196, VY - 24], [222, VY - 27], [LH.x - 4, LH.y]], 1.0, pathFn, 2, seed + 51);
  stroke([[128, VY - 19], [110, VY - 21], [BX + 9, BY + 3]], 1.0, pathFn, 2, seed + 52);
  stroke([[142, VY - 100], [112, RY - 3], [84, RY + 1], [RX + 9, RY]], 1.0, pathFn, 2, seed + 53);

  // rubble around the ruins (kept off the paths)
  for (let k = 0; k < 16; k++) {
    const x = RX + Math.round((rand() - 0.5) * 34), y = RY + Math.round((rand() - 0.5) * 26);
    const t = getT(x, y);
    if (inB(x, y) && land[I(x, y)] && t !== T.STONE && t !== T.PATH && t !== T.WALL) setT(x, y, rand() < 0.5 ? T.WALL : T.STONE);
  }

  // ---------------------------------------------------------------- Lantern Fens features
  const WX = 150, WY = 150;  // the Name-Well
  const SX = 74, SY = 106;   // Stiltmarch
  const CX = 233, CY = 76;   // the Drowned Choir
  disc(SX, SY, 27, (x, y, d) => {
    const t = getT(x, y); if (t === T.FOREST) return;
    if (d < 20) setT(x, y, T.MARSHDEEP); else if (d < 24) setT(x, y, T.MARSH); else if (t === T.MUD) setT(x, y, T.REEDS);
  });
  disc(WX, WY, 23, (x, y, d) => {
    if (d <= 6) setT(x, y, T.STONE); else if (d <= 8.5) setT(x, y, T.MUD); else if (d <= 19) setT(x, y, T.MARSHDEEP); else setT(x, y, T.MARSH);
  });
  disc(CX, CY, 25, (x, y, d) => {
    const t = getT(x, y); if (t === T.FOREST) return;
    if (d <= 19) setT(x, y, T.MARSHDEEP); else if (d <= 23) setT(x, y, T.MARSH); else if (t === T.MUD) setT(x, y, T.REEDS);
  });

  const plankFn = (x, y) => { const t = getT(x, y); if (t !== T.FOREST && t !== T.STONE) setT(x, y, T.PLANK); };
  const boardwalks = [
    [[150, bMid - 3], [148, 210], [153, 184], [150, WY + 6]],
    [[WX - 6, WY - 1], [124, 140], [102, 124], [SX + 3, SY + 3], [SX, SY]],
    [[WX + 6, WY - 2], [178, 134], [198, 110], [211, 95]],
  ];
  const walkPts = boardwalks.map((b, k) => stroke(b, 1.0, plankFn, 1.5, seed + 60 + k));
  for (let y = SY - 3; y <= SY + 3; y++) for (let x = SX - 4; x <= SX + 4; x++) setT(x, y, T.PLANK);
  for (let y = 93; y <= 97; y++) for (let x = 208; x <= 214; x++) setT(x, y, T.PLANK);

  // Stiltmarch huts around the hub, with spokes
  const hutAngles = [100, 160, 220, 280, 340];
  const huts = hutAngles.map((a) => {
    const r = (a * Math.PI) / 180;
    return [Math.round(SX + Math.cos(r) * 15), Math.round(SY + Math.sin(r) * 12)];
  });
  for (const [hx, hy] of huts) stroke([[SX, SY], [hx, hy]], 0.75, plankFn);

  // ---------------------------------------------------------------- props
  const props = [];
  const lights = [];
  const occ = new Uint8Array(N);
  const footCells = (type, bx, by) => {
    const cells = [];
    for (const f of PROPS[type].foot) {
      for (let y = by + f.dy; y < by + f.dy + f.h; y++) for (let x = bx + f.dx; x < bx + f.dx + f.w; x++) cells.push([x, y]);
    }
    return cells;
  };
  function place(type, bx, by, variant = 0, flip = false, test = null) {
    const def = PROPS[type];
    const cells = footCells(type, bx, by);
    for (const [x, y] of cells) {
      if (!inB(x, y) || occ[I(x, y)]) return false;
      if (test && !test(getT(x, y), x, y)) return false;
    }
    if (test && !cells.length && (!inB(bx, by) || !test(getT(bx, by), bx, by))) return false;
    for (const [x, y] of cells) occ[I(x, y)] = 1;
    const p = { type, bx, by, x: (bx + 0.5) * CELL_W, y: (by + 1) * CELL_H - 1, variant, flip, fade: 1 };
    props.push(p);
    for (const l of propLights(type, variant)) {
      lights.push({ ...l, x: p.x + (flip ? -l.dx : l.dx), y: p.y + l.dy, ph: rand() * 100 });
    }
    return true;
  }
  const nearWay = (bx, by, r) => {
    for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) {
      const t = getT(x, y);
      if (t === T.PATH || t === T.PLANK) return true;
    }
    return false;
  };
  function scatter(type, count, tries, test, spacing, opts = {}) {
    const def = PROPS[type];
    const pts = [];
    for (let k = 0; k < tries && pts.length < count; k++) {
      const bx = (rand() * COLS) | 0, by = (rand() * ROWS) | 0;
      if (!test(getT(bx, by), bx, by)) continue;
      if (pts.some((p) => Math.abs(p[0] - bx) < spacing && Math.abs(p[1] - by) < spacing * 0.7)) continue;
      if (!opts.allowNearWay && nearWay(bx, by, opts.wayGap ?? 3)) continue;
      const v = (rand() * (def.variants || 1)) | 0;
      if (place(type, bx, by, v, opts.noFlip ? false : rand() < 0.5, test)) pts.push([bx, by]);
    }
  }

  // landmark props
  place('lighthouse', LH.x + 2, LH.y + 2);
  place('shipHouse', 136, VY - 24, 0, false);
  place('shipHouse', 163, VY - 25, 1, true);
  place('shipHouse', 112, VY - 6, 2, false);
  place('shipHouse', 188, VY - 7, 0, true);
  for (const [x, y] of [[126, VY - 22], [174, VY - 22], [126, VY - 15], [174, VY - 15]]) place('lampPost', x, y);
  for (const px of piers) place('lampPost', px + 4, VY + 10);
  place('crates', 128, VY - 12); place('crates', 171, VY - 11, 0, true);
  place('rowboat', 141, VY + 3); place('rowboat', 157, VY + 6, 0, true); place('rowboat', 176, VY + 4);

  place('bigBell', BX, BY);
  place('smallBell', BX - 10, BY + 4);
  place('smallBell', BX + 10, BY - 3, 1, true);

  place('ruinArch', RX - 2, RY - 10);
  place('ruinArch', RX + 14, RY + 9, 1, true);

  place('well', WX, WY + 1);
  place('churchSpire', CX, CY + 6);
  huts.forEach(([hx, hy], k) => place('stiltHut', hx, hy, k, k % 2 === 1));

  // fens lantern posts along the boardwalks
  walkPts.forEach((pts, k) => {
    for (let n = 8; n < pts.length - 4; n += 14) {
      const [x0, y0] = pts[n - 1], [x1, y1] = pts[n + 1];
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      const side = (n / 14) % 2 < 1 ? 1 : -1;
      const lx = Math.round(pts[n][0] - (dy / len) * 2.5 * side), ly = Math.round(pts[n][1] + (dx / len) * 2.5 * side);
      if (getT(lx, ly) !== T.PLANK) place('lanternPost', lx, ly, (k + n) % 3 === 0 ? 1 : 0);
    }
  });

  const isLand = (t) => t === T.SAND || t === T.DUNE || t === T.HEATH || t === T.ROCKGROUND;
  scatter('seaStack', 12, 4000, (t, x, y) => t === T.DEEP && y > 250 && !(Math.abs(x - VX) < 34 && y > VY - 4) && distLand[I(x, y)] >= 3 && distLand[I(x, y)] <= 9, 14, { allowNearWay: true });
  scatter('boulder', 34, 6000, (t, x, y) => isLand(t) && y > 240, 7);
  scatter('shrub', 80, 6000, (t, x, y) => (t === T.HEATH || t === T.DUNE) && y > 240, 4);
  scatter('deadTree', 48, 8000, (t, x, y) => (t === T.MUD || t === T.REEDS) && y > 24 && region[I(x, y)] === R.FENS, 9);
  scatter('boulder', 10, 3000, (t, x, y) => t === T.MUD && region[I(x, y)] === R.FENS, 9);

  // ---------------------------------------------------------------- decals
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const i = I(x, y), t = terrain[i];
    if (decal[i]) continue;
    const h = hash2(x, y, seed + 70);
    if ((t === T.SAND || t === T.WETSAND) && h < 0.0035) {
      const [s, c] = LOST_OBJECTS[(hash2(x, y, seed + 71) * LOST_OBJECTS.length) | 0];
      let ok = true;
      for (let k = 0; k < s.length; k++) { const tt = getT(x + k, y); if (tt !== T.SAND && tt !== T.WETSAND) ok = false; }
      if (ok) for (let k = 0; k < s.length; k++) { decal[I(x + k, y)] = s.charCodeAt(k); decalCol[I(x + k, y)] = c; }
    } else if (t === T.HEATH && h < 0.012) { decal[i] = 42; decalCol[i] = 5; }       // '*'
    else if (t === T.DUNE && h < 0.003) { decal[i] = 42; decalCol[i] = 7; }
    else if (t === T.MUD && h < 0.004) { decal[i] = 111; decalCol[i] = 6; }          // 'o'
  }
  // extra lost things around the Bell Graves
  for (let k = 0; k < 26; k++) {
    const x = BX + Math.round((rand() - 0.5) * 30), y = BY + Math.round((rand() - 0.5) * 18);
    const tt = getT(x, y);
    if (tt === T.DUNE || tt === T.SAND) {
      const [s, c] = LOST_OBJECTS[(rand() * LOST_OBJECTS.length) | 0];
      for (let n = 0; n < s.length; n++) if (inB(x + n, y)) { decal[I(x + n, y)] = s.charCodeAt(n); decalCol[I(x + n, y)] = c; }
    }
  }

  // ---------------------------------------------------------------- collision
  for (let i = 0; i < N; i++) blocked[i] = TERRAIN[terrain[i]].blocked ? 1 : 0;
  for (const p of props) {
    if (PROPS[p.type].solid === false) continue;
    for (const [x, y] of footCells(p.type, p.bx, p.by)) if (inB(x, y)) blocked[I(x, y)] = 1;
  }
  // nothing decorative may sit on blocked cells or ways
  for (let i = 0; i < N; i++) if (blocked[i] || terrain[i] === T.PATH || terrain[i] === T.PLANK) decal[i] = 0;

  // ---------------------------------------------------------------- wisps
  const wispSpots = [];
  for (let tries = 0; wispSpots.length < 24 && tries < 6000; tries++) {
    const x = (20 + rand() * (COLS - 40)) | 0, y = (24 + rand() * 200) | 0;
    const t = getT(x, y);
    if (region[I(x, y)] !== R.FENS) continue;
    if (t !== T.MARSH && t !== T.MARSHDEEP && t !== T.REEDS) continue;
    const px = (x + 0.5) * CELL_W, py = (y + 0.5) * CELL_H;
    if (wispSpots.some((p) => Math.hypot(p.x - px, p.y - py) < 150)) continue;
    wispSpots.push({ x: px, y: py, blue: rand() < 0.45 });
  }

  // ---------------------------------------------------------------- landmarks
  const C = (x) => (x + 0.5) * CELL_W, Ry = (y) => (y + 0.5) * CELL_H;
  const landmarks = [
    { id: 'velmoor', name: 'Velmoor', desc: 'A harbour of beached dream-ships. Nobody remembers sailing them in.', x: C(VX), y: Ry(VY - 18), r: 170, labelDy: 120 },
    { id: 'lighthouse', name: 'Lighthouse of Unfinished Sentences', desc: 'Its beam speaks half a phrase, then forgets the rest.', x: C(LH.x + 2), y: Ry(LH.y + 2), r: 170, labelDy: 255 },
    { id: 'bells', name: 'The Bell Graves', desc: 'They ring when someone in the waking world dies.', x: C(BX), y: Ry(BY), r: 130, labelDy: 95 },
    { id: 'ruins', name: 'Tidegate Ruins', desc: 'Doorways onto nothing. The tide still remembers where they led.', x: C(RX), y: Ry(RY), r: 130, labelDy: 125 },
    { id: 'stiltmarch', name: 'Stiltmarch', desc: 'A village on stilts. It walks one step a year.', x: C(SX), y: Ry(SY), r: 180, labelDy: 150 },
    { id: 'well', name: 'The Name-Well', desc: 'The first way down. Something below already knows your name.', x: C(WX), y: Ry(WY), r: 115, labelDy: 75 },
    { id: 'choir', name: 'The Drowned Choir', desc: 'The abbey sank. The bells kept ringing.', x: C(CX), y: Ry(CY + 6), r: 270, labelDy: 250 },
    { id: 'thornwild', name: 'The Thornwild', desc: 'The trees are dreaming. They are not ready for you yet.', x: C(150), y: Ry(Math.round(forestY[150]) + 2), r: 0, edge: true, labelDy: 30 },
  ];

  // ---------------------------------------------------------------- spawn
  let spawn = { x: C(143), y: (VY - 8 + 1) * CELL_H - 2 };
  const free = (cx, cy) => inB(cx, cy) && !blocked[I(cx, cy)] && !blocked[I(cx - 1, cy)] && !blocked[I(cx + 1, cy)];
  outer: for (let r = 0; r < 20; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const cx = 143 + dx, cy = VY - 8 + dy;
      if (free(cx, cy)) { spawn = { x: C(cx), y: (cy + 1) * CELL_H - 2 }; break outer; }
    }
  }

  return {
    seed, terrain, region, blocked, decal, decalCol, distLand, distWater, forestY, boundaryY,
    props, lights, landmarks, wispSpots, spawn,
  };
}

export function cellAt(world, px, py) {
  const cx = Math.floor(px / CELL_W), cy = Math.floor(py / CELL_H);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return -1;
  return cy * COLS + cx;
}
