// Data access for the model hero. The only place that knows where data comes
// from; components receive normalized ModelHeroData / InventorySummary.
// Contract and endpoint notes: docs/BACKEND.md.

import { getModelListings, summarizeInventory, listingsSnapshotDate } from "./listings.js";
import { API_BASE, apiJson, ApiError } from "./http.js";
import { resolveCountry } from "../lib/country.js";
import { safeUrl } from "../lib/safe-url.js";

// TODO(backend): the page template sets window.__YW_CONFIG__ = { apiBase: "/api" }.
// While it's unset, the mocks in src/data are used (loaded lazily, so they can be deleted).

const clamp01 = (v, fallback) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);
const isObj = (v) => v !== null && typeof v === "object";

export class HeroDataError extends ApiError {}

/**
 * Validates and fills defaults for one view asset. Returns null when the asset
 * is unusable, so the view falls back to its placeholder instead of breaking.
 * @returns {import("../types").YachtHeroAsset | null}
 */
/** Normalized opaque area of an image, or undefined (then detected from alpha once on load). */
function normalizeBounds(vb) {
  return isObj(vb) && [vb.x, vb.y, vb.width, vb.height].every(Number.isFinite) && vb.width > 0 && vb.height > 0
    ? { x: clamp01(vb.x, 0), y: clamp01(vb.y, 0), width: clamp01(vb.width, 1), height: clamp01(vb.height, 1) }
    : undefined;
}

export function normalizeAsset(dto) {
  if (!isObj(dto) || typeof dto.src !== "string" || !dto.src) return null;
  const bounds = normalizeBounds(dto.visibleBounds);
  return {
    src: dto.src,
    alt: typeof dto.alt === "string" ? dto.alt : "",
    intrinsicWidth: Number.isFinite(dto.intrinsicWidth) ? dto.intrinsicWidth : undefined,
    intrinsicHeight: Number.isFinite(dto.intrinsicHeight) ? dto.intrinsicHeight : undefined,
    visibleBounds: bounds,
    // Waterline must be authored per asset; 1 (image bottom) is the safest guess.
    waterlineY: clamp01(dto.waterlineY, 1),
    anchorX: Number.isFinite(dto.anchorX) ? clamp01(dto.anchorX, 0.5) : undefined,
    causticBandHeight: clamp01(dto.causticBandHeight, 0.2),
    hullMaskSrc: typeof dto.hullMaskSrc === "string" ? dto.hullMaskSrc : undefined,
    enableWaterFx: dto.enableWaterFx !== false,
    water: {
      widthScale: Number.isFinite(dto.water?.widthScale) ? dto.water.widthScale : 1,
      offsetX: Number.isFinite(dto.water?.offsetX) ? dto.water.offsetX : 0,
    },
  };
}

/** Deck plans + tour. Invalid decks are dropped; no decks → null (placeholder shown). */
export function normalizeCutaway(dto) {
  if (!isObj(dto) || !Array.isArray(dto.decks)) return null;
  const decks = dto.decks.filter((d) => isObj(d) && typeof d.id === "string" && typeof d.src === "string" && d.src);
  if (!decks.length) return null;
  const tourUrl = typeof dto.tour?.url === "string" && /^https:\/\//.test(dto.tour.url) ? dto.tour.url : null;
  const hotspots = {};
  for (const [deckId, list] of Object.entries(isObj(dto.tour?.hotspots) ? dto.tour.hotspots : {})) {
    hotspots[deckId] = (Array.isArray(list) ? list : []).filter(
      (h) => isObj(h) && Number.isFinite(h.x) && Number.isFinite(h.y) && typeof h.rid === "string" && h.rid,
    ).map((h) => ({ ...h, x: clamp01(h.x, 0.5), y: clamp01(h.y, 0.5) }));
  }
  return {
    intrinsicWidth: Number.isFinite(dto.intrinsicWidth) ? dto.intrinsicWidth : 1000,
    intrinsicHeight: Number.isFinite(dto.intrinsicHeight) ? dto.intrinsicHeight : 346,
    decks: decks.map((d) => ({
      id: d.id,
      label: String(d.label ?? d.id),
      src: d.src,
      alt: String(d.alt ?? ""),
      visibleBounds: normalizeBounds(d.visibleBounds),
    })),
    displayScale: Number.isFinite(dto.displayScale) && dto.displayScale > 0 ? Math.min(2, dto.displayScale) : 1,
    defaultDeck: decks.some((d) => d.id === dto.defaultDeck) ? dto.defaultDeck : decks[0].id,
    tour: tourUrl ? { provider: dto.tour.provider ?? null, url: tourUrl, hotspots } : null,
  };
}

/** Accepts `countryCode` (preferred) or a country name; always returns both. */
export function normalizeBuilder(b) {
  const { code, name } = resolveCountry(b);
  return {
    name: String(b.name ?? ""),
    countryCode: code,
    country: name,
    logoSrc: typeof b.logoSrc === "string" ? b.logoSrc : undefined,
    founded: Number.isInteger(b.founded) ? b.founded : undefined,
    note: typeof b.note === "string" ? b.note : undefined,
    sourceId: typeof b.sourceId === "string" ? b.sourceId : undefined,
  };
}

/** @returns {import("../types").ModelHeroData} */
export function normalizeModelHero(dto) {
  if (!isObj(dto) || typeof dto.id !== "string" || !dto.id || typeof dto.name !== "string" || !isObj(dto.builder)) {
    throw new HeroDataError("Model hero: missing id, name or builder");
  }
  const side = normalizeAsset(dto.side);
  if (!side) throw new HeroDataError("Model hero: side view asset is required");
  return {
    ...dto,
    builder: normalizeBuilder(dto.builder),
    side,
    cutaway: normalizeCutaway(dto.cutaway),
    gallery: Array.isArray(dto.gallery)
      ? dto.gallery
          .filter((g) => isObj(g) && typeof g.src === "string" && g.src)
          .map((g) => ({
            src: g.src,
            thumb: typeof g.thumb === "string" && g.thumb ? g.thumb : g.src,
            alt: String(g.alt ?? ""),
            width: Number.isFinite(g.width) ? g.width : undefined,
            height: Number.isFinite(g.height) ? g.height : undefined,
          }))
      : [],
    // A spec without a value is hidden rather than rendered as "—" in the hero.
    specs: Array.isArray(dto.specs)
      ? dto.specs.filter((s) => isObj(s) && typeof s.id === "string" && s.value !== null && s.value !== undefined && s.value !== "")
      : [],
    sources: isObj(dto.sources) ? normalizeSources(dto.sources) : {},
  };
}

/** Source links shown in the specs tooltip / Tune panel: drop unsafe URLs. */
function normalizeSources(sources) {
  return Object.fromEntries(
    Object.entries(sources)
      .filter(([, s]) => isObj(s))
      .map(([id, s]) => [id, { ...s, url: safeUrl(s.url) ?? undefined }]),
  );
}

/** @returns {import("../types").InventorySummary} */
export function normalizeInventory(dto) {
  const count = Number.isInteger(dto?.listingCount) && dto.listingCount >= 0 ? dto.listingCount : null;
  const price = Number.isFinite(dto?.minimumAskingPrice) && dto.minimumAskingPrice > 0 ? dto.minimumAskingPrice : null;
  const currency = typeof dto?.currency === "string" && /^[A-Z]{3}$/.test(dto.currency) ? dto.currency : null;
  return {
    listingCount: count,
    // A price without a valid currency or without listings is never shown.
    minimumAskingPrice: count && currency ? price : null,
    currency: currency ?? "USD",
    updatedAt: typeof dto?.updatedAt === "string" ? dto.updatedAt : undefined,
    isDemo: Boolean(dto?.isDemo),
  };
}

/** Data inlined by SSR: <script type="application/json" id="model-hero-data">…</script> */
function readInlined() {
  const node = globalThis.document?.getElementById("model-hero-data");
  if (!node) return null;
  try {
    return JSON.parse(node.textContent);
  } catch {
    return null;
  }
}

/** @param {string} slug */
export async function getModelHero(slug, opts) {
  const inlined = readInlined();
  if (inlined) return normalizeModelHero(inlined);
  // TODO(backend): GET /api/models/{slug}/hero (or inline it via SSR, see readInlined)
  if (!API_BASE) return normalizeModelHero((await import("../data/galeon-500-fly.js")).galeon500Fly);
  return normalizeModelHero(await apiJson(`/models/${encodeURIComponent(slug)}/hero`, opts));
}

/** @param {string} modelId */
export async function getInventorySummary(modelId, opts) {
  // TODO(backend): GET /api/models/{id}/inventory-summary — live listings only, see docs/BACKEND.md
  // Until then it's derived from the listings snapshot, so hero and grid always agree.
  if (!API_BASE) {
    const listings = await getModelListings(modelId, opts);
    return normalizeInventory(summarizeInventory(listings, { updatedAt: listingsSnapshotDate }));
  }
  return normalizeInventory(await apiJson(`/models/${encodeURIComponent(modelId)}/inventory-summary`, opts));
}
