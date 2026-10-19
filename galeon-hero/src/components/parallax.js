// Small scroll parallax inside the hero. Each layer lags behind the page by
// `rate` × scroll: a higher rate reads as further away. Depth order, back to
// front: builder logo → title → yacht group → page content (rate 0).
// Transform-only, rAF-throttled, clamped to the hero range, off for reduced motion.
//
// Pull (elastic overscroll at the top): the page root moves down by `pull`,
// each layer only by `pull × layer.pull`, so deeper layers lag and the
// composition stretches apart.

export const PARALLAX_RATES = {
  logo: 0.42, // deepest layer: slowest on screen
  title: 0.28,
  yacht: 0.06, // stays nearly with the page, so it keeps overlapping the title
};

// Share of the pull distance each layer follows (page root = 1).
export const PULL_FACTORS = {
  logo: 0.3,
  title: 0.55,
  yacht: 0.85,
};

/**
 * @param {object} o
 * @param {HTMLElement} o.hero
 * @param {HTMLElement} o.root  moves with the full pull distance
 * @param {Array<{ els: HTMLElement[], rate: number, pull?: number }>} o.layers
 * @param {() => number} o.strength
 * @param {MediaQueryList} o.reducedMotion
 */
export function createParallax({ hero, root, layers, strength, reducedMotion }) {
  const mobile = matchMedia("(max-width: 640px)");
  let raf = 0;
  let pull = 0;
  let last = "";

  function apply() {
    raf = 0;
    const off = reducedMotion.matches;
    const range = hero.offsetHeight;
    const y = off ? 0 : Math.min(Math.max(window.scrollY - hero.offsetTop, 0), range);
    const k = strength() * (mobile.matches ? 0.5 : 1);
    // Below the hero y stays at `range`: nothing to rewrite on those scroll frames.
    const key = `${y}|${k}|${pull}`;
    if (key === last) return;
    last = key;
    root.style.transform = pull ? `translate3d(0, ${pull.toFixed(2)}px, 0)` : "";
    for (const { els, rate, pull: follow = 1 } of layers) {
      // Inside the root, so the lag is relative: pull × (follow − 1).
      const offset = y * rate * k + pull * (follow - 1);
      const t = offset ? `translate3d(0, ${offset.toFixed(2)}px, 0)` : "";
      for (const el of els) el.style.transform = t;
    }
  }

  const request = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  reducedMotion.addEventListener("change", request);
  mobile.addEventListener("change", request);
  apply();

  return {
    update: request,
    /** Elastic pull distance in px (0 when at rest). Applied synchronously: it's already frame-driven. */
    setPull(px) {
      pull = px;
      apply();
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      reducedMotion.removeEventListener("change", request);
      mobile.removeEventListener("change", request);
    },
  };
}
