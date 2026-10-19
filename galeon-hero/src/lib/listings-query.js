// Filter + sort model for the listings of one model (client-side: a dozen
// items). Follows Baymard's filtering findings:
//   - multi-select (checkbox) facets: condition, location
//   - range facets with sliders + text inputs: price, year, engine hours
//   - non-linear slider scale that follows the actual data distribution
// TODO(backend): with large inventories move filtering to the API (same URL params).

export const SORTS = [
  { id: "recommended", label: "Recommended" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "year-desc", label: "Newest first" },
  { id: "hours-asc", label: "Lowest engine hours" },
];

export const CONDITIONS = [
  { id: "new", label: "New" },
  { id: "used", label: "Pre-owned" },
];

/** Range facets: which field, how values snap, and whether both ends are editable. */
export const RANGES = {
  price: { field: "priceUsd", step: 10000, dual: true },
  year: { field: "year", step: 1, dual: true },
  hours: { field: "engineHours", step: 10, dual: false }, // "up to N hours"
};

/** @returns {import("../types").ListingFilters} */
export function emptyFilters() {
  return { cond: [], gen: [], loc: [], price: null, year: null, hours: null };
}

const inRange = (v, r) => r === null || (Number.isFinite(v) && v >= r.min && v <= r.max);

/**
 * @param {import("../types").ListingCard[]} listings
 * @param {import("../types").ListingFilters} f
 * @param {keyof import("../types").ListingFilters} [except]  ignore one facet (for its own counts/histogram)
 */
export function applyFilters(listings, f, except) {
  return listings.filter(
    (l) =>
      (except === "cond" || !f.cond.length || f.cond.includes(l.condition)) &&
      (except === "gen" || !f.gen?.length || f.gen.includes(l.generation)) &&
      (except === "loc" || !f.loc.length || f.loc.includes(l.location.countryCode)) &&
      (except === "price" || inRange(l.priceUsd, f.price)) &&
      (except === "year" || inRange(l.year, f.year)) &&
      (except === "hours" || inRange(l.engineHours, f.hours)),
  );
}

/** Data bounds for every range facet (from all listings, so the scale is stable while filtering). */
export function rangeBounds(listings) {
  const out = {};
  for (const [key, { field, step }] of Object.entries(RANGES)) {
    const values = listings.map((l) => l[field]).filter(Number.isFinite).sort((a, b) => a - b);
    const lo = values.length ? Math.floor(values[0] / step) * step : 0;
    const hi = values.length ? Math.ceil(values.at(-1) / step) * step : step;
    out[key] = { min: lo, max: Math.max(hi, lo + step), values };
  }
  return out;
}

export function locations(listings) {
  return [...new Set(listings.map((l) => l.location.countryCode).filter(Boolean))];
}

/** A range that covers the whole data span is no filter at all. */
export function normalizeRange(r, bounds, dual = true) {
  if (!r) return null;
  const min = dual ? Math.max(bounds.min, Math.min(r.min, r.max)) : bounds.min;
  const max = Math.min(bounds.max, Math.max(r.min, r.max));
  if (min <= bounds.min && max >= bounds.max) return null;
  return { min, max };
}

// Missing values ("Price on request", unknown hours) go last in either direction.
const nullsLast = (x, y, dir = 1) => (x == null ? (y == null ? 0 : 1) : y == null ? -1 : dir * (x - y));

export function sortListings(listings, sortId) {
  const out = [...listings];
  const by = {
    "price-asc": (a, b) => nullsLast(a.priceUsd, b.priceUsd),
    "price-desc": (a, b) => nullsLast(a.priceUsd, b.priceUsd, -1),
    "year-desc": (a, b) => b.year - a.year || nullsLast(a.priceUsd, b.priceUsd),
    "hours-asc": (a, b) => nullsLast(a.engineHours, b.engineHours),
  }[sortId];
  return by ? out.sort(by) : out; // "recommended" keeps the backend order
}

export function activeCount(f) {
  return f.cond.length + (f.gen?.length ?? 0) + f.loc.length + [f.price, f.year, f.hours].filter(Boolean).length;
}

// ---- URL: ?cond=new,used&gen=gen2&loc=US,GR&price=800000-1200000&year=2019-2022&hours=500 ----

export function filtersToParams(f, params = new URLSearchParams()) {
  for (const k of ["cond", "gen", "loc", "price", "year", "hours"]) params.delete(k);
  if (f.cond.length) params.set("cond", f.cond.join(","));
  if (f.gen?.length) params.set("gen", f.gen.join(","));
  if (f.loc.length) params.set("loc", f.loc.join(","));
  if (f.price) params.set("price", `${f.price.min}-${f.price.max}`);
  if (f.year) params.set("year", `${f.year.min}-${f.year.max}`);
  if (f.hours) params.set("hours", String(f.hours.max));
  return params;
}

export function filtersFromParams(params, bounds, knownLocations, knownGenerations = []) {
  const list = (k, allowed) => (params.get(k) ?? "").split(",").filter((v) => allowed.includes(v));
  const pair = (k) => {
    const m = /^(\d+)-(\d+)$/.exec(params.get(k) ?? "");
    return m ? normalizeRange({ min: +m[1], max: +m[2] }, bounds[k]) : null;
  };
  const h = Number(params.get("hours"));
  return {
    cond: list("cond", CONDITIONS.map((c) => c.id)),
    gen: list("gen", knownGenerations),
    loc: list("loc", knownLocations),
    price: pair("price"),
    year: pair("year"),
    hours: Number.isFinite(h) && h > 0 ? normalizeRange({ min: bounds.hours.min, max: h }, bounds.hours, false) : null,
  };
}

// ---- non-linear slider scale ----

/**
 * Slider position 0..1 ↔ value. Knots are the sorted data values spread evenly
 * along the track, so dense value ranges get more track (Baymard: "biased scale
 * based on how the products are actually distributed").
 */
export function createDistributionScale(values, min, max) {
  const knots = [...new Set([min, ...values.filter((v) => v > min && v < max), max])].sort((a, b) => a - b);
  if (knots.length < 2) knots.push(min + 1);
  const n = knots.length - 1;
  return {
    toValue(t) {
      const x = Math.min(1, Math.max(0, t)) * n;
      const i = Math.min(n - 1, Math.floor(x));
      return knots[i] + (knots[i + 1] - knots[i]) * (x - i);
    },
    toPos(v) {
      if (v <= knots[0]) return 0;
      if (v >= knots[n]) return 1;
      let i = 0;
      while (knots[i + 1] < v) i++;
      return (i + (v - knots[i]) / (knots[i + 1] - knots[i] || 1)) / n;
    },
  };
}

export function linearScale(min, max) {
  return { toValue: (t) => min + (max - min) * Math.min(1, Math.max(0, t)), toPos: (v) => (v - min) / (max - min || 1) };
}
