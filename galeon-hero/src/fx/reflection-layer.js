import { createShaderLayer } from "./shader-layer.js";
import { reflectionBox } from "./scene-geometry.js";

// Mirror of the current yacht asset about its waterline, generated per frame
// from the same texture as the visible PNG (no baked reflection image).
// Distortion grows with distance from the waterline, so the join with the hull
// stays seamless. All time terms are integer harmonics of uPhase → loops cleanly.
const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSource;
uniform vec2 uSize;        // canvas, CSS px
uniform vec2 uImgSize;     // yacht image box, CSS px
uniform float uWaterline;  // normalized image y
uniform float uOpacity;
uniform float uFadePx;
uniform float uAmp;        // px
uniform float uBlur;       // px
uniform float uPhase;      // 0..2π

vec4 src(vec2 px) {
  // Clamp at the contact line so blur taps never sample above the waterline.
  vec2 uv = vec2(px.x / uImgSize.x, uWaterline - max(px.y, 0.0) / uImgSize.y);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0) return vec4(0.0);
  return texture(uSource, uv);
}

void main() {
  float x = vUv.x * uSize.x;
  float d = vUv.y * uSize.y;                  // px below the waterline
  float depth = clamp(d / max(uFadePx, 1.0), 0.0, 1.0);

  float grow = smoothstep(0.0, 0.35, depth);  // calm at the contact line
  float dx = uAmp * grow * (
      0.65 * sin(d * 0.21 - 2.0 * uPhase + x * 0.004)
    + 0.35 * sin(d * 0.47 + 3.0 * uPhase + x * 0.011));
  float dy = uAmp * 0.45 * grow * sin(x * 0.028 + uPhase + d * 0.06);
  vec2 p = vec2(x + dx, d + dy);

  float r = uBlur * (0.35 + 0.65 * depth);
  vec4 c = src(p) * 0.2;
  c += (src(p + vec2( r, 0.0)) + src(p + vec2(-r, 0.0))) * 0.12;
  c += (src(p + vec2(0.0,  r)) + src(p + vec2(0.0, -r))) * 0.12;
  float q = r * 0.7071;
  c += (src(p + vec2( q,  q)) + src(p + vec2(-q,  q)) + src(p + vec2( q, -q)) + src(p + vec2(-q, -q))) * 0.08;

  float fade = pow(1.0 - depth, 1.6);
  outColor = c * (uOpacity * fade);   // premultiplied in, premultiplied out
}`;

export function createReflectionLayer(canvas, { image, onLost }) {
  const layer = createShaderLayer(canvas, { fs: FS, textures: { uSource: image }, onLost });
  let box = null;
  let imgBox = null;
  let fadePx = 1;

  return {
    layer,
    layout(sceneLayout, asset, waterlineY, fx, dprCap) {
      const r = fx.reflection;
      box = reflectionBox(sceneLayout, waterlineY, r.fade, r.offsetY);
      imgBox = sceneLayout.image;
      fadePx = sceneLayout.hull.height * r.fade;
      layer.place(box, dprCap);
    },
    render(phase, fx, waterlineY) {
      if (!box) return;
      const r = fx.reflection;
      layer.draw((gl, u) => {
        gl.uniform2f(u.uSize, box.width, box.height);
        gl.uniform2f(u.uImgSize, imgBox.width, imgBox.height);
        gl.uniform1f(u.uWaterline, waterlineY);
        gl.uniform1f(u.uOpacity, r.opacity);
        gl.uniform1f(u.uFadePx, fadePx);
        gl.uniform1f(u.uAmp, r.amplitude);
        gl.uniform1f(u.uBlur, r.blur);
        gl.uniform1f(u.uPhase, phase);
      });
    },
  };
}
