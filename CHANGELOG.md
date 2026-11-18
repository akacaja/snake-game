# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-18

### Added

- The `<snake-game>` web component, in `modal` and `inline` modes.
- Attributes to change the grid, the snake, the food, the intro, the speed, the walls and the size of the board.
- Replaceable texts, with plural forms by language.
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

## Next steps

- A landing page at the site root will replace the temporary redirect in `index.html`.
