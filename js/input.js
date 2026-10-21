// Keyboard input. Movement keys are polled; action keys fire callbacks once per press.
// Uses physical key positions (event.code), so WASD works on any keyboard layout.

export class Input {
  constructor() {
    this.keys = new Set();
    this.handlers = new Map();
    this.dashAt = 0;
    this.enabled = true;
    addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'Space') this.dashAt = performance.now();
      const fns = this.handlers.get(e.code);
      if (fns) for (const fn of fns) fn(e);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.keys.clear(); });
  }
  on(code, fn) {
    if (!this.handlers.has(code)) this.handlers.set(code, []);
    this.handlers.get(code).push(fn);
  }
  get left() { return this.enabled && (this.keys.has('KeyA') || this.keys.has('ArrowLeft')); }
  get right() { return this.enabled && (this.keys.has('KeyD') || this.keys.has('ArrowRight')); }
  get up() { return this.enabled && (this.keys.has('KeyW') || this.keys.has('ArrowUp')); }
  get down() { return this.enabled && (this.keys.has('KeyS') || this.keys.has('ArrowDown')); }
  // A dash press is buffered briefly so pressing just before the cooldown ends still counts.
  takeDash() {
    if (this.enabled && this.dashAt && performance.now() - this.dashAt < 150) { this.dashAt = 0; return true; }
    return false;
  }
}
