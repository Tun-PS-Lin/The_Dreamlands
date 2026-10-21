// Vector art for the Dreamer (the player). It is drawn per direction and pose, then asciified.
// Equipment changes what is drawn: weapon, shield or lantern, hood, armour.

import { lin, rad, poly, ell, glow } from './draw.js';

export const ART_W = 44, ART_H = 80, FEET_Y = 77;

const C = {
  cloak: '#4f535c', cloakDk: '#30333a', cloakLt: '#6a6e78',
  hood: '#5c606b', hoodLt: '#7a7e89', face: '#06070a', eye: '#d6f3ff',
  armLt: '#c9cfd8', arm: '#868c94', armDk: '#50555c',
  tunicLt: '#5f574d', tunicDk: '#39342e',
  belt: '#6e4a2c', buckle: '#d6b062', boot: '#4b3a2a', greave: '#60656c',
};

// pose: { walk: -1..1 stride, bob: 0..1, sway: cloak offset, dash: 0|1 }
export function drawPlayerArt(ctx, dir, pose, eq) {
  ctx.save();
  if (pose.dash && (dir === 'left' || dir === 'right')) {
    ctx.translate(22, FEET_Y); ctx.rotate(dir === 'left' ? -0.14 : 0.14); ctx.translate(-22, -FEET_Y);
  }
  if (dir === 'right') { ctx.translate(ART_W, 0); ctx.scale(-1, 1); side(ctx, pose, eq); }
  else if (dir === 'left') side(ctx, pose, eq);
  else if (dir === 'up') back(ctx, pose, eq);
  else front(ctx, pose, eq);
  ctx.restore();
}

function torsoFill(ctx, x0, x1, eq) {
  return eq.chest ? lin(ctx, x0, 0, x1, 0, [C.armLt, C.arm, C.armDk]) : lin(ctx, x0, 0, x1, 0, [C.tunicLt, C.tunicDk]);
}

function leg(ctx, x, y, w, h) {
  ctx.fillStyle = lin(ctx, x, 0, x + w, 0, ['#7a7f87', C.greave, '#3c4046']);
  ctx.fillRect(x, y, w, h - 5);
  ctx.fillStyle = C.boot; ctx.fillRect(x - 0.5, y + h - 5, w + 1, 5);
}

function arm(ctx, x, y, w, h) {
  ctx.fillStyle = lin(ctx, x, 0, x + w, 0, [C.cloakLt, C.cloak]);
  ctx.fillRect(x, y, w, h - 5);
  ctx.fillStyle = lin(ctx, x, 0, x + w, 0, [C.armLt, C.armDk]);
  ctx.fillRect(x, y + h - 5, w, 5);
}

function legRot(ctx, x, y, a, len, far) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = far ? '#45494f' : lin(ctx, -3, 0, 3, 0, ['#7a7f87', C.greave]);
  ctx.fillRect(-3, 0, 6, len - 5);
  ctx.fillStyle = far ? '#33291e' : C.boot; ctx.fillRect(-5, len - 5, 8, 5);
  ctx.restore();
}

function armRot(ctx, x, y, a, far) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = far ? C.cloakDk : C.cloak; ctx.fillRect(-2.5, 0, 5, 13);
  ctx.fillStyle = far ? C.armDk : C.arm; ctx.fillRect(-2.5, 13, 5, 5);
  ctx.restore();
}

function sword(ctx, hx, hy, ang, id) {
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  ctx.fillStyle = lin(ctx, -1.6, 0, 1.6, 0, ['#eef2f7', '#9aa1aa', '#5d636b']);
  poly(ctx, [-1.4, 2, 1.4, 2, 1.0, 21, 0, 24, -1.0, 21]); ctx.fill();
  if (id === 'rusted_sword') {
    ctx.fillStyle = 'rgba(170,80,40,0.85)';
    for (const y of [5, 9, 14, 18]) ctx.fillRect(-1, y, 1.6, 1.4);
  }
  ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-4, 0, 8, 2);
  ctx.fillStyle = '#4a3420'; ctx.fillRect(-0.9, -4.5, 1.8, 4.5);
  ctx.fillStyle = '#b08a4a'; ell(ctx, 0, -5, 1.4, 1.4); ctx.fill();
  ctx.restore();
}

function shieldFace(ctx, x, y, rx, ry) {
  ctx.fillStyle = lin(ctx, x - rx, 0, x + rx, 0, ['#8a6846', '#5d4430', '#3a2a1c']);
  ell(ctx, x, y, rx, ry); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,12,0.8)'; ctx.lineWidth = 0.8;
  for (const f of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.moveTo(x + f * rx, y - ry * 0.9); ctx.lineTo(x + f * rx, y + ry * 0.9); ctx.stroke(); }
  ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 1.6; ell(ctx, x, y, rx, ry); ctx.stroke();
  if (rx > 4) {
    ctx.fillStyle = '#c9ced6'; ell(ctx, x, y, 2, 2.4); ctx.fill();
    ctx.strokeStyle = 'rgba(235,238,242,0.9)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, y - ry * 0.7); ctx.lineTo(x, y + ry * 0.7); ctx.moveTo(x - rx * 0.65, y); ctx.lineTo(x + rx * 0.65, y); ctx.stroke();
  }
}

function shieldBack(ctx, x, y) {
  ctx.fillStyle = lin(ctx, x - 8, 0, x + 8, 0, ['#5d4430', '#3a2a1c']);
  ell(ctx, x, y, 7.8, 9.8); ctx.fill();
  ctx.strokeStyle = '#6b5a44'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x - 6, y - 3); ctx.lineTo(x + 6, y - 3); ctx.moveTo(x - 6, y + 3); ctx.lineTo(x + 6, y + 3); ctx.stroke();
  ctx.strokeStyle = '#80868e'; ctx.lineWidth = 1.4; ell(ctx, x, y, 7.8, 9.8); ctx.stroke();
}

function lanternAt(ctx, x, y) {
  ctx.strokeStyle = '#3a3128'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 2); ctx.stroke();
  ctx.fillStyle = '#231d17'; ctx.fillRect(x - 3.2, y - 2, 6.4, 8);
  ctx.fillStyle = rad(ctx, x, y + 2, 4, ['#f2fbff', '#8fdcff', '#3a8fc0']); ctx.fillRect(x - 2.2, y - 1, 4.4, 6);
  glow(ctx, x, y + 2, 11, '140,215,255', 0.55);
}

function hoodPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(22, 2);
  ctx.bezierCurveTo(30, 6, 33, 16, 32.5, 29);
  ctx.lineTo(11.5, 29);
  ctx.bezierCurveTo(11, 16, 14, 6, 22, 2);
  ctx.closePath();
}

function headFront(ctx, eq) {
  if (eq.head) {
    ctx.fillStyle = lin(ctx, 12, 0, 32, 0, [C.hoodLt, C.hood, C.cloakDk]);
    hoodPath(ctx); ctx.fill();
    ctx.fillStyle = C.face; ell(ctx, 22, 19.5, 6, 6.6); ctx.fill();
    ctx.fillStyle = C.eye; ctx.fillRect(18.8, 18.3, 2.2, 1.8); ctx.fillRect(23.2, 18.3, 2.2, 1.8);
  } else {
    ctx.fillStyle = lin(ctx, 15, 0, 29, 0, ['#b3a495', '#7d7066']); ell(ctx, 22, 19, 6.5, 8); ctx.fill();
    ctx.fillStyle = '#2b2622'; ell(ctx, 22, 13.5, 7, 4.5); ctx.fill();
    ctx.fillStyle = '#15120f'; ctx.fillRect(19, 19, 1.6, 1.4); ctx.fillRect(23.4, 19, 1.6, 1.4);
  }
}

function front(ctx, p, eq) {
  const b = p.bob, w = p.walk, s = p.sway;
  ctx.translate(0, 3 - b);
  // back of the cloak
  ctx.fillStyle = lin(ctx, 0, 26, 0, 70, [C.cloak, C.cloakDk]);
  const hem = [];
  for (let k = 0; k <= 8; k++) hem.push(37 + s * 0.5 - k * 3.75, 66 + (k % 2 ? 4 : 0));
  poly(ctx, [10, 28, 34, 28, ...hem]); ctx.fill();
  // legs
  const lLift = Math.max(0, w) * 3, rLift = Math.max(0, -w) * 3;
  leg(ctx, 15.5, 52, 6, 22 + b - lLift);
  leg(ctx, 22.5, 52, 6, 22 + b - rLift);
  // torso
  ctx.fillStyle = torsoFill(ctx, 14, 30, eq); ctx.fillRect(14, 29, 16, 24);
  if (eq.chest) {
    ctx.strokeStyle = 'rgba(30,32,36,0.8)'; ctx.lineWidth = 1;
    for (const y of [36, 41]) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(30, y); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(22, 29); ctx.lineTo(22, 46); ctx.stroke();
  }
  ctx.fillStyle = C.belt; ctx.fillRect(14, 46, 16, 3);
  ctx.fillStyle = C.buckle; ctx.fillRect(20.5, 46, 3, 3);
  // front cloak flaps
  ctx.fillStyle = lin(ctx, 0, 28, 0, 66, [C.cloakLt, C.cloak, C.cloakDk]);
  poly(ctx, [10, 29, 15.5, 30, 14.5, 64 + s * 0.4, 8 + s * 0.5, 64]); ctx.fill();
  poly(ctx, [34, 29, 28.5, 30, 29.5, 64 - s * 0.4, 36 + s * 0.5, 64]); ctx.fill();
  // arms
  arm(ctx, 7.5, 31 + w * 1.6, 5, 19);
  arm(ctx, 31.5, 31 - w * 1.6, 5, 19);
  ctx.fillStyle = lin(ctx, 8, 27, 18, 35, [C.armLt, C.armDk]);
  ell(ctx, 12.5, 31, 5, 3.6); ctx.fill(); ell(ctx, 31.5, 31, 5, 3.6); ctx.fill();
  ctx.fillStyle = lin(ctx, 12, 27, 32, 37, ['#7d818a', '#4c4f56']);
  poly(ctx, [12, 27, 32, 27, 27, 36, 17, 36]); ctx.fill();
  if (eq.weapon) sword(ctx, 10, 50 + w * 1.6, 0.17, eq.weapon);
  headFront(ctx, eq);
  if (eq.offhand === 'shield') shieldFace(ctx, 34.5, 45 - w * 1.2, 7.8, 9.8);
  else if (eq.offhand === 'lantern') lanternAt(ctx, 34, 52 - w * 1.2);
}

function back(ctx, p, eq) {
  const b = p.bob, w = p.walk, s = p.sway;
  ctx.translate(0, 3 - b);
  const lLift = Math.max(0, -w) * 3, rLift = Math.max(0, w) * 3;
  leg(ctx, 15.5, 52, 6, 22 + b - lLift);
  leg(ctx, 22.5, 52, 6, 22 + b - rLift);
  // arms behind the cloak edges
  arm(ctx, 6.5, 31 - w * 1.6, 4.5, 18);
  arm(ctx, 33, 31 + w * 1.6, 4.5, 18);
  // cloak
  ctx.fillStyle = lin(ctx, 8, 0, 36, 0, [C.cloakLt, C.cloak, C.cloakDk]);
  const hem = [];
  for (let k = 0; k <= 10; k++) hem.push(38 + s * 0.6 - k * 3.2, 68 + (k % 2 ? 4 : 0));
  poly(ctx, [10, 27, 34, 27, ...hem]); ctx.fill();
  ctx.strokeStyle = 'rgba(18,19,23,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(18, 32); ctx.lineTo(16 + s * 0.4, 66); ctx.moveTo(26, 32); ctx.lineTo(28 + s * 0.4, 66); ctx.stroke();
  if (eq.weapon) sword(ctx, 35.5, 49 + w * 1.6, -0.17, eq.weapon);
  if (eq.offhand === 'shield') shieldBack(ctx, 8.5, 45 + w * 1.2);
  else if (eq.offhand === 'lantern') lanternAt(ctx, 9, 52 + w * 1.2);
  // hood (back)
  if (eq.head) {
    ctx.fillStyle = lin(ctx, 12, 0, 32, 0, [C.hoodLt, C.hood, C.cloakDk]);
    hoodPath(ctx); ctx.fill();
    ctx.strokeStyle = 'rgba(18,19,23,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(22, 4); ctx.lineTo(22, 28); ctx.stroke();
  } else {
    ctx.fillStyle = '#2b2622'; ell(ctx, 22, 18, 7, 8.5); ctx.fill();
  }
}

function side(ctx, p, eq) {
  const b = p.bob, w = p.walk, s = p.sway;
  ctx.translate(0, 3 - b);
  const hipY = 52;
  legRot(ctx, 23, hipY, -w * 0.45, 22 + b, true);
  // trailing cloak
  ctx.fillStyle = lin(ctx, 14, 0, 38, 0, [C.cloak, C.cloakDk]);
  poly(ctx, [20, 28, 27, 28, 33 + s, 50, 36 + s * 1.3, 67, 32 + s, 70, 29 + s, 66, 25 + s * 0.8, 70, 21, 66, 18, 50]); ctx.fill();
  // far arm + weapon (right hand is the far side when facing left)
  const fa = w * 0.5;
  armRot(ctx, 24, 31, fa, true);
  if (eq.weapon) sword(ctx, 24 - Math.sin(fa) * 17, 31 + Math.cos(fa) * 17, 1.0, eq.weapon);
  legRot(ctx, 21, hipY, w * 0.45, 22 + b, false);
  // torso
  ctx.fillStyle = torsoFill(ctx, 17, 28, eq); ctx.fillRect(17, 29, 11, 24);
  ctx.fillStyle = C.belt; ctx.fillRect(17, 46, 11, 3);
  // near arm + off-hand
  const na = -w * 0.5;
  const hx = 21 - Math.sin(na) * 17, hy = 31 + Math.cos(na) * 17;
  armRot(ctx, 21, 31, na, false);
  if (eq.offhand === 'shield') shieldFace(ctx, hx - 2.5, hy - 6, 3.8, 9.5);
  else if (eq.offhand === 'lantern') lanternAt(ctx, hx, hy + 4);
  ctx.fillStyle = lin(ctx, 16, 28, 26, 34, [C.armLt, C.armDk]); ell(ctx, 21, 31, 4.5, 3.5); ctx.fill();
  // head
  if (eq.head) {
    ctx.fillStyle = lin(ctx, 12, 0, 32, 0, [C.hoodLt, C.hood, C.cloakDk]);
    ctx.beginPath();
    ctx.moveTo(27, 3); ctx.bezierCurveTo(33, 10, 31, 22, 29, 30); ctx.lineTo(15, 30);
    ctx.bezierCurveTo(12, 24, 12, 13, 17, 7); ctx.quadraticCurveTo(21, 3, 27, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.face; ell(ctx, 16.2, 19, 3.4, 5.8); ctx.fill();
    ctx.fillStyle = C.eye; ctx.fillRect(14.6, 18, 1.5, 1.3);
  } else {
    ctx.fillStyle = lin(ctx, 14, 0, 28, 0, ['#b3a495', '#7d7066']); ell(ctx, 21, 19, 6.5, 8); ctx.fill();
    ctx.fillStyle = '#2b2622'; ell(ctx, 23, 15, 6.5, 6); ctx.fill();
  }
}
