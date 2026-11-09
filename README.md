# snake-game

A snake game as a web component. Add one script, add one tag, and the game shows up. No dependencies, no framework.

```html
<script src="dist/snake-game.js"></script>
<snake-game open></snake-game>
```

By default the game starts closed. The `open` attribute makes it open by itself, as a modal on top of the page.

## Install

There are two ways. Pick one.

**A. One file (works by double click, no server).** Copy `dist/snake-game.js` to your site and load it with a normal script tag. It registers `<snake-game>` and exposes a global `SnakeGame`.

```html
<script src="snake-game.js"></script>
```

**B. ES modules.** Copy the `src/` folder and import it. This needs a web server, because browsers block modules on `file://`.

```html
<script type="module" src="src/snake-game.js"></script>
```

The file `dist/snake-game.js` is generated. Do not edit it. After changing anything in `src/`, run `npm run build`.

Browser support: the modal uses the native `<dialog>` element, so you need a browser from 2022 or newer (Safari 15.4+, Firefox 98+, Chrome 99+). When the page is opened through `file://`, some browsers (Safari in particular) may not save the best score.

## Ways to open the game

```html
<!-- always open, on top of the page -->
<snake-game open></snake-game>

<!-- from a button -->
<button onclick="document.querySelector('snake-game').open()">Play</button>
<snake-game></snake-game>

<!-- from a key or a secret code -->
<script>
  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    typed = (typed + e.key.toLowerCase()).slice(-5);
    if (typed === 'snake') document.querySelector('snake-game').open();
  });
</script>

<!-- on a 404 page, inside the page instead of on top of it -->
<snake-game mode="inline" open></snake-game>
```

In inline mode the game fills the width of its container, also when the container is a flex or grid row (the tag gets `width: 100%`). To use another width, set it on the tag in your CSS, for example `snake-game { width: 480px; }`. Your rule wins over the default. Every time the game opens, a new game starts. If the container has no size yet (for example, it is hidden), the game starts on the first frame with a size, and `pause()` and `restart()` do nothing until then. Escape or the close button closes it.

## Attributes

Values that are not valid go back to the default, with one warning in the console.

| Attribute | Values | Default | What it does |
| --- | --- | --- | --- |
| `open` | boolean | closed | Opens the game. `open()` and `close()` keep it in sync. |
| `mode` | `modal` / `inline` | `modal` | On top of the page, or in place of the tag. Changing it while open closes and reopens the game (emits `snake-close` and `snake-open`). |
| `grid` | `dots` / `squares` / `lines` / `none` | `dots` | Dots, small filled squares, graph paper, or nothing. |
| `snake` | `taper` / `uniform` | `taper` | The body gets thinner toward the tail, or stays the same size. |
| `food` | `circle` / `square` | `circle` | Shape of the food. |
| `food-halo` | `soft` / `none` | `soft` | Glow around the food. |
| `intro` | `wave` / `cascade` / `none` | `wave` | How the grid appears when the game opens. |
| `transitions` | `on` / `off` | `on` | Smooth growing of the head and shrinking of the tail. |
| `wrap` | boolean | off | Cross the walls instead of losing. Applies at the next restart. |
| `cols`, `rows` | integers | automatic | Fixed size of the grid. Automatic means "fit the space" (at least 5). |
| `speed` | moves per second | `5` | Starting speed. |
| `speed-step` | number | `0.3` | Speed added for each food. |
| `max-speed` | number | `14` | Speed limit. |
| `start-length` | integer | `3` | Starting length of the snake. |
| `best-key` | text | `snake-game-best` | `localStorage` key of the best score. Empty turns it off. |

### Texts

All texts can be replaced. Use `{score}` and `{best}` where they apply.

| Attribute | Default |
| --- | --- |
| `text-title` | `Snake game` |
| `text-instructions` | `Use arrow keys or WASD to move, or swipe on touch screens. Space pauses. Escape closes.` |
| `text-score` | `{score}` |
| `text-best` | `Best {best}` |
| `text-game-over-one` | `Game over, {score} point` |
| `text-game-over-other` | `Game over, {score} points` |
| `text-play-again` | `Play again` |
| `text-pause` / `text-resume` | `Pause` / `Resume` |
| `text-paused` | `Paused. Press space to continue.` |
| `text-close` | `Close game` |
| `text-ate` | `Score {score}` (read by screen readers when the snake eats) |

The game over text depends on the number (`Intl.PluralRules`). The language comes from the closest `lang` attribute (the tag itself, a parent, or `<html lang>`), then `en`. For languages with more forms, also set `text-game-over-zero`, `-two`, `-few` or `-many`. A missing form falls back to `-other`.

```html
<snake-game lang="pt-BR"
  text-game-over-one="Fim de jogo, {score} ponto"
  text-game-over-other="Fim de jogo, {score} pontos"></snake-game>
```

## Methods and properties

`open()`, `close()`, `toggle()`, `pause()`, `resume()`, `togglePause()`, `restart()`, `refreshStyles()`.

Properties: `isOpen` (read only), `engine` (read only, the current game), `renderers` (get and set, see below).

## Events

All are `CustomEvent`s that bubble and cross the shadow DOM. Data is in `event.detail`.

| Event | detail |
| --- | --- |
| `snake-open`, `snake-close` | none |
| `snake-eat` | `{ score, length }` |
| `snake-score` | `{ score, best }` |
| `snake-gameover` | `{ score, best, reason }` with `reason` as `wall`, `self` or `full` |
| `snake-pause`, `snake-resume`, `snake-restart` | none |

Exception: if the element is removed from the page while the game is open, it still emits `snake-close`, but the element is already out of the page, so the event does not reach `document`. To catch that case, listen on the element itself.

## Looks: design tokens

Every visual value is a CSS variable. Set it on the tag, on a parent, or on `:root`. The defaults live in `src/theme.js`, one comment per token.

```css
snake-game { --snake-color: rebeccapurple; --snake-spacing: 40px; }
```

| Token | What it is |
| --- | --- |
| `--snake-grid-color`, `--snake-grid-dot-size`, `--snake-grid-line-width` | Grid color, dot size, line thickness |
| `--snake-spacing` | Distance between cell centers |
| `--snake-color`, `--snake-head-size`, `--snake-tail-size` | Snake |
| `--snake-food-color`, `--snake-food-size`, `--snake-food-halo-color`, `--snake-food-halo-size` | Food and its glow |
| `--snake-background`, `--snake-backdrop` | Board background and the page cover in modal mode |
| `--snake-board-width`, `--snake-board-height` | Maximum board size |
| `--snake-text-color`, `--snake-font`, `--snake-font-size` | Texts |
| `--snake-focus-color`, `--snake-button-size` | Keyboard focus outline, minimum button size |
| `--snake-duration`, `--snake-intro-duration` | Transitions and grid entrance |

Changes are picked up while the game is open. You can force it with `refreshStyles()`. Keep the text color at a contrast of at least 4.5:1 with the background (the test page warns you).

## Your own drawing

Replace any of `grid`, `snake`, `food`. What you leave out keeps the default drawing.

```js
const game = document.querySelector('snake-game');
game.renderers = {
  snake(ctx, scene) {
    ctx.fillStyle = scene.tokens.color;
    for (const s of scene.segments) ctx.fillRect(s.cx - s.size / 2, s.cy - s.size / 2, s.size, s.size);
  },
};
```

Order: clear, grid, food, snake. The `ctx` is already scaled to CSS pixels. `scene` has `cols`, `rows`, `spacing`, `scale`, `width`, `height`, `dpr`, `center(x, y)`, `tokens` (resolved: colors as strings, sizes in px, times in ms), `options`, `state`, `time`, `cells`, `segments` and `foodItem`. Use `scene.tokens` instead of fixed values. If your function throws, the default drawing is used and the error is logged once. The defaults are exported as `drawGrid`, `drawSnake` and `drawFood`.

## The engine alone

The rules have no browser code. Use them for tests or for another interface.

```js
import { createEngine } from './src/engine.js';
const engine = createEngine({ cols: 12, rows: 12 });
engine.turn('down');
engine.step();            // you decide the clock
console.log(engine.getState());
```

From the single file it is `SnakeGame.createEngine(...)`. The global `SnakeGame` also has `SnakeGameElement`, the three draw functions, `directionFromKey` and `directionFromSwipe`. It never replaces an existing `window.SnakeGame`.

## Controls and accessibility

- Keyboard: arrow keys or WASD, Space pauses, Escape closes. Keys only act while the game is open (in `inline` mode, while it has focus).
- Touch: swipe. The page does not scroll while you swipe over the board.
- The board is labeled, scores and game over are announced, buttons are real buttons with at least 44 px, and the focus outline is visible.
- With `prefers-reduced-motion`, nothing animates and the game opens paused.

## Develop

```sh
npm test                 # automatic tests (Node, no dependencies)
npm run build            # regenerates dist/snake-game.js
node scripts/serve.js    # http://localhost:8000/demo/ and /examples/module.html
```

`python3 -m http.server 8000` works as well. `examples/minimal.html` uses the single file and opens by double click. `demo/index.html` is a test page with every option, the tokens, a contrast warning and an event log.

## License

MIT. See `LICENSE`.
