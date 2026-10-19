import test from "node:test";
import assert from "node:assert/strict";
import { isEmail, subscribeModelAlerts, getAlertSubscription } from "../src/api/alerts.js";

test("isEmail accepts plain addresses and rejects junk", () => {
  assert.equal(isEmail(" a.b@example.com "), true);
  for (const bad of ["", "a@b", "a b@c.com", "@c.com", "a@.c"]) assert.equal(isEmail(bad), false, bad);
});

test("subscribeModelAlerts rejects an invalid email and drops unknown topics", async () => {
  await assert.rejects(subscribeModelAlerts({ modelId: "m", email: "nope", topics: ["listings"] }));
  const s = await subscribeModelAlerts({ modelId: "m", email: "x@example.com ", topics: ["listings", "spam"] }, { demoDelayMs: 0 });
  assert.deepEqual(s, { email: "x@example.com", topics: ["listings"] });
});

test("getAlertSubscription: tolerates old or hand-edited storage", () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  try {
    store.set("yw-model-alerts", JSON.stringify({ m: { email: "a@b.cc" }, n: { email: "a@b.cc", topics: ["price", "x"] }, bad: { email: "nope" } }));
    assert.deepEqual(getAlertSubscription("m"), { email: "a@b.cc", topics: ["listings"] });
    assert.deepEqual(getAlertSubscription("n"), { email: "a@b.cc", topics: ["price"] });
    assert.equal(getAlertSubscription("bad"), null);
    store.set("yw-model-alerts", "null");
    assert.equal(getAlertSubscription("m"), null);
  } finally {
    delete globalThis.localStorage;
  }
});
