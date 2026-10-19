// Formatting for listing cards. Pure functions (unit-tested).

import { resolveCountry } from "./country.js";

// Same formula and defaults as YachtWay's own calculator (getMonthlyPayment in
// their bundle): 10% down, 5% APR, 240 months. Only shown for USD prices.
export const LOAN_DEFAULTS = { downPaymentShare: 0.1, aprPercent: 5, months: 240 };

export function monthlyPayment(price, { downPaymentShare, aprPercent, months } = LOAN_DEFAULTS) {
  if (!Number.isFinite(price) || price <= 0) return null;
  const r = aprPercent / 12 / 100;
  const k = (1 + r) ** months;
  return Math.round((r * k * (price * (1 - downPaymentShare))) / (k - 1));
}

/** @returns {{ symbol: string, amount: string, text: string }} */
export function priceParts(value, currency) {
  const parts = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).formatToParts(value);
  const symbol = parts.filter((p) => p.type === "currency").map((p) => p.value).join("");
  const amount = parts.filter((p) => p.type !== "currency" && p.type !== "literal").map((p) => p.value).join("");
  return { symbol, amount, text: `${symbol}${amount}` };
}

/** Compact money for chips: $50K, $1.2M. */
export function compactMoney(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** "Miami Beach, FL" in the US, "Athens, Greece" elsewhere. */
export function formatLocation({ city, region, countryCode }) {
  const { code, name } = resolveCountry({ countryCode });
  const tail = code === "US" ? region || "USA" : name;
  return [city, tail].filter(Boolean).join(", ");
}

/** Regional-indicator emoji for an ISO alpha-2 code (as in the Figma cards). */
export function flagEmoji(countryCode) {
  if (!/^[A-Z]{2}$/.test(countryCode ?? "")) return "";
  return String.fromCodePoint(...[...countryCode].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function formatHours(hours) {
  return Number.isFinite(hours) ? `${hours.toLocaleString("en-US")} hrs` : null;
}
