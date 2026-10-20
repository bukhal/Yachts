// MOCK of the backend response for GET /api/models/galeon-500-fly/hero.
// Shape: ModelHeroData (src/types.d.ts), contract: docs/BACKEND.md.
// Everything here is per-model, not per-listing.
// TODO(backend): delete this file once src/api/model-hero.js reads the real endpoint.

const VERIFIED_AT = "2026-10-19";

/** @type {import("../types").ModelHeroData} */
export const galeon500Fly = {
  id: "galeon-500-fly",
  slug: "galeon-500-fly",
  name: "Galeon 500 Fly",
  builder: {
    name: "Galeon",
    countryCode: "PL", // ISO 3166-1 alpha-2; shown as "PL", full name in the tooltip
    logoSrc: "./assets/galeon-logo.svg",
    founded: 1982,
    note: "Built in-house at two yards on the Gulf of Gdańsk: Straszyn and Wiślinka.",
    sourceId: "production",
  },
  series: "Fly Series",
  type: "Flybridge motor yacht",

  side: {
    // Exported from Figma node 48:1414 (Yacht 1) at 2× — cut-out with alpha (WebP, lossless alpha).
    src: "./assets/galeon-500-fly-side.webp",
    alt: "Galeon 500 Fly flybridge motor yacht, side profile",
    intrinsicWidth: 1566,
    intrinsicHeight: 549,
    // Opaque pixels x 7–1553, y 12–548 (measured once from the alpha channel).
    visibleBounds: { x: 0.00447, y: 0.02186, width: 0.98787, height: 0.97814 },
    // Normalized 0..1 in the source image. The hull is cropped at the
    // waterline, so the waterline sits at the bottom opaque row (y = 547).
    waterlineY: 0.997,
    anchorX: 0.5,
    causticBandHeight: 0.21, // Figma effect rect: 56 px of a 274 px tall image
    enableWaterFx: true,
    water: { widthScale: 1, offsetX: 0 },
  },
  // Top-down deck plans (updated renders, 2026-10-20). All three share one
  // 1877×692 transparent canvas, so they stay aligned when crossfading.
  cutaway: {
    intrinsicWidth: 1877,
    intrinsicHeight: 692,
    defaultDeck: "flybridge",
    // Order = switcher order, top deck first. visibleBounds (normalized, optional)
    // were measured from the alpha channel; without them the page measures once on load.
    decks: [
      {
        id: "flybridge",
        label: "Flybridge",
        src: "./assets/decks/flybridge.webp",
        alt: "Galeon 500 Fly flybridge, plan view from above",
        visibleBounds: { x: 0.0272, y: 0.0318, width: 0.959, height: 0.9393 },
      },
      {
        id: "main",
        label: "Main Deck",
        src: "./assets/decks/main-deck.webp",
        alt: "Galeon 500 Fly main deck layout: cockpit, salon, galley and helm",
        visibleBounds: { x: 0.0272, y: 0.0318, width: 0.959, height: 0.9393 },
      },
      {
        id: "lower",
        label: "Lower Deck",
        src: "./assets/decks/lower-deck.webp",
        alt: "Galeon 500 Fly lower deck layout: master, VIP and twin cabins",
        visibleBounds: { x: 0.0352, y: 0.1662, width: 0.9057, height: 0.6806 },
      },
    ],
    // Optional per-model multiplier when a model's plans are drawn at another scale.
    // These renders fill their canvas more (hull 96% of the width vs 85% before):
    // 0.89 keeps the plan the size the layout was tuned for.
    displayScale: 0.89,
    tour: {
      provider: "giraffe360",
      url: "https://tour.giraffe360.com/4ca50bad22854f789486010bae9d4d35/",
      // Giraffe360 documents no URL for opening a given room/scene. Its `?rid=`
      // only aims the camera at an Info hotspot, and only once Reference IDs
      // are enabled in their dashboard. Add entries here when those IDs exist:
      // { [deckId]: [{ x: 0..1, y: 0..1, label, rid }] } — x/y normalized to the deck image.
      hotspots: {},
    },
  },
  // Model gallery (first item = cover). Photos of Galeon 500 Fly yachts listed
  // on yachtway.com (2025 Fort Myers and 2020 Miami Beach listings), stored
  // locally at 1800 px + 720 px thumbnails. TODO(content): official model photo set.
  gallery: [
    { src: "./assets/gallery/01.jpg", thumb: "./assets/gallery/01-sm.jpg", width: 1800, height: 1011, alt: "Galeon 500 Fly at anchor in turquoise water, aerial view" },
    { src: "./assets/gallery/02.jpg", thumb: "./assets/gallery/02-sm.jpg", width: 1800, height: 1350, alt: "Galeon 500 Fly underway, aerial view" },
    { src: "./assets/gallery/03.jpg", thumb: "./assets/gallery/03-sm.jpg", width: 1349, height: 1800, alt: "Galeon 500 Fly from above, leaving a wake on dark water" },
    { src: "./assets/gallery/04.jpg", thumb: "./assets/gallery/04-sm.jpg", width: 1800, height: 1011, alt: "Galeon 500 Fly from directly above: flybridge and foredeck" },
    { src: "./assets/gallery/05.jpg", thumb: "./assets/gallery/05-sm.jpg", width: 1800, height: 1200, alt: "Main deck salon with lounge seating and dining table" },
    { src: "./assets/gallery/06.jpg", thumb: "./assets/gallery/06-sm.jpg", width: 1800, height: 1200, alt: "Full-beam master cabin" },
    { src: "./assets/gallery/07.jpg", thumb: "./assets/gallery/07-sm.jpg", width: 1800, height: 1200, alt: "Flybridge under the hardtop" },
    { src: "./assets/gallery/08.jpg", thumb: "./assets/gallery/08-sm.jpg", width: 1800, height: 1200, alt: "Galley on the main deck" },
    { src: "./assets/gallery/09.jpg", thumb: "./assets/gallery/09-sm.jpg", width: 1800, height: 1011, alt: "Galeon 500 Fly running in open water" },
    { src: "./assets/gallery/10.jpg", thumb: "./assets/gallery/10-sm.jpg", width: 1800, height: 1350, alt: "Stern, cockpit and swim platform at the dock" },
    { src: "./assets/gallery/11.jpg", thumb: "./assets/gallery/11-sm.jpg", width: 1800, height: 1200, alt: "Main deck helm station" },
    { src: "./assets/gallery/12.jpg", thumb: "./assets/gallery/12-sm.jpg", width: 1800, height: 1200, alt: "Guest cabin" },
    { src: "./assets/gallery/13.jpg", thumb: "./assets/gallery/13-sm.jpg", width: 1800, height: 1200, alt: "Flybridge lounge and table" },
    { src: "./assets/gallery/14.jpg", thumb: "./assets/gallery/14-sm.jpg", width: 1800, height: 1012, alt: "Aft deck with glass doors to the salon" },
    { src: "./assets/gallery/15.jpg", thumb: "./assets/gallery/15-sm.jpg", width: 1800, height: 1350, alt: "Galeon 500 Fly running bow-on" },
    { src: "./assets/gallery/16.jpg", thumb: "./assets/gallery/16-sm.jpg", width: 1800, height: 1350, alt: "Galeon 500 Fly from above" },
  ],

  // Compact hero row: value + unit on screen; `secondary` and `note` go to the tooltip.
  specs: [
    {
      id: "length",
      label: "length",
      value: 16.2,
      quantity: "length", // stored metric; unit + value follow the Metric/Imperial switch
      secondary: "Length overall {m:16.20}",
      note: "Hull length {m:14.44}.",
      sourceId: "global",
    },
    {
      id: "beam",
      label: "beam",
      value: 4.46,
      quantity: "length",
      secondary: "{m:6.00} in Beach Mode",
      note: "Beam overall {m:4.46}. Lowering both side platforms widens the cockpit to {m:6.00}.",
      sourceId: "global",
    },
    {
      id: "draft",
      label: "draft",
      value: 1.4,
      quantity: "length",
      secondary: "{m:1.00} canoe body (hull only)",
      note: "{m:1.40} is the maximum draft incl. running gear, for twin Volvo Penta D11-670 on shafts.",
      sourceId: "us2023",
      referenceProfile: "us-2023-d11-670",
    },
    {
      id: "capacity",
      label: "capacity",
      value: 12,
      unit: "persons",
      note: "Maximum number of people on board, CE category B.",
      sourceId: "global",
    },
    {
      id: "sleeps",
      label: "sleeps",
      value: 6,
      unit: "3 cabins",
      note: "Full-beam master en suite, VIP cabin forward and a twin guest cabin.",
      sourceId: "global",
    },
    {
      id: "crew",
      label: "crew",
      value: 1,
      unit: "optional",
      note: "Crew cabin with its own head comes with the L-sofa aft layout; other layouts have a garage instead.",
      sourceId: "global",
    },
    {
      id: "speed",
      label: "speed",
      value: 30,
      unit: "knots",
      secondary: "30 kn max · 25 kn cruise",
      note: "Builder estimate for twin Volvo Penta D11-670. Other engines differ: about 33 kn (D11-725) and 35 kn (IPS 950).",
      sourceId: "us2023",
      referenceProfile: "us-2023-d11-670",
    },
    {
      id: "power",
      label: "performance",
      value: "2×725",
      unit: "horse power",
      secondary: "From 2×550 hp up to 2×725 hp",
      note: "Maximum available output. The engines of each yacht depend on its configuration.",
      sourceId: "global",
    },
  ],

  sources: {
    global: {
      id: "global",
      label: "Galeon 500 FLY — manufacturer documentation (global)",
      shortLabel: "Galeon, global specification",
      url: "https://galeon.pl/en/model/500-fly-2/",
      archiveUrl: "https://web.archive.org/web/20240720135520/https://galeon.pl/en/model/500-fly-2/",
      market: "Global",
      verifiedAt: VERIFIED_AT,
      note: "The live URL now redirects to 520 FLY; values come from the 500 FLY page as archived on 2024-07-20.",
    },
    us2023: {
      id: "us2023",
      label: "Galeon 500 FLY — US spec sheet 2023",
      shortLabel: "Galeon US spec sheet 2023",
      url: "https://www.galeonyachts.us/-/media/files/galeon/spec-sheets/2023-spec-sheets/gal-30013-500-fly-spec-sheet-refresh_2023-web.pdf",
      archiveUrl:
        "https://web.archive.org/web/20230705073916/https://www.galeonyachts.us/-/media/files/galeon/spec-sheets/2023-spec-sheets/gal-30013-500-fly-spec-sheet-refresh_2023-web.pdf",
      market: "US",
      verifiedAt: VERIFIED_AT,
      note: "Configuration: twin Volvo Penta D11-670 on shafts. Speeds are builder estimates (fresh water, 6 people, full tanks).",
    },
    yachtbuyer: {
      id: "yachtbuyer",
      label: "YachtBuyer — Galeon 500 Fly full specification (third party)",
      shortLabel: "YachtBuyer (third party)",
      url: "https://www.yachtbuyer.com/en/galeon/new/500-fly",
      market: "Global",
      verifiedAt: VERIFIED_AT,
      note: "Not a builder source. Used only for crew cabin and speeds of other engine options.",
    },
    production: {
      id: "production",
      label: "Galeon shipyard — production",
      shortLabel: "Galeon shipyard",
      url: "https://www.galeon.yachts/craftsmanship/production",
      market: "Global",
      verifiedAt: VERIFIED_AT,
    },
  },

  // Full data for later sections (Specifications etc.). Not shown in the hero.
  overview: {
    hullLength: { value: 14.44, unit: "m", sourceId: "global" },
    hullBeam: { value: 4.4, unit: "m", sourceId: "global" },
    lightCraftMass: { value: 22250, unit: "kg", sourceId: "global" },
    maxLoad: { value: 4270, unit: "kg", sourceId: "global" },
    fuel: { value: 1800, unit: "L", note: "2 × 900 L", sourceId: "global" },
    water: { value: 650, unit: "L", sourceId: "global" },
    blackWater: { value: 240, unit: "L", sourceId: "us2023" },
    heightWithMast: { value: 6.9, unit: "m", sourceId: "us2023" },
    ceCategory: { value: "B", sourceId: "global" },
    heads: { value: 2, note: "Guest bathrooms; plus crew head with crew cabin layout", sourceId: "global" },
    design: { value: "Tony Castro Yacht Design (naval architecture & exterior), Galeon (interior)", sourceId: "yachtbuyer" },
    awards: { value: "European Powerboat of the Year 2016", sourceId: "global" },
  },

  // Market/configuration-specific values behind the hero numbers.
  referenceProfiles: [
    {
      id: "global-docs",
      sourceId: "global",
      values: {
        draftCanoeBody: { value: 1.0, unit: "m", note: "Hull only, without propellers/shafts" },
        enginePower: { value: "2×550 – 2×725", unit: "hp" },
      },
    },
    {
      id: "us-2023-d11-670",
      sourceId: "us2023",
      values: {
        draftMax: { value: 1.4, unit: "m" },
        beam: { value: 4.42, unit: "m", note: "US sheet; global data gives 4.46 m overall" },
        engines: { value: "2 × Volvo Penta D11-670 (2 × 670 hp)" },
        speedMax: { value: 30, unit: "kn" },
        speedCruise: { value: 25, unit: "kn" },
      },
    },
    {
      id: "third-party-engine-options",
      sourceId: "yachtbuyer",
      values: {
        speedMaxD11_725: { value: 32.7, unit: "kn" },
        speedMaxIps950: { value: 35.4, unit: "kn" },
      },
    },
  ],
};
