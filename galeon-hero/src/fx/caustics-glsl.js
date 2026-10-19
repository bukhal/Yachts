// Caustic light pattern from Figma shader "Water reflection" v2676e8e2, shared
// by the hull caustics (yacht) and the footer glints. GLSL ES 3.00; needs
// fwidth (core in WebGL2).
export const CAUSTICS_GLSL = `
vec2 waterHash(vec2 cell) {
  return fract(sin(vec2(dot(cell, vec2(127.1, 311.7)), dot(cell, vec2(269.5, 183.3)))) * 43758.5453);
}

float causticGap(vec2 p, float cycle, vec2 seed) {
  vec2 warped = p + 0.23 * vec2(
    sin(p.y * 1.8 + 0.62 * sin(cycle)) + 0.38 * sin(p.x * 2.7 + p.y + 0.42 * cos(cycle)),
    cos(p.x * 1.65 + 0.56 * cos(cycle)) + 0.34 * sin(p.y * 2.5 - p.x + 0.46 * sin(cycle))
  );
  vec2 cell = floor(warped);
  vec2 local = fract(warped);
  float first = 100.0;
  float second = 100.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 offset = vec2(float(i), float(j));
      vec2 h = waterHash(cell + offset + seed);
      vec2 phases = h * 6.28318530718;
      vec2 site = vec2(0.5) + 0.23 * sin(phases + vec2(cycle, -cycle))
        + 0.055 * cos(phases.yx * 2.0 + vec2(2.0 * cycle));
      vec2 delta = offset + site - local;
      float d2 = dot(delta, delta);
      if (d2 < first) { second = first; first = d2; }
      else { second = min(second, d2); }
    }
  }
  return max(sqrt(second) - sqrt(first), 0.0);
}

float causticLight(float gap, float width) {
  float antialias = max(fwidth(gap), 0.0015);
  float ridge = 1.0 - smoothstep(width * 0.15, width + antialias, gap);
  float halo = exp(-gap / max(width * 2.8, 0.001));
  return ridge * 0.78 + halo * 0.22;
}
`;
