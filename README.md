# snake-game

[Português (Brasil)](README.pt-BR.md)

Live demo: https://akacaja.github.io/snake-game/demo/

A snake game as a web component. Add one script, add one tag, and the game shows up. No dependencies, no framework.

```html
<script src="dist/snake-game.js"></script>
<snake-game open></snake-game>
```

By default the game starts closed. The `open` attribute makes it open by itself, as a modal on top of the page.

## Install

There are two ways. Pick one.

**A. One file (works by double click, no server).** Copy `dist/snake-game.js` to your site and load it with a normal script tag. It registers `<snake-game>` and exposes a global `SnakeGame`. Size: **15.4 KB** gzipped (`dist/snake-game.js`, measured with Node's zlib, default level).

```html
<script src="snake-game.js"></script>
```

**B. ES modules.** Copy the `src/` folder (and `skins/` or `addons/`, if you use those extras) and import it. This needs a web server, because browsers block modules on `file://`.

```html
<script type="module" src="src/snake-game.js"></script>
```

The file `dist/snake-game.js` is generated. Do not edit it. It has no comments (the code in `src/` has them). `addons/` and `skins/` are generated too, from `src/addons/` and `src/skins/`. After changing anything in `src/`, run `npm run build`.

Extras like skins and the leaderboard are always optional files: the main file never includes them. The leaderboard is `addons/leaderboard.js`, **6.4 KB** gzipped (see [Leaderboard](#leaderboard)).

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
| `food` | `circle` / `square` | `circle` | Shape of the food (not for emoji food). |
| `food-halo` | `soft` / `none` | `soft` | Glow around the food (not for emoji food). |
| `intro` | `wave` / `cascade` / `none` | `wave` | How the grid appears when the game opens. |
| `transitions` | `on` / `off` | `on` | Smooth shrinking of the tail tip. |
| `skin` | name of a skin | none | Theme of the food (emoji) and of the colors. See [Skins](#skins). |
| `skin-palette` | `on` / `off` | `on` | `off` keeps the colors of your site and uses only the emoji of the skin. |
| `wrap` | boolean | off | Cross the walls instead of losing. Applies at the next restart. |
| `cols`, `rows` | integers | automatic | Fixed size of the grid. Automatic means "fit the space" (at least 5). |
| `speed` | moves per second | `5` | Starting speed. |
| `speed-step` | number | `0.3` | Speed added for each food. |
| `max-speed` | number | `14` | Speed limit. |
| `start-length` | integer | `3` | Starting length of the snake. |
| `best-key` | text | `snake-game-best` | `localStorage` key of the best score. Empty turns it off. |
| `leaderboard` | `on` / `off` | `on` | `off` ends a game as in version 0.2.0. Only does something when the leaderboard file is loaded. Read at the end of each game. |
| `leaderboard-url` | address | none | Sends the scores to a service and shows its Top 10. Without it, nothing leaves the browser. See [Leaderboard](#leaderboard). |
| `leaderboard-key` | text | `snake-game-leaderboard` | Start of the `localStorage` keys of the leaderboard. Empty stores nothing. Must start with a letter or a number: a value that starts with `-` works as empty (nothing is stored, the list lasts until the page closes) and gives one warning in the console. Do not use the same value as `best-key`. |

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
| `text-ate-food` | `Ate {food}. Score {score}` (the same, when the food is an emoji of a skin; `{food}` is its name) |

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
| `snake-leaderboard-save` | `{ name, score }`, when a name was saved (leaderboard file only) |
| `snake-leaderboard-error` | `{ code }` with `code` as `format`, `personal_data`, `rejected`, `taken`, `rate_limited` or `offline` (leaderboard file only) |

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
| `--snake-color`, `--snake-gap`, `--snake-head-size`, `--snake-tail-size` | Snake and the space between its dots |
| `--snake-food-color`, `--snake-food-size`, `--snake-food-halo-color`, `--snake-food-halo-size`, `--snake-food-emoji-size` | Food and its glow. `--snake-food-emoji-size`: size of an emoji food, as a share of the spacing (percentage, default `75%`, so 24px when the spacing is 32px; it shrinks with the grid) |
| `--snake-background`, `--snake-backdrop` | Board background and the page cover in modal mode |
| `--snake-board-width`, `--snake-board-height`, `--snake-board-share` | Maximum board size, and the share of a phone screen the board takes (percentage, default `75%`) |
| `--snake-text-color`, `--snake-font`, `--snake-font-size` | Texts |
| `--snake-focus-color`, `--snake-button-size` | Keyboard focus outline, minimum button size |
| `--snake-highlight-color` | Your own name in the Top 10 (bold too). Default: the focus color. Keep 4.5:1 with the background. A skin can set it |
| `--snake-field-font-size` | Text size of the name field (default `16px`; keep it at 16px or more, so iPhones do not zoom in) |
| `--snake-duration`, `--snake-intro-duration` | Transitions and grid entrance |

By default the head is the spacing minus `--snake-gap` (30px) and the tip of the tail is 80% of the head (24px, and it follows a head you set by hand), so the space on screen between the head and the next dot is 2px, even when the grid shrinks to fit a small board. The automatic head never gets smaller than 20% of a cell; a head you set by hand stays as it is. With `snake="taper"` the tail gets thinner and the space grows to about 8px at the tip; with `snake="uniform"` it is 2px along the whole body. `--snake-gap: 0` makes the dots touch and a negative value makes them overlap. You can still set `--snake-head-size` and `--snake-tail-size` to fixed values, like `16px` and `8px`.

On phones (touch screen, short side up to 540px), in modal mode, the board takes `--snake-board-share` of the screen: 75% of the width when the phone is lying down (score and buttons on the right) and 75% of the height when it is standing (score on top). Turning the phone keeps the game going. Computers, tablets and `inline` mode keep the normal layout.

Changes are picked up while the game is open. You can force it with `refreshStyles()`. Keep the text color at a contrast of at least 4.5:1 with the background (the test page warns you).

## Skins

A skin is an optional theme: the food becomes an emoji (a different one each time, never the same twice in a row) and the colors change. Without `skin`, the game looks the same as always. Three skins come in the `skins/` folder: `natal` (Christmas), `halloween` and `carnaval`. They are separate files, so they are not in `dist/snake-game.js`. Load the file you want, before or after the game, and set the attribute:

```html
<script src="skins/natal.js"></script>
<script src="dist/snake-game.js"></script>
<snake-game skin="natal" open></snake-game>
```

- Colors: your `--snake-*` variables win, then the colors of the skin, then the defaults. `skin-palette="off"` keeps your colors and uses only the emoji.
- An emoji that the device cannot show is left out of the draw. If none can be shown, the normal circle or square appears (with the food color of the palette). A name that is not registered, for example because the file did not load, gives one warning in the console and the normal game.
- `food` and `food-halo` only change the circle or square: an emoji food keeps its own shape and has no glow.
- Browsers with anti-fingerprinting protection (for example Firefox with `privacy.resistFingerprinting`, Brave or Tor Browser) can change the canvas check that sees which emojis the device shows. An emoji may then be left out (the normal circle or square appears) or show as an empty box.
- Your own skin: add `[name, skin]` to `globalThis.snakeGameSkins` (works in any order, also with ES modules) or call `SnakeGame.registerSkin(name, skin)`, which returns `true` or `false`. The palette takes only color tokens, without the `--snake-` prefix. A food needs an emoji and a name (`en` and `pt`, for example). What is not valid is skipped, with a warning. `foods` that is not a list is skipped, with a warning.

```js
(globalThis.snakeGameSkins = globalThis.snakeGameSkins || []).push(['pizza', {
  foods: [{ emoji: '🍕', names: { en: 'pizza', pt: 'pizza' } }],
  palette: { color: '#7a2e0e', 'food-color': '#c0392b' },
}]);
```

- Your own drawing: for an emoji food, `scene.foodItem.emoji` holds the text (otherwise `null`), and `foodItem.size` is already the emoji size.
- Accessibility: when the snake eats an emoji, the name is read in the language of the page (`text-ate-food`). With `prefers-reduced-motion`, nothing changes: the emoji appears without animation, like everything else.

## Leaderboard

After a game with points, the game asks for a username and then shows the Top 10, with your name highlighted. It is an optional file, like the skins, so it is not in `dist/snake-game.js`. Without the file, or with `leaderboard="off"`, the game ends exactly as in version 0.2.0.

On a phone lying down (modal only), when the keyboard leaves little room, only the row with the username, Save and Skip is shown above the keyboard, and the board and the score come back when the keyboard closes. After saving, the keyboard closes and your name is in view. Upright, on a computer and in inline mode, nothing changes.

### How to load

```html
<script src="addons/leaderboard.js"></script>
<script src="dist/snake-game.js"></script>
<snake-game open></snake-game>
```

The file can come before or after the game. With ES modules, add `import './addons/leaderboard.js';` (it is a side-effect import). In both cases `addons/leaderboard.js` must be published together with the rest of your site. It is **6.4 KB** gzipped.

- **Local (default).** The Top 10 lives in this browser (`localStorage`). Each username keeps only its best score. Three keys are used, all starting with `leaderboard-key` (default `snake-game-leaderboard`): the list (up to 10 entries), `-name` (the last username, to fill the field next time) and `-keys` (see the next point). With `leaderboard-key=""` nothing is stored (not even the last username) and the list lasts until the page closes. With an empty key and a service, each save counts as a new browser, so the service answers "name already taken" for a name saved before (the same for a value that starts with `-`). There is no filter for offensive names, because only the people who play on this browser see the list.
- **A service.** With `leaderboard-url="https://scores.example.org/api"` the game sends the score to that service and shows its Top 10. The first time a name is saved, the service returns a random key. The game keeps it in the browser (separately for each address) and sends it on the next saves, so only that browser can update that name. Another browser gets "This name is already taken". The requests, answers and error codes are in [docs/leaderboard-api.md](docs/leaderboard-api.md). If the service is down, the game says so and does not freeze.
- **Your own JavaScript.** If you do not want the standard format, set `game.leaderboard` (it wins over the address).

```js
game.leaderboard = {
  async submit({ name, score }) { return { top: [{ name, score }] }; }, // required: the Top 10, as a list of { name, score }
  async top() { return [{ name: 'Ana', score: 12 }]; },                // optional: used when submit gives no top
};
// To refuse a name, throw an error with a code:
// throw Object.assign(new Error('taken'), { code: 'taken' });
```

The codes are `format`, `personal_data`, `rejected`, `taken`, `rate_limited` and `offline`. An unknown code, an error without code or a bad `top` count as `offline`, and a call that takes more than 5 seconds too.

### Username rules

The game checks the name as the person saves (and, after the first error, at every key). The first rule that fails decides the message.

- No links, e-mails or 6 or more digits in a row (separators do not hide them: `ana-12-34-56` is refused). A link is `http:` or `https:`, `://`, `www.`, or an ending like `.com`, `.net` or `.org`. `ana.maria` is fine.
- Only letters (with accents), numbers, `_`, `-` and `.`. No spaces, emojis or invisible characters.
- From 3 to 12 characters, after the spaces at the ends are removed.
- Start with a letter or number, and have at least one letter (`123`, `1_2` and `1.2.3` are refused).

"Carol", "carol", "cárol" and "ca_rol" are the same name: case, accents and the separators `_`, `-` and `.` do not count.

### Texts

The texts are `text-*` attributes like the others, and they follow a change of `lang` or of the attribute while the form is open.

| Attribute | Default | Português |
| --- | --- | --- |
| `text-leaderboard-label` | `Username` | `Nome de usuário` |
| `text-leaderboard-save` | `Save` | `Salvar` |
| `text-leaderboard-skip` | `Skip` | `Pular` |
| `text-leaderboard-title` | `Top 10` | `Top 10` |
| `text-leaderboard-retry` | `Try again` | `Tentar de novo` |
| `text-leaderboard-error-length` | `Use 3 to 12 characters.` | `Use de 3 a 12 caracteres.` |
| `text-leaderboard-error-chars` | `Use only letters, numbers, _, - and .` | `Use só letras, números, _, - e .` |
| `text-leaderboard-error-start` | `Start with a letter or number, and don't use only numbers.` | `Comece com letra ou número e não use só números.` |
| `text-leaderboard-error-personal-data` | `Don't use links, emails or long numbers.` | `Não use links, e-mails ou números longos.` |
| `text-leaderboard-error-rejected` | `Choose another name.` | `Escolha outro nome.` |
| `text-leaderboard-error-taken` | `This name is already taken. Choose another one.` | `Esse nome já está em uso. Escolha outro.` |
| `text-leaderboard-error-rate-limited` | `Too many tries. Wait a moment and try again.` | `Muitas tentativas. Espere um pouco e tente de novo.` |
| `text-leaderboard-error-offline` | `Service unavailable. Try again later.` | `Serviço fora do ar. Tente mais tarde.` |

### Privacy and accessibility

- Only the username, the score and the key are stored or sent. No cookies, no referrer, no e-mail.
- The field has a label, and the error is announced as soon as it appears. The error is also in bold text and a thicker border, never only a color. Enter saves, Escape leaves the field (a second Escape closes the game), and "Skip" ends the game without saving.
- The highlight of your name uses `--snake-highlight-color`, bold text and `aria-current`. The list scrolls and "Play again" stays visible, also on small screens.

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

From the single file it is `SnakeGame.createEngine(...)`. The global `SnakeGame` also has `SnakeGameElement`, the three draw functions, `registerSkin`, `directionFromKey` and `directionFromSwipe`. It never replaces an existing `window.SnakeGame`.

## Controls and accessibility

- Keyboard: arrow keys or WASD, Space pauses, Escape closes. Keys only act while the game is open (in `inline` mode, while it has focus). While you type in a text field of the game (like the leaderboard name field), keys only type: Enter saves and Escape leaves the field.
- Touch: swipe. The page does not scroll while you swipe over the board.
- The board is labeled, scores and game over are announced, buttons are real buttons with at least 44 px, and the focus outline is visible.
- With `prefers-reduced-motion`, nothing animates and the game opens paused.

## Develop

```sh
npm test                 # automatic tests (Node, no dependencies)
npm run build            # regenerates dist/snake-game.js, addons/ and skins/
node scripts/serve.js    # http://localhost:8000/demo/ and /examples/module.html
npm run serve:pages      # same, under /snake-game/ like GitHub Pages
```

To change a skin or an addon, edit it in `src/skins/` or `src/addons/`, then run `npm run build`.

When the server starts, it also prints your network address (for example `http://192.168.0.12:8000/demo/`). Open it on a phone on the same Wi-Fi to try the game with your finger.

`python3 -m http.server 8000` works as well. `examples/minimal.html` uses the single file and opens by double click. `demo/index.html` is a test page with every option, the tokens, a contrast warning and an event log. It also has a pretend leaderboard service (`demo/fake-service.js`, inside the page, nothing goes to the network) with states for name taken, name rejected, too many tries, offline and more.

Changes: see [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See `LICENSE`.
