// "Back to top": a small glass circle pinned to the bottom-right corner. It
// appears once "Current Yachts for Sale" reaches the upper third of the screen
// and hides again above it. Icon only; the name is in aria-label.
// The scroll eases into the top (gathering speed, not braking) and lands with
// the page's rubber-band bounce and the yacht's rock (onArrive).

const ARROW = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16V4M5 9l5-5 5 5"/></svg>';

/**
 * @param {object} o
 * @param {HTMLElement} o.trigger  shown once this element's top is in the upper part of the viewport
 * @param {HTMLElement} [o.focusTarget]  receives focus after scrolling up (the button itself disappears)
 * @param {MediaQueryList} o.reducedMotion
 * @param {() => void} [o.onArrive]  called when the scroll reaches the top (the bounce)
 */
export function createBackToTop({ trigger, focusTarget, reducedMotion, onArrive }) {
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

  // Accelerating scroll (ease-in): slow start, fastest at the very top. Any
  // wheel / touch / key from the user cancels it and leaves the page where it is.
  let anim = 0;
  const cancel = () => {
    cancelAnimationFrame(anim);
    anim = 0;
  };
  for (const type of ["wheel", "touchstart", "keydown"]) window.addEventListener(type, () => anim && cancel(), { passive: true });
  function pullToTop() {
    cancel();
    const from = window.scrollY;
    if (reducedMotion.matches || from <= 0) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const duration = Math.min(1400, Math.max(800, from / 5));
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.cos((t * Math.PI) / 2); // sine ease-in: a gentle pull that still arrives with some speed
      window.scrollTo({ top: Math.round(from * (1 - eased)), behavior: "instant" });
      if (t < 1) anim = requestAnimationFrame(step);
      else {
        anim = 0;
        onArrive?.();
      }
    };
    anim = requestAnimationFrame(step);
  }

  btn.addEventListener("click", () => {
    pullToTop();
    if (focusTarget) {
      if (!focusTarget.hasAttribute("tabindex")) focusTarget.tabIndex = -1;
      focusTarget.focus({ preventScroll: true });
    }
  });
  return btn;
}
