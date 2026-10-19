// Content below the hero fades in with a short rise as it scrolls into view,
// in the hero intro's language (same easing, opacity then position), one
// block at a time. Blocks that enter together are staggered in reading order.
// Only opacity/translate change, so layout never shifts; reduced motion,
// keyboard focus and blocks already above the viewport show at once.

// Order inside a selector group = stagger order (cards of one grid, FAQ items…).
const TARGETS = [
  ".listings__head",
  ".listings__grid > .lcard",
  ".listings__more",
  ".msec__head",
  ".gen-card",
  ".spec-visual__side",
  ".spec-visual__top",
  ".spec-tabs",
  ".reviews__videos > .vcard",
  ".reviews__list > .vcard",
  ".quote",
  ".models-track",
  ".dealers-grid > .dcard",
  ".faq__item",
  ".waylo",
  ".site-footer__brand",
  ".site-footer__cols",
  ".site-footer__trust",
].join(", ");

const STAGGER_MS = 70;
const MAX_DELAY_MS = 420;

/** @param {{ reducedMotion: MediaQueryList }} o */
export function createScrollReveal({ reducedMotion }) {
  const seen = new WeakSet();
  const pending = new Set();
  const show = (el, delay = 0) => {
    el.style.setProperty("--reveal-delay", `${delay}ms`);
    el.classList.add("is-revealed");
    io.unobserve(el);
    pending.delete(el);
  };

  const io = new IntersectionObserver(
    (entries) => {
      // One callback = one batch entering together: stagger it top-left → bottom-right.
      const entering = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      entering.forEach((e, i) => show(e.target, Math.min(i * STAGGER_MS, MAX_DELAY_MS)));
      // Jumped past (anchor link, restored scroll): already read, no animation.
      for (const e of entries) if (!e.isIntersecting && e.boundingClientRect.bottom < 0) show(e.target);
    },
    { rootMargin: "0px 0px -8% 0px" },
  );

  // A jump can carry a block from below the viewport to above it without it ever
  // intersecting, so the observer never fires: catch those on the next frame.
  let raf = 0;
  const sweep = () => {
    raf = 0;
    for (const el of pending) if (el.getBoundingClientRect().bottom < 0) show(el);
  };
  window.addEventListener("scroll", () => pending.size && (raf ||= requestAnimationFrame(sweep)), { passive: true });

  // Focus moving into a hidden block (Tab) shows it at once.
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest?.(".reveal:not(.is-revealed)");
    if (el) show(el);
  });

  return {
    /** Register blocks rendered since the last scan (call after each render). */
    scan(root = document) {
      if (reducedMotion.matches) return;
      for (const el of root.querySelectorAll(TARGETS)) {
        if (seen.has(el)) continue;
        seen.add(el);
        pending.add(el);
        el.classList.add("reveal");
        io.observe(el);
      }
    },
  };
}
