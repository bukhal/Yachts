// Elastic pull-down at the very top of the page (Apple-style rubber band).
// Wheel/trackpad or touch "past the top" accumulates a pull with increasing
// resistance; releasing springs it back. The pull is fed to the parallax,
// which stretches the layers apart by depth.
//
// Hooks for a future effect/action (TODO(ux)):
//   hero.dispatchEvent("hero:pull-armed")    — pull crossed the threshold
//   hero.dispatchEvent("hero:pull-release")  — released; detail.armed tells if past threshold
//   <html data-pull="armed"> while past the threshold (CSS hook)

const WHEEL_IDLE_MS = 90; // no wheel events for this long = released
// Trackpads keep sending decaying "momentum" wheel events for up to ~1 s after
// the fingers lift. Treat a steady decay as the release, then swallow the tail.
const MOMENTUM_DECAY_EVENTS = 2; // consecutive shrinking deltas…
const MOMENTUM_SHARE = 0.6; // …below this share of the gesture's peak
const LINE_PX = 16;

/**
 * @param {object} o
 * @param {HTMLElement} o.hero
 * @param {() => { enabled: boolean, maxDistance: number, threshold: number, stiffness: number }} o.config
 * @param {MediaQueryList} o.reducedMotion
 * @param {(px: number) => void} o.onPull
 */
export function createOverscrollPull({ hero, config, reducedMotion, onPull }) {
  let raw = 0; // finger/wheel distance past the top
  let pull = 0; // displayed distance after rubber-band resistance
  let velocity = 0;
  let springing = false;
  let armed = false;
  let raf = 0;
  let wheelTimer = 0;
  let touchStartY = null;
  // wheel gesture tracking
  let peak = 0;
  let lastAbs = 0;
  let decay = 0;
  let swallowing = false; // momentum tail after a detected release

  const active = () => config().enabled && !reducedMotion.matches;
  const atTop = () => window.scrollY <= 0;
  // Ignore gestures inside the tuning panel or other scrollable widgets.
  const ignored = (target) => target instanceof Element && target.closest(".fx-panel, dialog, [data-no-pull]");

  // Rubber band: approaches maxDistance asymptotically, ~linear at the start.
  const band = (d, max) => max * (1 - Math.exp(-d / max));

  function set(value) {
    pull = value;
    const { threshold } = config();
    const nowArmed = pull >= threshold;
    if (nowArmed !== armed) {
      armed = nowArmed;
      if (armed) document.documentElement.dataset.pull = "armed";
      else document.documentElement.removeAttribute("data-pull");
      if (armed) hero.dispatchEvent(new CustomEvent("hero:pull-armed", { bubbles: true }));
    }
    onPull(pull);
  }

  // A new gesture during the spring-back continues from where the content is now.
  function interruptSpring() {
    if (!springing) return;
    springing = false;
    cancelAnimationFrame(raf);
    raf = 0;
    const max = config().maxDistance;
    raw = -max * Math.log(1 - Math.min(pull, max * 0.999) / max);
  }

  function drag(distance) {
    raw = Math.max(0, distance);
    set(band(raw, config().maxDistance));
  }

  function release() {
    if (pull <= 0 || springing) return;
    hero.dispatchEvent(new CustomEvent("hero:pull-release", { bubbles: true, detail: { armed, distance: pull } }));
    raw = 0;
    velocity = 0;
    spring();
  }

  // Critically damped spring towards 0 from the current pull and velocity.
  function spring() {
    springing = true;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      // Critically damped spring towards 0.
      const k = config().stiffness;
      const c = 2 * Math.sqrt(k);
      velocity += (-k * pull - c * velocity) * dt;
      const next = pull + velocity * dt;
      if (Math.abs(next) < 0.3 && Math.abs(velocity) < 5) {
        springing = false;
        raf = 0;
        return set(0);
      }
      set(Math.max(0, next));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function onWheel(e) {
    if (!active() || e.ctrlKey || ignored(e.target)) return;
    const dy = e.deltaMode === 1 ? e.deltaY * LINE_PX : e.deltaY;
    // Start a pull only at the top and only when scrolling up; while pulled,
    // scrolling down first un-pulls before the page moves.
    if (!((atTop() && dy < 0) || (pull > 0 && dy > 0))) return;
    e.preventDefault();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(endWheelGesture, WHEEL_IDLE_MS);
    if (swallowing) return; // inertia after release: no re-pull, no native bounce

    const abs = Math.abs(dy);
    decay = abs < lastAbs ? decay + 1 : 0;
    lastAbs = abs;
    peak = Math.max(peak, abs);
    if (dy < 0 && decay >= MOMENTUM_DECAY_EVENTS && abs < peak * MOMENTUM_SHARE) {
      swallowing = true; // fingers lifted: spring back now instead of riding the momentum
      return release();
    }
    interruptSpring();
    drag(raw - dy);
  }

  function endWheelGesture() {
    peak = lastAbs = decay = 0;
    if (swallowing) swallowing = false;
    else release();
  }

  function onTouchStart(e) {
    if (!active() || e.touches.length !== 1 || ignored(e.target) || !atTop()) return (touchStartY = null);
    interruptSpring();
    touchStartY = e.touches[0].clientY - raw;
  }

  function onTouchMove(e) {
    if (touchStartY === null) return;
    const d = e.touches[0].clientY - touchStartY;
    if (d > 0 && atTop()) {
      e.preventDefault(); // also stops native bounce / pull-to-refresh here
      drag(d);
    } else if (pull > 0) {
      drag(0);
    }
  }

  function onTouchEnd() {
    if (touchStartY === null) return;
    touchStartY = null;
    release();
  }

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd);
  window.addEventListener("touchcancel", onTouchEnd);
  reducedMotion.addEventListener("change", release);

  return {
    get value() {
      return pull;
    },
    /**
     * Arriving at the top with momentum (e.g. "back to top"): the same rubber
     * band, stretched to about `peak` px and springing back, no gesture needed.
     */
    kick(peak = config().maxDistance * 0.6) {
      if (!active()) return;
      interruptSpring();
      raw = 0;
      // Closed form of the same critically damped spring started at 0 with
      // velocity v0: x(t) = v0·t·e^(−ωt), peaking at v0/(ω·e) when t = 1/ω.
      // (A per-frame step is unstable at this initial velocity.)
      const w = Math.sqrt(config().stiffness);
      const v0 = Math.min(peak, config().maxDistance) * w * Math.E;
      const t0 = performance.now();
      springing = true; // a new gesture interrupts it like a spring-back
      const step = (now) => {
        const t = (now - t0) / 1000;
        const x = v0 * t * Math.exp(-w * t);
        if (t > 1 / w && x < 0.3) {
          springing = false;
          raf = 0;
          return set(0);
        }
        set(x);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
    dispose() {
      cancelAnimationFrame(raf);
      clearTimeout(wheelTimer);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      reducedMotion.removeEventListener("change", release);
      document.documentElement.removeAttribute("data-pull");
    },
  };
}
