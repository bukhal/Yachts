// Cutaway: top-down deck plans with a vertical deck switcher (left) and the
// 360° tour button (right). Decks are stacked in one box and crossfade; they
// share one canvas size, so switching never shifts the plan.

import { createHeroViewControl } from "./hero-view-control.js";
import { createTourDialog } from "./tour-dialog.js";
import { alphaBounds } from "../fx/scene-geometry.js";

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Opaque bounds of a loaded image (one-off scan on a small canvas). */
function measure(img) {
  const s = Math.min(1, 400 / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * s));
  const h = Math.max(1, Math.round(img.naturalHeight * s));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  try {
    return alphaBounds(ctx.getImageData(0, 0, w, h).data, w, h);
  } catch {
    return null; // cross-origin image without CORS: keep the defaults
  }
}

/** Giraffe360's documented `?rid=` (camera aimed at an Info hotspot). */
function tourUrlFor(tour, rid) {
  if (!rid) return tour.url;
  const u = new URL(tour.url);
  u.searchParams.set("rid", rid);
  return u.toString();
}

/**
 * @param {HTMLElement} panel  #view-panel-cutaway
 * @param {object} o
 * @param {import("../types").CutawayData} o.cutaway
 * @param {string} o.modelName
 * @param {(event: string, props?: object) => void} [o.track]
 */
export function createCutawayView(panel, { cutaway, modelName, track }) {
  const root = el("div", "cutaway");
  const plan = el("div", "cutaway__plan");
  plan.style.aspectRatio = `${cutaway.intrinsicWidth} / ${cutaway.intrinsicHeight}`;

  const deckPanels = cutaway.decks.map((d, i) => {
    const p = el("div", "cutaway__deck");
    p.id = `deck-panel-${d.id}`;
    const img = el("img", "cutaway__img");
    img.alt = d.alt;
    img.width = cutaway.intrinsicWidth;
    img.height = cutaway.intrinsicHeight;
    img.decoding = "async";
    img.draggable = false;
    // Not fetched with the page: the panel is hidden until Cutaway is chosen.
    // load() sets the sources on intent (hover/focus of the switcher), when the
    // browser is idle after load, or on activation — whichever comes first.
    img.dataset.src = d.src;
    p.append(img);

    for (const h of cutaway.tour?.hotspots?.[d.id] ?? []) {
      const b = el("button", "cutaway__hotspot");
      b.type = "button";
      b.style.left = `${h.x * 100}%`;
      b.style.top = `${h.y * 100}%`;
      b.setAttribute("aria-label", `${h.label} — open in 360° tour`);
      b.dataset.rid = h.rid;
      b.append(el("span", "cutaway__hotspot-label", h.label));
      p.append(b);
    }
    plan.append(p);
    return { deck: d, panel: p, index: i };
  });

  // Controls live in their own layer next to the view panels (same grid cell),
  // so they don't slide with the plan during view transitions — they fade in
  // once the plan has arrived (CSS .cutaway-controls).
  const host = panel.parentElement; // .hero__views: shared CSS variables for plan + controls
  const controls = el("div", "cutaway-controls");
  controls.inert = true;
  const switcher = el("div", "cutaway__decks");
  const side = el("div", "cutaway__side");
  controls.append(switcher, side);
  root.append(plan);
  panel.replaceChildren(root);
  host.append(controls);
  switcher.hidden = cutaway.decks.length < 2; // a single plan needs no switcher

  // Controls sit beside the *visible* plan: union of all decks' opaque areas,
  // so they don't jump when switching decks.
  const bounds = new Map(cutaway.decks.filter((d) => d.visibleBounds).map((d) => [d.id, d.visibleBounds]));
  function placeControls() {
    if (!bounds.size) return;
    const all = [...bounds.values()];
    host.style.setProperty("--vis-left", String(Math.min(...all.map((b) => b.x))));
    host.style.setProperty("--vis-right", String(Math.max(...all.map((b) => b.x + b.width))));
  }
  placeControls();
  deckPanels.forEach(({ deck, panel: p }) => {
    if (bounds.has(deck.id)) return;
    const img = p.querySelector("img");
    const done = () => {
      const b = measure(img);
      if (b) bounds.set(deck.id, b);
      placeControls();
    };
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener("load", done, { once: true });
  });

  let currentDeck = cutaway.defaultDeck;
  const control = createHeroViewControl(switcher, {
    label: `${modelName} decks`,
    idPrefix: "deck",
    orientation: "vertical",
    initial: cutaway.defaultDeck,
    views: deckPanels.map(({ deck, panel: p }) => ({ id: deck.id, label: deck.label, panel: p })),
    onChange(id) {
      if (id !== currentDeck) track?.("hero_deck_change", { deck: id });
      currentDeck = id;
      root.dataset.deck = id;
    },
  });
  // Tab panels are focusable by default in the tabs pattern; plans are images, keep them out of tab order.
  deckPanels.forEach(({ panel: p }) => p.removeAttribute("tabindex"));

  if (cutaway.tour) {
    const dialog = createTourDialog({ title: `${modelName} · 360° tour` });
    const btn = el("button", "tour-btn");
    btn.type = "button";
    btn.setAttribute("aria-haspopup", "dialog");
    btn.append(el("span", "tour-btn__icon"), el("span", "", "360° tour"));
    btn.firstChild.setAttribute("aria-hidden", "true");
    side.append(btn);
    btn.addEventListener("click", () => {
      dialog.open(cutaway.tour.url, btn);
      track?.("hero_tour_open", { deck: currentDeck, from: "button" });
    });
    plan.addEventListener("click", (e) => {
      const hs = e.target.closest(".cutaway__hotspot");
      if (!hs) return;
      dialog.open(tourUrlFor(cutaway.tour, hs.dataset.rid), hs);
      track?.("hero_tour_open", { deck: currentDeck, from: "hotspot" });
    });
  }

  return {
    get deck() {
      return currentDeck;
    },
    /** Tunable look (plan size and shadow) → CSS variables. */
    applyStyle({ planScale, shadowOpacity, shadowBlur, shadowY }) {
      host.style.setProperty("--plan-scale", String(planScale * cutaway.displayScale));
      host.style.setProperty("--plan-shadow-opacity", String(shadowOpacity));
      host.style.setProperty("--plan-shadow-blur", `${shadowBlur}px`);
      host.style.setProperty("--plan-shadow-y", `${shadowY}px`);
    },
    /** Fetch the deck plans (idempotent). */
    load() {
      for (const img of host.querySelectorAll("img[data-src]")) {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
      }
    },
    /** Controls are interactive only while Cutaway is the active view. */
    setActive(on) {
      controls.inert = !on;
    },
    /** Entering Cutaway from another view always starts on the default deck (Flybridge). */
    reset() {
      control.select(cutaway.defaultDeck);
    },
  };
}
