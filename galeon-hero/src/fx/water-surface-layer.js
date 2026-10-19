import { createShaderLayer } from "./shader-layer.js";
import { waterBox } from "./scene-geometry.js";
import { hexToRgb } from "./store.js";

// Water in front of the hull: a solid fill in the page background colour that
// covers the bottom few px of the PNG up to a wavy edge (so the hull reads as
// sitting *in* the water), a soft bright edge line, and faint ripples below.
// Local to the hull width; no texture needed.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2 uSize;        // CSS px
uniform float uWaterline;  // px from the canvas top
uniform float uOverlap;    // px over the hull
uniform float uAmp;        // px
uniform float uScale;
uniform float uDepth;      // px
uniform float uIntensity;
uniform float uPhase;      // 0..2π
uniform vec3 uFillColor;   // usually the page background
uniform float uFillOpacity;

vec4 over(vec4 dst, vec3 rgb, float a) {
  return vec4(rgb * a, a) + dst * (1.0 - a);
}

void main() {
  float x = vUv.x * uSize.x;
  float y = vUv.y * uSize.y;
  float k = uScale;

  float wave = uAmp * (
      0.55 * sin(x * 0.045 / k + uPhase)
    + 0.30 * sin(x * 0.11 / k - 2.0 * uPhase + 1.3)
    + 0.15 * sin(x * 0.23 / k + 3.0 * uPhase + 2.1));
  float edgeY = uWaterline - uOverlap + wave;
  float dy = y - edgeY;

  float u = vUv.x;
  float env = smoothstep(0.0, 0.14, u) * smoothstep(1.0, 0.86, u);
  float I = uIntensity * env;

  vec4 c = vec4(0.0);

  // Fill: solid background colour from the wavy edge down to the waterline,
  // hiding the lowest strip of hull. Antialiased edge; short feather below the
  // waterline so it never paints over the reflection.
  float fillEnv = smoothstep(0.0, 0.015, u) * smoothstep(1.0, 0.985, u);
  float below = smoothstep(-0.75, 0.75, dy);
  float stop = 1.0 - smoothstep(0.0, 1.5, y - uWaterline);
  c = over(c, uFillColor, uFillOpacity * fillEnv * below * stop);

  // Ripple lines below the waterline, fading with depth.
  float r = y - uWaterline;
  if (r > 0.0) {
    float fall = exp(-r / max(uDepth * 0.45, 1.0));
    float warp = 1.6 * sin(x * 0.021 / k + uPhase) + 0.8 * sin(x * 0.057 / k - 2.0 * uPhase);
    float lines = sin(r * 0.62 / k - warp - 2.0 * uPhase);
    float crest = pow(max(lines, 0.0), 10.0);
    float trough = pow(max(-lines, 0.0), 14.0);
    c = over(c, vec3(0.80, 0.83, 0.87), 0.28 * I * trough * fall);
    c = over(c, vec3(1.0), 0.45 * I * crest * fall);
  }

  // Soft bright edge.
  float edge = exp(-(dy * dy) / 1.1);
  c = over(c, vec3(1.0), 0.6 * I * edge);

  outColor = c;
}`;

export function createWaterSurfaceLayer(canvas, { onLost }) {
  const layer = createShaderLayer(canvas, { fs: FS, onLost });
  let box = null;

  return {
    layer,
    layout(sceneLayout, asset, waterlineY, fx, dprCap) {
      const w = fx.water;
      box = waterBox(sceneLayout, {
        widthScale: w.widthScale * (asset.water?.widthScale ?? 1),
        offsetX: asset.water?.offsetX ?? 0,
        overlap: w.overlap,
        amplitude: w.amplitude,
        depth: w.depth,
      });
      layer.place(box, dprCap);
    },
    render(phase, fx) {
      if (!box) return;
      const w = fx.water;
      layer.draw((gl, u) => {
        gl.uniform2f(u.uSize, box.width, box.height);
        gl.uniform1f(u.uWaterline, box.waterlineInBox);
        gl.uniform1f(u.uOverlap, w.overlap);
        gl.uniform1f(u.uAmp, w.amplitude);
        gl.uniform1f(u.uScale, w.scale);
        gl.uniform1f(u.uDepth, w.depth);
        gl.uniform1f(u.uIntensity, w.intensity);
        gl.uniform1f(u.uPhase, phase);
        gl.uniform3f(u.uFillColor, ...hexToRgb(w.fillColor));
        gl.uniform1f(u.uFillOpacity, w.fillOpacity);
      });
    },
  };
}
