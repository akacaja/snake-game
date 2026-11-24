# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-11-24

### Added

- Skins: the `skin` attribute turns the food into an emoji (a different one each time) and applies a palette. Three skins in `skins/`: `natal`, `halloween` and `carnaval`, loaded by separate script files.
- `skin-palette="off"` keeps your colors and uses only the emoji.
- `SnakeGame.registerSkin(name, skin)` and the queue `globalThis.snakeGameSkins`, to add your own skin.
- `--snake-food-emoji-size` (a share of the spacing, default `75%`) and the text `text-ate-food`.
- `scene.foodItem.emoji` for your own food drawing.
- The test page has a skin selector, with two test skins.

### Changed

- `dist/snake-game.js` is built without comments (about 14.7 KB gzipped). The code in `src/` keeps all of them.
- Color tokens have one more layer for the skin palette (`--snake-*`, then the skin, then the default). Nothing changes without a skin.
- Colors may also be written in `skins/*.js` (the rule used to be `src/theme.js` only).

## [0.1.0] - 2026-11-23

### Added

- The `<snake-game>` web component, in `modal` and `inline` modes.
- Attributes to change the grid, the snake, the food, the intro, the speed, the walls and the size of the board.
- Replaceable texts, with plural forms by language.
- The head of the snake does not pulse: it always shows at full size, and only the tail tip shrinks.
- Events (`snake-open`, `snake-close`, `snake-eat`, `snake-score`, `snake-gameover`, `snake-pause`, `snake-resume`, `snake-restart`) and methods (`open()`, `close()`, `toggle()`, `pause()`, `resume()`, `togglePause()`, `restart()`, `refreshStyles()`).
- Design tokens as CSS variables, with the defaults in `src/theme.js`.
- Your own drawing for the grid, the snake and the food (`renderers`).
- The game rules in a separate engine, with no browser code (`src/engine.js`).
- A single-file build in `dist/snake-game.js`.
- A test page (`demo/`) and two examples (`examples/`).
- Automatic tests.
- A favicon for the demo.
- A README in Portuguese (`README.pt-BR.md`), linked from the English one.
- The gzipped size of `dist/snake-game.js` in both READMEs.
- `--base` option in `scripts/serve.js` and `npm run serve:pages`, to try the site in a subfolder like GitHub Pages.
- The local server prints the network address, to open the demo on a phone on the same Wi-Fi.
- A temporary page at the root (`index.html`) that sends visitors to the demo.
- This changelog.
- In `inline` mode the game fills the width of its container, also inside flex and grid rows.
- The README explains that `snake-close` does not reach `document` when the element is removed from the page.
- More comments in the code.
- The check for forbidden names reads its list from a local file outside the repository.
- On phones, in modal mode, the board takes 75% of the screen: of the width when lying down (score and buttons on the right) and of the height when standing (score on top). New token `--snake-board-share`. Turning the phone keeps the game. Computers and `inline` mode do not change.
- New token `--snake-gap` (default `2px`): the space on screen between the head and the next dot (2px), kept also when the grid shrinks. With `snake="taper"` the tail gets thinner and the space grows to about 8px at the tip; with `snake="uniform"` it is 2px along the whole body. 0 makes the dots touch and a negative value makes them overlap. The head and the tail tip now default to `spacing - gap` (30px) and 80% of it (24px), so the snake is bigger than before (`--snake-head-size` and `--snake-tail-size` still accept fixed values).

## Next steps

- A landing page at the site root will replace the temporary redirect in `index.html`.
