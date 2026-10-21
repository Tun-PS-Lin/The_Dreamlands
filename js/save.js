// Local save in the browser (position, inventory, explored map, discoveries).

import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.v === 1 ? s : null;
  } catch { return null; }
}

export function writeSave(game) {
  try {
    const { player, inventory, hud } = game;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1,
      player: { x: Math.round(player.x), y: Math.round(player.y), dir: player.dir },
      inv: inventory.serialize(),
      discovered: [...hud.discovered],
      fog: hud.fogData(),
      perf: hud.perfOn,
    }));
  } catch { /* storage full or blocked: the game still runs */ }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
