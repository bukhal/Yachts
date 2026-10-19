// Visitor preferences (not design tuning): unit system and saved models.
// Stored locally; TODO(backend): sync "saved" to the account when signed in.

const KEY = "yw-prefs-v1";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

export function createPreferences() {
  const raw = read();
  let state = {
    units: raw.units === "imperial" ? "imperial" : "metric",
    saved: Array.isArray(raw.saved) ? raw.saved.filter((x) => typeof x === "string") : [],
  };
  const listeners = new Set();
  const commit = (change) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* private mode: preference lasts for this page view */
    }
    listeners.forEach((fn) => fn(state, change));
  };
  return {
    get: () => state,
    setUnits(units) {
      if (units === state.units || (units !== "metric" && units !== "imperial")) return;
      const from = state.units;
      state = { ...state, units };
      commit({ units, from });
    },
    isSaved: (id) => state.saved.includes(id),
    toggleSaved(id) {
      const saved = state.saved.includes(id) ? state.saved.filter((x) => x !== id) : [...state.saved, id];
      state = { ...state, saved };
      commit({ saved: id });
      return saved.includes(id);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
