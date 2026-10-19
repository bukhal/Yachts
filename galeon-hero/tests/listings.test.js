import test from "node:test";
import assert from "node:assert/strict";
import { monthlyPayment, priceParts, formatLocation, flagEmoji } from "../src/lib/listing-format.js";
import {
  applyFilters, sortListings, emptyFilters, rangeBounds, locations, normalizeRange,
  filtersToParams, filtersFromParams, createDistributionScale,
} from "../src/lib/listings-query.js";
import { normalizeListing, summarizeInventory, assignGenerations, generationOf } from "../src/api/listings.js";
import { galeon500FlyListings } from "../src/data/listings.mock.js";
import { galeon500FlyContent } from "../src/data/galeon-500-fly.sections.js";

const listings = assignGenerations(galeon500FlyListings.map((dto) => normalizeListing(dto)).filter(Boolean), galeon500FlyContent.generations);
const bounds = rangeBounds(listings);

test("snapshot: 12 Galeon 500 Fly listings, each with photos", () => {
  assert.equal(listings.length, 12);
  assert.ok(listings.every((l) => l.media.some((m) => m.type === "image")));
  assert.equal(listings.filter((l) => l.media[0].type === "video").length, 1);
});

test("monthly payment uses YachtWay's formula (10% down, 5% APR, 240 months)", () => {
  // 900,000 → 810,000 financed → 5,345.6/mo
  assert.equal(monthlyPayment(900000), 5346);
  assert.equal(monthlyPayment(0), null);
});

test("price and location formatting", () => {
  assert.deepEqual(priceParts(899999, "USD"), { symbol: "$", amount: "899,999", text: "$899,999" });
  assert.equal(priceParts(1090000, "EUR").symbol, "€");
  assert.equal(formatLocation({ city: "Miami Beach", region: "FL", countryCode: "US" }), "Miami Beach, FL");
  assert.equal(formatLocation({ city: "Athens", countryCode: "GR" }), "Athens, Greece");
  assert.equal(flagEmoji("PL"), "🇵🇱");
  assert.equal(flagEmoji("??"), "");
});

test("inventory summary: count all, lowest price only in the requested currency", () => {
  const s = summarizeInventory(listings, { updatedAt: "2026-10-19" });
  assert.equal(s.listingCount, 12);
  assert.equal(s.minimumAskingPrice, 800000);
  assert.equal(summarizeInventory([], {}).minimumAskingPrice, null);
});

test("filters: multi-select within a facet, AND across facets; `except` ignores one facet", () => {
  const f = { ...emptyFilters(), cond: ["used"], loc: ["US", "GR"] };
  const res = applyFilters(listings, f);
  assert.ok(res.length > 0 && res.every((l) => l.condition === "used" && ["US", "GR"].includes(l.location.countryCode)));
  assert.equal(applyFilters(listings, f, "loc").length, listings.filter((l) => l.condition === "used").length);
  assert.equal(applyFilters(listings, emptyFilters()).length, 12);
});

test("ranges: inclusive, and a range spanning all data is no filter", () => {
  const f = { ...emptyFilters(), year: { min: 2020, max: 2022 } };
  assert.ok(applyFilters(listings, f).every((l) => l.year >= 2020 && l.year <= 2022));
  assert.equal(normalizeRange({ min: bounds.year.min, max: bounds.year.max }, bounds.year), null);
  assert.deepEqual(normalizeRange({ min: 2023, max: 2019 }, bounds.year), { min: 2019, max: 2023 }); // swapped, not collapsed
  assert.equal(applyFilters(listings, { ...emptyFilters(), hours: { min: 0, max: 500 } }).every((l) => l.engineHours <= 500), true);
});

test("URL round-trip; unknown values are dropped", () => {
  const f = { cond: ["new"], gen: ["gen2"], loc: ["US"], price: { min: 900000, max: 1500000 }, year: { min: 2019, max: 2022 }, hours: { min: bounds.hours.min, max: 500 } };
  const p = filtersToParams(f);
  assert.equal(p.toString(), "cond=new&gen=gen2&loc=US&price=900000-1500000&year=2019-2022&hours=500");
  assert.deepEqual(filtersFromParams(p, bounds, locations(listings), ["gen1", "gen2"]), f);
  const bad = filtersFromParams(new URLSearchParams("cond=boat&loc=XX&price=abc"), bounds, locations(listings));
  assert.deepEqual(bad, emptyFilters());
});

test("distribution scale: monotonic, round-trips, gives dense ranges more track", () => {
  const s = createDistributionScale([800000, 830000, 850000, 900000, 2342021], 800000, 2350000);
  for (const t of [0, 0.2, 0.5, 0.8, 1]) assert.ok(Math.abs(s.toPos(s.toValue(t)) - t) < 1e-9);
  assert.ok(s.toValue(0.5) < 1000000, "half the track covers the clustered low prices");
});

test("sorting by normalized price and year", () => {
  const asc = sortListings(listings, "price-asc").map((l) => l.priceUsd);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  assert.equal(sortListings(listings, "year-desc")[0].year, 2026);
  assert.deepEqual(sortListings(listings, "recommended"), listings);
});

test("listing normalization drops unusable items and invalid old prices", () => {
  assert.equal(normalizeListing({ slug: "x", year: 2020, media: [] }), null);
  const l = normalizeListing({ slug: "x", year: 2020, price: 100, currency: "USD", oldPrice: 90, media: [{ type: "image", src: "a.jpg" }] });
  assert.equal(l.oldPrice, null);
});

test("generations: assigned by model year, filterable", () => {
  assert.deepEqual(
    [...new Set(listings.map((l) => `${l.year}:${l.generation}`))].sort(),
    ["2017:gen1", "2019:gen1", "2020:gen1", "2021:gen1", "2022:gen1", "2023:gen1", "2025:gen2", "2026:gen2"],
  );
  assert.equal(applyFilters(listings, { ...emptyFilters(), gen: ["gen2"] }).length, 2);
});

test("generations: backend value wins, unknown years stay null", () => {
  const [l] = assignGenerations([{ year: 2025, generation: "gen1" }, { year: 1999, generation: null }], galeon500FlyContent.generations);
  assert.equal(l.generation, "gen1");
  assert.equal(generationOf(1999, galeon500FlyContent.generations), null);
  assert.equal(generationOf(2025, []), null);
});

test("normalizeListing: unsafe or missing urls become null", () => {
  const base = { slug: "x", year: 2020, media: [{ type: "image", src: "a.jpg" }] };
  assert.equal(normalizeListing({ ...base, url: "javascript:alert(1)" }).url, null);
  assert.equal(normalizeListing(base).url, null);
  assert.equal(normalizeListing({ ...base, url: "https://yachtway.com/vessels/x/" }).url, "https://yachtway.com/vessels/x/");
});

test("sort: listings without a price go last both ways", () => {
  const ls = [{ priceUsd: 2 }, { priceUsd: null }, { priceUsd: 1 }];
  assert.deepEqual(sortListings(ls, "price-asc").map((l) => l.priceUsd), [1, 2, null]);
  assert.deepEqual(sortListings(ls, "price-desc").map((l) => l.priceUsd), [2, 1, null]);
});
