// Metric ↔ Imperial (US) for spec values. Data is stored metric; the page
// renders in the visitor's system. Knots and horsepower are the marine
// standard in both systems, so they don't convert.

export const SYSTEMS = { metric: "metric", imperial: "imperial" };

const FT_PER_M = 3.280839895;
const GAL_PER_L = 1 / 3.785411784;
const LB_PER_KG = 2.20462262;

/** Quantity → { factor, metric unit, imperial unit } */
const Q = {
  length: { factor: FT_PER_M, metric: "meters", imperial: "feet", shortM: "m" },
  volume: { factor: GAL_PER_L, metric: "liters", imperial: "US gal", shortM: "L" },
  mass: { factor: LB_PER_KG, metric: "kg", imperial: "lb", shortM: "kg" },
};


/** Numeric value in the given system (metric input). */
export function toSystem(quantity, metricValue, system) {
  const q = Q[quantity];
  return q && system === SYSTEMS.imperial ? metricValue * q.factor : metricValue;
}

/** Feet → 53′2″ (yacht convention). */
export function feetInches(feet) {
  let ft = Math.floor(feet);
  let inch = Math.round((feet - ft) * 12);
  if (inch === 12) {
    ft += 1;
    inch = 0;
  }
  return `${ft}′${inch}″`;
}

/**
 * Display a value (already in `system`) for a quantity.
 * @param {{ decimals?: number }} [opts] decimals for metric lengths (default 2)
 */
export function formatQuantity(quantity, value, system, { decimals = 2 } = {}) {
  if (quantity === "length") {
    return system === SYSTEMS.imperial ? feetInches(value) : value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return Math.round(value).toLocaleString("en-US");
}

export function unitLabel(quantity, system, { short = false } = {}) {
  const q = Q[quantity];
  if (!q) return "";
  if (system === SYSTEMS.imperial) return q.imperial;
  return short ? q.shortM : q.metric;
}

/** "{m:6.00} in Beach Mode" → "6.00 m in Beach Mode" / "19′8″ in Beach Mode". Also {L:…}, {kg:…}. */
export function fillUnits(text, system) {
  if (typeof text !== "string") return text;
  return text.replace(/\{(m|L|kg):([\d.]+)\}/g, (_, u, n) => {
    const quantity = { m: "length", L: "volume", kg: "mass" }[u];
    const v = toSystem(quantity, Number(n), system);
    const shown = formatQuantity(quantity, v, system);
    return quantity === "length" && system === SYSTEMS.imperial ? shown : `${shown} ${unitLabel(quantity, system, { short: true })}`;
  });
}

/**
 * Both systems in one element, stacked in the same grid cell; CSS shows the
 * one matching <html data-units> (see .u-dual). The cell is as wide as the
 * longer variant, so switching never shifts the layout.
 * @param {{ block?: boolean }} [opts] block = full-width text (paragraphs, list items)
 */
export function dual(metricText, imperialText, { block = false } = {}) {
  const wrap = document.createElement("span");
  wrap.className = block ? "u-dual u-dual--block" : "u-dual";
  for (const [sys, text] of [["metric", metricText], ["imperial", imperialText]]) {
    const s = document.createElement("span");
    s.dataset.sys = sys;
    s.textContent = text;
    wrap.append(s);
  }
  return wrap;
}

/** Value + unit for a metric quantity, both systems (e.g. "16.20 m" / "53′2″"). */
export function dualQuantity(quantity, metricValue, { withUnit = true } = {}) {
  const text = (sys) => {
    const v = formatQuantity(quantity, toSystem(quantity, metricValue, sys), sys);
    if (!withUnit || (quantity === "length" && sys === SYSTEMS.imperial)) return v;
    return `${v} ${unitLabel(quantity, sys, { short: true })}`;
  };
  return dual(text(SYSTEMS.metric), text(SYSTEMS.imperial));
}

/** A text template with {m:…} tokens, both systems. */
export const dualText = (template, opts) => dual(fillUnits(template, SYSTEMS.metric), fillUnits(template, SYSTEMS.imperial), opts);
