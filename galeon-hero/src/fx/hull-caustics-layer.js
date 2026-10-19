import { createShaderLayer } from "./shader-layer.js";
import { causticsBox } from "./scene-geometry.js";
import { hexToRgb } from "./store.js";
import { CAUSTICS_GLSL } from "./caustics-glsl.js";

// Port of Figma shader "Water reflection" v2676e8e2 (reference/water-reflection.2676e8e2.main.ts)
// from WGSL to GLSL ES 3.00. causticGap / causticLight / illumination and the
// reflectionOnly output are line-for-line equivalents. Added on top:
//   hullMask = sourceAlpha × lowerHullBand × (optional hull mask)
// because the original generates light regardless of the input's shape.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSource;      // yacht PNG, premultiplied
uniform sampler2D uHullMask;    // optional per-asset mask (r channel)
uniform float uHasHullMask;
uniform vec4 uUvRect;           // image-uv rect covered by this canvas (x0,y0,x1,y1)
uniform float uWaterline;       // normalized, image space
uniform float uBandHeight;      // normalized, image space
uniform float uBandFade;        // 0..1 share of the band used for the fade-in

uniform float uTime;            // seconds, already reduced mod loopDuration
uniform vec2 uDims;             // output size in CSS px (Figma: width / renderScale)
uniform float uLightIntensity;
uniform float uRippleSize;
uniform float uRippleComplexity;
uniform float uSoftness;
uniform float uAngle;
uniform float uLoopDuration;
uniform float uPhase;
uniform vec4 uLightColor;

${CAUSTICS_GLSL}
void main() {
  vec2 uv = vUv;
  vec2 dims = max(uDims, vec2(1.0));
  float cycle = 6.28318530718 * (uTime / max(uLoopDuration, 0.01) + uPhase / 100.0);
  float angle = uAngle * 0.0174532925199;
  vec2 p = (uv - vec2(0.5)) * dims / max(uRippleSize, 1.0);
  vec2 rotated = vec2(cos(angle) * p.x - sin(angle) * p.y, sin(angle) * p.x + cos(angle) * p.y);
  vec2 projected = rotated / vec2(1.0, 1.32);
  float width = mix(0.025, 0.16, uSoftness);
  float primary = causticLight(causticGap(projected, cycle, vec2(7.0, 13.0)), width);
  float secondary = 0.0;
  float fine = 0.0;
  if (uRippleComplexity > 1.0) {
    secondary = causticLight(causticGap(projected * 1.81 + vec2(6.2, -3.7), cycle + 1.9, vec2(31.0, 59.0)), width * 0.86);
  }
  if (uRippleComplexity > 2.0) {
    fine = causticLight(causticGap(projected * 3.17 + vec2(-2.4, 8.3), cycle + 4.1, vec2(73.0, 101.0)), width * 0.75);
  }
  float secondaryWeight = clamp(uRippleComplexity - 1.0, 0.0, 1.0) * 0.46;
  float fineWeight = clamp(uRippleComplexity - 2.0, 0.0, 1.0) * 0.24;
  float illumination = (primary + secondary * secondaryWeight + fine * fineWeight) / (1.0 + secondaryWeight + fineWeight);
  float strength = 1.0 - exp(-uLightIntensity * illumination * 1.45);
  vec4 lightColor = clamp(uLightColor, vec4(0.0), vec4(1.0));
  // reflectionOnly = true branch of the original.
  float coverage = clamp(strength * lightColor.a, 0.0, 1.0) * smoothstep(0.015, 0.06, illumination);

  // ---- hull mask (web addition) — computed in the yacht image's own uv ----
  vec2 imgUv = mix(uUvRect.xy, uUvRect.zw, uv);
  float sourceAlpha = texture(uSource, imgUv).a;
  float bandTop = uWaterline - uBandHeight;
  float lowerHullBand = smoothstep(bandTop, bandTop + uBandHeight * uBandFade, imgUv.y)
    * step(imgUv.y, uWaterline);
  float hullMask = sourceAlpha * lowerHullBand;
  if (uHasHullMask > 0.5) hullMask *= texture(uHullMask, imgUv).r;

  // Final result is bounded by source alpha, so no light can leak past the silhouette.
  float a = coverage * hullMask;
  outColor = vec4(lightColor.rgb * a, a);
}`;

export function createHullCausticsLayer(canvas, { image, hullMask, onLost }) {
  const layer = createShaderLayer(canvas, {
    fs: FS,
    textures: { uSource: image, uHullMask: hullMask ?? null },
    onLost,
  });
  let box = null;
  let band = 0.2;

  return {
    layer,
    layout(sceneLayout, asset, waterlineY, fx, dprCap) {
      band = asset.causticBandHeight * fx.caustics.bandHeight;
      box = causticsBox(sceneLayout, waterlineY, band);
      layer.place(box, dprCap);
    },
    render(time, fx, waterlineY) {
      if (!box) return;
      const c = fx.caustics;
      canvas.style.mixBlendMode = c.blend;
      // Same reduction as the Figma host: seconds mod loopDuration before float packing.
      const d = Math.max(0.01, c.loopDuration);
      const t = ((time % d) + d) % d;
      const [r, g, b] = hexToRgb(c.lightColor);
      layer.draw((gl, u) => {
        gl.uniform1f(u.uHasHullMask, hullMask ? 1 : 0);
        gl.uniform4f(u.uUvRect, box.uv.x0, box.uv.y0, box.uv.x1, box.uv.y1);
        gl.uniform1f(u.uWaterline, waterlineY);
        gl.uniform1f(u.uBandHeight, box.uv.y1 - box.uv.y0);
        gl.uniform1f(u.uBandFade, c.bandFade);
        gl.uniform1f(u.uTime, t);
        gl.uniform2f(u.uDims, box.width, box.height);
        gl.uniform1f(u.uLightIntensity, c.lightIntensity);
        gl.uniform1f(u.uRippleSize, c.rippleSize);
        gl.uniform1f(u.uRippleComplexity, c.rippleComplexity);
        gl.uniform1f(u.uSoftness, c.reflectionSoftness);
        gl.uniform1f(u.uAngle, c.reflectionAngle);
        gl.uniform1f(u.uLoopDuration, d);
        gl.uniform1f(u.uPhase, c.animationPhase);
        gl.uniform4f(u.uLightColor, r, g, b, 1);
      });
    },
  };
}
