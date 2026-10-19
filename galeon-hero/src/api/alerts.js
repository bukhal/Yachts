// "Notify me" subscriptions for a model: new listings, price drops, new models
// from the builder. The demo keeps the subscription in this browser only.
// TODO(backend): POST /api/alerts { email, modelId, topics } → 201 (double opt-in
// email); the page only shows "check your inbox". See docs/BACKEND.md.

import { API_BASE, apiJson } from "./http.js";

const KEY = "yw-model-alerts";

export const ALERT_TOPICS = ["listings", "price", "models"];
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());

function readLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/** The visitor's subscription for this model (demo: local), or null. */
export function getAlertSubscription(modelId) {
  const s = readLocal()[modelId];
  if (!s || !isEmail(s.email)) return null;
  // Stored data may be old or edited by hand: keep only known topics.
  const topics = Array.isArray(s.topics) ? s.topics.filter((t) => ALERT_TOPICS.includes(t)) : [];
  return { email: s.email, topics: topics.length ? topics : ["listings"] };
}

/**
 * @param {{ modelId: string, email: string, topics: string[] }} o
 * @returns {Promise<{ email: string, topics: string[] }>}
 */
export async function subscribeModelAlerts({ modelId, email, topics }, { signal, demoDelayMs = 600 } = {}) {
  if (!isEmail(email)) throw new Error("invalid email");
  const sub = { email: email.trim(), topics: topics.filter((t) => ALERT_TOPICS.includes(t)) };
  if (API_BASE) {
    await apiJson("/alerts", { method: "POST", body: { modelId, ...sub }, signal });
    return sub;
  }
  await new Promise((r) => setTimeout(r, demoDelayMs)); // demo: feels like a request
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readLocal(), [modelId]: sub }));
  } catch {
    /* private mode: the confirmation still shows for this visit */
  }
  return sub;
}

export function clearAlertSubscription(modelId) {
  try {
    const all = readLocal();
    delete all[modelId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* nothing stored */
  }
}
