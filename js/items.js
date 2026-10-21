// Item definitions and their icon art (48 x 48, asciified like everything else).

import { lin, rad, poly, ell, glow, TAU } from './draw.js';

export const EQUIP_SLOTS = ['head', 'amulet', 'weapon', 'offhand', 'chest', 'legs', 'feet', 'ring1', 'ring2'];
export const SLOT_ACCEPT = { head: 'head', amulet: 'amulet', weapon: 'weapon', offhand: 'offhand', chest: 'chest', legs: 'legs', feet: 'feet', ring1: 'ring', ring2: 'ring' };
export const SLOT_LABEL = { head: 'helm', amulet: 'amulet', weapon: 'weapon', offhand: 'off-hand', chest: 'chest', legs: 'legs', feet: 'feet', ring1: 'ring', ring2: 'ring' };
export const TYPE_LABEL = {
  weapon: 'Weapon · one-handed', offhand: 'Off-hand', head: 'Helm', chest: 'Chest', legs: 'Legs', feet: 'Feet',
  amulet: 'Amulet', ring: 'Ring', misc: 'Curio', consumable: 'Consumable',
};
export const TYPE_ORDER = ['weapon', 'offhand', 'head', 'chest', 'legs', 'feet', 'amulet', 'ring', 'consumable', 'misc'];
export const RARITY = {
  common: { label: 'Common', color: '#bdb8aa', rank: 0 },
  worn: { label: 'Worn', color: '#9cc29a', rank: 1 },
  lost: { label: 'Lost', color: '#e3bb68', rank: 2 },
  dreamt: { label: 'Dreamt', color: '#b49af2', rank: 3 },
};

// ------------------------------------------------------------------ icon art
function bellShape(ctx, cx, cy, s) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-8, -12); ctx.quadraticCurveTo(0, -20, 8, -12);
  ctx.bezierCurveTo(10, -6, 9, 3, 15, 9); ctx.quadraticCurveTo(0, 14, -15, 9);
  ctx.bezierCurveTo(-9, 3, -10, -6, -8, -12); ctx.closePath();
  ctx.fillStyle = lin(ctx, -15, 0, 15, 0, ['#f0c27a', '#b98445', '#6b4622']); ctx.fill();
  ctx.fillStyle = '#1a120a'; ell(ctx, 0, 10, 13, 2.5); ctx.fill();
  ctx.strokeStyle = '#8a6234'; ctx.lineWidth = 2.5; ell(ctx, 0, -18, 3, 2.5); ctx.stroke();
  ctx.restore();
}

const ICONS = {
  sword(ctx, rust) {
    ctx.save(); ctx.translate(24, 24); ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = lin(ctx, -3, 0, 3, 0, ['#f4f7fb', '#a6adb6', '#5a6068']);
    poly(ctx, [0, -23, 3, -18, 3, 7, -3, 7, -3, -18]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 6); ctx.stroke();
    if (rust) { ctx.fillStyle = 'rgba(176,84,42,0.9)'; for (const [x, y] of [[-1.5, -10], [1, -4], [-1, 2], [1.4, -15]]) { ell(ctx, x, y, 1.6, 1.3); ctx.fill(); } }
    ctx.fillStyle = lin(ctx, -9, 0, 9, 0, ['#c49a55', '#7a5a2e']); ctx.fillRect(-9, 7, 18, 3.5);
    ctx.fillStyle = '#4a3420'; ctx.fillRect(-1.8, 10.5, 3.6, 9);
    ctx.fillStyle = '#b08a4a'; ell(ctx, 0, 21.5, 2.8, 2.8); ctx.fill();
    ctx.restore();
  },
  shield(ctx) {
    ctx.fillStyle = lin(ctx, 6, 0, 42, 0, ['#9a7650', '#6a4c34', '#3e2c1d']); ell(ctx, 24, 24, 17, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,12,0.85)'; ctx.lineWidth = 1.2;
    for (const x of [15, 21, 27, 33]) { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, 40); ctx.stroke(); }
    ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 3; ell(ctx, 24, 24, 17, 18); ctx.stroke();
    ctx.fillStyle = lin(ctx, 20, 20, 28, 28, ['#e3e7ec', '#7d838b']); ell(ctx, 24, 24, 4.5, 4.5); ctx.fill();
  },
  lantern(ctx) {
    glow(ctx, 24, 25, 22, '140,215,255', 0.35);
    ctx.strokeStyle = '#6a5a44'; ctx.lineWidth = 2; ell(ctx, 24, 6, 4, 3); ctx.stroke();
    ctx.fillStyle = '#2a231b'; poly(ctx, [14, 13, 34, 13, 30, 8, 18, 8]); ctx.fill();
    ctx.fillStyle = rad(ctx, 24, 25, 11, ['#f6fdff', '#8fdcff', '#2c6f9a']); ctx.fillRect(16, 13, 16, 23);
    ctx.fillStyle = '#2a231b'; ctx.fillRect(15, 13, 2, 23); ctx.fillRect(31, 13, 2, 23); ctx.fillRect(23.2, 13, 1.6, 23);
    ctx.fillRect(13, 36, 22, 4);
  },
  hood(ctx) {
    ctx.fillStyle = lin(ctx, 8, 0, 40, 0, ['#70747e', '#4c505a', '#2a2c32']);
    ctx.beginPath(); ctx.moveTo(24, 3); ctx.bezierCurveTo(36, 8, 41, 24, 40, 44); ctx.lineTo(8, 44); ctx.bezierCurveTo(7, 24, 12, 8, 24, 3); ctx.fill();
    ctx.fillStyle = '#06070a'; ell(ctx, 24, 27, 8.5, 10); ctx.fill();
    ctx.fillStyle = '#a8dcff'; ctx.fillRect(19.5, 25, 2.2, 1.8); ctx.fillRect(26.3, 25, 2.2, 1.8);
  },
  coat(ctx) {
    ctx.fillStyle = lin(ctx, 4, 0, 44, 0, ['#b0b6bf', '#6e747b', '#3f4349']);
    poly(ctx, [12, 8, 36, 8, 45, 20, 39, 25, 36, 44, 12, 44, 9, 25, 3, 20]); ctx.fill();
    ctx.fillStyle = 'rgba(110,80,50,0.85)'; poly(ctx, [12, 26, 36, 26, 36, 44, 12, 44]); ctx.fill();
    ctx.strokeStyle = 'rgba(30,32,36,0.7)'; ctx.lineWidth = 1; for (const y of [14, 19]) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(36, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(240,240,232,0.85)'; for (let k = 0; k < 14; k++) ctx.fillRect(13 + ((k * 37) % 22), 28 + ((k * 13) % 14), 1.5, 1.5);
  },
  greaves(ctx) {
    ctx.fillStyle = lin(ctx, 8, 0, 40, 0, ['#9aa0a8', '#5e646b', '#3a3e44']);
    poly(ctx, [12, 6, 36, 6, 34, 26, 31, 44, 25, 44, 24, 22, 23, 44, 17, 44, 14, 26]); ctx.fill();
    ctx.fillStyle = '#c3c8cf'; ell(ctx, 18, 24, 3, 2.4); ctx.fill(); ell(ctx, 29, 24, 3, 2.4); ctx.fill();
    ctx.fillStyle = '#6e4a2c'; ctx.fillRect(12, 6, 24, 3);
  },
  boots(ctx) {
    ctx.fillStyle = lin(ctx, 6, 0, 42, 0, ['#7a5d40', '#4b3a2a', '#2c2219']);
    poly(ctx, [10, 8, 20, 8, 20, 34, 28, 36, 30, 42, 8, 42]); ctx.fill();
    poly(ctx, [26, 6, 35, 6, 35, 32, 42, 34, 44, 40, 25, 40]); ctx.fill();
    ctx.fillStyle = 'rgba(140,200,230,0.45)'; ctx.fillRect(11, 12, 2, 18); ctx.fillRect(27, 10, 2, 18);
  },
  amulet(ctx) {
    ctx.strokeStyle = '#c9a45a'; ctx.lineWidth = 1.8; ctx.setLineDash([2, 1.5]);
    ctx.beginPath(); ctx.moveTo(9, 5); ctx.quadraticCurveTo(24, 30, 39, 5); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = lin(ctx, 18, 0, 30, 0, ['#f0c27a', '#a8743c', '#5e3c1c']);
    ctx.beginPath(); ctx.moveTo(24, 19); ctx.bezierCurveTo(32, 26, 31, 40, 24, 43); ctx.bezierCurveTo(17, 40, 16, 26, 24, 19); ctx.fill();
    glow(ctx, 24, 33, 12, '255,200,120', 0.3);
  },
  ringGold(ctx) {
    ctx.strokeStyle = lin(ctx, 10, 0, 34, 0, ['#f3d38c', '#b98a3e', '#7a5520']); ctx.lineWidth = 5; ell(ctx, 21, 27, 11, 11); ctx.stroke();
    ctx.fillStyle = '#c9a050'; ctx.fillRect(31, 24, 12, 5); ctx.fillRect(38, 29, 2.5, 5); ctx.fillRect(42, 29, 2, 4);
  },
  ringReed(ctx) {
    ctx.strokeStyle = '#5e8f52'; ctx.lineWidth = 5; ell(ctx, 24, 26, 12, 12); ctx.stroke();
    ctx.strokeStyle = '#9cc58a'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; ctx.beginPath(); ctx.moveTo(24 + Math.cos(a) * 9.5, 26 + Math.sin(a) * 9.5); ctx.lineTo(24 + Math.cos(a + 0.35) * 14.5, 26 + Math.sin(a + 0.35) * 14.5); ctx.stroke(); }
  },
  keys(ctx) {
    ctx.strokeStyle = '#c9a050'; ctx.lineWidth = 2.5; ell(ctx, 16, 12, 7, 7); ctx.stroke();
    const key = (x, y, a, c) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = c;
      ell(ctx, 0, 0, 4, 4); ctx.fill(); ctx.fillRect(-1.2, 3, 2.4, 20); ctx.fillRect(1.2, 16, 4, 2.2); ctx.fillRect(1.2, 20, 3, 2.2);
      ctx.fillStyle = '#1a140c'; ell(ctx, 0, 0, 1.5, 1.5); ctx.fill(); ctx.restore();
    };
    key(14, 20, 0.35, '#d8b45c'); key(22, 18, -0.15, '#b8c0c8'); key(29, 15, -0.6, '#c08a4a');
  },
  letter(ctx) {
    ctx.fillStyle = lin(ctx, 0, 10, 0, 38, ['#f2e8cf', '#c9bc9a']); ctx.fillRect(5, 11, 38, 26);
    ctx.strokeStyle = 'rgba(90,70,40,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(5, 11); ctx.lineTo(24, 26); ctx.lineTo(43, 11); ctx.stroke();
    ctx.fillStyle = '#b0392e'; ell(ctx, 24, 26, 4.5, 4.5); ctx.fill();
  },
  map(ctx) {
    ctx.fillStyle = lin(ctx, 0, 0, 48, 48, ['#e6d6ad', '#b59f72']);
    poly(ctx, [7, 9, 18, 6, 26, 10, 40, 7, 42, 22, 38, 30, 41, 40, 24, 42, 14, 39, 6, 41, 9, 28, 5, 18]); ctx.fill();
    ctx.strokeStyle = '#6a4a26'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.2) { const r = 1.5 + a * 1.75; const x = 24 + Math.cos(a) * r, y = 24 + Math.sin(a) * r * 0.8; a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = '#7a1e1e'; ell(ctx, 24, 24, 1.8, 1.8); ctx.fill();
  },
  spectacles(ctx) {
    ctx.fillStyle = 'rgba(160,200,230,0.3)'; ell(ctx, 14, 25, 8.5, 8.5); ctx.fill(); ell(ctx, 34, 25, 8.5, 8.5); ctx.fill();
    ctx.strokeStyle = '#c9ced6'; ctx.lineWidth = 2.6; ell(ctx, 14, 25, 8.5, 8.5); ctx.stroke(); ell(ctx, 34, 25, 8.5, 8.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(21, 22); ctx.quadraticCurveTo(24, 19, 27, 22); ctx.stroke();
    ctx.strokeStyle = '#eef3f8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30, 19); ctx.lineTo(34, 25); ctx.lineTo(31, 31); ctx.stroke();
  },
  amberBottle(ctx) {
    glow(ctx, 24, 30, 18, '255,180,80', 0.35);
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(20, 4, 8, 6);
    ctx.fillStyle = 'rgba(200,170,120,0.6)'; ctx.fillRect(21, 10, 6, 7);
    ctx.fillStyle = rad(ctx, 24, 30, 14, ['#fff2c4', '#ffb84a', '#a85a14']); ell(ctx, 24, 30, 12.5, 13); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ell(ctx, 19, 25, 2.2, 4); ctx.fill();
  },
  wispJar(ctx) {
    glow(ctx, 24, 28, 20, '120,210,255', 0.4);
    ctx.fillStyle = '#4e3e2c'; ctx.fillRect(11, 8, 26, 6);
    ctx.fillStyle = 'rgba(150,200,220,0.25)'; ctx.fillRect(12, 14, 24, 28);
    ctx.fillStyle = rad(ctx, 24, 28, 9, ['#ffffff', '#a6e6ff', 'rgba(60,150,220,0)']); ctx.fillRect(12, 14, 24, 28);
    ctx.strokeStyle = 'rgba(200,230,240,0.7)'; ctx.lineWidth = 1.4; ctx.strokeRect(12, 14, 24, 28);
  },
  smallBell(ctx) { bellShape(ctx, 24, 26, 1.25); },
  tallow(ctx) {
    glow(ctx, 24, 12, 12, '255,200,110', 0.45);
    ctx.fillStyle = lin(ctx, 16, 0, 32, 0, ['#f4ead2', '#cbbd99']); ctx.fillRect(17, 20, 14, 22);
    ctx.fillStyle = '#efe4c9'; ell(ctx, 18, 24, 2, 4); ctx.fill(); ell(ctx, 29, 27, 2, 5); ctx.fill();
    ctx.fillStyle = '#2a2018'; ctx.fillRect(23.4, 15, 1.2, 5);
    ctx.fillStyle = rad(ctx, 24, 12, 5, ['#fffbe6', '#ffc85a', 'rgba(255,120,20,0)']);
    ctx.beginPath(); ctx.moveTo(24, 4); ctx.quadraticCurveTo(29, 12, 24, 16); ctx.quadraticCurveTo(19, 12, 24, 4); ctx.fill();
  },
  shell(ctx) {
    ctx.fillStyle = lin(ctx, 8, 8, 40, 40, ['#f6d8cf', '#d39a8e', '#8e5a52']);
    ctx.beginPath(); ctx.moveTo(24, 6); ctx.bezierCurveTo(42, 12, 42, 36, 24, 42); ctx.bezierCurveTo(10, 38, 8, 20, 24, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(110,60,55,0.7)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); for (let a = 0; a < TAU * 1.6; a += 0.2) { const r = 1 + a * 2.2; const x = 26 + Math.cos(a) * r, y = 24 + Math.sin(a) * r; a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  },
  horse(ctx) {
    ctx.fillStyle = lin(ctx, 6, 0, 42, 0, ['#c08a54', '#8a5a30', '#5a3a1e']);
    poly(ctx, [10, 30, 12, 20, 28, 19, 33, 10, 36, 8, 40, 12, 38, 16, 35, 16, 34, 26, 32, 34, 29, 34, 28, 27, 16, 27, 15, 34, 12, 34]); ctx.fill();
    ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(5, 37); ctx.quadraticCurveTo(22, 46, 42, 37); ctx.stroke();
    ctx.fillStyle = '#2a1a0e'; ell(ctx, 36.5, 11.5, 1, 1); ctx.fill();
  },
};

export const ITEMS = {
  rusted_sword: { name: 'Rusted Shortsword', type: 'weapon', rarity: 'common', stats: { dmg: [4, 7] }, desc: 'Washed up with the tide. The rust spells a name you almost remember.', icon: (c) => ICONS.sword(c, true) },
  driftwood_shield: { name: 'Driftwood Shield', type: 'offhand', sub: 'shield', rarity: 'common', stats: { armour: 6 }, desc: 'Planks from a ship that never existed, bound with harbour iron.', icon: ICONS.shield },
  wisp_lantern: { name: 'Wisp Lantern', type: 'offhand', sub: 'lantern', rarity: 'lost', stats: { light: 110, lucidity: 5 }, desc: "A Fen-warden's lantern. The wisp inside keeps trying to say a word. Lights the way much further.", icon: ICONS.lantern },
  sleepers_hood: { name: "Sleeper's Hood", type: 'head', rarity: 'worn', stats: { armour: 2, lucidity: 3 }, desc: 'You were wearing it when you fell asleep. You do not own a hood.', icon: ICONS.hood },
  salt_coat: { name: 'Salt-stiff Coat', type: 'chest', rarity: 'common', stats: { armour: 8 }, desc: 'Mail under oilcloth, crusted white with dried sea.', icon: ICONS.coat },
  tide_greaves: { name: 'Tide-worn Greaves', type: 'legs', rarity: 'common', stats: { armour: 4 }, desc: 'The straps are knotted the way your grandmother tied them.', icon: ICONS.greaves },
  wading_boots: { name: 'Wading Boots', type: 'feet', rarity: 'common', stats: { armour: 2, speed: 3 }, desc: 'Still wet. They will always be wet.', icon: ICONS.boots },
  clapper_amulet: { name: 'Bell-Clapper Amulet', type: 'amulet', rarity: 'lost', stats: { lucidity: 8 }, desc: 'Pulled from one of the Bell Graves. It is warm whenever someone, somewhere, stops breathing.', icon: ICONS.amulet },
  key_ring: { name: 'Ring of the Lost Key', type: 'ring', rarity: 'worn', stats: { lucidity: 4 }, desc: 'A key bent into a ring. It still opens something.', icon: ICONS.ringGold },
  reed_band: { name: 'Reedwoven Band', type: 'ring', rarity: 'common', stats: { speed: 2 }, desc: 'Braided by Fen-wardens for travellers who paid in secrets.', icon: ICONS.ringReed },
  lost_keys: { name: 'Bundle of Lost Keys', type: 'misc', rarity: 'lost', desc: 'Seven keys. Six doors you remember. One you do not.', icon: ICONS.keys },
  unsent_letter: { name: 'Unsent Letter', type: 'misc', rarity: 'worn', desc: 'Addressed to you, in your own handwriting, dated tomorrow.', icon: ICONS.letter },
  map_fragment: { name: 'Torn Map Fragment', type: 'misc', rarity: 'dreamt', desc: 'A spiral, drawn in a careful hand. Someone has written "deeper" at its centre.', icon: ICONS.map },
  spectacles: { name: 'Cracked Spectacles', type: 'misc', rarity: 'common', desc: 'Through the left lens the sea is full of stars. Through the right, it is full of eyes.', icon: ICONS.spectacles },
  amber_bottle: { name: 'Bottle of Amber Light', type: 'consumable', rarity: 'worn', stack: 9, desc: 'Bottled dawn from the Shore of Lost Hours. It cannot be used yet.', icon: ICONS.amberBottle },
  wisp_jar: { name: 'Wisp in a Jar', type: 'misc', rarity: 'lost', desc: 'It whispers half a name. If you listen too long, you forget your own.', icon: ICONS.wispJar },
  small_bell: { name: 'Small Grave Bell', type: 'misc', rarity: 'worn', desc: 'It rang once in your pocket. You did not look at the time.', icon: ICONS.smallBell },
  tallow_stub: { name: 'Tallow Stub', type: 'misc', rarity: 'common', stack: 9, desc: "Pale wax from a ship that sails up into the sky. It smells of someone else's memories.", icon: ICONS.tallow },
  memory_shell: { name: 'Memory Shell', type: 'misc', rarity: 'common', stack: 9, desc: 'Hold it to your ear: a conversation you had as a child, with someone you have never met.', icon: ICONS.shell },
  wooden_horse: { name: 'Wooden Horse', type: 'misc', rarity: 'worn', desc: "A child's toy. You had one exactly like it. You are sure of that.", icon: ICONS.horse },
};
