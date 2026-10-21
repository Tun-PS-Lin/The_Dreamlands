// Small colour helpers with caching (colour strings are reused as glyph-atlas keys).

const shadeCache = new Map();
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Brightness-scaled colour, optionally with alpha. Cached by input.
export function shade(hex, k = 1, a = 1) {
  const key = hex + '|' + k + '|' + a;
  let v = shadeCache.get(key);
  if (v) return v;
  const [r, g, b] = hexToRgb(hex);
  v = a >= 1
    ? `rgb(${clamp255(r * k)},${clamp255(g * k)},${clamp255(b * k)})`
    : `rgba(${clamp255(r * k)},${clamp255(g * k)},${clamp255(b * k)},${a})`;
  shadeCache.set(key, v);
  return v;
}

export function rgba(rgb, a) {
  return `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`;
}
