// Global tuning constants for The Coil prototype.

export const CELL_W = 7;            // ground glyph cell width  (world px)
export const CELL_H = 10;           // ground glyph cell height (world px)
export const GROUND_FONT = 9.6;     // ground glyph font size   (world px)

export const COLS = 300;            // world size in cells
export const ROWS = 420;
export const WORLD_W = COLS * CELL_W;
export const WORLD_H = ROWS * CELL_H;
export const CHUNK = 32;            // cells per cached ground chunk (each side)

export const SPRITE_CELL_W = 4;     // glyph cell used for props (world px)
export const SPRITE_CELL_H = 6;
export const SPRITE_FONT = 6.4;

export const FONT_FAMILY = '"JetBrains Mono", "IBM Plex Mono", Menlo, Consolas, "Courier New", monospace';
export const BG = '#05070e';
export const SEED = 1931;
export const SAVE_KEY = 'thecoil.save.v1';

// Glyph density ramp, light ink -> heavy ink.
export const RAMP = " .'`:-,;=+*xzcvoaedbpqQ8%#&@WM";
// Cleaner ramp for characters and props, so sprites read as shapes rather than text.
export const SPRITE_RAMP = " .'`:-;=+*o%#&8@";

export const PLAYER = {
  walkSpeed: 150,     // px / s
  accel: 1300,        // px / s^2 toward target velocity
  friction: 1700,     // px / s^2 when no input
  dashSpeed: 600,
  dashTime: 0.17,     // s
  dashCooldown: 0.55, // s
  halfW: 6,           // collider half width (px)
  footH: 6,           // collider height above the feet (px)
};
