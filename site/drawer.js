// The code drawer: a non-modal <dialog> opened by the "Get code" button.
// It does the dialog work by hand (focus, Tab, Esc, click outside, inert), so the page behind keeps working on a
// computer and the drawer can cover the whole screen on a phone. It has no colors and no sizes: the CSS decides how
// it looks, and this file only asks the CSS whether the drawer is full screen (position: fixed).
const FOCUSABLE = 'button, input, [tabindex="0"]';

export function initDrawer({ drawer, opener, closeButton, onClose = () => {} }) {
  let inerted = []; // what was made inert while the drawer covers the screen, to undo it

  const isOpen = () => drawer.open;
  const isFullScreen = () => getComputedStyle(drawer).position === 'fixed';

  const focusable = () => [...drawer.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && !el.closest('[hidden]'));

  // Full screen: everything that is not the drawer (and not a parent of it) leaves the Tab order and the screen reader.
  function applyInert() {
    removeInert();
    for (let node = drawer; node && node !== document.body; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling === node || sibling.inert) continue;
        sibling.inert = true;
        inerted.push(sibling);
      }
    }
  }

  function removeInert() {
    for (const node of inerted) node.inert = false;
    inerted = [];
  }

  function open() {
    if (isOpen()) return;
    drawer.hidden = false;
    drawer.show(); // the not-modal way to open a dialog: the page stays alive behind it
    opener.setAttribute('aria-expanded', 'true');
    closeButton.focus({ preventScroll: true });
    if (isFullScreen()) applyInert();
  }

  function close({ returnFocus }) {
    if (!isOpen()) return;
    removeInert();
    drawer.close();
    drawer.hidden = true;
    opener.setAttribute('aria-expanded', 'false');
    onClose();
    if (returnFocus) opener.focus({ preventScroll: true });
  }

  opener.addEventListener('click', () => {
    if (isOpen()) close({ returnFocus: true });
    else open();
  });
  closeButton.addEventListener('click', () => close({ returnFocus: true }));

  drawer.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close({ returnFocus: true });
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || !drawer.contains(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (current === last || !drawer.contains(current))) {
      event.preventDefault();
      first.focus();
    }
  });

  // A press outside the drawer closes it, and the press still counts for whatever was pressed. The focus is not
  // sent back to Get code: it stays with what the person pressed. The <dialog> would hand the focus back to the
  // element that had it before show(), so the focus leaves the drawer first.
  document.addEventListener('pointerdown', (event) => {
    if (!isOpen() || drawer.contains(event.target) || opener.contains(event.target)) return;
    if (drawer.contains(document.activeElement)) document.activeElement.blur();
    close({ returnFocus: false });
  }, true);

  // Safety net: if the focus ever lands outside the open drawer, it comes back to the close button.
  document.addEventListener('focusin', (event) => {
    if (isOpen() && !drawer.contains(event.target) && !opener.contains(event.target)) closeButton.focus({ preventScroll: true });
  });

  // Turning the phone changes whether the drawer is full screen: the inert state follows.
  window.addEventListener('resize', () => {
    if (!isOpen()) return;
    if (isFullScreen()) applyInert();
    else removeInert();
  });

  return { open, close, isOpen };
}
