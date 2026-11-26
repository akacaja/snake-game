# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- A landing page at the site root (`index.html` + `site/`), in English: a playground with the real game (skin, grid, snake, gap, colors, walls, intro, speed and leaderboard), the code ready to paste (HTML, CSS tokens and a prompt for AI) in a "Get code" drawer, with Copy code and Copy link and a confirmation message (and a clear message when the browser blocks copying), six animated feature illustrations, a FAQ and a footer. It uses no dependencies, and the page itself has no build step (it loads the built `dist/`); the only external request is the page fonts.
- `site/config.js` and `site/scenes.js`: pure modules (no DOM) with the code generator, the share link and the illustration frames, with tests.
- `site/landing.js` (playground, settings and copy), `site/drawer.js` (the code drawer), `site/features.js` (feature list and illustrations) and `site/landing.css` (the landing page's only colors and sizes).

### Changed

- `npm run serve:pages` and `node scripts/serve.js` list the landing page first, then the demo.
- The READMEs point to the landing page and to the demo.

### Removed

- The temporary redirect from `index.html` to `demo/`. The demo stays at `demo/`.

## [0.3.1] - 2026-11-25

### Fixed

- The leaderboard on a phone lying down with the keyboard open: when there is little room above the keyboard, only the row with the username, Save and Skip is shown. After saving, the keyboard closes and your name is in view. Upright, on a computer and in inline mode, nothing changes.
- A `leaderboard-key` that starts with `-` now works as an empty key (nothing is stored, the list lasts until the page closes), with one warning in the console, instead of silently storing nothing.
- The snake no longer disappears with a big `--snake-gap`: the automatic head is never smaller than 20% of a cell (a head set by hand stays as it is).

### Changed

- `addons/` and `skins/` are now generated from `src/addons/` and `src/skins/`, without comments (smaller files). Edit the files in `src/`, then run `npm run build`.
- Every published file has the license header, and the generated ones also carry the version.

### Added

- A warning in the console when the `foods` of a skin is not a list.
- README notes: `food` and `food-halo` do not apply to emoji food, and browsers with anti-fingerprinting protection can affect the emoji check.
- Tests of the leaderboard screen, on a fake page without dependencies, and a test of the license header.

## [0.3.0] - 2026-11-24

### Added

- Leaderboard, in the optional file `addons/leaderboard.js` (it is not in `dist/snake-game.js`, like the skins). After a game with points, the game asks for a username and shows the Top 10 with your name highlighted. The last username is remembered in the browser.
- Username rules, checked on the spot: 3 to 12 characters, letters (with accents), numbers, `_`, `-` and `.`, starting with a letter or number, with at least one letter, and no links, e-mails or 6 or more digits in a row. "Carol", "cárol" and "ca_rol" are the same name.
- Local ranking (default): the best score of each username, kept in this browser. Nothing leaves the browser without `leaderboard-url`.
- Global ranking service: `leaderboard-url` sends the score to a service and shows its Top 10. Unique names use a key that the service returns the first time and the browser keeps. The service contract is in `docs/leaderboard-api.md` (and `docs/leaderboard-api.pt-BR.md`). `game.leaderboard` plugs in your own JavaScript instead.
- Attributes `leaderboard` (`off` brings back the game of 0.2.0), `leaderboard-url` and `leaderboard-key`; texts `text-leaderboard-*`; events `snake-leaderboard-save` and `snake-leaderboard-error`; tokens `--snake-highlight-color` and `--snake-field-font-size`.
- The queue `globalThis.snakeGameAddons`, so optional files can plug into the game.
- The test page has a pretend leaderboard service (`demo/fake-service.js`, inside the page) with states for name taken, name rejected, too many tries, offline, slow and more.
- Tests that limit the size of the main file (15.7 KB gzipped) and of the addon (6.5 KB gzipped).

### Changed

- `dist/snake-game.js` grew to about 15.3 KB gzipped, with the hook for addons. Keys no longer steer the snake, pause or close the game while you type in a text field of the game (like the leaderboard name field).
- Addons are scanned by the check for literal colors and sizes: they may only use `var(--_*)`.

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

- The leaderboard server (global ranking), following `docs/leaderboard-api.md`.
- A way to recover a name when its key is lost (browser data cleared, another device).
- See the Top 10 without playing.
- Show your own position when it is outside the Top 10.
