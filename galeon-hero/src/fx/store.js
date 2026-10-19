import { FX_SCHEMA, PRESETS, VOLATILE_GROUPS, buildDefaults, buildFactoryDefaults } from "../config/fx-defaults.js";

// v2: only values that differ from the defaults are stored, so new defaults
// reach returning visitors (v1 stored everything and froze old defaults).
const STORAGE_KEY = "yw-hero-fx-v2";

function clampValue(spec, value) {
  if (!spec) return undefined;
  switch (spec.type) {
    case "range": {
      const n = Number(value);
      if (!Number.isFinite(n)) return spec.default;
      return Math.min(spec.max, Math.max(spec.min, n));
    }
    case "toggle":
      return Boolean(value);
    case "color":
      return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : spec.default;
    case "select":
      return spec.options.includes(value) ? value : spec.default;
  }
}

export function sanitizeFx(raw, base = buildDefaults()) {
  const out = structuredClone(base);
  if (!raw || typeof raw !== "object") return out;
  for (const [group, { params }] of Object.entries(FX_SCHEMA)) {
    for (const key of Object.keys(params)) {
      const v = raw[group]?.[key];
      if (v !== undefined) out[group][key] = clampValue(params[key], v);
    }
  }
  return out;
}

/** Values that differ from the factory defaults, without debug toggles. */
export function diffFromFactory(state) {
  const factory = buildFactoryDefaults();
  const diff = {};
  for (const [group, values] of Object.entries(state)) {
    if (VOLATILE_GROUPS.includes(group)) continue;
    for (const [key, value] of Object.entries(values)) {
      if (factory[group]?.[key] !== value) (diff[group] ??= {})[key] = value;
    }
  }
  return diff;
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(state, defaults) {
  const diff = {};
  for (const [group, values] of Object.entries(state)) {
    for (const [key, value] of Object.entries(values)) {
      if (defaults[group]?.[key] !== value) (diff[group] ??= {})[key] = value;
    }
  }
  try {
    localStorage.removeItem("yw-hero-fx-v1");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diff));
  } catch {
    /* storage unavailable: settings live for this session only */
  }
}

/** One shared FX config. Sliders write here; layers read from here each frame. */
export function createFxStore({ persist = true } = {}) {
  let defaults = sanitizeFx(buildDefaults(), buildFactoryDefaults());
  let state = sanitizeFx(persist ? readStored() : null, defaults);
  let paused = false;
  const listeners = new Set();
  const emit = (change) => {
    if (persist) writeStored(state, defaults);
    listeners.forEach((fn) => fn(state, change));
  };

  return {
    get: () => state,
    get paused() {
      return paused;
    },
    setPaused(value) {
      paused = Boolean(value);
      listeners.forEach((fn) => fn(state, { paused }));
    },
    set(group, key, value) {
      const spec = FX_SCHEMA[group]?.params[key];
      if (!spec) return;
      state = { ...state, [group]: { ...state[group], [key]: clampValue(spec, value) } };
      emit({ group, key });
    },
    get defaults() {
      return defaults;
    },
    /** After "Save as defaults": the current values become the reset target. */
    rebaseDefaults(tuned) {
      defaults = sanitizeFx(buildDefaults(tuned), buildFactoryDefaults());
      emit({ rebased: true });
    },
    isChanged(group, key) {
      return state[group][key] !== defaults[group][key];
    },
    reset() {
      state = structuredClone(defaults);
      emit({ reset: true });
    },
    applyPreset(id) {
      const preset = PRESETS[id];
      if (!preset) return;
      const next = structuredClone(defaults);
      for (const [group, values] of Object.entries(preset.values)) Object.assign(next[group], values);
      state = sanitizeFx(next, defaults);
      emit({ preset: id });
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
