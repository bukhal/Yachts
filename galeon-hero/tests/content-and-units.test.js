import test from "node:test";
import assert from "node:assert/strict";
import { normalizeModelContent } from "../src/api/model-content.js";
import { galeon500FlyContent } from "../src/data/galeon-500-fly.sections.js";
import { safeUrl, urlHost } from "../src/lib/safe-url.js";
import { feetInches, fillUnits, formatQuantity, toSystem } from "../src/lib/units.js";

test("content: the demo content normalizes without losing anything", () => {
  const c = normalizeModelContent(galeon500FlyContent);
  for (const k of ["generations", "specGroups", "videos", "quotes", "models", "dealers", "faq"]) {
    assert.equal(c[k].length, galeon500FlyContent[k].length, k);
  }
  assert.equal(c.successor.id, "successor");
  assert.deepEqual(c.drawings.dimensions, { loa: 16.2, draft: 1.4, beam: 4.46, beachMode: 6 });
  assert.equal(c.modelsUrl, galeon500FlyContent.modelsUrl);
});

test("content: missing or malformed data gives empty blocks, never a throw", () => {
  const empty = normalizeModelContent(null);
  assert.deepEqual([empty.generations, empty.specGroups, empty.faq, empty.dealers], [[], [], [], []]);
  assert.equal(empty.drawings, null);
  assert.equal(empty.successor, null);
  const c = normalizeModelContent({
    generations: [{ id: "g", years: ["x"] }, null, { id: "ok", years: [2020] }],
    specGroups: [{ id: "s", rows: [{ label: "L", value: null }, { label: "M", value: "text", quantity: "length" }] }],
    dealers: [{ name: "D", web: "javascript:alert(1)", profile: "https://yachtway.com/dealers/d/" }],
    quotes: [{ text: "q", url: "data:text/html,x" }],
    videos: [{ id: "<script>" }],
    faq: [{ q: "only question" }, { auto: "price" }],
  });
  assert.deepEqual(c.generations.map((g) => g.id), ["ok"]);
  assert.equal(c.specGroups[0].rows.length, 1);
  assert.equal(c.specGroups[0].rows[0].quantity, undefined); // text values never convert
  assert.equal(c.dealers[0].web, null);
  assert.equal(c.quotes[0].url, null);
  assert.equal(c.videos.length, 0);
  assert.deepEqual(c.faq.map((f) => f.auto ?? f.q), ["price"]);
});

test("safeUrl / urlHost", () => {
  assert.equal(safeUrl("https://a.com/x"), "https://a.com/x");
  assert.equal(safeUrl("/brands/x/"), "/brands/x/");
  assert.equal(safeUrl("#faq"), "#faq");
  for (const bad of ["javascript:alert(1)", "//evil.com", "data:x", "", null, 42]) assert.equal(safeUrl(bad), null, String(bad));
  assert.equal(urlHost("https://www.mnyachts.com/x"), "mnyachts.com");
  assert.equal(urlHost("relative/path"), null);
});

test("units: feet-inches rounding and templates", () => {
  assert.equal(feetInches(16.99), "17′0″"); // 11.88″ rounds up to the next foot
  assert.equal(formatQuantity("length", toSystem("length", 16.2, "imperial"), "imperial"), "53′2″");
  assert.equal(fillUnits("{m:6.00} wide", "metric"), "6.00 m wide");
  assert.equal(fillUnits("{m:6.00} wide", "imperial"), "19′8″ wide");
  assert.equal(fillUnits("{L:1800} fuel", "imperial"), "476 US gal fuel");
});
