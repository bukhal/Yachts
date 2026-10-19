import { createShaderLayer } from "./shader-layer.js";

// Calm water seen from above, behind the Cutaway title and deck plan.
// A domain-warped value-noise heightfield gives fine slow ripples; its normals
// shade the surface in the page's cool light palette, and sparse, irregular
// specular glints flicker where a slow mask allows them. Edges fade out in CSS.
// Independent of the hull effects (own canvas, own loop, own settings).
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2 uSize;        // CSS px
uniform float uTime;       // s
uniform float uScale;      // ripple size multiplier
uniform float uIntensity;  // 0..1 overall visibility
uniform float uGlints;     // 0..1 glint amount
uniform float uContrast;   // ripple light/shade contrast (1 = default)
uniform float uGlintSharp; // specular exponent: higher = smaller, sharper glints

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float height(vec2 p, float t) {
  vec2 q = p + 0.45 * vec2(noise(p * 0.7 + vec2(t * 0.05, 0.0)), noise(p * 0.7 + vec2(5.2, -t * 0.04)));
  return 0.55 * noise(q * 1.0 + vec2(t * 0.08, t * 0.03))
       + 0.30 * noise(q * 2.3 - vec2(t * 0.11, -t * 0.06))
       + 0.15 * noise(q * 4.9 + vec2(-t * 0.15, t * 0.12));
}

void main() {
  vec2 px = vUv * uSize;
  vec2 p = px / (90.0 * uScale);
  float t = uTime;

  float e = 0.06;
  float h = height(p, t);
  vec3 n = normalize(vec3(height(p - vec2(e, 0.0), t) - height(p + vec2(e, 0.0), t),
                          height(p - vec2(0.0, e), t) - height(p + vec2(0.0, e), t),
                          0.18));
  vec3 L = normalize(vec3(-0.35, -0.55, 0.76));
  float diff = clamp(dot(n, L), 0.0, 1.0);

  // Cool light palette around the page background #EFF2F6.
  vec3 trough = vec3(0.886, 0.913, 0.945);
  vec3 crest = vec3(0.968, 0.977, 0.989);
  vec3 col = mix(trough, crest, smoothstep(0.55, 0.95, diff));
  col = mix(mix(trough, crest, 0.6), col, uContrast);

  // Sun glints: very tight specular, only where a slow mask lets them through,
  // twinkling with a faster noise so they appear irregularly.
  vec3 R = reflect(-L, n);
  float spec = pow(max(R.z, 0.0), uGlintSharp);
  float mask = smoothstep(0.52, 0.78, noise(p * 0.35 + vec2(t * 0.02, -t * 0.015)));
  float twinkle = smoothstep(0.55, 0.9, noise(px / 9.0 + vec2(t * 1.3, -t * 0.9)));
  float glint = clamp(spec * mask * twinkle * 6.0, 0.0, 1.0) * uGlints;

  float a = uIntensity * clamp(0.55 + 0.45 * uContrast * (1.0 - diff), 0.0, 1.0);
  vec3 rgb = col * a;
  rgb = rgb * (1.0 - glint) + vec3(1.0) * glint;
  a = a * (1.0 - glint) + glint;
  outColor = vec4(rgb, a); // premultiplied
}`;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} o
 * @param {() => { enabled: boolean, intensity: number, speed: number, scale: number, contrast: number, glints: number, glintSharpness: number, coverage: number }} o.config
 * @param {MediaQueryList} o.reducedMotion
 * @param {() => boolean} o.paused
 */
export function createWaterBackground(canvas, { config, reducedMotion, paused }) {
  // The WebGL context is created the first time Cutaway opens, not at page load.
  let layer = null;
  let tried = false;
  const ensureLayer = () => {
    if (tried) return layer;
    tried = true;
    try {
      layer = createShaderLayer(canvas, { fs: FS, onLost: () => (layer = null) });
      layer.place(size, 1.5);
    } catch {
      canvas.hidden = true; // static page background stays; nothing else depends on it
    }
    return layer;
  };
  let active = false;
  let raf = 0;
  let last = 0;
  let time = 7.3; // start mid-pattern
  let visible = true;
  let size = { width: 1, height: 1 };

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    sync();
  });
  io.observe(canvas);
  document.addEventListener("visibilitychange", () => sync());
  reducedMotion.addEventListener("change", () => sync());

  function draw() {
    if (!layer) return;
    const c = config();
    layer.draw((gl, u) => {
      gl.uniform2f(u.uSize, size.width, size.height);
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uScale, c.scale);
      gl.uniform1f(u.uIntensity, c.intensity);
      gl.uniform1f(u.uGlints, c.glints);
      gl.uniform1f(u.uContrast, c.contrast);
      gl.uniform1f(u.uGlintSharp, c.glintSharpness);
    });
  }

  function tick(now) {
    raf = 0;
    if (!running()) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    time = (time + dt * config().speed) % 3600;
    draw();
    raf = requestAnimationFrame(tick);
  }

  const running = () => active && layer && config().enabled && visible && !document.hidden && !paused() && !reducedMotion.matches;

  function sync() {
    canvas.classList.toggle("is-on", active && config().enabled && Boolean(layer));
    canvas.style.setProperty("--water-coverage", String(config().coverage));
    if (running() && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else if (!running() && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!running() && active) draw(); // static frame (reduced motion / paused)
  }

  return {
    /** Box in CSS px; backing store capped at DPR 1.5 (the surface is soft anyway). */
    place(box) {
      size = box;
      layer?.place(box, 1.5);
      if (active) draw(); // an inactive (invisible) surface isn't redrawn on resize
    },
    setActive(value) {
      active = value;
      if (active) ensureLayer();
      sync();
    },
    refresh: sync,
  };
}
