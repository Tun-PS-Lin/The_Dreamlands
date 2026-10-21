// Inventory: the data model (bag + equipment) and the UI (E to open).
// UI features: drag and drop with a smoothed ghost, valid-slot highlighting, double-click or
// right-click to equip/unequip, hover details, stat tweening, FLIP-animated sorting,
// and a turnable glyph preview of the character that reflects the equipped gear.

import { ITEMS, EQUIP_SLOTS, SLOT_ACCEPT, SLOT_LABEL, TYPE_LABEL, TYPE_ORDER, RARITY } from './items.js';
import { asciiSprite, makeCanvas } from './glyphs.js';
import { buildPlayerFrames, DIRS } from './player.js';

const BAG_SIZE = 32;
const BASE = { hp: 120, mp: 40, lucidity: 100, light: 150 };

// ------------------------------------------------------------------ model
export class Inventory {
  constructor(saved) {
    this.uid = 1;
    this.bag = new Array(BAG_SIZE).fill(null);
    this.equip = Object.fromEntries(EQUIP_SLOTS.map((k) => [k, null]));
    if (!(saved && this.load(saved))) this.defaults();
  }
  make(id, count = 1) { return { uid: this.uid++, id, count }; }
  defaults() {
    Object.assign(this.equip, {
      head: this.make('sleepers_hood'), chest: this.make('salt_coat'), legs: this.make('tide_greaves'),
      feet: this.make('wading_boots'), weapon: this.make('rusted_sword'), offhand: this.make('driftwood_shield'),
    });
    const start = [['wisp_lantern'], ['clapper_amulet'], ['key_ring'], ['reed_band'], ['lost_keys'], ['unsent_letter'],
      ['map_fragment'], ['spectacles'], ['amber_bottle', 3], ['wisp_jar'], ['small_bell'], ['tallow_stub', 4],
      ['memory_shell', 2], ['wooden_horse']];
    start.forEach(([id, c], i) => { this.bag[i] = this.make(id, c || 1); });
  }
  load(s) {
    try {
      if (!Array.isArray(s.bag) || s.bag.length !== BAG_SIZE || typeof s.equip !== 'object') return false;
      const mk = (v) => (Array.isArray(v) && ITEMS[v[0]] ? this.make(v[0], Math.max(1, v[1] | 0)) : null);
      this.bag = s.bag.map(mk);
      for (const k of EQUIP_SLOTS) {
        const it = mk(s.equip[k]);
        this.equip[k] = it && SLOT_ACCEPT[k] === ITEMS[it.id].type ? it : null;
      }
      return true;
    } catch { return false; }
  }
  serialize() {
    const ser = (v) => (v ? [v.id, v.count] : null);
    return { bag: this.bag.map(ser), equip: Object.fromEntries(EQUIP_SLOTS.map((k) => [k, ser(this.equip[k])])) };
  }
  get(ref) { return ref.kind === 'bag' ? this.bag[ref.key] : this.equip[ref.key]; }
  set(ref, v) { if (ref.kind === 'bag') this.bag[ref.key] = v; else this.equip[ref.key] = v; }
  accepts(ref, item) {
    if (!item || ref.kind === 'bag') return true;
    return SLOT_ACCEPT[ref.key] === ITEMS[item.id].type;
  }
  firstEmpty() { return this.bag.indexOf(null); }

  move(from, to) {
    if (from.kind === to.kind && from.key === to.key) return false;
    const a = this.get(from), b = this.get(to);
    if (!a || !this.accepts(to, a)) return false;
    if (b && b.id === a.id && ITEMS[a.id].stack && to.kind === 'bag') {
      b.count += a.count; this.set(from, null); return true;
    }
    if (b && !this.accepts(from, b)) {
      if (to.kind !== 'bag') return false;
      const e = this.firstEmpty();
      if (e < 0) return false;
      this.set(to, a); this.set(from, null); this.bag[e] = b;
      return true;
    }
    this.set(to, a); this.set(from, b);
    return true;
  }

  // Equip from the bag, or unequip into the bag.
  quick(ref) {
    const it = this.get(ref);
    if (!it) return null;
    if (ref.kind === 'equip') {
      const e = this.firstEmpty();
      if (e < 0) return null;
      const to = { kind: 'bag', key: e };
      return this.move(ref, to) ? to : null;
    }
    const type = ITEMS[it.id].type;
    let key = EQUIP_SLOTS.find((k) => SLOT_ACCEPT[k] === type);
    if (!key) return null;
    if (type === 'ring') key = !this.equip.ring1 ? 'ring1' : !this.equip.ring2 ? 'ring2' : 'ring1';
    const to = { kind: 'equip', key };
    return this.move(ref, to) ? to : null;
  }

  sort() {
    const items = this.bag.filter(Boolean);
    // merge stacks
    const merged = [];
    for (const it of items) {
      const m = ITEMS[it.id].stack && merged.find((x) => x.id === it.id);
      if (m) m.count += it.count; else merged.push(it);
    }
    merged.sort((a, b) => {
      const A = ITEMS[a.id], B = ITEMS[b.id];
      return TYPE_ORDER.indexOf(A.type) - TYPE_ORDER.indexOf(B.type)
        || RARITY[B.rarity].rank - RARITY[A.rarity].rank
        || A.name.localeCompare(B.name);
    });
    this.bag = new Array(BAG_SIZE).fill(null);
    merged.forEach((it, i) => { this.bag[i] = it; });
  }

  stats() {
    const s = { armour: 0, dmg: [1, 2], light: BASE.light, lucidity: BASE.lucidity, speed: 0, hp: BASE.hp, mp: BASE.mp };
    for (const k of EQUIP_SLOTS) {
      const it = this.equip[k];
      if (!it) continue;
      const st = ITEMS[it.id].stats || {};
      s.armour += st.armour || 0;
      s.light += st.light || 0;
      s.lucidity += st.lucidity || 0;
      s.speed += st.speed || 0;
      if (st.dmg) s.dmg = st.dmg;
    }
    return s;
  }

  // What the renderer needs to draw the character and light the world.
  look() {
    const st = this.stats();
    const off = this.equip.offhand;
    return {
      weapon: this.equip.weapon?.id || null,
      offhand: off ? ITEMS[off.id].sub : null,
      head: !!this.equip.head, chest: !!this.equip.chest,
      light: st.light, speed: st.speed, lantern: off ? ITEMS[off.id].sub === 'lantern' : false,
    };
  }
}

// ------------------------------------------------------------------ icons
const iconCache = new Map();
export function itemIcon(id) {
  let u = iconCache.get(id);
  if (u) return u;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = asciiSprite(48, 48, (ctx) => ITEMS[id].icon(ctx), { cellW: 3, cellH: 4, font: 4.4, scale: dpr * 1.25, art: 3, bg: 0.5, boost: 1.22, lift: 18 });
  u = c.toDataURL();
  iconCache.set(id, u);
  return u;
}

// ------------------------------------------------------------------ UI
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export class InventoryUI {
  constructor(inv, { onChange, onToggle }) {
    this.inv = inv;
    this.onChange = onChange;
    this.onToggle = onToggle;
    this.open = false;
    this.root = document.getElementById('inventory');
    this.slotEls = new Map(); // "bag:3" / "equip:head" -> element
    this.drag = null;
    this.previewDir = 0;
    this.previewFrames = null;
    this.previewSig = '';
    this.shownStats = null;
    this.build();
    this.render();
  }

  refKey(ref) { return ref.kind + ':' + ref.key; }
  parseRef(el) {
    const [kind, key] = el.dataset.slot.split(':');
    return { kind, key: kind === 'bag' ? Number(key) : key };
  }

  build() {
    const r = this.root;
    r.innerHTML = '';
    r.append(h('div', 'inv-scrim'));
    const panel = h('div', 'inv-panel');
    panel.innerHTML = `
      <header class="inv-head">
        <div class="inv-title"><span>THE DREAMER</span><span class="sep">·</span><span class="dim">INVENTORY</span></div>
        <div class="inv-actions"><button class="btn" data-act="sort">SORT</button><button class="btn" data-act="close">CLOSE <kbd>E</kbd></button></div>
      </header>
      <div class="inv-body">
        <section class="inv-left">
          <div class="equip">
            <div class="equip-figure"><canvas class="inv-preview"></canvas><div class="fig-hint">drag to turn</div></div>
          </div>
          <div class="inv-stats"></div>
          <div class="bag-head"><span>BAG</span><span class="bag-count"></span></div>
          <div class="bag"></div>
        </section>
        <aside class="inv-detail"><div class="detail-inner"></div></aside>
      </div>
      <footer class="inv-foot">drag to move · double-click or right-click to equip / unequip · <kbd>E</kbd> or <kbd>Esc</kbd> to close</footer>`;
    r.append(panel);
    this.ghost = h('div', 'drag-ghost');
    this.ghost.append(h('img'));
    r.append(this.ghost);
    this.panel = panel;

    const equip = panel.querySelector('.equip');
    const pos = {
      head: [0, 0], amulet: [2, 0], weapon: [0, 1], offhand: [2, 1], ring1: [0, 2], ring2: [2, 2],
      chest: [1, 2, 0], legs: [1, 2, 1], feet: [1, 2, 2],
    };
    const bottom = h('div', 'equip-row');
    for (const k of EQUIP_SLOTS) {
      const el = this.makeSlot({ kind: 'equip', key: k }, SLOT_LABEL[k]);
      el.classList.add('slot-' + k);
      if (k === 'weapon' || k === 'offhand') el.classList.add('tall');
      if (pos[k].length === 3) bottom.append(el);
      else { el.style.gridColumn = pos[k][0] + 1; el.style.gridRow = pos[k][1] + 1; equip.append(el); }
    }
    bottom.style.gridColumn = 2; bottom.style.gridRow = 3;
    equip.append(bottom);

    const bag = panel.querySelector('.bag');
    for (let i = 0; i < BAG_SIZE; i++) {
      const el = this.makeSlot({ kind: 'bag', key: i });
      el.style.setProperty('--i', i);
      bag.append(el);
    }

    const stats = panel.querySelector('.inv-stats');
    this.statEls = {};
    for (const [k, label, color] of [['armour', 'ARMOUR', '#7fc4ff'], ['dmg', 'DAMAGE', '#ff8a7a'], ['light', 'LIGHT', '#ffd27a'], ['lucidity', 'LUCIDITY', '#b49af2'], ['speed', 'SPEED', '#8fe0a0']]) {
      const row = h('div', 'stat');
      row.innerHTML = `<div class="stat-top"><span class="stat-label">${label}</span><span class="stat-val"></span></div><div class="seg"><div class="seg-fill" style="--c:${color}"></div></div>`;
      stats.append(row);
      this.statEls[k] = { val: row.querySelector('.stat-val'), fill: row.querySelector('.seg-fill') };
    }

    this.detail = panel.querySelector('.detail-inner');
    this.preview = panel.querySelector('.inv-preview');
    this.bagCount = panel.querySelector('.bag-count');
    this.showDetail(null);

    panel.querySelector('[data-act="close"]').addEventListener('click', () => this.close());
    panel.querySelector('[data-act="sort"]').addEventListener('click', () => this.sort());
    r.querySelector('.inv-scrim').addEventListener('click', () => this.close());
    panel.addEventListener('contextmenu', (e) => e.preventDefault());

    // turn the preview by dragging
    const fig = panel.querySelector('.equip-figure');
    let turnX = null;
    fig.addEventListener('pointerdown', (e) => { turnX = e.clientX; fig.setPointerCapture(e.pointerId); this.turnIdle = 0; });
    fig.addEventListener('pointermove', (e) => {
      if (turnX == null) return;
      const d = e.clientX - turnX;
      if (Math.abs(d) > 28) { this.previewDir = (this.previewDir + (d > 0 ? 1 : 3)) % 4; turnX = e.clientX; this.turnIdle = 0; }
    });
    fig.addEventListener('pointerup', () => { turnX = null; });

    addEventListener('resize', () => this.fit());
    this.fit();
  }

  makeSlot(ref, label) {
    const el = h('div', 'slot');
    el.dataset.slot = this.refKey(ref);
    if (label) el.append(h('span', 'slot-label', label));
    const img = h('img', 'icon'); img.draggable = false; img.alt = '';
    el.append(img, h('span', 'count'));
    el.addEventListener('pointerdown', (e) => this.onDown(e, el));
    el.addEventListener('pointerenter', () => { if (!this.drag) this.hover(el); else el.classList.add('over'); });
    el.addEventListener('pointerleave', () => el.classList.remove('over'));
    el.addEventListener('dblclick', () => this.quick(el));
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.quick(el); });
    this.slotEls.set(el.dataset.slot, el);
    return el;
  }

  fit() {
    const W = 860, H = 690;
    const s = Math.min(1, (innerWidth - 24) / W, (innerHeight - 24) / H);
    this.panel.style.setProperty('--fit', s.toFixed(3));
  }

  // ---------------------------------------------------------------- open / close
  toggle() { this.open ? this.close() : this.show(); }
  show() {
    if (this.open) return;
    this.open = true;
    this.root.classList.remove('closing');
    this.root.classList.add('open', 'opening');
    this.root.setAttribute('aria-hidden', 'false');
    clearTimeout(this.openT);
    this.openT = setTimeout(() => this.root.classList.remove('opening'), 700);
    this.render();
    this.onToggle(true);
    this.turnIdle = 0;
    const loop = (t) => { if (!this.open) return; this.tickPreview(t); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  close() {
    if (!this.open) return;
    if (this.drag) this.cancelDrag();
    this.open = false;
    this.root.classList.remove('open', 'opening');
    this.root.classList.add('closing');
    this.root.setAttribute('aria-hidden', 'true');
    cancelAnimationFrame(this.raf);
    this.onToggle(false);
  }

  // ---------------------------------------------------------------- rendering
  render() {
    for (const [k, el] of this.slotEls) {
      const ref = this.parseRef(el);
      const it = this.inv.get(ref);
      const img = el.querySelector('.icon'), cnt = el.querySelector('.count');
      el.classList.toggle('filled', !!it);
      el.dataset.uid = it ? it.uid : '';
      for (const r of Object.keys(RARITY)) el.classList.toggle('r-' + r, !!it && ITEMS[it.id].rarity === r);
      if (it) {
        const src = itemIcon(it.id);
        if (img.getAttribute('src') !== src) img.src = src;
        img.style.visibility = 'visible';
        cnt.textContent = it.count > 1 ? it.count : '';
      } else {
        img.removeAttribute('src'); img.style.visibility = 'hidden'; cnt.textContent = '';
      }
    }
    this.bagCount.textContent = `${this.inv.bag.filter(Boolean).length} / ${BAG_SIZE}`;
    this.renderStats();
    if (!this.previewFrames) this.refreshPreview();
    else { clearTimeout(this.previewT); this.previewT = setTimeout(() => this.refreshPreview(), 200); }
  }

  renderStats() {
    const s = this.inv.stats();
    const from = this.shownStats || s;
    this.shownStats = s;
    const max = { armour: 40, dmg: 20, light: 300, lucidity: 130, speed: 15 };
    const t0 = performance.now(), dur = 380;
    cancelAnimationFrame(this.statRaf);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      const L = (a, b) => a + (b - a) * e;
      const v = {
        armour: Math.round(L(from.armour, s.armour)),
        dmg: [Math.round(L(from.dmg[0], s.dmg[0])), Math.round(L(from.dmg[1], s.dmg[1]))],
        light: Math.round(L(from.light, s.light)),
        lucidity: Math.round(L(from.lucidity, s.lucidity)),
        speed: Math.round(L(from.speed, s.speed)),
      };
      const E = this.statEls;
      E.armour.val.textContent = v.armour;
      E.dmg.val.textContent = `${v.dmg[0]}–${v.dmg[1]}`;
      E.light.val.textContent = v.light;
      E.lucidity.val.textContent = v.lucidity;
      E.speed.val.textContent = `+${v.speed}%`;
      E.armour.fill.style.width = (Math.min(1, v.armour / max.armour) * 100) + '%';
      E.dmg.fill.style.width = (Math.min(1, v.dmg[1] / max.dmg) * 100) + '%';
      E.light.fill.style.width = (Math.min(1, v.light / max.light) * 100) + '%';
      E.lucidity.fill.style.width = (Math.min(1, v.lucidity / max.lucidity) * 100) + '%';
      E.speed.fill.style.width = (Math.min(1, v.speed / max.speed) * 100) + '%';
      if (k < 1) this.statRaf = requestAnimationFrame(step);
    };
    this.statRaf = requestAnimationFrame(step);
  }

  refreshPreview() {
    const look = this.inv.look();
    const sig = JSON.stringify(look);
    if (sig === this.previewSig && this.previewFrames) return;
    this.previewSig = sig;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // rendered at the size it is shown, with finer glyph cells than in the world
    this.previewFrames = buildPlayerFrames(look, dpr * 2.2, { cellW: 2.1, cellH: 3.1, font: 3.3, art: 4, bg: 0.46, boost: 1.45, lift: 34 }, ['idle0', 'idle1']);
    this.previewDpr = dpr;
  }

  tickPreview(t) {
    if (!this.previewFrames) return;
    this.turnIdle = (this.turnIdle || 0) + 1 / 60;
    if (this.turnIdle > 3.2) { this.turnIdle = 0; this.previewDir = (this.previewDir + 1) % 4; }
    const order = ['down', 'right', 'up', 'left'];
    const dir = order[this.previewDir];
    const fr = this.previewFrames[dir]['idle' + (Math.floor(t / 900) % 2)];
    const c = this.preview, g = c.getContext('2d');
    const box = c.parentElement.getBoundingClientRect();
    const fit = parseFloat(getComputedStyle(this.panel).getPropertyValue('--fit')) || 1;
    const W = Math.round((box.width / fit) * this.previewDpr), H = Math.round((box.height / fit) * this.previewDpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    g.clearRect(0, 0, W, H);
    const sc = Math.min(1.25, (H * 0.9) / fr.c.height);
    const dw = fr.c.width * sc, dh = fr.c.height * sc;
    const x = W / 2 - fr.ax * sc, y = H * 0.96 - fr.ay * sc;
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.beginPath(); g.ellipse(W / 2, H * 0.955, dw * 0.32, dh * 0.03, 0, 0, Math.PI * 2); g.fill();
    g.imageSmoothingEnabled = true;
    g.drawImage(fr.c, x, y, dw, dh);
  }

  showDetail(it) {
    const d = this.detail;
    d.classList.remove('in'); void d.offsetWidth; d.classList.add('in');
    if (!it) {
      d.innerHTML = `<div class="detail-empty"><div class="de-glyph">?</div><div>Hover an item to inspect it.</div><div class="de-sub">Things washed up on the Shore are rarely what they seem.</div></div>`;
      return;
    }
    const def = ITEMS[it.id], rar = RARITY[def.rarity];
    const st = def.stats || {};
    const lines = [];
    if (st.dmg) lines.push(`<li><span>Damage</span><b>${st.dmg[0]}–${st.dmg[1]}</b></li>`);
    if (st.armour) lines.push(`<li><span>Armour</span><b>+${st.armour}</b></li>`);
    if (st.light) lines.push(`<li><span>Light radius</span><b>+${st.light}</b></li>`);
    if (st.lucidity) lines.push(`<li><span>Lucidity</span><b>+${st.lucidity}</b></li>`);
    if (st.speed) lines.push(`<li><span>Move speed</span><b>+${st.speed}%</b></li>`);
    const equippable = def.type !== 'misc' && def.type !== 'consumable';
    d.innerHTML = `
      <div class="d-icon r-${def.rarity}"><img src="${itemIcon(it.id)}" alt=""></div>
      <div class="d-name" style="color:${rar.color}">${def.name}</div>
      <div class="d-type"><span>${TYPE_LABEL[def.type]}</span><span class="d-rar" style="color:${rar.color}">${rar.label}</span></div>
      ${lines.length ? `<ul class="d-stats">${lines.join('')}</ul>` : ''}
      <p class="d-desc">${def.desc}</p>
      ${it.count > 1 ? `<div class="d-meta">Carrying ${it.count}</div>` : ''}
      <div class="d-hint">${equippable ? 'Double-click to equip or unequip' : def.type === 'consumable' ? 'Cannot be used yet' : 'Keepsake'}</div>`;
  }

  hover(el) {
    const it = this.inv.get(this.parseRef(el));
    if (it && it.uid !== this.detailUid) { this.detailUid = it.uid; this.showDetail(it); }
  }

  // ---------------------------------------------------------------- actions
  // FLIP: remember where each item's icon was, apply the change, animate from old to new spot.
  withFlip(fn) {
    const before = new Map();
    for (const el of this.slotEls.values()) if (el.dataset.uid) before.set(el.dataset.uid, el.querySelector('.icon').getBoundingClientRect());
    const changed = fn();
    if (!changed) return false;
    this.render();
    for (const el of this.slotEls.values()) {
      const uid = el.dataset.uid;
      if (!uid || !before.has(uid)) continue;
      const img = el.querySelector('.icon');
      const a = before.get(uid), b = img.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      img.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0,0)' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    this.onChange();
    return true;
  }

  pop(ref) {
    const el = this.slotEls.get(this.refKey(ref));
    if (!el) return;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  quick(el) {
    const ref = this.parseRef(el);
    let to = null;
    this.withFlip(() => { to = this.inv.quick(ref); return !!to; });
    if (to) { this.pop(to); this.detailUid = null; this.hover(this.slotEls.get(this.refKey(to))); }
  }

  sort() { this.withFlip(() => { this.inv.sort(); return true; }); }

  // ---------------------------------------------------------------- drag and drop
  onDown(e, el) {
    if (e.button !== 0) return;
    const ref = this.parseRef(el);
    const it = this.inv.get(ref);
    if (!it) return;
    e.preventDefault();
    this.pending = { el, ref, it, x: e.clientX, y: e.clientY, id: e.pointerId };
    const move = (ev) => this.onMove(ev);
    const up = (ev) => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); this.onUp(ev); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }

  onMove(e) {
    if (this.pending && !this.drag) {
      if (Math.hypot(e.clientX - this.pending.x, e.clientY - this.pending.y) < 5) return;
      this.startDrag(this.pending, e);
    }
    if (!this.drag) return;
    this.drag.tx = e.clientX; this.drag.ty = e.clientY;
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.slot');
    if (over !== this.drag.over) {
      this.drag.over?.classList.remove('over');
      this.drag.over = over && this.root.contains(over) ? over : null;
      this.drag.over?.classList.add('over');
    }
  }

  startDrag(p, e) {
    const rect = p.el.querySelector('.icon').getBoundingClientRect();
    this.drag = { ...p, tx: e.clientX, ty: e.clientY, gx: rect.left + rect.width / 2, gy: rect.top + rect.height / 2, vx: 0, over: null, size: rect.width };
    p.el.classList.add('lifted');
    this.root.classList.add('dragging');
    const img = this.ghost.querySelector('img');
    img.src = itemIcon(p.it.id);
    this.ghost.style.width = this.ghost.style.height = rect.width + 'px';
    this.ghost.classList.remove('drop', 'back');
    this.ghost.classList.add('on');
    for (const el of this.slotEls.values()) {
      const ref = this.parseRef(el);
      if (ref.kind !== 'equip') continue;
      el.classList.toggle('can-drop', this.inv.accepts(ref, p.it));
      el.classList.toggle('no-drop', !this.inv.accepts(ref, p.it));
    }
    this.showDetail(p.it); this.detailUid = p.it.uid;
    const tick = () => {
      if (!this.drag) return;
      const d = this.drag;
      const nx = d.gx + (d.tx - d.gx) * 0.42, ny = d.gy + (d.ty - d.gy) * 0.42;
      d.vx = d.vx * 0.7 + (nx - d.gx) * 0.3;
      d.gx = nx; d.gy = ny;
      const rot = Math.max(-14, Math.min(14, d.vx * 1.4));
      this.ghost.style.transform = `translate3d(${d.gx - d.size / 2}px, ${d.gy - d.size / 2}px, 0) rotate(${rot.toFixed(1)}deg) scale(1.12)`;
      d.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  onUp(e) {
    const p = this.pending;
    this.pending = null;
    if (!this.drag) return;
    const d = this.drag;
    cancelAnimationFrame(d.raf);
    const target = d.over;
    let ok = false, toRef = null;
    if (target) {
      toRef = this.parseRef(target);
      ok = this.inv.accepts(toRef, d.it) && this.inv.move(d.ref, toRef);
    }
    const dest = ok ? target : d.el;
    const r = dest.querySelector('.icon').getBoundingClientRect();
    this.ghost.classList.add(ok ? 'drop' : 'back');
    this.ghost.style.transform = `translate3d(${r.left + r.width / 2 - d.size / 2}px, ${r.top + r.height / 2 - d.size / 2}px, 0) rotate(0deg) scale(1)`;
    const finish = () => {
      this.ghost.classList.remove('on', 'drop', 'back');
      d.el.classList.remove('lifted');
      this.root.classList.remove('dragging');
      for (const el of this.slotEls.values()) el.classList.remove('can-drop', 'no-drop', 'over');
      this.drag = null;
      if (ok) {
        this.render();
        this.pop(toRef);
        this.onChange();
      }
    };
    setTimeout(finish, 170);
  }

  cancelDrag() {
    if (!this.drag) return;
    cancelAnimationFrame(this.drag.raf);
    this.ghost.classList.remove('on', 'drop', 'back');
    this.drag.el.classList.remove('lifted');
    this.root.classList.remove('dragging');
    for (const el of this.slotEls.values()) el.classList.remove('can-drop', 'no-drop', 'over');
    this.drag = null;
  }
}
