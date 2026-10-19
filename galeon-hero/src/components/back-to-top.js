// "Back to top": a small glass circle pinned to the bottom-right corner. It
// appears once "Current Yachts for Sale" reaches the upper third of the screen
// and hides again above it. Icon only; the name is in aria-label.

const ARROW = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16V4M5 9l5-5 5 5"/></svg>';

/**
 * @param {object} o
 * @param {HTMLElement} o.trigger  shown once this element's top is in the upper part of the viewport
 * @param {HTMLElement} [o.focusTarget]  receives focus after scrolling up (the button itself disappears)
 * @param {MediaQueryList} o.reducedMotion
 */
export function createBackToTop({ trigger, focusTarget, reducedMotion }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "to-top";
  btn.setAttribute("aria-label", "Back to top");
  btn.innerHTML = ARROW;
  btn.tabIndex = -1; // focusable only while shown
  document.body.append(btn);

  let shown = false;
  let raf = 0;
  const sync = () => {
    raf = 0;
    const next = trigger.getBoundingClientRect().top < window.innerHeight * 0.3;
    if (next === shown) return;
    shown = next;
    btn.classList.toggle("is-shown", shown);
    btn.tabIndex = shown ? 0 : -1;
    btn.setAttribute("aria-hidden", String(!shown));
  };
  window.addEventListener("scroll", () => (raf ||= requestAnimationFrame(sync)), { passive: true });
  window.addEventListener("resize", () => (raf ||= requestAnimationFrame(sync)));
  sync();

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
    if (focusTarget) {
      if (!focusTarget.hasAttribute("tabindex")) focusTarget.tabIndex = -1;
      focusTarget.focus({ preventScroll: true });
    }
  });
  return btn;
}
