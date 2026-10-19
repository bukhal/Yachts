// Content of the sections under the hero (Generations, Specifications, Reviews,
// Models, Dealers, FAQ). Components get a normalized ModelContent: every list
// exists (possibly empty), malformed entries are dropped and links are safe, so
// a missing optional block hides that block instead of breaking the page.
// Contract: ModelContent in src/types.d.ts, docs/BACKEND.md.

import { API_BASE, apiJson } from "./http.js";
import { safeUrl } from "../lib/safe-url.js";

const isObj = (v) => v !== null && typeof v === "object";
const str = (v) => (typeof v === "string" ? v : "");
const list = (v, fn) => (Array.isArray(v) ? v.map((x) => (isObj(x) ? fn(x) : null)).filter(Boolean) : []);
const num = (v) => (Number.isFinite(v) ? v : null);

function normalizeGeneration(g) {
  if (typeof g.id !== "string" || !Array.isArray(g.years) || !Number.isInteger(g.years[0])) return null;
  return {
    id: g.id,
    label: str(g.label) || g.id,
    title: str(g.title),
    years: [g.years[0], Number.isInteger(g.years[1]) ? g.years[1] : null],
    image: str(g.image),
    points: Array.isArray(g.points) ? g.points.filter((p) => typeof p === "string") : [],
    sources: Array.isArray(g.sources) ? g.sources.map(safeUrl).filter(Boolean) : [],
  };
}

function normalizeSpecGroup(g) {
  if (typeof g.id !== "string") return null;
  const rows = list(g.rows, (r) =>
    typeof r.label === "string" && r.value !== null && r.value !== undefined && r.value !== ""
      ? {
          label: r.label,
          value: r.value,
          // Only numbers convert between unit systems; anything else shows as text.
          quantity: typeof r.value === "number" && ["length", "volume", "mass"].includes(r.quantity) ? r.quantity : undefined,
          note: typeof r.note === "string" ? r.note : undefined,
        }
      : null,
  );
  return rows.length ? { id: g.id, title: str(g.title), icon: str(g.icon), rows } : null;
}

function normalizeDrawings(d) {
  if (!isObj(d)) return null;
  const dims = isObj(d.dimensions) ? d.dimensions : {};
  const dimensions = { loa: num(dims.loa), draft: num(dims.draft), beam: num(dims.beam), beachMode: num(dims.beachMode) };
  const u = d.underwater;
  const underwater =
    isObj(u) && typeof u.src === "string" && [u.left, u.width, u.aspect].every(Number.isFinite) ? { src: u.src, left: u.left, width: u.width, aspect: u.aspect } : null;
  return dimensions.loa ? { dimensions, underwater } : null;
}

function normalizeFaqEntry(f) {
  const keywords = Array.isArray(f.keywords) ? f.keywords.filter((k) => typeof k === "string").map((k) => k.toLowerCase()) : [];
  if (["price", "count", "generation"].includes(f.auto)) return { auto: f.auto, q: str(f.q), keywords };
  return typeof f.q === "string" && typeof f.a === "string" ? { q: f.q, a: f.a, keywords } : null;
}

/** @returns {import("../types").ModelContent} */
export function normalizeModelContent(dto) {
  const c = isObj(dto) ? dto : {};
  return {
    generations: list(c.generations, normalizeGeneration).sort((a, b) => a.years[0] - b.years[0]),
    successor: isObj(c.successor) ? normalizeGeneration(c.successor) : null,
    drawings: normalizeDrawings(c.drawings),
    specGroups: list(c.specGroups, normalizeSpecGroup),
    videos: list(c.videos, (v) =>
      typeof v.id === "string" && /^[\w-]{6,20}$/.test(v.id) ? { ...v, title: str(v.title), channel: str(v.channel), thumb: str(v.thumb), summary: str(v.summary) } : null,
    ),
    quotes: list(c.quotes, (q) => (typeof q.text === "string" ? { text: q.text, author: str(q.author), publication: str(q.publication), url: safeUrl(q.url) } : null)),
    models: list(c.models, (m) =>
      typeof m.name === "string" && Number.isFinite(m.lengthM)
        ? { ...m, url: safeUrl(m.url), forSale: Number.isInteger(m.forSale) ? m.forSale : 0, fromUsd: num(m.fromUsd) }
        : null,
    ),
    modelsUrl: safeUrl(c.modelsUrl),
    modelsKind: str(c.modelsKind),
    dealers: list(c.dealers, (d) =>
      typeof d.name === "string" ? { name: d.name, area: str(d.area), location: str(d.location), logo: str(d.logo), web: safeUrl(d.web), profile: safeUrl(d.profile) } : null,
    ),
    faq: list(c.faq, normalizeFaqEntry),
  };
}

/** @param {import("../types").ModelHeroData} model */
export async function getModelContent(model, { signal } = {}) {
  // TODO(backend): GET /api/models/{id}/content
  if (!API_BASE) return normalizeModelContent((await import("../data/galeon-500-fly.sections.js")).galeon500FlyContent);
  return normalizeModelContent(await apiJson(`/models/${encodeURIComponent(model.id)}/content`, { signal }));
}
