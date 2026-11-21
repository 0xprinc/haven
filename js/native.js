// Makes the web app behave like a native app on iPad and iPhone.
// Safari still allows a few page gestures even in Home Screen mode.
// We switch those off here.

// Pinch-zoom of the whole page (Safari ignores user-scalable=no).
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}

// Two-finger moves outside the board would zoom or scroll the page.
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1 && !e.target.closest('.board-wrap')) e.preventDefault();
  },
  { passive: false }
);

// Double-tap zoom is switched off in CSS with touch-action: manipulation.

// Long-press menus and text selection.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('selectstart', (e) => e.preventDefault());
document.addEventListener('dragstart', (e) => e.preventDefault());

// Is it running as a Home Screen app (or inside our own wrapper app)?
export function isStandalone() {
  return (
    window.navigator.standalone === true ||
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches ||
    /HavenApp/.test(navigator.userAgent)
  );
}

export function isAppleTouch() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

document.documentElement.classList.toggle('standalone', isStandalone());
