import { getModelHero, getInventorySummary } from "./api/model-hero.js";
import { track } from "./api/analytics.js";
import { createFxStore } from "./fx/store.js";
import { createYachtScene } from "./components/yacht-scene.js";
import { createHeroViewControl } from "./components/hero-view-control.js";
import { renderHeroSpecs } from "./components/hero-specs.js";
import { renderInventorySummary } from "./components/inventory-summary.js";
import { createParallax, PARALLAX_RATES, PULL_FACTORS } from "./components/parallax.js";
import { createOverscrollPull } from "./components/overscroll-pull.js";
import { createSectionNav } from "./components/section-nav.js";
import { createModelActions } from "./components/model-actions.js";
import { createPreferences } from "./lib/preferences.js";
import { createListingsSection } from "./components/listings/listings-section.js";
import { getModelListings, assignGenerations, listingsSnapshotDate } from "./api/listings.js";
import { getModelContent, normalizeModelContent } from "./api/model-content.js";
import { renderModelSections, faqItems } from "./components/model-sections.js";
import { buildStructuredData, injectStructuredData } from "./lib/structured-data.js";
import { createAlertsCta } from "./components/alerts-cta.js";
import { createFxControls } from "./components/fx-controls.js";
import { createCutawayView } from "./components/cutaway-view.js";
import { createGalleryView } from "./components/gallery-view.js";
import { createWaterBackground } from "./fx/water-background-layer.js";
import { createTitleRipple } from "./fx/title-ripple.js";
import { createFooterGlints } from "./fx/footer-glints-layer.js";

// View labels live in config so "Cutaway" can be renamed without touching components.
const VIEW_LABELS = { side: "Side view", cutaway: "Cutaway", gallery: "Gallery" };

// TODO(backend): the page template sets data-model-slug on <main>.
const DEFAULT_SLUG = "galeon-500-fly";
// Dev tooling: the "Tune effects" panel, the ?fixture=padded check and tuning
// kept in localStorage. Off: every visitor gets the approved effects from
// src/config/fx-tuned.js. Turn on with ?dev in the URL or __YW_CONFIG__.devTools.
const DEV_TOOLS = globalThis.__YW_CONFIG__?.devTools ?? new URLSearchParams(location.search).has("dev");

/** Runs an optional part of the page; if it throws, the rest of the page still works. */
function optional(name, fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`[page] ${name} failed:`, err);
    return null;
  }
}

// Header links are placeholders in this iteration: keep them inert.
document.addEventListener("click", (e) => {
  if (e.target.closest?.("[data-demo-link]")) e.preventDefault();
});

async function init() {
  const $ = (sel) => document.querySelector(sel);
  const params = new URLSearchParams(location.search);
  const slug = $("main")?.dataset.modelSlug || DEFAULT_SLUG;

  let model;
  try {
    model = await getModelHero(slug);
  } catch (err) {
    // The static markup (h1, placeholders) stays usable; only the hero data is missing.
    console.error("[hero] model data unavailable:", err);
    document.documentElement.classList.add("intro-play", "intro-yacht");
    $("[data-stage]").classList.add("is-image-error");
    return;
  }
  // Inventory loads independently: its failure must not block the hero.
  const inventory = getInventorySummary(model.id).catch((err) => {
    console.error("[hero] inventory summary unavailable:", err);
    return null;
  });

  // Content and listings load in parallel with the hero setup below.
  const contentReady = getModelContent(model);
  const listingsReady = getModelListings(model.id);
  // Handled below; these no-ops just keep an early rejection from logging as "uncaught" meanwhile.
  contentReady.catch(() => {});
  listingsReady.catch(() => {});

  const fixtureActive = DEV_TOOLS && params.get("fixture") === "padded";
  if (fixtureActive) {
    // Technical check only: same yacht with different padding/aspect + adjusted metadata.
    const { createPaddedFixture } = await import("./dev/padded-fixture.js");
    model.side = await createPaddedFixture(model.side);
    document.documentElement.dataset.fixture = "padded";
  }

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const store = createFxStore({ persist: DEV_TOOLS });

  $("[data-title]").textContent = model.name;
  const logo = $("[data-builder-logo]");
  if (model.builder.logoSrc) {
    logo.src = model.builder.logoSrc;
    logo.alt = model.builder.name;
  } else {
    logo.hidden = true; // the static logo in the markup belongs to the demo model
  }

  const prefs = createPreferences();
  optional("hero specs", () => renderHeroSpecs($("[data-specs]"), model));
  createModelActions({ model, prefs, track, unitsSlot: $("[data-units-slot]"), actionsSlot: $("[data-actions-slot]") });
  inventory.then((inv) => {
    const link = renderInventorySummary($("[data-inventory]"), inv);
    link.addEventListener("click", () =>
      track("hero_inventory_click", { model: model.id, listings: inv?.listingCount ?? -1, demo: Boolean(inv?.isDemo) }),
    );
  });

  let controls = null;
  const scene = createYachtScene({
    stage: $("[data-stage]"),
    underlight: $("[data-underlight]"),
    asset: model.side,
    store,
    reducedMotion,
    onStatus: () => controls?.sync(),
  });

  // All panels share one grid cell, so the hero height never depends on the active view.
  const views = $("[data-views]");
  const panels = Object.fromEntries([...views.querySelectorAll("[data-panel]")].map((p) => [p.dataset.panel, p]));
  const cutawayView = model.cutaway ? optional("cutaway", () => createCutawayView(panels.cutaway, { cutaway: model.cutaway, modelName: model.name, track })) : null;
  const galleryView = model.gallery.length ? optional("gallery", () => createGalleryView(panels.gallery, { photos: model.gallery, modelName: model.name, track })) : null;
  // Hidden views fetch their images on intent, when idle after load, or when opened.
  const warmViews = () => {
    cutawayView?.load();
    galleryView?.load();
  };
  $("[data-view-control]").addEventListener("pointerenter", warmViews, { once: true });
  $("[data-view-control]").addEventListener("focusin", warmViews, { once: true });
  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500));
  if (document.readyState === "complete") idle(warmViews, { timeout: 4000 });
  else window.addEventListener("load", () => idle(warmViews, { timeout: 4000 }), { once: true });

  // Cutaway water surface behind the title and deck plan (own canvas + loop).
  const hero = $("[data-hero]");
  const waterCanvas = $("[data-cutaway-water]");
  const water = createWaterBackground(waterCanvas, {
    config: () => store.get().cutawayWater,
    reducedMotion,
    paused: () => store.paused,
  });
  const placeWater = () => {
    const facts = $(".hero__facts");
    water.place({ left: 0, top: 0, width: hero.clientWidth, height: Math.max(1, facts.offsetTop - 12) });
  };
  new ResizeObserver(placeWater).observe(hero);
  const titleRipple = createTitleRipple($("[data-title]"), {
    config: () => store.get().cutawayTitle,
    reducedMotion,
    paused: () => store.paused,
  });
  const applyPlanStyle = () => cutawayView?.applyStyle(store.get().cutawayPlan);
  applyPlanStyle();
  store.subscribe((_, change) => {
    const all = change.reset || change.preset || change.rebased;
    if (all || change.group === "cutawayWater" || change.paused !== undefined) water.refresh();
    if (all || change.group === "cutawayTitle" || change.paused !== undefined) titleRipple.refresh();
    if (all || change.group === "cutawayPlan") applyPlanStyle();
  });

  // Side view FX switch off only after the crossfade, so the reflection fades with the yacht.
  const CROSSFADE_MS = 620; // .hero__panel.is-leaving in hero.css
  let sideOffTimer = 0;

  createHeroViewControl($("[data-view-control]"), {
    label: `${model.name} views`,
    initial: "side",
    views: Object.keys(VIEW_LABELS).map((id) => ({ id, label: VIEW_LABELS[id], panel: panels[id] })),
    onChange(id) {
      clearTimeout(sideOffTimer);
      if (id !== "side") warmViews();
      if (id === "side") scene.setActive(Boolean(model.side.enableWaterFx));
      else sideOffTimer = setTimeout(() => scene.setActive(false), CROSSFADE_MS);
      water.setActive(id === "cutaway" && Boolean(model.cutaway));
      titleRipple.setActive(id === "cutaway" && Boolean(model.cutaway));
      if (id === "cutaway" && views.dataset.view !== "cutaway") cutawayView?.reset();
      cutawayView?.setActive(id === "cutaway");
      if (views.dataset.view) track("hero_view_change", { model: model.id, view: id });
      views.dataset.view = id;
    },
  });

  const parallax = createParallax({
    hero: $("[data-hero]"),
    root: $("main"),
    layers: [
      { els: [logo], rate: PARALLAX_RATES.logo, pull: PULL_FACTORS.logo },
      { els: [$("[data-title]")], rate: PARALLAX_RATES.title, pull: PULL_FACTORS.title },
      {
        els: [...document.querySelectorAll("[data-parallax], [data-underlight]")],
        rate: PARALLAX_RATES.yacht,
        pull: PULL_FACTORS.yacht,
      },
    ],
    strength: () => store.get().placement.parallax,
    reducedMotion,
  });
  createOverscrollPull({
    hero: $("[data-hero]"),
    config: () => store.get().pull,
    reducedMotion,
    onPull: (px) => parallax.setPull(px),
  });
  store.subscribe((_, change) => change.key === "parallax" && parallax.update());

  if (DEV_TOOLS) {
    controls = optional("tune panel", () =>
      createFxControls({
        store,
        sources: model.sources,
        fixtureActive,
        getStatus: () => ({ ...scene.status, reducedMotion: reducedMotion.matches }),
      }),
    );
  }

  optional("alerts", () => createAlertsCta($("[data-alerts]"), { model, track, reducedMotion }));

  const footerGlints = optional("footer glints", () =>
    createFooterGlints($("[data-footer-glints]"), {
      config: () => store.get().footerGlints,
      caustics: () => store.get().caustics,
      reducedMotion,
    }),
  );
  if (footerGlints) store.subscribe(() => footerGlints.update());
  const footerInner = $(".site-footer__inner");
  let fogRaf = 0;
  const syncFog = () => {
    fogRaf = 0;
    document.documentElement.classList.toggle("is-footer-top", footerInner.getBoundingClientRect().top < 160);
  };
  window.addEventListener("scroll", () => (fogRaf ||= requestAnimationFrame(syncFog)), { passive: true });
  syncFog();

  const sectionNav = createSectionNav({ nav: $("[data-section-nav]"), header: $("[data-site-header]"), reducedMotion });

  // Content failing must not take the listings down (and vice versa).
  const content = await contentReady.catch((err) => {
    console.error("[content] unavailable:", err);
    return normalizeModelContent(null);
  });
  const listingsRoot = $("[data-listings]");
  listingsReady
    .finally(() => listingsRoot.classList.remove("is-loading"))
    .then((listings) => {
      assignGenerations(listings, content.generations);
      const section = createListingsSection($("[data-listings]"), {
        listings,
        modelName: model.name,
        updatedAt: listingsSnapshotDate ?? undefined,
        cardStyle: () => store.get().listings.cardStyle,
        showQuickFilters: () => store.get().listings.quickFilters,
        reducedMotion,
        track,
        generations: content.generations,
        // TODO(backend): a catalog URL filtered to this model (none exists on yachtway.com yet).
        catalogUrl: content.modelsUrl,
        brandName: model.builder.name,
      });
      store.subscribe((_, change) => (change.group === "listings" || change.reset || change.preset) && section.applyStyle());
      renderModelSections({ model, content, listings, prefs, listingsApi: section, scrollTo: sectionNav.scrollToSection, track });
      optional("structured data", () =>
        injectStructuredData(buildStructuredData({ model, listings, faq: faqItems({ modelName: model.name, listings, content }) })),
      );
    })
    .catch((err) => {
      console.error("[listings] unavailable:", err);
      const note = $("[data-listings] .wip__note");
      if (note) note.textContent = "Listings are unavailable right now. Please try again later.";
    });

  // Fonts shift the title height → re-place the underlight once they're in,
  // then start the intro so the title never animates in a fallback font.
  const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 800))]);
  fontsReady.then(() => {
    scene.relayoutUnderlight();
    requestAnimationFrame(() => document.documentElement.classList.add("intro-play"));
  });
  let relayoutRaf = 0;
  window.addEventListener("resize", () => (relayoutRaf ||= requestAnimationFrame(() => ((relayoutRaf = 0), scene.relayoutUnderlight()))));
  document.fonts?.ready.then(placeWater);
}

init();
