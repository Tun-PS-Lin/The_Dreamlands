// Prop definitions. Each prop is painted as vector art and later converted to glyphs.
//   w, h    size of the art in world px; the base point is (w / 2, h - 2)
//   foot    blocked cells relative to the base cell: [{ dx, dy, w, h }]
//   lights  light sources relative to the base point (dx is mirrored when the prop is flipped)
//   solid   false for decoration the player can walk through

import { lin, rad, poly, ell, glow, blob } from './draw.js';

function drawBell(ctx, rnd, cx, cy, s, rot) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-16, -30);
  ctx.quadraticCurveTo(0, -44, 16, -30);
  ctx.bezierCurveTo(21, -18, 19, 2, 31, 18);
  ctx.quadraticCurveTo(0, 27, -31, 18);
  ctx.bezierCurveTo(-19, 2, -21, -18, -16, -30);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -30, 0, 30, 0, ['#e6b871', '#b07e43', '#6b4622', '#3d2711']);
  ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(60,35,15,0.8)'; ctx.lineWidth = 1.6;
  for (const y of [-22, 6, 13]) { ctx.beginPath(); ctx.moveTo(-34, y); ctx.lineTo(34, y + 2); ctx.stroke(); }
  for (let k = 0; k < 7; k++) {
    ctx.fillStyle = 'rgba(80,150,125,0.75)';
    ell(ctx, (rnd() - 0.5) * 40, -20 + rnd() * 34, 3 + rnd() * 5, 2 + rnd() * 3); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#1a120a'; ell(ctx, 0, 19, 28, 5); ctx.fill();
  ctx.strokeStyle = '#8a6234'; ctx.lineWidth = 4; ell(ctx, 0, -42, 6, 5); ctx.stroke();
  ctx.restore();
}

function stoneBlock(ctx, x, y, w, h) {
  ctx.fillStyle = lin(ctx, x, 0, x + w, 0, ['#a6a8ae', '#7a7d83', '#45474c']);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(30,32,36,0.7)'; ctx.lineWidth = 1;
  for (let yy = y + 8; yy < y + h; yy += 9) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
}

export const PROPS = {
  lighthouse: {
    w: 64, h: 236,
    foot: [{ dx: -2, dy: -1, w: 5, h: 2 }],
    lights: [{ dx: 0, dy: -193, r: 250, color: '255,214,140', int: 1, glow: 0.55, flick: 0.03, beam: true }],
    draw(ctx, rnd) {
      const cx = 32, top = 58, bot = 222, wb = 17, wt = 11;
      for (let k = 0; k < 7; k++) {
        const x = 8 + k * 8 + (rnd() - 0.5) * 4;
        ctx.fillStyle = lin(ctx, x - 8, 214, x + 8, 236, ['#8a8f96', '#4a4e55']);
        blob(ctx, x, 226 + (rnd() - 0.5) * 4, 9, 7, rnd); ctx.fill();
      }
      ctx.fillStyle = lin(ctx, cx - wb, 0, cx + wb, 0, ['#d6cfbf', '#a39d91', '#5c5852']);
      poly(ctx, [cx - wb, bot, cx + wb, bot, cx + wt, top, cx - wt, top]); ctx.fill();
      const band = (f0, f1) => {
        const y0 = top + (bot - top) * f0, y1 = top + (bot - top) * f1;
        const w0 = wt + (wb - wt) * f0, w1 = wt + (wb - wt) * f1;
        ctx.fillStyle = lin(ctx, cx - wb, 0, cx + wb, 0, ['#8a3f35', '#6a2f28', '#3a1b17']);
        poly(ctx, [cx - w0, y0, cx + w0, y0, cx + w1, y1, cx - w1, y1]); ctx.fill();
      };
      band(0.18, 0.3); band(0.52, 0.64);
      ctx.fillStyle = '#16181c'; ctx.fillRect(cx - 2, 112, 4, 8); ctx.fillRect(cx - 2, 168, 4, 8);
      ctx.fillStyle = '#121316';
      ctx.beginPath(); ctx.moveTo(cx - 5, bot); ctx.lineTo(cx - 5, bot - 12); ctx.arc(cx, bot - 12, 5, Math.PI, 0); ctx.lineTo(cx + 5, bot); ctx.fill();
      ctx.fillStyle = '#2c3035'; ctx.fillRect(cx - 16, top - 5, 32, 6);
      ctx.strokeStyle = '#555b62'; ctx.lineWidth = 1;
      for (let x = cx - 15; x <= cx + 15; x += 3) { ctx.beginPath(); ctx.moveTo(x, top - 5); ctx.lineTo(x, top - 11); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(cx - 16, top - 11); ctx.lineTo(cx + 16, top - 11); ctx.stroke();
      ctx.fillStyle = '#25282c'; ctx.fillRect(cx - 10, top - 30, 20, 25);
      ctx.fillStyle = rad(ctx, cx, top - 17, 12, ['#fffbe6', '#ffd986', '#e8a74a']); ctx.fillRect(cx - 8, top - 28, 16, 21);
      ctx.fillStyle = '#25282c'; ctx.fillRect(cx - 1, top - 28, 2, 21);
      glow(ctx, cx, top - 17, 30, '255,215,140', 0.55);
      ctx.fillStyle = lin(ctx, cx - 12, 0, cx + 12, 0, ['#4d535b', '#2b2f35']);
      poly(ctx, [cx - 13, top - 29, cx + 13, top - 29, cx, top - 46]); ctx.fill();
      ctx.fillStyle = '#6a7078'; ctx.fillRect(cx - 1, top - 52, 2, 7);
    },
  },

  shipHouse: {
    w: 164, h: 112,
    foot: [{ dx: -10, dy: -3, w: 21, h: 4 }],
    lights: [
      { dx: -21.5, dy: -65, r: 95, color: '255,196,110', int: 0.75, glow: 0.4, flick: 0.08 },
      { dx: 14.5, dy: -65, r: 95, color: '255,196,110', int: 0.75, glow: 0.4, flick: 0.08 },
    ],
    draw(ctx, rnd) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(10, 64); ctx.lineTo(146, 62); ctx.lineTo(160, 44); ctx.lineTo(156, 70);
      ctx.quadraticCurveTo(84, 120, 14, 84); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, 60, 0, 110, ['#7c5838', '#4b3321', '#291b11']); ctx.fill();
      ctx.clip();
      ctx.strokeStyle = 'rgba(28,18,10,0.85)'; ctx.lineWidth = 1.2;
      for (let y = 68; y < 112; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(84, y + 10, 164, y - 6); ctx.stroke(); }
      for (let k = 0; k < 40; k++) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(210,200,180,0.5)' : 'rgba(90,120,100,0.45)';
        ctx.fillRect(20 + rnd() * 130, 84 + rnd() * 20, 1.6, 1.6);
      }
      ctx.restore();
      ctx.fillStyle = '#8c6a46'; ctx.fillRect(12, 60, 136, 4);
      ctx.fillStyle = lin(ctx, 40, 0, 118, 0, ['#6a5440', '#4a3a2c', '#33281e']); ctx.fillRect(40, 30, 78, 32);
      ctx.strokeStyle = 'rgba(25,18,12,0.7)'; ctx.lineWidth = 1;
      for (let x = 44; x < 118; x += 6) { ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, 62); ctx.stroke(); }
      ctx.fillStyle = lin(ctx, 0, 10, 0, 36, ['#55545c', '#34333a']);
      poly(ctx, [30, 35, 128, 35, 112, 12, 46, 12]); ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,24,0.6)';
      for (let y = 16; y < 35; y += 5) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(120, y); ctx.stroke(); }
      for (const wx of [55, 91]) {
        ctx.fillStyle = '#ffd27e'; ctx.fillRect(wx, 40, 11, 10);
        ctx.fillStyle = '#5a3f25'; ctx.fillRect(wx + 5, 40, 1.2, 10);
        glow(ctx, wx + 5.5, 45, 16, '255,200,110', 0.45);
      }
      ctx.fillStyle = '#170f09'; ctx.fillRect(73, 44, 12, 18);
      ctx.fillStyle = '#4a3826'; ctx.fillRect(134, 2, 5, 60);
      ctx.fillStyle = 'rgba(170,164,150,0.85)';
      poly(ctx, [139, 8, 158, 16, 152, 42, 145, 33, 139, 38]); ctx.fill();
    },
  },

  bigBell: {
    w: 92, h: 84,
    foot: [{ dx: -5, dy: -2, w: 11, h: 3 }],
    draw(ctx, rnd) {
      drawBell(ctx, rnd, 46, 46, 1, -0.24);
      ctx.fillStyle = lin(ctx, 0, 62, 0, 84, ['#b09a78', '#76644d']); ell(ctx, 46, 74, 45, 11); ctx.fill();
      for (let k = 0; k < 30; k++) { ctx.fillStyle = 'rgba(205,185,155,0.6)'; ctx.fillRect(10 + rnd() * 72, 66 + rnd() * 14, 1.5, 1.5); }
    },
  },

  smallBell: {
    w: 54, h: 50,
    foot: [{ dx: -2, dy: -1, w: 5, h: 2 }],
    draw(ctx, rnd) {
      drawBell(ctx, rnd, 27, 27, 0.55, 0.35);
      ctx.fillStyle = lin(ctx, 0, 36, 0, 50, ['#b09a78', '#76644d']); ell(ctx, 27, 43, 25, 7); ctx.fill();
    },
  },

  seaStack: {
    w: 72, h: 140, variants: 3,
    foot: [{ dx: -3, dy: -1, w: 7, h: 2 }],
    draw(ctx, rnd) {
      const pts = [8, 134];
      const twin = rnd() < 0.5;
      for (let k = 1; k <= 6; k++) pts.push(10 + k * 2 + (rnd() - 0.5) * 6, 134 - k * 18 - rnd() * 4);
      pts.push(30 + (rnd() - 0.5) * 8, 8 + rnd() * 12);
      if (twin) { pts.push(40, 34 + rnd() * 10); pts.push(48 + (rnd() - 0.5) * 6, 18 + rnd() * 12); }
      for (let k = 6; k >= 1; k--) pts.push(62 - k * 1.5 + (rnd() - 0.5) * 6, 134 - k * 17 - rnd() * 4);
      pts.push(64, 134);
      ctx.fillStyle = lin(ctx, 8, 0, 64, 0, ['#a4aab2', '#737880', '#3b3f45', '#25282c']);
      poly(ctx, pts); ctx.fill();
      ctx.save(); poly(ctx, pts); ctx.clip();
      ctx.strokeStyle = 'rgba(25,27,31,0.7)'; ctx.lineWidth = 1.2;
      for (let y = 20; y < 134; y += 9 + rnd() * 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(72, y + (rnd() - 0.5) * 8); ctx.stroke(); }
      for (let k = 0; k < 30; k++) { ctx.fillStyle = 'rgba(235,235,225,0.7)'; ctx.fillRect(14 + rnd() * 44, 6 + rnd() * 40, 1.4, 1.4); }
      ctx.restore();
      ctx.fillStyle = 'rgba(205,228,240,0.5)'; ell(ctx, 36, 136, 34, 4.5); ctx.fill();
    },
  },

  boulder: {
    w: 34, h: 26, variants: 4,
    foot: [{ dx: -1, dy: 0, w: 3, h: 1 }],
    draw(ctx, rnd) {
      ctx.fillStyle = lin(ctx, 4, 4, 30, 24, ['#a39d93', '#6e6962', '#36332f']);
      blob(ctx, 17, 15, 14, 9.5, rnd, 11, 0.22); ctx.fill();
      if (rnd() < 0.6) { ctx.fillStyle = 'rgba(90,120,70,0.7)'; blob(ctx, 14, 9, 8, 3.5, rnd, 8, 0.3); ctx.fill(); }
    },
  },

  rowboat: {
    w: 60, h: 26,
    foot: [{ dx: -3, dy: 0, w: 7, h: 1 }],
    draw(ctx) {
      ctx.fillStyle = lin(ctx, 0, 6, 0, 24, ['#8a6440', '#4a321e']);
      ctx.beginPath(); ctx.moveTo(4, 12); ctx.quadraticCurveTo(30, 2, 56, 12); ctx.quadraticCurveTo(30, 28, 4, 12); ctx.fill();
      ctx.fillStyle = '#2a1c10';
      ctx.beginPath(); ctx.moveTo(9, 12); ctx.quadraticCurveTo(30, 6, 51, 12); ctx.quadraticCurveTo(30, 21, 9, 12); ctx.fill();
      ctx.fillStyle = '#7a5a3a'; ctx.fillRect(22, 9, 3, 7); ctx.fillRect(36, 9, 3, 7);
      ctx.strokeStyle = '#9a7a52'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(24, 12); ctx.lineTo(10, 23); ctx.moveTo(38, 12); ctx.lineTo(52, 22); ctx.stroke();
    },
  },

  lampPost: {
    w: 18, h: 72,
    foot: [{ dx: 0, dy: 0, w: 1, h: 1 }],
    lights: [{ dx: 0, dy: -56, r: 115, color: '255,200,120', int: 0.85, glow: 0.5, flick: 0.12 }],
    draw(ctx) {
      ctx.fillStyle = '#2f261c'; ctx.fillRect(7.5, 18, 3, 52); ctx.fillRect(4, 66, 10, 4);
      ctx.fillStyle = '#3c3026'; ctx.fillRect(3, 6, 12, 2);
      ctx.fillStyle = '#26201a'; ctx.fillRect(4, 8, 10, 12);
      ctx.fillStyle = rad(ctx, 9, 14, 6, ['#fff3cf', '#ffcf73', '#d58a33']); ctx.fillRect(5.5, 9.5, 7, 9);
      glow(ctx, 9, 14, 12, '255,205,120', 0.5);
    },
  },

  crates: {
    w: 40, h: 34,
    foot: [{ dx: -2, dy: 0, w: 5, h: 1 }],
    draw(ctx) {
      const box = (x, y, w, h) => {
        ctx.fillStyle = lin(ctx, x, y, x + w, y + h, ['#8a6a44', '#5a4128']); ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(30,20,10,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke();
      };
      box(2, 14, 18, 18); box(16, 4, 14, 13);
      ctx.fillStyle = lin(ctx, 24, 0, 38, 0, ['#6e5236', '#3f2d1c']); ctx.fillRect(24, 16, 13, 17);
      ctx.strokeStyle = '#8f9399'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(24, 20); ctx.lineTo(37, 20); ctx.moveTo(24, 29); ctx.lineTo(37, 29); ctx.stroke();
    },
  },

  ruinArch: {
    w: 92, h: 110,
    foot: [{ dx: -5, dy: 0, w: 3, h: 1 }, { dx: 3, dy: 0, w: 3, h: 1 }],
    draw(ctx, rnd) {
      stoneBlock(ctx, 8, 34, 18, 74);
      stoneBlock(ctx, 66, 52, 18, 56);
      ctx.strokeStyle = '#8b8e94'; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.arc(46, 40, 30, Math.PI, Math.PI * 1.62); ctx.stroke();
      ctx.fillStyle = '#8b8e94'; poly(ctx, [66, 52, 70, 45, 75, 50, 80, 43, 84, 52]); ctx.fill();
      ctx.strokeStyle = 'rgba(80,120,70,0.85)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 6; k++) {
        const x = k < 3 ? 10 + rnd() * 14 : 68 + rnd() * 14;
        let y = k < 3 ? 36 : 54;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let s = 0; s < 6; s++) { y += 6 + rnd() * 5; ctx.lineTo(x + (rnd() - 0.5) * 5, y); }
        ctx.stroke();
      }
      for (let k = 0; k < 5; k++) { ctx.fillStyle = '#6a6d73'; blob(ctx, 30 + rnd() * 34, 102 + rnd() * 5, 4, 3, rnd, 7, 0.3); ctx.fill(); }
    },
  },

  deadTree: {
    w: 92, h: 128, variants: 4,
    foot: [{ dx: -1, dy: 0, w: 2, h: 1 }],
    draw(ctx, rnd) {
      ctx.lineCap = 'round';
      const branch = (x, y, ang, len, w, depth) => {
        const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
        ctx.strokeStyle = depth > 2 ? '#766d60' : '#5e574d'; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo((x + x2) / 2 + (rnd() - 0.5) * 8, (y + y2) / 2, x2, y2); ctx.stroke();
        if (depth > 0) {
          const n = 2 + (rnd() < 0.3 ? 1 : 0);
          for (let k = 0; k < n; k++) branch(x2, y2, ang + (rnd() - 0.5) * 1.3, len * (0.6 + rnd() * 0.2), w * 0.62, depth - 1);
        } else if (rnd() < 0.55) {
          ctx.strokeStyle = 'rgba(115,130,98,0.8)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 + (rnd() - 0.5) * 3, y2 + 8 + rnd() * 14); ctx.stroke();
        }
      };
      ctx.strokeStyle = '#5e574d'; ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(46, 124); ctx.lineTo(46 + (rnd() - 0.5) * 30, 126); ctx.stroke(); }
      branch(46, 126, -Math.PI / 2 + (rnd() - 0.5) * 0.3, 38, 8, 4);
    },
  },

  stiltHut: {
    w: 104, h: 132,
    foot: [{ dx: -6, dy: -3, w: 13, h: 4 }],
    lights: [
      { dx: -17.5, dy: -66, r: 100, color: '255,190,100', int: 0.8, glow: 0.45, flick: 0.1 },
      { dx: 40, dy: -66, r: 80, color: '255,190,100', int: 0.7, glow: 0.5, flick: 0.18 },
    ],
    draw(ctx, rnd) {
      ctx.fillStyle = '#2b2219';
      for (const x of [20, 38, 62, 80]) ctx.fillRect(x, 88, 4, 42);
      ctx.strokeStyle = 'rgba(120,180,170,0.45)'; ctx.lineWidth = 1;
      for (const x of [20, 38, 62, 80]) { ell(ctx, x + 2, 130, 6, 1.6); ctx.stroke(); }
      ctx.fillStyle = lin(ctx, 0, 84, 0, 94, ['#7a5a3a', '#4a3522']); ctx.fillRect(10, 84, 84, 9);
      ctx.fillStyle = lin(ctx, 18, 0, 86, 0, ['#5e4a36', '#46372a', '#2e241b']); ctx.fillRect(18, 46, 68, 40);
      ctx.strokeStyle = 'rgba(20,14,9,0.6)';
      for (let x = 22; x < 86; x += 6) { ctx.beginPath(); ctx.moveTo(x, 46); ctx.lineTo(x, 86); ctx.stroke(); }
      ctx.fillStyle = lin(ctx, 0, 6, 0, 54, ['#77714a', '#4e4a30', '#33301f']);
      poly(ctx, [6, 54, 98, 54, 52, 6]); ctx.fill();
      ctx.strokeStyle = 'rgba(30,28,16,0.55)';
      for (let k = 0; k < 40; k++) {
        const x = 12 + rnd() * 80, y = 20 + rnd() * 32;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (x - 52) * 0.08, y + 6); ctx.stroke();
      }
      ctx.fillStyle = '#ffc56a'; ctx.fillRect(28, 58, 13, 12);
      glow(ctx, 34.5, 64, 18, '255,190,100', 0.45);
      ctx.fillStyle = '#4a3522'; ctx.fillRect(34, 58, 1.2, 12); ctx.fillRect(28, 63.5, 13, 1.2);
      ctx.fillStyle = '#150e08'; ctx.fillRect(56, 60, 15, 25);
      ctx.strokeStyle = '#2b2219'; ctx.beginPath(); ctx.moveTo(92, 54); ctx.lineTo(92, 60); ctx.stroke();
      ctx.fillStyle = rad(ctx, 92, 64, 4, ['#fff2c8', '#ffbd5c']); ctx.fillRect(89, 60, 6, 8);
      glow(ctx, 92, 64, 14, '255,190,100', 0.5);
    },
  },

  churchSpire: {
    w: 120, h: 236,
    foot: [{ dx: -1, dy: -3, w: 7, h: 4 }],
    lights: [{ dx: 10, dy: -92, r: 140, color: '120,230,210', int: 0.85, glow: 0.55, flick: 0.1 }],
    draw(ctx, rnd) {
      ctx.fillStyle = lin(ctx, 0, 170, 0, 234, ['#454b52', '#262a2f']);
      poly(ctx, [0, 234, 0, 206, 52, 176, 58, 234]); ctx.fill();
      ctx.strokeStyle = 'rgba(15,17,20,0.6)'; ctx.lineWidth = 1;
      for (let y = 190; y < 234; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(56, y - 6); ctx.stroke(); }
      ctx.fillStyle = lin(ctx, 50, 0, 90, 0, ['#7a8188', '#4f555b', '#2b2f34']); ctx.fillRect(50, 92, 40, 142);
      ctx.strokeStyle = 'rgba(20,22,25,0.6)';
      for (let y = 100; y < 234; y += 10) { ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(90, y); ctx.stroke(); }
      const wx = 70, wy = 140;
      ctx.fillStyle = '#a6f2e4';
      ctx.beginPath(); ctx.moveTo(wx - 7, wy + 14); ctx.lineTo(wx - 7, wy); ctx.quadraticCurveTo(wx, wy - 14, wx + 7, wy); ctx.lineTo(wx + 7, wy + 14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2b3035'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(wx, wy - 8); ctx.lineTo(wx, wy + 14); ctx.stroke();
      glow(ctx, wx, wy + 2, 28, '120,230,210', 0.5);
      ctx.fillStyle = '#15181b'; ctx.fillRect(62, 100, 16, 18);
      ctx.strokeStyle = '#3b4147'; for (let y = 103; y < 118; y += 3) { ctx.beginPath(); ctx.moveTo(62, y); ctx.lineTo(78, y); ctx.stroke(); }
      ctx.fillStyle = lin(ctx, 48, 0, 92, 0, ['#4d545b', '#2a2e33']); poly(ctx, [46, 94, 94, 94, 70, 18]); ctx.fill();
      ctx.strokeStyle = '#6a7077'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(70, 18); ctx.lineTo(70, 3); ctx.moveTo(64, 9); ctx.lineTo(76, 9); ctx.stroke();
      for (let k = 0; k < 12; k++) {
        ctx.strokeStyle = 'rgba(80,130,90,0.55)'; ctx.lineWidth = 1.2;
        let x = 52 + rnd() * 36, y = 120 + rnd() * 80;
        ctx.beginPath(); ctx.moveTo(x, y);
        while (y < 232) { y += 6; x += (rnd() - 0.5) * 2; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,70,65,0.8)'; ctx.fillRect(0, 226, 120, 8);
    },
  },

  well: {
    w: 64, h: 60,
    foot: [{ dx: -3, dy: -2, w: 7, h: 3 }],
    lights: [{ dx: 0, dy: -18, r: 170, color: '110,200,255', int: 0.9, glow: 0.6, flick: 0.06 }],
    draw(ctx) {
      ctx.fillStyle = '#3e3124'; ctx.fillRect(6, 10, 4, 34); ctx.fillRect(54, 10, 4, 34);
      ctx.fillStyle = '#4e3e2c'; ctx.fillRect(3, 8, 58, 4);
      ctx.strokeStyle = '#8a7a60'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(32, 12); ctx.lineTo(32, 28); ctx.stroke();
      ctx.fillStyle = '#5a4630'; ctx.fillRect(28, 26, 8, 6);
      ctx.fillStyle = lin(ctx, 0, 30, 0, 58, ['#8a8d94', '#55585f']); ell(ctx, 32, 44, 28, 13); ctx.fill();
      ctx.fillStyle = rad(ctx, 32, 42, 20, ['#c8f2ff', '#4fb4e8', '#0a2a40', '#02060a']); ell(ctx, 32, 42, 20, 8); ctx.fill();
      ctx.fillStyle = lin(ctx, 0, 44, 0, 58, ['#6a6d74', '#3d4046']);
      ctx.fillRect(4, 44, 56, 8);
      ctx.beginPath(); ctx.ellipse(32, 52, 28, 6, 0, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(25,27,31,0.7)';
      for (let x = 10; x < 60; x += 9) { ctx.beginPath(); ctx.moveTo(x, 45); ctx.lineTo(x, 56); ctx.stroke(); }
      glow(ctx, 32, 40, 26, '110,200,255', 0.45);
    },
  },

  lanternPost: {
    w: 26, h: 66, variants: 2,
    foot: [{ dx: 0, dy: 0, w: 1, h: 1 }],
    lights: (v) => [{ dx: 6, dy: -45, r: 100, color: v ? '120,210,255' : '255,190,100', int: 0.8, glow: 0.5, flick: 0.15 }],
    draw(ctx, rnd, v) {
      const col = v ? ['#e4f8ff', '#7fd4ff'] : ['#fff2c8', '#ffbd5c'];
      ctx.strokeStyle = '#3a2f24'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(10, 64); ctx.quadraticCurveTo(7, 36, 10, 8); ctx.lineTo(20, 9); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(19, 9); ctx.lineTo(19, 14); ctx.stroke();
      ctx.fillStyle = '#231c15'; ctx.fillRect(15, 14, 8, 10);
      ctx.fillStyle = rad(ctx, 19, 19, 5, col); ctx.fillRect(16.5, 15.5, 5, 7);
      glow(ctx, 19, 19, 12, v ? '120,210,255' : '255,190,100', 0.5);
    },
  },

  shrub: {
    w: 26, h: 18, variants: 3, solid: false,
    foot: [],
    draw(ctx, rnd) {
      for (let k = 0; k < 9; k++) {
        ctx.fillStyle = rnd() < 0.5 ? '#2f4a2d' : '#3f5e39';
        blob(ctx, 5 + rnd() * 16, 6 + rnd() * 8, 5, 4, rnd, 7, 0.3); ctx.fill();
      }
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = rnd() < 0.5 ? '#8a6aa8' : '#c9b8d8';
        ctx.fillRect(4 + rnd() * 18, 3 + rnd() * 10, 1.6, 1.6);
      }
    },
  },
};

export function propLights(type, variant) {
  const def = PROPS[type];
  if (!def.lights) return [];
  return typeof def.lights === 'function' ? def.lights(variant) : def.lights;
}
