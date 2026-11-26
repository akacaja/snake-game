// The "features" section: an accordion of 6 items, 10 seconds each, with an illustration per item.
// The illustrations are plain HTML in index.html; scenes.js says what each element shows at each tick,
// and this file applies it. Nothing runs unless it can be seen: reduced motion, a hidden tab, a section off
// screen and the "Pause animations" button all stop it (and the single requestAnimationFrame loop with it).
// When the list and the panel are stacked in one column (a phone, a narrow window), the panel moves to sit right
// under the description of the open item; side by side it stays in its own column, next to the list.
import { SCENES, SKIN_IDS, TICK_MS } from './scenes.js';

const ITEM_MS = 10000;

export function initFeatures() {
  const section = document.querySelector('#features');
  if (!section) return;
  const items = [...section.querySelectorAll('.feature')];
  const sceneEls = [...section.querySelectorAll('.scene')];
  const scenesBox = section.querySelector('.scenes');
  const stage = section.querySelector('.feature-panel__stage');
  const pauseButton = section.querySelector('#pause-animations');
  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const panel = section.querySelector('.feature-panel');
  const list = section.querySelector('.feature-list');
  // The width where the two columns stop fitting is a CSS variable (landing.css), so this file has no sizes.
  const stackedWidth = getComputedStyle(document.documentElement).getPropertyValue('--features-stacked-max').trim();
  const stackedQuery = matchMedia(stackedWidth ? `(max-width: ${stackedWidth})` : 'not all');

  // For each scene: its elements by data-el, and the last patch written to each (to write only what changed).
  const views = sceneEls.map((el) => ({
    el,
    nodes: new Map([...el.querySelectorAll('[data-el]')].map((node) => [node.dataset.el, node])),
    last: new Map(),
  }));

  let index = 0;
  let reduce = reduceQuery.matches;
  let userPaused = false;
  let visible = false;
  let hovering = false;
  let focusInside = false;
  let bar = null;
  let raf = 0;
  let lastTime = 0;
  let elapsed = 0;
  let lastTick = -1;
  let stillSkin = 1; // the skin shown by the stopped "Seasonal skins" scene

  // ---- drawing ---------------------------------------------------------------------------

  function write(view, frame) {
    for (const [id, patch] of Object.entries(frame)) {
      const node = view.nodes.get(id);
      if (!node) continue;
      const key = JSON.stringify(patch);
      const before = view.last.get(id);
      if (before === key) continue;
      view.last.set(id, key);
      if (patch.on !== undefined) node.toggleAttribute('data-on', patch.on);
      if (patch.hidden !== undefined) node.hidden = patch.hidden;
      if (patch.text !== undefined) node.textContent = patch.text;
      if (patch.vars) for (const [name, value] of Object.entries(patch.vars)) node.style.setProperty(name, String(value));
      if (patch.attrs) for (const [name, value] of Object.entries(patch.attrs)) node.setAttribute(name, String(value));
      if (patch.pop && before !== undefined && !reduce && node.firstElementChild) {
        node.firstElementChild.animate(
          [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        );
      }
    }
  }

  function draw(tick) {
    write(views[index], SCENES[index].frame(tick));
  }

  function drawStill() {
    const scene = SCENES[index];
    write(views[index], scene.stillFor ? scene.stillFor(stillSkin) : scene.still);
  }

  // ---- what may run ----------------------------------------------------------------------

  const sceneRuns = () => !reduce && visible && !document.hidden && !userPaused;
  const barRuns = () => sceneRuns() && !hovering && !focusInside;

  function loop(now) {
    raf = 0;
    if (!sceneRuns()) return;
    elapsed += Math.max(0, now - lastTime);
    lastTime = now;
    const tick = Math.floor(elapsed / TICK_MS);
    if (tick !== lastTick) {
      lastTick = tick;
      draw(tick);
    }
    raf = requestAnimationFrame(loop);
  }

  function sync() {
    section.toggleAttribute('data-paused', !sceneRuns());
    if (bar) {
      if (barRuns() && bar.playState === 'paused') bar.play();
      else if (!barRuns() && bar.playState === 'running') bar.pause();
    }
    if (sceneRuns() && !raf) {
      lastTime = performance.now();
      raf = requestAnimationFrame(loop);
    } else if (!sceneRuns() && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  // ---- where the panel sits ----------------------------------------------------------------

  // Stacked: inside the <li> of the open item, after its description. Side by side: back after the list.
  // Moving a node drops the focus it holds (the "Pause animations" button, for one), so the focus is given back.
  function placePanel() {
    const held = panel.contains(document.activeElement) ? document.activeElement : null;
    if (stackedQuery.matches) {
      if (panel.parentElement !== items[index]) items[index].append(panel);
    } else if (panel.previousElementSibling !== list) {
      list.after(panel);
    }
    if (held && document.activeElement !== held) held.focus({ preventScroll: true });
  }

  // ---- the accordion ---------------------------------------------------------------------

  function show(next) {
    if (bar) {
      bar.cancel();
      bar = null;
    }
    // The scene that leaves stops and goes back to its first frame; the one that arrives starts from zero.
    const old = views[index];
    old.last.clear();
    write(old, SCENES[index].frame(0));
    old.el.hidden = true;
    items[index].querySelector('.feature__button').setAttribute('aria-expanded', 'false');
    items[index].querySelector('.feature__body').hidden = true;

    index = next;
    placePanel();
    const now = views[index];
    now.last.clear();
    now.el.hidden = false;
    const button = items[index].querySelector('.feature__button');
    button.setAttribute('aria-expanded', 'true');
    items[index].querySelector('.feature__body').hidden = false;

    elapsed = 0;
    lastTick = -1;
    section.dataset.motion = reduce ? 'still' : 'auto';
    if (reduce) {
      drawStill();
    } else {
      draw(0);
      const fill = items[index].querySelector('.feature__fill');
      bar = fill.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: ITEM_MS, easing: 'linear', fill: 'both' });
      bar.onfinish = () => show((index + 1) % items.length);
      if (!barRuns()) bar.pause();
    }
    sync();
  }

  items.forEach((item, i) => {
    const button = item.querySelector('.feature__button');
    // Hover picks the item; a click picks it again, even the open one, and starts it over.
    button.addEventListener('pointerenter', (event) => {
      // Stacked, the layout moves under the pointer when an item opens, so hovering would open item after item.
      if (event.pointerType === 'mouse' && i !== index && !stackedQuery.matches) show(i);
    });
    button.addEventListener('click', () => show(i));
  });

  // The skin buttons of the first scene are real: they set the skin in the playground.
  section.querySelectorAll('[data-pick-skin]').forEach((button) => {
    button.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('landing-pick-skin', { detail: { skin: button.dataset.pickSkin } }));
      if (reduce) {
        stillSkin = Math.max(0, SKIN_IDS.indexOf(button.dataset.pickSkin));
        views[0].last.clear();
        drawStill();
      }
    });
  });

  pauseButton.addEventListener('click', () => {
    userPaused = !userPaused;
    pauseButton.setAttribute('aria-pressed', String(userPaused));
    sync();
  });

  // ---- reasons to stop -------------------------------------------------------------------

  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    sync();
  }).observe(section);

  document.addEventListener('visibilitychange', sync);

  section.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') { hovering = true; sync(); }
  });
  section.addEventListener('pointerleave', () => { hovering = false; sync(); });

  // Only keyboard focus counts, so a mouse click on an item does not freeze the section.
  const checkFocus = () => {
    focusInside = section.querySelector(':focus-visible') !== null;
    sync();
  };
  section.addEventListener('focusin', checkFocus);
  section.addEventListener('focusout', () => setTimeout(checkFocus, 0));

  stackedQuery.addEventListener('change', placePanel);

  reduceQuery.addEventListener('change', (event) => {
    reduce = event.matches;
    show(index);
  });

  // ---- size: the scenes are drawn at one size and shrunk to fit a narrow panel --------------

  const fit = () => {
    const full = parseFloat(getComputedStyle(scenesBox).getPropertyValue('--scene-width'));
    if (full > 0 && stage.clientWidth > 0) scenesBox.style.setProperty('--scene-scale', String(Math.min(1, stage.clientWidth / full)));
  };
  new ResizeObserver(fit).observe(stage);
  fit();

  show(0);
}
