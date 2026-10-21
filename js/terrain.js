// Terrain and region definitions. Each terrain lists the glyphs it is drawn with,
// its foreground colours, a background tint, whether it blocks movement and its speed factor.

export const T = {
  DEEP: 0, SHALLOW: 1, SAND: 2, WETSAND: 3, DUNE: 4, HEATH: 5, ROCKGROUND: 6, ROCK: 7,
  PATH: 8, PLANK: 9, MUD: 10, MARSH: 11, MARSHDEEP: 12, REEDS: 13, FOREST: 14, STONE: 15, WALL: 16,
};

export const R = { SEA: 0, SHORE: 1, FENS: 2, THORN: 3 };

export const TERRAIN = [];
function def(id, o) {
  TERRAIN[id] = Object.assign(
    { blocked: false, speed: 1, water: false, glyphs: '.', fg: ['#888888'], bg: '#000000', mini: '#222222' },
    o,
  );
}

// A space in `glyphs` means "leave this cell empty".
def(T.DEEP,       { glyphs: '   ..--~~=-', fg: ['#1a3552', '#21436a', '#152c45', '#28507a'], bg: '#050c17', blocked: true, water: true, mini: '#0d1d33' });
def(T.SHALLOW,    { glyphs: '~~--=..~', fg: ['#3b7395', '#4b86a6', '#30627f'], bg: '#0a1b2a', speed: 0.6, water: true, mini: '#1d4560' });
def(T.SAND,       { glyphs: ".:,'`.;:.:", fg: ['#c2a986', '#ad9574', '#d3ba95', '#9a8466'], bg: '#3a2f23', mini: '#a58e6f' });
def(T.WETSAND,    { glyphs: ".,:`.';", fg: ['#8d7c66', '#7a6b58', '#9a8870'], bg: '#231d16', speed: 0.95, mini: '#74654f' });
def(T.DUNE,       { glyphs: ".,\"':v.,;", fg: ['#ad9873', '#90946b', '#727f57', '#bba47e'], bg: '#2b2419', mini: '#8f8663' });
def(T.HEATH,      { glyphs: "\",'v.w;\"", fg: ['#5f7d51', '#4b6942', '#6e8c5c', '#40593b'], bg: '#111a11', mini: '#4b6542' });
def(T.ROCKGROUND, { glyphs: ':.%=:.', fg: ['#6f737a', '#81858b', '#5c6066'], bg: '#191b1f', mini: '#5d6167' });
def(T.ROCK,       { glyphs: '#%@&8#', fg: ['#8e939b', '#72777f', '#a3a8b0'], bg: '#25282d', blocked: true, mini: '#80858d' });
def(T.PATH,       { glyphs: '.:`,.:', fg: ['#94805f', '#a58f6c', '#806c52'], bg: '#251e15', speed: 1.08, mini: '#9a845f' });
def(T.PLANK,      { glyphs: '==#=', fg: ['#a07a4c', '#8a663b', '#b68c58'], bg: '#2e1f12', speed: 1.08, mini: '#a07a4a' });
def(T.MUD,        { glyphs: '.,_`.~,', fg: ['#716a4b', '#827a57', '#615a40'], bg: '#1b190f', speed: 0.92, mini: '#3f3b2b' });
def(T.MARSH,      { glyphs: '~-._~-', fg: ['#3d8a80', '#4a9c90', '#317268'], bg: '#08201d', speed: 0.62, water: true, mini: '#1d4d49' });
def(T.MARSHDEEP,  { glyphs: '- ~. -', fg: ['#265e58', '#2e6d66'], bg: '#041311', blocked: true, water: true, mini: '#0e2b29' });
def(T.REEDS,      { glyphs: "|!il|/\\I|", fg: ['#5a9e6c', '#70b47e', '#46805a', '#8cc290'], bg: '#0d2016', speed: 0.82, mini: '#3f7350' });
def(T.FOREST,     { glyphs: '&%#@Y*8&', fg: ['#1e492d', '#295b37', '#163923', '#356f3e'], bg: '#06100a', blocked: true, mini: '#173a23' });
def(T.STONE,      { glyphs: '.:+=.:', fg: ['#73757d', '#63656c', '#83868e'], bg: '#17181d', mini: '#6a6c73' });
def(T.WALL,       { glyphs: '#[]H%#', fg: ['#8e9199', '#7a7d85', '#9ea1a9'], bg: '#1f2126', blocked: true, mini: '#8c8f97' });

// Per-region mood: darkness of the lighting layer, fog density and a colour tint.
export const REGION_INFO = {
  [R.SEA]:   { name: 'The Inverted Sea',    tier: 'Between the turns',      dark: 0.3, fog: 0.4, tint: [90, 130, 200], tintA: 0.04 },
  [R.SHORE]: { name: 'Shore of Lost Hours', tier: 'Tier I · Shallow Sleep', dark: 0.2, fog: 0.42, tint: [255, 150, 105], tintA: 0.085 },
  [R.FENS]:  { name: 'Lantern Fens',        tier: 'Tier I · Shallow Sleep', dark: 0.32, fog: 0.34, tint: [60, 170, 150], tintA: 0.06 },
  [R.THORN]: { name: 'The Thornwild',       tier: 'Tier I · Shallow Sleep', dark: 0.5, fog: 0.3, tint: [60, 140, 80], tintA: 0.05 },
};
