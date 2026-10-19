// Floating filters panel (modal dialog, no backdrop blur/dim — a soft layered
// shadow separates it). Facets: condition + location (multi-select), price,
// year, engine hours (range sliders with inputs and a live histogram).
// Desktop applies live; on mobile changes are staged and applied with
// "Show N yachts" (Baymard: explicit apply on small screens).

import { createRangeFilter } from "./range-filter.js";
import { CONDITIONS, RANGES, applyFilters, normalizeRange, activeCount, emptyFilters, createDistributionScale, linearScale } from "../../lib/listings-query.js";
import { compactMoney, flagEmoji } from "../../lib/listing-format.js";
import { afterAnimation } from "../../lib/after-animation.js";

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const clone = (f) => ({ ...f, cond: [...f.cond], gen: [...(f.gen ?? [])], loc: [...f.loc] });

/**
 * @param {object} o
 * @param {import("../../types").ListingCard[]} o.listings
 * @param {ReturnType<import("../../lib/listings-query.js").rangeBounds>} o.bounds
 * @param {string[]} o.locationCodes
 * @param {(code: string) => string} o.countryName
 * @param {() => import("../../types").ListingFilters} o.getFilters
 * @param {(f: import("../../types").ListingFilters) => void} o.onApply
 */
export function createFiltersDrawer({ listings, bounds, locationCodes, countryName, generations = [], getFilters, onApply }) {
  const mobile = matchMedia("(max-width: 640px)");
  let draft = emptyFilters();

  const dialog = el("dialog", "filters");
  dialog.setAttribute("aria-labelledby", "filters-title");
  const head = el("div", "filters__head");
  const titles = el("div");
  const title = el("h2", "filters__title", "Filters");
  title.id = "filters-title";
  const summary = el("p", "filters__summary");
  summary.setAttribute("aria-live", "polite");
  titles.append(title, summary);
  const close = el("button", "filters__close");
  close.type = "button";
  close.setAttribute("aria-label", "Close filters");
  head.append(titles, close);

  const body = el("div", "filters__body");
  const foot = el("div", "filters__foot");
  const clearAll = el("button", "btn btn--ghost", "Clear all");
  clearAll.type = "button";
  const apply = el("button", "btn btn--primary");
  apply.type = "button";
  foot.append(clearAll, apply);
  dialog.append(head, body, foot);
  document.body.append(dialog);

  // ---- sections ----
  const resets = {};
  function section(key, label) {
    const s = el("section", "fsec");
    const h = el("div", "fsec__head");
    const t = el("h3", "fsec__title", label);
    const r = el("button", "fsec__reset", "Reset");
    r.type = "button";
    r.addEventListener("click", () => update({ ...draft, [key]: Array.isArray(draft[key]) ? [] : null }));
    resets[key] = r;
    h.append(t, r);
    s.append(h);
    body.append(s);
    return s;
  }

  // Condition: two toggle chips (checkboxes).
  const condSec = section("cond", "Condition");
  const condRow = el("div", "toggle-row");
  const condInputs = CONDITIONS.map((c) => {
    const lab = el("label", "toggle");
    const input = el("input");
    input.type = "checkbox";
    input.value = c.id;
    const count = el("span", "toggle__count");
    lab.append(input, el("span", "toggle__label", c.label), count);
    input.addEventListener("change", () => {
      const cond = input.checked ? [...draft.cond, c.id] : draft.cond.filter((x) => x !== c.id);
      update({ ...draft, cond });
    });
    condRow.append(lab);
    return { id: c.id, input, count, lab };
  });
  condSec.append(condRow);

  // Generation: toggle chips, like condition.
  let genInputs = [];
  if (generations.length) {
    const genSec = section("gen", "Generation");
    const genRow = el("div", "toggle-row");
    genInputs = generations.map((g) => {
      const lab = el("label", "toggle");
      const input = el("input");
      input.type = "checkbox";
      input.value = g.id;
      const count = el("span", "toggle__count");
      lab.append(input, el("span", "toggle__label", `${g.label} · ${g.years[0]}–${String(g.years[1] ?? "").slice(-2)}`), count);
      input.addEventListener("change", () => {
        const gen = input.checked ? [...draft.gen, g.id] : draft.gen.filter((x) => x !== g.id);
        update({ ...draft, gen });
      });
      genRow.append(lab);
      return { id: g.id, input, count, lab };
    });
    genSec.append(genRow);
  }

  // Ranges.
  const money = (v) => compactMoney(v, "USD");
  const ranges = {
    price: createRangeFilter({
      id: "f-price", label: "price", bounds: bounds.price, step: RANGES.price.step, dual: true,
      scale: createDistributionScale(bounds.price.values, bounds.price.min, bounds.price.max),
      format: money, formatInput: (v) => v.toLocaleString("en-US"), prefix: "$",
      onInput: (r) => update({ ...draft, price: r }),
    }),
    year: createRangeFilter({
      id: "f-year", label: "year", bounds: bounds.year, step: 1, dual: true,
      scale: linearScale(bounds.year.min, bounds.year.max),
      format: String, formatInput: String,
      onInput: (r) => update({ ...draft, year: r }),
    }),
    hours: createRangeFilter({
      id: "f-hours", label: "engine hours", bounds: bounds.hours, step: RANGES.hours.step, dual: false,
      scale: createDistributionScale(bounds.hours.values, bounds.hours.min, bounds.hours.max),
      format: (v) => `${v.toLocaleString("en-US")} hrs`, formatInput: (v) => v.toLocaleString("en-US"), suffix: "hrs",
      onInput: (r) => update({ ...draft, hours: r }),
    }),
  };
  section("price", "Price").append(ranges.price.root, el("p", "fsec__note", "Prices in other currencies are compared in USD."));
  section("year", "Year").append(ranges.year.root);
  section("hours", "Engine hours").append(ranges.hours.root);

  // Location: checkbox list with flags and counts.
  const locSec = section("loc", "Location");
  const locList = el("div", "check-list");
  const locInputs = locationCodes.map((code) => {
    const lab = el("label", "check");
    const input = el("input");
    input.type = "checkbox";
    input.value = code;
    const name = el("span", "check__label");
    name.append(el("span", "check__flag", flagEmoji(code)), el("span", "", countryName(code)));
    name.firstChild.setAttribute("aria-hidden", "true");
    const count = el("span", "check__count");
    lab.append(input, el("span", "check__box"), name, count);
    input.addEventListener("change", () => {
      const loc = input.checked ? [...draft.loc, code] : draft.loc.filter((x) => x !== code);
      update({ ...draft, loc });
    });
    locList.append(lab);
    return { code, input, count, lab };
  });
  locSec.append(locList);

  // ---- state ----
  function update(next) {
    draft = {
      ...next,
      price: normalizeRange(next.price, bounds.price),
      year: normalizeRange(next.year, bounds.year),
      hours: normalizeRange(next.hours, bounds.hours, false),
    };
    if (!mobile.matches) onApply(clone(draft)); // live on desktop
    paint();
  }

  function paint() {
    const n = applyFilters(listings, draft).length;
    summary.textContent = `${n} of ${listings.length} yachts match`;
    apply.textContent = n ? `Show ${n} ${n === 1 ? "yacht" : "yachts"}` : "No matches";
    apply.disabled = n === 0;
    clearAll.disabled = activeCount(draft) === 0;

    const condBase = applyFilters(listings, draft, "cond");
    for (const c of condInputs) {
      c.input.checked = draft.cond.includes(c.id);
      const k = condBase.filter((l) => l.condition === c.id).length;
      c.count.textContent = String(k);
      c.lab.classList.toggle("is-empty", k === 0 && !c.input.checked);
    }
    const genBase = applyFilters(listings, draft, "gen");
    for (const c of genInputs) {
      c.input.checked = draft.gen.includes(c.id);
      const k = genBase.filter((l) => l.generation === c.id).length;
      c.count.textContent = String(k);
      c.lab.classList.toggle("is-empty", k === 0 && !c.input.checked);
    }
    const locBase = applyFilters(listings, draft, "loc");
    for (const c of locInputs) {
      c.input.checked = draft.loc.includes(c.code);
      const k = locBase.filter((l) => l.location.countryCode === c.code).length;
      c.count.textContent = String(k);
      c.input.disabled = k === 0 && !c.input.checked;
      c.lab.classList.toggle("is-empty", c.input.disabled);
    }
    for (const [key, r] of Object.entries(ranges)) {
      r.set(draft[key]);
      r.setDistribution(applyFilters(listings, draft, key).map((l) => l[RANGES[key].field]).filter(Number.isFinite));
    }
    for (const [key, btn] of Object.entries(resets)) {
      const on = Array.isArray(draft[key]) ? draft[key].length > 0 : Boolean(draft[key]);
      btn.hidden = !on;
    }
  }

  // ---- open / close ----
  let trigger = null;
  function finishClose() {
    dialog.classList.remove("is-closing");
    if (dialog.open) dialog.close();
    trigger?.focus();
  }
  function requestClose() {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return finishClose();
    dialog.classList.add("is-closing");
    afterAnimation(dialog, 300, finishClose);
  }

  close.addEventListener("click", requestClose);
  apply.addEventListener("click", () => {
    onApply(clone(draft));
    requestClose();
  });
  clearAll.addEventListener("click", () => update(emptyFilters()));
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    requestClose();
  });
  // Click outside the card closes it (the dialog box itself is the card).
  dialog.addEventListener("pointerdown", (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) requestClose();
  });

  return {
    open(from) {
      trigger = from;
      draft = clone(getFilters());
      paint();
      dialog.showModal();
      close.focus();
    },
    /** External changes (chips, URL) while open. */
    refresh() {
      if (!dialog.open) return;
      draft = clone(getFilters());
      paint();
    },
  };
}
