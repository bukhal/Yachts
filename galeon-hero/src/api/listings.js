// Listings of one model (the "For sale" section) and the inventory summary
// derived from them. Components get normalized ListingCard objects.

import { API_BASE, apiJson } from "./http.js";
import { safeUrl } from "../lib/safe-url.js";

// Approximate rates for comparing prices across currencies in the demo only.
// TODO(backend): send `priceUsd` (or a normalized price) with every listing.
const USD_PER = { USD: 1, EUR: 1.1 };

const isObj = (v) => v !== null && typeof v === "object";

/** @returns {import("../types").ListingCard | null} */
export function normalizeListing(dto) {
  if (!isObj(dto) || typeof dto.slug !== "string" || !Number.isInteger(dto.year)) return null;
  const media = (Array.isArray(dto.media) ? dto.media : []).filter(
    (m) => isObj(m) && typeof m.src === "string" && (m.type === "image" || m.type === "video"),
  );
  if (!media.some((m) => m.type === "image")) return null; // a card needs at least one photo
  const price = Number.isFinite(dto.price) && dto.price > 0 ? dto.price : null;
  const currency = /^[A-Z]{3}$/.test(dto.currency ?? "") ? dto.currency : null;
  return {
    ...dto,
    url: safeUrl(dto.url),
    price: currency ? price : null,
    currency,
    priceUsd: price && currency && USD_PER[currency] ? Math.round(price * USD_PER[currency]) : null,
    oldPrice: Number.isFinite(dto.oldPrice) && price && dto.oldPrice > price ? dto.oldPrice : null,
    engineHours: Number.isFinite(dto.engineHours) ? dto.engineHours : null,
    location: isObj(dto.location) ? dto.location : {},
    // TODO(backend): send the confirmed generation. Until then assignGenerations()
    // derives it from the model year and the content's generations.
    generation: typeof dto.generation === "string" ? dto.generation : null,
    media: media.slice(0, 6),
  };
}

/** Count + lowest asking price in one currency; never invents a price. */
export function summarizeInventory(listings, { currency = "USD", updatedAt } = {}) {
  const priced = listings.filter((l) => l.price && l.currency === currency);
  return {
    listingCount: listings.length,
    minimumAskingPrice: priced.length ? Math.min(...priced.map((l) => l.price)) : null,
    currency,
    updatedAt,
    isDemo: false,
  };
}

/** Generation of a model year within `generations` (null when outside all of them). */
export function generationOf(year, generations = []) {
  return generations.find((g) => year >= g.years?.[0] && year <= (g.years?.[1] ?? Infinity))?.id ?? null;
}

/** Fills `generation` where the backend didn't send one (by model year). Mutates and returns the list. */
export function assignGenerations(listings, generations = []) {
  for (const l of listings) l.generation ??= generationOf(l.year, generations);
  return listings;
}

/** Date of the mock snapshot ("updated …" line); null with a live API. Set once the mock is loaded. */
export let listingsSnapshotDate = null;

/** @param {string} modelId */
export async function getModelListings(modelId, { signal } = {}) {
  // TODO(backend): GET /api/models/{id}/listings — available listings of this model, recommended order.
  if (!API_BASE) {
    const mock = await import("../data/listings.mock.js"); // dev data, loaded only without an API
    listingsSnapshotDate = mock.LISTINGS_SNAPSHOT_AT;
    return mock.galeon500FlyListings.map((dto) => normalizeListing(dto)).filter(Boolean);
  }
  const body = await apiJson(`/models/${encodeURIComponent(modelId)}/listings`, { signal });
  const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  return list.map((dto) => normalizeListing(dto)).filter(Boolean);
}
