// "Current Yachts for Sale": toolbar (count, sort, Filters), active filter
// chips, card grid, empty state. Filter + sort state is mirrored in the URL
// (?sort=&cond=&price=&year=&hours=&loc=) so a filtered view can be shared.

import { renderListingCard, attachMediaPreview } from "./listing-card.js";
import { createFiltersDrawer } from "./filters-drawer.js";
import { createSortMenu } from "./sort-menu.js";
import { createQuickLocations } from "./quick-locations.js";
import {
  SORTS, CONDITIONS, applyFilters, sortListings, activeCount, emptyFilters,
  rangeBounds, locations, filtersToParams, filtersFromParams,
} from "../../lib/listings-query.js";
import { resolveCountry } from "../../lib/country.js";
import { compactMoney } from "../../lib/listing-format.js";

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/**
 * @param {HTMLElement} root  section#for-sale
 * @param {object} o
 * @param {import("../../types").ListingCard[]} o.listings
 * @param {string} o.modelName
 * @param {string} [o.updatedAt]
 * @param {() => "overlay" | "classic"} o.cardStyle
 * @param {MediaQueryList} o.reducedMotion
 * @param {(event: string, props?: object) => void} [o.track]
 * @param {string} [o.catalogUrl]  "See all" target: the full catalog on YachtWay
 * @param {string} [o.brandName]   "See all {brand} yachts for sale"
 */
export function createListingsSection(root, { listings, modelName, updatedAt, cardStyle, showQuickFilters = () => true, reducedMotion, track, generations = [], catalogUrl, brandName = "" }) {
  const genLabel = (id) => generations.find((g) => g.id === id)?.label ?? null;
  const countryName = (c) => resolveCountry({ countryCode: c }).name;
  const bounds = rangeBounds(listings);
  const locationCodes = locations(listings).sort((a, b) => countryName(a).localeCompare(countryName(b)));
  const params = new URLSearchParams(location.search);
  const state = {
    sort: SORTS.some((s) => s.id === params.get("sort")) ? params.get("sort") : "recommended",
    filters: filtersFromParams(params, bounds, locationCodes, generations.map((g) => g.id)),
  };

  // ---- toolbar ----
  const head = el("div", "listings__head");
  const titleBox = el("div", "listings__title-box");
  const title = root.querySelector("h2") ?? el("h2", "", "Current Yachts for Sale");
  title.className = "listings__title";
  const sub = el("p", "listings__sub");
  titleBox.append(title, sub);

  const tools = el("div", "listings__tools");
  const sortMenu = createSortMenu(SORTS, {
    value: state.sort,
    onChange(id) {
      state.sort = id;
      syncUrl();
      render({ animate: "all" });
      track?.("listings_sort", { sort: id });
    },
  });
  const filtersBtn = el("button", "pill-btn");
  filtersBtn.type = "button";
  filtersBtn.setAttribute("aria-haspopup", "dialog");
  const badge = el("span", "pill-btn__badge");
  filtersBtn.append(el("span", "pill-btn__icon"), el("span", "", "Filters"), badge);
  filtersBtn.firstChild.setAttribute("aria-hidden", "true");
  head.append(titleBox, tools);

  const chips = el("div", "listings__chips");
  chips.setAttribute("aria-label", "Active filters");
  const grid = el("div", "listings__grid");
  const status = el("p", "visually-hidden");
  status.setAttribute("role", "status");
  const empty = el("div", "listings__empty");
  empty.hidden = true;
  const emptyReset = el("button", "btn btn--primary", "Reset filters");
  emptyReset.type = "button";
  empty.append(
    el("p", "listings__empty-title", "No yachts match these filters"),
    el("p", "listings__empty-text", "Try a wider price range, another year or location."),
    emptyReset,
  );

  const quick = createQuickLocations({
    codes: locationCodes,
    countryName,
    getSelected: () => state.filters.loc,
    onChange: (loc) => setFilters({ ...state.filters, loc }),
    countFor: (code) => applyFilters(listings, state.filters, "loc").filter((l) => l.location.countryCode === code).length,
  });

  // One row: title · [quick locations | sort · filters], all on one axis.
  const sep = el("span", "listings__sep");
  sep.setAttribute("aria-hidden", "true");
  const actions = el("div", "listings__actions"); // sort + filters never split
  actions.append(sortMenu.el, filtersBtn);
  tools.append(quick.el, sep, actions);
  // Every listing of the model is on the page; "See all" leads to the full catalog.
  const more = el("div", "listings__more");
  if (catalogUrl) {
    const link = el("a", "see-all");
    link.href = catalogUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.innerHTML = '<span></span><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12M11 5l5 5-5 5"/></svg>';
    link.firstChild.textContent = `See all ${brandName ? `${brandName} ` : ""}yachts for sale`;
    link.addEventListener("click", () => track?.("listings_see_all", {}));
    more.append(link);
  } else more.hidden = true;

  root.replaceChildren(head, chips, grid, more, empty, status);

  // Cards are built once; filtering/sorting reorders and hides them.
  const cards = new Map(listings.map((l) => [l.slug, renderListingCard(l, { modelName, generationLabel: genLabel })]));
  const preview = attachMediaPreview(grid, { reducedMotion });

  const drawer = createFiltersDrawer({
    listings,
    bounds,
    locationCodes,
    countryName,
    generations,
    getFilters: () => state.filters,
    onApply: (f) => setFilters(f),
  });

  function syncUrl() {
    const p = filtersToParams(state.filters, new URLSearchParams(location.search));
    p.delete("sort");
    if (state.sort !== "recommended") p.set("sort", state.sort);
    const q = p.toString();
    history.replaceState(history.state, "", `${location.pathname}${q ? `?${q}` : ""}${location.hash}`);
  }

  /** @param {{ animate?: "new" | "all" | false }} [opts] */
  function render({ animate = "new" } = {}) {
    const visible = sortListings(applyFilters(listings, state.filters), state.sort);
    const order = visible.map((l) => cards.get(l.slug));
    // Re-append in order; fade in cards that (re)appear, or all of them after a re-sort.
    const before = new Set([...grid.children]);
    grid.replaceChildren(...order);
    if (animate && !reducedMotion.matches) {
      const entering = order.filter((c) => !(animate === "new" && before.has(c)));
      // Restart the animation with one reflow for all cards (not one per card).
      entering.forEach((c) => c.classList.remove("is-entering"));
      if (entering.length) void grid.offsetWidth;
      entering.forEach((c) => {
        c.style.setProperty("--enter-delay", `${Math.min(order.indexOf(c), 8) * 35}ms`);
        c.classList.add("is-entering");
        c.addEventListener("animationend", () => c.classList.remove("is-entering"), { once: true });
      });
    }
    preview.observe(order);

    const n = visible.length;
    const total = listings.length;
    sub.textContent = [`${n === total ? total : `${n} of ${total}`} ${total === 1 ? "listing" : "listings"}`, updatedAt ? `updated ${formatDate(updatedAt)}` : null]
      .filter(Boolean)
      .join(" · ");
    status.textContent = `${n} ${n === 1 ? "yacht" : "yachts"} shown`;
    empty.hidden = n > 0;
    grid.hidden = n === 0;

    const f = state.filters;
    const k = activeCount(f);
    badge.textContent = k ? String(k) : "";
    badge.hidden = !k;
    filtersBtn.setAttribute("aria-label", k ? `Filters, ${k} active` : "Filters");

    // Applied filters stay visible above the results, each removable (Baymard).
    const applied = [
      ...f.cond.map((c) => ({ label: CONDITIONS.find((x) => x.id === c).label, clear: { cond: f.cond.filter((x) => x !== c) } })),
      ...(f.gen ?? []).map((g) => ({ label: genLabel(g) ?? g, clear: { gen: f.gen.filter((x) => x !== g) } })),
      f.price && { label: `${compactMoney(f.price.min)} – ${compactMoney(f.price.max)}`, clear: { price: null } },
      f.year && { label: f.year.min === f.year.max ? String(f.year.min) : `${f.year.min} – ${f.year.max}`, clear: { year: null } },
      f.hours && { label: `≤ ${f.hours.max.toLocaleString("en-US")} hrs`, clear: { hours: null } },
      // Locations show in the quick-filter row; when that row is hidden they appear here.
      ...(quickVisible() ? [] : f.loc.map((c) => ({ label: countryName(c), clear: { loc: f.loc.filter((x) => x !== c) } }))),
    ].filter(Boolean);
    chips.replaceChildren();
    for (const a of applied) {
      const chip = el("button", "active-chip");
      chip.type = "button";
      chip.append(el("span", "", a.label), el("span", "active-chip__x", "×"));
      chip.setAttribute("aria-label", `Remove filter: ${a.label}`);
      chip.addEventListener("click", () => setFilters({ ...state.filters, ...a.clear }));
      chips.append(chip);
    }
    if (applied.length > 1) {
      const clear = el("button", "active-chip active-chip--clear", "Clear all");
      clear.type = "button";
      clear.addEventListener("click", resetFilters);
      chips.append(clear);
    }
    chips.hidden = applied.length === 0;
    quick.render();
    drawer.refresh();
  }

  let trackTimer = 0;
  function setFilters(f) {
    state.filters = f;
    syncUrl();
    render();
    clearTimeout(trackTimer); // one event per settled change, not per slider tick
    trackTimer = setTimeout(() => track?.("listings_filter", { active: activeCount(f), query: filtersToParams(f).toString() }), 600);
  }

  function resetFilters() {
    setFilters(emptyFilters());
  }

  filtersBtn.addEventListener("click", () => drawer.open(filtersBtn));
  emptyReset.addEventListener("click", resetFilters);

  const quickVisible = () => showQuickFilters();
  function applyStyle() {
    grid.dataset.cardStyle = cardStyle();
    // Visibility only: the selection (and the URL) stays as it is.
    const show = quickVisible();
    quick.el.hidden = !show;
    sep.hidden = !show;
    if (quick.el.dataset.shown !== String(show)) {
      quick.el.dataset.shown = String(show);
      render({ animate: false });
    }
  }
  applyStyle();
  render({ animate: false });

  return {
    applyStyle,
    render,
    /** Show only one generation (from the Generations section). */
    showGeneration(id) {
      setFilters({ ...emptyFilters(), gen: [id] });
    },
    countByGeneration: (id) => listings.filter((l) => l.generation === id).length,
  };
}

function formatDate(iso) {
  // Date-only ISO strings parse as UTC midnight; format in UTC so US time zones don't show the day before.
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
