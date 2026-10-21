// Vector drawing helpers used to paint source art before it is converted to glyphs.

export const TAU = Math.PI * 2;

export function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const n = stops.length - 1;
  stops.forEach((c, i) => g.addColorStop(n ? i / n : 0, c));
  return g;
}

export function rad(ctx, x, y, r, stops, r0 = 0) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r);
  const n = stops.length - 1;
  stops.forEach((c, i) => g.addColorStop(n ? i / n : 0, c));
  return g;
}

export function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}

export function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

export function glow(ctx, x, y, r, rgb, a = 0.6) {
  ctx.fillStyle = rad(ctx, x, y, r, [`rgba(${rgb},${a})`, `rgba(${rgb},${a * 0.35})`, `rgba(${rgb},0)`]);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function blob(ctx, cx, cy, rx, ry, rnd, n = 10, jit = 0.25) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    const j = 1 + (rnd() - 0.5) * jit * 2;
    pts.push(cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j);
  }
  poly(ctx, pts);
}
