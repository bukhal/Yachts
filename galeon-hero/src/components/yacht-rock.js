// A gentle rock of the yacht after the elastic pull at the top: a small bob up
// and down and a slight roll around the hull's centre, dying out over ~1.8 s and
// settling exactly at rest. The hull caustics move with it (same pivot); the
// water surface and reflection stay put. Uses the individual `translate` /
// `rotate` properties, so it composes with the scene's own positioning.

const DURATION_MS = 1800;
const STEPS = 48;

/**
 * Damped oscillation sampled as keyframes.
 * @param {number} strength 0..1
 */
function keyframes(strength) {
  const bob = 6 * strength; // px envelope (peaks ≈2.5px), first move is up
  const roll = 0.7 * strength; // deg envelope (peaks ≈0.25°)
  const frames = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * (DURATION_MS / 1000);
    // Smooth onset (starts exactly at rest), exponential decay, and exactly 0 at the end.
    const damp = (1 - Math.exp(-t / 0.12)) * Math.exp(-t / 0.5) * (1 - t / (DURATION_MS / 1000));
    const y = -bob * damp * Math.sin(2 * Math.PI * 1.25 * t);
    const r = roll * damp * Math.sin(2 * Math.PI * 1.25 * t + 0.9); // roll leads the bob a little
    frames.push({ translate: `0 ${y.toFixed(2)}px`, rotate: `${r.toFixed(3)}deg` });
  }
  return frames;
}

/**
 * @param {object} o
 * @param {HTMLElement} o.stage  the side-view scene
 * @param {MediaQueryList} o.reducedMotion
 */
export function createYachtRock({ stage, reducedMotion }) {
  const yacht = stage.querySelector(".scene__yacht");
  const caustics = stage.querySelector(".fx--caustics");
  let running = [];

  return {
    /** @param {number} [strength] 0..1, scales bob and roll */
    rock(strength = 1) {
      if (reducedMotion.matches || !yacht?.offsetWidth) return;
      const s = Math.max(0.25, Math.min(1, strength));
      running.forEach((a) => a.cancel());
      // One pivot for both layers: the yacht's centre, in each element's own box.
      const cx = yacht.offsetLeft + yacht.offsetWidth / 2;
      const cy = yacht.offsetTop + yacht.offsetHeight / 2;
      const opts = { duration: DURATION_MS, easing: "linear" };
      const frames = keyframes(s);
      yacht.style.transformOrigin = "50% 50%";
      running = [yacht.animate(frames, opts)];
      if (caustics && !caustics.hidden) {
        caustics.style.transformOrigin = `${cx - caustics.offsetLeft}px ${cy - caustics.offsetTop}px`;
        running.push(caustics.animate(frames, opts));
      }
    },
  };
}
