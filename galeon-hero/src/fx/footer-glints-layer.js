import { createShaderLayer } from "./shader-layer.js";
import { CAUSTICS_GLSL } from "./caustics-glsl.js";
import { hexToRgb } from "./store.js";

// Water glints in the footer: the hull-caustics light pattern (same shader
// functions, same ripple / softness / angle / loop as "Hull caustics"), faded
// in from the top so it only lives in the dark lower part of the footer.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform float uTime;            // seconds mod loop
uniform vec2 uDims;             // CSS px
uniform float uIntensity;
uniform float uRippleSize;
uniform float uRippleComplexity;
uniform float uSoftness;
uniform float uAngle;
uniform float uLoopDuration;
uniform float uFadeStart;       // 0..1 of the height where glints start
uniform vec3 uColor;

${CAUSTICS_GLSL}

void main() {
  vec2 dims = max(uDims, vec2(1.0));
  float cycle = 6.28318530718 * (uTime / max(uLoopDuration, 0.01));
  float angle = uAngle * 0.0174532925199;
  vec2 p = (vUv - vec2(0.5)) * dims / max(uRippleSize, 1.0);
  vec2 rotated = vec2(cos(angle) * p.x - sin(angle) * p.y, sin(angle) * p.x + cos(angle) * p.y);
  vec2 projected = rotated / vec2(1.0, 1.32);
  float width = mix(0.025, 0.16, uSoftness);
  float primary = causticLight(causticGap(projected, cycle, vec2(7.0, 13.0)), width);
  float secondary = 0.0;
  if (uRippleComplexity > 1.0) {
    secondary = causticLight(causticGap(projected * 1.81 + vec2(6.2, -3.7), cycle + 1.9, vec2(31.0, 59.0)), width * 0.86);
  }
  float w2 = clamp(uRippleComplexity - 1.0, 0.0, 1.0) * 0.46;
  float illumination = (primary + secondary * w2) / (1.0 + w2);
  float strength = 1.0 - exp(-uIntensity * illumination * 1.45);
  float coverage = strength * smoothstep(0.015, 0.06, illumination);
  // vertical fade: nothing above uFadeStart, full at the bottom edge
  float fade = smoothstep(uFadeStart, 1.0, vUv.y);
  float a = clamp(coverage * fade, 0.0, 1.0);
  outColor = vec4(uColor * a, a);
}`;

/**
 * @param {HTMLCanvasElement} canvas  absolutely positioned over the footer
 * @param {object} o
 * @param {() => object} o.config     FX "footerGlints" group
 * @param {() => object} o.caustics   FX "caustics" group (ripple shape and loop)
 * @param {MediaQueryList} o.reducedMotion
 */
export function createFooterGlints(canvas, { config, caustics, reducedMotion }) {
  // The WebGL context is created when the footer first comes into view.
  let layer = null;
  let tried = false;
  const ensureLayer = () => {
    if (tried) return;
    tried = true;
    try {
      layer = createShaderLayer(canvas, { fs: FS, onLost: () => (layer = null) });
      place();
    } catch {
      canvas.hidden = true; // the gradient alone still reads as water
    }
  };
  let raf = 0;
  let last = 0;
  let time = 3.1;
  let visible = false;
  let size = { width: 1, height: 1 };
  const host = canvas.parentElement;

  function place() {
    const r = host.getBoundingClientRect();
    size = { left: 0, top: 0, width: r.width, height: r.height };
    layer?.place(size, 1); // soft light: DPR 1 is plenty
  }

  function draw() {
    if (!layer) return;
    const c = config();
    const k = caustics();
    const d = Math.max(0.01, k.loopDuration);
    const [r, g, b] = hexToRgb(c.color);
    layer.draw((gl, u) => {
      gl.uniform1f(u.uTime, ((time % d) + d) % d);
      gl.uniform2f(u.uDims, size.width, size.height);
      gl.uniform1f(u.uIntensity, c.intensity);
      gl.uniform1f(u.uRippleSize, k.rippleSize * c.scale);
      gl.uniform1f(u.uRippleComplexity, k.rippleComplexity);
      gl.uniform1f(u.uSoftness, k.reflectionSoftness);
      gl.uniform1f(u.uAngle, k.reflectionAngle);
      gl.uniform1f(u.uLoopDuration, d);
      gl.uniform1f(u.uFadeStart, c.fadeStart);
      gl.uniform3f(u.uColor, r, g, b);
    });
  }

  const running = () => layer && config().enabled && visible && !document.hidden && !reducedMotion.matches;

  function tick(now) {
    raf = 0;
    if (!running()) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    time = (time + dt * config().speed) % 3600;
    draw();
    raf = requestAnimationFrame(tick);
  }

  function update() {
    canvas.classList.toggle("is-on", Boolean(layer) && config().enabled);
    if (running() && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else if (!running() && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!running() && visible) draw(); // one still frame (reduced motion)
  }

  // Start a little before the footer scrolls in, so the first frame is ready.
  new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible) ensureLayer();
      update();
    },
    { rootMargin: "200px 0px" },
  ).observe(host);
  new ResizeObserver(() => {
    place();
    if (visible && !running()) draw();
  }).observe(host);
  document.addEventListener("visibilitychange", update);
  reducedMotion.addEventListener("change", update);
  return { update };
}
