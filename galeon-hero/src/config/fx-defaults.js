import { TUNED } from "./fx-tuned.js";

// Single source of truth for hero effect defaults and their safe ranges.
// Factory defaults live in FX_SCHEMA; values saved from the tuning panel live
// in fx-tuned.js and override them.
// The tuning panel is generated from FX_SCHEMA; the store clamps every value
// to these ranges, so nothing outside them can reach a shader.

// Params of the "Water reflection" shader instance on node 48:1421
// (shader 9518f0c3…, version 2676e8e2…). Starting point for hull caustics.
export const FIGMA_INSTANCE = {
  loopDuration: 2.3,
  reflectionAngle: -149,
  animationPhase: 36,
  rippleSize: 20,
  reflectionSoftness: 0,
  lightIntensity: 0.38,
  reflectionOnly: true,
  lightColor: { r: 1, g: 1, b: 1, a: 1 },
  rippleComplexity: 2.85,
};

const range = (label, def, min, max, step, unit = "") => ({ type: "range", label, default: def, min, max, step, unit });
const toggle = (label, def) => ({ type: "toggle", label, default: def });
const color = (label, def) => ({ type: "color", label, default: def });
const select = (label, def, options) => ({ type: "select", label, default: def, options });

export const FX_SCHEMA = {
  water: {
    label: "Water",
    params: {
      enabled: toggle("Water edge", true),
      intensity: range("Intensity", 0.55, 0, 1, 0.01),
      speed: range("Speed", 0.6, 0, 3, 0.05, "×"),
      amplitude: range("Amplitude", 1.2, 0, 6, 0.1, "px"),
      scale: range("Wave scale", 1, 0.3, 3, 0.05, "×"),
      overlap: range("Overlap on hull", 3, 0, 14, 0.5, "px"),
      fillColor: color("Fill color", "#eff2f6"),
      fillOpacity: range("Fill opacity", 1, 0, 1, 0.01),
      depth: range("Ripple depth", 26, 4, 80, 1, "px"),
      widthScale: range("Width", 1.04, 0.6, 1.5, 0.01, "×"),
    },
  },
  reflection: {
    label: "Reflection",
    params: {
      enabled: toggle("Reflection", true),
      opacity: range("Opacity", 0.32, 0, 1, 0.01),
      fade: range("Fade distance", 0.42, 0.05, 1, 0.01, "of hull h"),
      amplitude: range("Distortion", 2.2, 0, 12, 0.1, "px"),
      speed: range("Distortion speed", 0.5, 0, 3, 0.05, "×"),
      blur: range("Blur", 1.2, 0, 6, 0.1, "px"),
      offsetY: range("Vertical offset", 0, -12, 24, 0.5, "px"),
    },
  },
  caustics: {
    label: "Hull caustics",
    params: {
      enabled: toggle("Caustics", true),
      lightIntensity: range("Light intensity", FIGMA_INSTANCE.lightIntensity, 0, 2, 0.01),
      lightColor: color("Light color", "#ffffff"),
      rippleSize: range("Ripple size", FIGMA_INSTANCE.rippleSize, 8, 300, 1, "px"),
      rippleComplexity: range("Ripple complexity", FIGMA_INSTANCE.rippleComplexity, 1, 3, 0.01),
      reflectionSoftness: range("Softness", FIGMA_INSTANCE.reflectionSoftness, 0, 1, 0.01),
      reflectionAngle: range("Angle", FIGMA_INSTANCE.reflectionAngle, -180, 180, 1, "°"),
      loopDuration: range("Loop duration", FIGMA_INSTANCE.loopDuration, 2, 60, 0.1, "s"),
      animationPhase: range("Phase", FIGMA_INSTANCE.animationPhase, 0, 100, 0.1, "%"),
      bandHeight: range("Band height", 1, 0.2, 3, 0.05, "× asset"),
      bandFade: range("Band fade", 0.75, 0.05, 1, 0.01),
      blend: select("Blend", "soft-light", ["soft-light", "screen", "overlay", "normal"]),
    },
  },
  underlight: {
    label: "Underlight",
    params: {
      enabled: toggle("Underlight", true),
      opacity: range("Opacity", 0.1, 0, 0.6, 0.005),
      color: color("Edge tone", "#323c62"),
      width: range("Width", 2.72, 0.5, 4, 0.01, "× hull w"),
      height: range("Height", 1.54, 0.2, 3, 0.01, "× hull h"),
      offsetY: range("Vertical offset", -9, -120, 120, 1, "px"),
    },
  },
  placement: {
    label: "Placement / scroll",
    params: {
      waterlineY: range("Waterline", 0, -0.05, 0.05, 0.001, "Δ norm"),
      scale: range("Asset scale", 1, 0.6, 1.3, 0.01, "×"),
      offsetX: range("Asset offset X", 0, -80, 80, 1, "px"),
      offsetY: range("Asset offset Y", 0, -60, 60, 1, "px"),
      parallax: range("Parallax strength", 1, 0, 2, 0.05, "×"),
    },
  },
  cutawayWater: {
    label: "Cutaway · water background",
    params: {
      enabled: toggle("Water background", true),
      intensity: range("Intensity", 0.7, 0, 1, 0.01),
      speed: range("Speed", 1, 0, 4, 0.05, "×"),
      scale: range("Ripple scale", 0.8, 0.3, 3, 0.05, "×"),
      contrast: range("Ripple contrast", 1, 0, 2.5, 0.05, "×"),
      glints: range("Sun glints", 0.8, 0, 1, 0.01),
      glintSharpness: range("Glint sharpness", 220, 40, 800, 10),
      coverage: range("Coverage", 1, 0.5, 1.6, 0.01, "×"),
    },
  },
  cutawayTitle: {
    label: "Cutaway · title ripple",
    params: {
      enabled: toggle("Title ripple", true),
      amount: range("Amount", 6, 0, 24, 0.5, "px"),
      scale: range("Ripple scale", 1, 0.3, 3, 0.05, "×"),
      speed: range("Speed", 1, 0, 4, 0.05, "×"),
    },
  },
  cutawayPlan: {
    label: "Cutaway · deck plans",
    params: {
      planScale: range("Plan size", 1.15, 0.8, 1.5, 0.01, "× Figma"),
      shadowOpacity: range("Shadow opacity", 0.16, 0, 0.5, 0.01),
      shadowBlur: range("Shadow blur", 48, 0, 140, 1, "px"),
      shadowY: range("Shadow offset Y", 22, 0, 80, 1, "px"),
    },
  },
  listings: {
    label: "Listings (view state)",
    params: {
      cardStyle: select("Card style", "overlay", ["overlay", "classic"]),
      quickFilters: toggle("Show location quick filters", true),
    },
  },
  footerGlints: {
    label: "Footer · water glints",
    // Ripple shape, softness, angle and loop come from "Hull caustics".
    params: {
      enabled: toggle("Glints", true),
      intensity: range("Intensity", 0.09, 0, 1, 0.01),
      color: color("Light color", "#b9c8ff"),
      scale: range("Ripple size", 2.4, 0.5, 6, 0.05, "× hull"),
      speed: range("Speed", 0.6, 0, 2, 0.05, "×"),
      fadeStart: range("Fade start", 0.45, 0, 0.95, 0.01, "of height"),
    },
  },
  pull: {
    label: "Pull at top",
    params: {
      enabled: toggle("Elastic pull", true),
      maxDistance: range("Max distance", 180, 40, 400, 5, "px"),
      threshold: range("Threshold", 110, 20, 300, 5, "px"),
      stiffness: range("Spring stiffness", 1200, 100, 2400, 20), // critically damped: visually back in ~0.15 s
    },
  },
  debug: {
    label: "Debug",
    params: {
      hideYacht: toggle("Hide yacht PNG", false),
      contrastBackdrop: toggle("Contrast backdrop", false),
    },
  },
};

// A slower, calmer variant of the Figma caustics loop.
export const PRESETS = {
  figma: { label: "Figma instance", values: {} },
  calm: {
    label: "Calm loop",
    values: { caustics: { loopDuration: 9, lightIntensity: 0.32, rippleSize: 24 }, water: { speed: 0.4 } },
  },
};

// Groups that are never saved as defaults.
export const VOLATILE_GROUPS = ["debug"];

export function buildFactoryDefaults() {
  const out = {};
  for (const [group, { params }] of Object.entries(FX_SCHEMA)) {
    out[group] = {};
    for (const [key, spec] of Object.entries(params)) out[group][key] = spec.default;
  }
  return out;
}

/** Factory defaults with the saved tuning applied (unknown keys are ignored). */
export function buildDefaults(tuned = TUNED) {
  const out = buildFactoryDefaults();
  for (const [group, values] of Object.entries(tuned ?? {})) {
    if (!out[group] || VOLATILE_GROUPS.includes(group)) continue;
    for (const [key, value] of Object.entries(values ?? {})) if (key in out[group]) out[group][key] = value;
  }
  return out;
}
