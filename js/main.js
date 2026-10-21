// Entry point: boot, game loop and wiring between systems.

import { SEED, FONT_FAMILY } from './config.js';
import { generateWorld } from './world.js';
import { Renderer } from './render.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { Effects } from './fx.js';
import { Wisps } from './wisps.js';
import { HUD } from './hud.js';
import { Inventory, InventoryUI } from './inventory.js';
import { loadSave, writeSave, clearSave } from './save.js';

async function fontsReady() {
  if (!document.fonts) return;
  const timeout = new Promise((r) => setTimeout(r, 2500));
  try {
    await Promise.race([Promise.all([
      document.fonts.load('12px "JetBrains Mono"'),
      document.fonts.load('600 12px "JetBrains Mono"'),
    ]), timeout]);
  } catch { /* fall back to system monospace */ }
}

const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function boot() {
  const loading = document.getElementById('loading');
  const status = loading.querySelector('.ld-sub');
  const params = new URLSearchParams(location.search);
  if (params.has('reset')) clearSave();

  await fontsReady();
  status.textContent = 'dreaming the shore…';
  await frame();

  const world = generateWorld(SEED);
  const save = loadSave();
  const input = new Input();
  const fx = new Effects(world);
  const wisps = new Wisps(world);
  const inventory = new Inventory(save?.inv);
  const player = new Player(world, save?.player || world.spawn);
  const renderer = new Renderer(document.getElementById('game'), world);
  const hud = new HUD(world, save);

  const game = { world, player, fx, wisps, inventory, renderer, hud, input, time: 0, invOpen: false, lights: [] };
  window.addEventListener('resize', () => renderer.resize());

  player.setEquip(inventory.look());
  renderer.onScale = (s) => player.rebuild(s);
  player.rebuild(renderer.scale);
  hud.setStats(inventory.stats());

  const invUI = new InventoryUI(inventory, {
    onChange: () => {
      hud.setStats(inventory.stats());
      // rebuild the world sprite a moment later so UI animations are never interrupted
      clearTimeout(game.rebuildT);
      game.rebuildT = setTimeout(() => {
        player.setEquip(inventory.look());
        player.rebuild(renderer.scale);
        writeSave(game);
      }, 260);
    },
    onToggle: (open) => {
      game.invOpen = open;
      input.enabled = !open;
      hud.setDim(open);
    },
  });

  input.on('KeyE', () => invUI.toggle());
  input.on('KeyI', () => invUI.toggle());
  input.on('Escape', () => invUI.close());
  input.on('Backquote', () => hud.togglePerf());
  for (let n = 1; n <= 8; n++) input.on('Digit' + n, () => { if (!game.invOpen) hud.pressHotbar(n - 1); });

  status.textContent = 'waking on the shore…';
  await frame();
  renderer.snapCamera(player);
  renderer.prewarm();
  hud.update(0, { ...game, suppressToast: true });

  // light sources: static (props) + dynamic (player, wisps), rebuilt each frame
  const playerLight = { x: 0, y: 0, r: 150, int: 0.95, glow: 0, color: '255,230,200', flick: 0.02, ph: 1 };
  const updateLights = () => {
    const look = player.equip;
    playerLight.x = player.x; playerLight.y = player.y - 28;
    playerLight.r = look.light || 150;
    playerLight.glow = look.lantern ? 0.45 : 0;
    playerLight.color = look.lantern ? '140,215,255' : '255,230,200';
    playerLight.flick = look.lantern ? 0.08 : 0.02;
    game.lights = [playerLight, ...world.lights, ...wisps.lights(game.time)];
  };

  if (params.has('debug')) window.__coil = { game, invUI, writeSave, clearSave };

  let last = performance.now();
  let saveT = 0;
  const tick = (now) => {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    const t0 = performance.now();
    game.time += dt;
    if (!game.invOpen) player.update(dt, input, fx); else player.idle(dt);
    wisps.update(dt, game.time, player);
    fx.update(dt, renderer);
    renderer.updateCamera(dt, player);
    hud.update(dt, game);
    renderer.updateAmbience(dt, hud.currentRegion);
    updateLights();
    renderer.render(game, dt);
    hud.perf(dt, performance.now() - t0);
    saveT += dt;
    if (saveT > 6) { saveT = 0; writeSave(game); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame((t) => { last = t; requestAnimationFrame(tick); });

  addEventListener('pagehide', () => writeSave(game));
  document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(game); });

  loading.classList.add('done');
  document.getElementById('hud').classList.add('on');
  setTimeout(() => hud.showRegion(hud.region), 900);
  setTimeout(() => loading.remove(), 2200);
}

boot().catch((err) => {
  console.error(err);
  const l = document.getElementById('loading');
  if (l) l.querySelector('.ld-sub').textContent = 'The dream failed to load: ' + err.message;
});
