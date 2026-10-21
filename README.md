# The Coil

An ASCII-styled Lovecraftian exploration RPG that runs in the browser. You fall asleep and wake on the
**Shore of Lost Hours**, the outer tip of a spiral dream-world called the Coil. North of the shore lie the
**Lantern Fens**.

This is the first playable prototype: exploration, movement, dash and inventory. There are no enemies or
other mechanics yet.

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` (or arrows) | Move |
| `Space` | Dash |
| `E` (or `I`) | Open / close inventory |
| `Esc` | Close inventory |
| `1` to `8` | Hotbar (abilities not learned yet) |
| `` ` `` | Show / hide the FPS readout |

Inventory: drag items between slots, double-click or right-click to equip and unequip, **Sort** to tidy the
bag, drag the character preview to turn it. Equipping the **Wisp Lantern** in the off-hand changes your light.

## Run it locally

The game uses JavaScript modules, so it must be served over HTTP (opening `index.html` directly will not work).

```bash
# any one of these, from the project folder
python3 -m http.server 8080
npx http-server . -p 8080 -c-1
```

Then open <http://localhost:8080>.

Useful URL options:

- `?reset` clears the local save (position, inventory, explored map) and starts fresh.
- `?debug` exposes `window.__coil` in the console for testing.

## Put it on GitHub Pages

1. Create a repository and push this folder (no build step is needed).
2. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`.
3. The game will be served at `https://<your-user>.github.io/<repo-name>/`.

## Project structure

```
index.html          page shell, HUD markup
css/style.css       all UI styling (HUD, inventory, toasts, loading screen)
js/main.js          boot, game loop, wiring between systems
js/config.js        tuning constants: cell size, world size, player speed and dash
js/world.js         procedural world: Shore, Fens, landmarks, props, lights (no DOM, runs in Node too)
js/terrain.js       terrain types (glyphs, colours, speed, collision) and region moods
js/props.js         vector art for props (lighthouse, ship-houses, bells, huts, well…)
js/playerArt.js     vector art for the Dreamer in every direction and pose
js/glyphs.js        glyph atlas + the "asciify" converter that turns art into glyph sprites
js/render.js        renderer: cached ground chunks, water, sprites, fog, lighting, labels
js/player.js        movement, dash, collision, animation frames
js/fx.js            footprints, dust, ripples, drifting motes
js/wisps.js         fen wisps (atmosphere and light)
js/hud.js           party frame, minimap with fog of war, hotbar, toasts, FPS
js/items.js         item definitions and icon art
js/inventory.js     inventory model and UI (drag and drop, equip, sort, preview)
js/input.js         keyboard input
js/save.js          local save
```

## How the ASCII look works

Nothing is drawn from image files. Every object is painted as simple vector art on a hidden canvas, then
converted to glyphs: each small cell of the art is averaged, its brightness picks a character from a density
ramp (` .:-=+*%#@`) and its colour tints the character. The results are cached as sprites.

The ground is generated as a grid of glyphs and rendered once into chunks, which are reused every frame. Only
water crests, particles, sprites and the light map are drawn per frame, which keeps it smooth.

## Performance notes

- Ground chunks are cached (least-recently-used) and new ones are prepared one per frame ahead of the camera.
- Lighting is drawn at half resolution and scaled up.
- Character and prop sprites are rebuilt only when equipment or screen scale changes.
- The FPS readout (`` ` ``) shows frames per second and the JavaScript time per frame.

## Tuning

Most feel parameters live in `js/config.js` (`PLAYER.walkSpeed`, `dashSpeed`, `dashTime`, `dashCooldown`).
Region darkness, fog and tint are in `js/terrain.js` (`REGION_INFO`). The world seed is `SEED` in
`js/config.js`; change it for a different coastline and fens.
