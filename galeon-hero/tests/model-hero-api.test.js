import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAsset, normalizeModelHero, normalizeInventory, HeroDataError } from "../src/api/model-hero.js";
import { galeon500Fly } from "../src/data/galeon-500-fly.js";

test("mock model passes normalization unchanged in the fields the hero uses", () => {
  const m = normalizeModelHero(galeon500Fly);
  assert.equal(m.name, "Galeon 500 Fly");
  assert.equal(m.side.waterlineY, 0.997);
  assert.deepEqual(m.specs.map((s) => s.id), ["length", "beam", "draft", "capacity", "sleeps", "crew", "speed", "power"]);
  assert.deepEqual(m.cutaway.decks.map((d) => d.id), ["flybridge", "main", "lower"]);
  assert.equal(m.cutaway.defaultDeck, "flybridge");
  assert.match(m.cutaway.tour.url, /^https:\/\/tour\.giraffe360\.com\//);
});

test("model without a usable side asset is rejected", () => {
  assert.throws(() => normalizeModelHero({ ...galeon500Fly, side: { alt: "no src" } }), HeroDataError);
  assert.throws(() => normalizeModelHero(null), HeroDataError);
});

test("asset metadata is clamped; invalid bounds fall back to alpha detection", () => {
  const a = normalizeAsset({ src: "x.png", waterlineY: 1.4, causticBandHeight: -1, visibleBounds: { x: 0, y: 0, width: 0, height: 1 } });
  assert.equal(a.waterlineY, 1);
  assert.equal(a.causticBandHeight, 0);
  assert.equal(a.visibleBounds, undefined);
  assert.equal(a.enableWaterFx, true);
  assert.equal(normalizeAsset({ src: "" }), null);
});

test("specs without a value are hidden", () => {
  const m = normalizeModelHero({ ...galeon500Fly, specs: [{ id: "a", value: null }, { id: "b", value: "" }, { id: "c", value: 0 }] });
  assert.deepEqual(m.specs.map((s) => s.id), ["c"]);
});

test("inventory never shows a price without listings or a valid currency", () => {
  assert.equal(normalizeInventory({ listingCount: 0, minimumAskingPrice: 900000, currency: "USD" }).minimumAskingPrice, null);
  assert.equal(normalizeInventory({ listingCount: 3, minimumAskingPrice: 900000, currency: "usd" }).minimumAskingPrice, null);
  assert.equal(normalizeInventory({ listingCount: 3, minimumAskingPrice: 0, currency: "EUR" }).minimumAskingPrice, null);
  assert.equal(normalizeInventory({ listingCount: -1 }).listingCount, null);
  const ok = normalizeInventory({ listingCount: 3, minimumAskingPrice: 900000, currency: "EUR", isDemo: false });
  assert.deepEqual([ok.listingCount, ok.minimumAskingPrice, ok.currency, ok.isDemo], [3, 900000, "EUR", false]);
});

test("builder country: ISO code on screen, full name for the tooltip, any country", async () => {
  const { normalizeBuilder } = await import("../src/api/model-hero.js");
  assert.deepEqual([normalizeBuilder({ name: "Galeon", countryCode: "PL" }).countryCode, normalizeBuilder({ name: "Galeon", countryCode: "PL" }).country], ["PL", "Poland"]);
  assert.equal(normalizeBuilder({ name: "Azimut", country: "Italy" }).countryCode, "IT");
  assert.equal(normalizeBuilder({ name: "Sunseeker", countryCode: "uk" }).countryCode, "GB");
  assert.equal(normalizeBuilder({ name: "Sea Ray", country: "USA" }).countryCode, "US");
  assert.equal(normalizeBuilder({ name: "X", country: "Atlantis" }).countryCode, "Atlantis");
});

test("cutaway: invalid decks dropped, hotspots need coordinates and a provider id", async () => {
  const { normalizeCutaway } = await import("../src/api/model-hero.js");
  assert.equal(normalizeCutaway({ decks: [{ id: "a" }] }), null);
  const c = normalizeCutaway({
    decks: [{ id: "main", src: "m.png" }],
    defaultDeck: "nope",
    tour: { url: "https://t.example/x", hotspots: { main: [{ x: 1.4, y: 0.2, label: "Salon", rid: "S1" }, { x: 0.5, y: 0.5, label: "No id" }] } },
  });
  assert.equal(c.defaultDeck, "main");
  assert.deepEqual(c.tour.hotspots.main, [{ x: 1, y: 0.2, label: "Salon", rid: "S1" }]);
  assert.equal(normalizeCutaway({ decks: [{ id: "a", src: "a.png" }], tour: { url: "javascript:alert(1)" } }).tour, null);
});

test("cutaway decks: bounds and displayScale are validated", async () => {
  const { normalizeCutaway } = await import("../src/api/model-hero.js");
  const c = normalizeCutaway({
    displayScale: 9,
    decks: [
      { id: "a", src: "a.png", visibleBounds: { x: 0.1, y: 0.2, width: 0.8, height: 0.6 } },
      { id: "b", src: "b.png", visibleBounds: { x: 0.1, y: 0.2, width: 0, height: 0.6 } },
    ],
  });
  assert.equal(c.displayScale, 2);
  assert.deepEqual(c.decks[0].visibleBounds, { x: 0.1, y: 0.2, width: 0.8, height: 0.6 });
  assert.equal(c.decks[1].visibleBounds, undefined); // measured from alpha on load instead
  assert.equal(normalizeCutaway({ decks: [{ id: "a", src: "a.png" }] }).displayScale, 1);
});
