// Water ripple on the hero title in Cutaway — as if the white letters lie
// under a thin moving water surface. SVG turbulence + displacement on the real
// <h1> (stays text for SEO / screen readers). The noise frequencies breathe on
// a loop, so the ripple flows instead of jumping between seeds.
// Ramps in/out with the view; when fully off, the filter is removed (no cost).

const SVG_NS = "http://www.w3.org/2000/svg";
const FPS = 30; // displacement is CPU-side in most browsers; 30 fps is plenty for slow water
const RAMP_MS = 700;

/**
 * @param {HTMLElement} title
 * @param {object} o
 * @param {() => { enabled: boolean, amount: number, scale: number, speed: number }} o.config
 * @param {MediaQueryList} o.reducedMotion
 * @param {() => boolean} o.paused
 */
export function createTitleRipple(title, { config, reducedMotion, paused }) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.id = "title-ripple";
  // Room for displaced pixels around the glyphs.
  filter.setAttribute("x", "-4%");
  filter.setAttribute("y", "-25%");
  filter.setAttribute("width", "108%");
  filter.setAttribute("height", "150%");
  const turb = document.createElementNS(SVG_NS, "feTurbulence");
  turb.setAttribute("type", "fractalNoise");
  turb.setAttribute("numOctaves", "2");
  turb.setAttribute("seed", "7");
  turb.setAttribute("result", "noise");
  const disp = document.createElementNS(SVG_NS, "feDisplacementMap");
  disp.setAttribute("in", "SourceGraphic");
  disp.setAttribute("in2", "noise");
  disp.setAttribute("xChannelSelector", "R");
  disp.setAttribute("yChannelSelector", "G");
  filter.append(turb, disp);
  svg.append(filter);
  document.body.append(svg);

  let active = false;
  let level = 0; // 0..1 ramp
  let t = 0;
  let last = 0;
  let raf = 0;
  let lastDraw = 0;

  function draw() {
    const c = config();
    const k = 1 / Math.max(0.2, c.scale);
    // Horizontal-stretched noise reads as ripples; frequencies breathe slowly.
    const fx = 0.0065 * k * (1 + 0.1 * Math.sin(t * 0.6));
    const fy = 0.05 * k * (1 + 0.14 * Math.sin(t * 0.9 + 1.3));
    turb.setAttribute("baseFrequency", `${fx.toFixed(5)} ${fy.toFixed(5)}`);
    disp.setAttribute("scale", (c.amount * level).toFixed(2));
    title.style.filter = level > 0.001 && c.enabled ? "url(#title-ripple)" : "";
  }

  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const target = active && config().enabled ? 1 : 0;
    const step = reducedMotion.matches ? 1 : dt * (1000 / RAMP_MS);
    level = target > level ? Math.min(target, level + step) : Math.max(target, level - step);
    const moving = !reducedMotion.matches && !paused() && !document.hidden && onScreen;
    if (moving) t += dt * config().speed;
    // Keep running while ramping, or while active and animated.
    const keepGoing = level !== target || (level > 0 && moving);
    // Throttled redraw; always draw the final state before the loop stops.
    if (!keepGoing || now - lastDraw >= 1000 / FPS) {
      lastDraw = now;
      draw();
    }
    if (keepGoing) raf = requestAnimationFrame(tick);
  }

  function sync() {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  document.addEventListener("visibilitychange", sync);
  // Off-screen (hero scrolled away) the ripple holds still instead of rewriting the filter.
  let onScreen = true;
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    sync();
  }).observe(title);
  reducedMotion.addEventListener("change", sync);

  return {
    setActive(value) {
      active = value;
      sync();
    },
    refresh: sync,
  };
}
