// Data contract for the model hero. JS modules reference these via JSDoc.

export type HeroView = "side" | "cutaway" | "gallery";

export interface YachtHeroAsset {
  src: string;
  alt: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  /** Opaque area of the image, normalized 0..1. Auto-detected from alpha once if omitted. */
  visibleBounds?: { x: number; y: number; width: number; height: number };
  /** Normalized 0..1 within the original image. Must be set per asset: alpha alone can't tell the waterline. */
  waterlineY: number;
  /** Normalized x placed at the stage centre; defaults to the centre of visibleBounds. */
  anchorX?: number;
  /** Height of the caustics band above the waterline, as a fraction of image height. */
  causticBandHeight: number;
  /** Optional grayscale/alpha mask in the same pixel space as `src`. */
  hullMaskSrc?: string;
  enableWaterFx: boolean;
  water?: { widthScale?: number; offsetX?: number };
}

export interface SpecItem {
  id: string;
  label: string;
  value: number | string | null;
  /** Shown under the value. Keep it short: one or two words. Ignored when `quantity` is set. */
  unit?: string;
  /** Convertible quantity: `value` is metric and follows the Metric/Imperial switch. */
  quantity?: "length" | "volume" | "mass";
  /** Tooltip lead line. Unit tokens convert with the switch: "{m:6.00} in Beach Mode", also {L:…} and {kg:…}. */
  secondary?: string;
  /** Tooltip body: what exactly the number means. */
  note?: string;
  /** Key into ModelHeroData.sources; rendered as the tooltip's "Source:" line. */
  sourceId?: string;
  sourceUrl?: string;
  referenceProfile?: string;
  format?: Intl.NumberFormatOptions;
}

export interface InventorySummary {
  listingCount: number | null;
  minimumAskingPrice: number | null;
  currency: string;
  updatedAt?: string;
  isDemo: boolean;
}

export interface SpecSource {
  id: string;
  label: string;
  shortLabel?: string;
  url: string;
  archiveUrl?: string;
  market: string;
  /** ISO date the values were last checked against the source. */
  verifiedAt: string;
  note?: string;
}

export interface Builder {
  name: string;
  /** ISO 3166-1 alpha-2, e.g. "PL". Shown on screen. */
  countryCode: string;
  /** Full English name, e.g. "Poland". Derived from countryCode when omitted. */
  country?: string;
  logoSrc?: string;
  founded?: number;
  /** Tooltip text: where/how the builder produces its yachts. */
  note?: string;
  sourceId?: string;
}

export interface GalleryPhoto {
  /** Large image for the viewer (≈1800 px on the long side). */
  src: string;
  /** Tile image (≈720 px); falls back to `src`. */
  thumb: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface DeckPlan {
  id: string;
  label: string;
  /** Transparent PNG; every deck of a model shares one canvas size so plans stay aligned. */
  src: string;
  alt: string;
  /** Opaque area, normalized 0..1. Optional: measured from alpha on load when missing. */
  visibleBounds?: { x: number; y: number; width: number; height: number };
}

export interface TourHotspot {
  /** Normalized 0..1 relative to the deck image. */
  x: number;
  y: number;
  label: string;
  /** Provider reference (Giraffe360 `?rid=`). Only documented IDs — never guessed. */
  rid: string;
}

export interface CutawayData {
  intrinsicWidth: number;
  intrinsicHeight: number;
  decks: DeckPlan[];
  /** Deck shown when Cutaway opens. */
  defaultDeck: string;
  /** Per-model size multiplier for plans drawn at another scale (default 1). */
  displayScale: number;
  tour: { provider: string | null; url: string; hotspots: Record<string, TourHotspot[]> } | null;
}

export interface ModelHeroData {
  id: string;
  slug?: string;
  name: string;
  builder: Builder;
  series?: string;
  type?: string;
  side: YachtHeroAsset;
  cutaway?: CutawayData | null;
  /** First item is the cover. */
  gallery: GalleryPhoto[];
  specs: SpecItem[];
  sources?: Record<string, SpecSource>;
  /** Full model data for later sections; not rendered in the hero. */
  overview?: Record<string, { value: number | string; unit?: string; note?: string; sourceId?: string }>;
  referenceProfiles?: Array<{ id: string; sourceId: string; values: Record<string, unknown> }>;
}

export interface ListingMedia {
  type: "image" | "video";
  src: string;
  /** Video only: frame shown before playback. */
  poster?: string;
}

/** One card in "For sale". Order of `media` = order of hover zones; a video first autoplays on hover. */
export interface ListingCard {
  id: string;
  slug: string;
  /** Listing page on yachtway.com; null when missing or not http(s) (the card then has no link). */
  url: string | null;
  year: number;
  condition: "new" | "used";
  price: number | null;
  currency: string | null;
  /** Normalized for sorting/filtering across currencies (backend should send it). */
  priceUsd: number | null;
  /** Previous price if it was cut; shown as a price-drop badge. */
  oldPrice: number | null;
  location: { city?: string; region?: string | null; countryCode?: string };
  engineHours: number | null;
  /** Not rendered on the card yet (kept for the listing page / future filters). */
  engines?: { count?: number; make?: string; model?: string; hpEach?: number };
  topSpeedKn?: number | null;
  seller?: string | null;
  photosCount?: number;
  has3DTour?: boolean;
  /** Not rendered on the card yet. */
  youtubeUrl?: string | null;
  /** Model generation id ("gen1"…); null when not confirmed. */
  generation?: string | null;
  /** 3–6 items: card preview only, not the full gallery. */
  media: ListingMedia[];
}

/** Listing filters. Empty array / null = facet not applied. */
export interface ListingFilters {
  cond: Array<"new" | "used">;
  /** Generation ids, e.g. "gen1". */
  gen: string[];
  /** ISO country codes. */
  loc: string[];
  /** USD (normalized price). */
  price: { min: number; max: number } | null;
  year: { min: number; max: number } | null;
  /** Only `max` is used ("up to N hours"). */
  hours: { min: number; max: number } | null;
}

/* ---------- Content under the hero: GET /api/models/{id}/content ----------
   After normalizeModelContent (src/api/model-content.js) every list exists
   (possibly empty) and every link is http(s) or null. Text may contain unit
   tokens {m:6.00} / {L:1800} / {kg:22250} (metric), rendered in both systems. */

export interface Generation {
  id: string;
  /** Badge, e.g. "Gen 1". */
  label: string;
  title: string;
  /** [first model year, last model year | null = still built] */
  years: [number, number | null];
  /** Side render on a transparent background, trimmed to the hull (bottom = waterline). */
  image: string;
  points: string[];
  sources: string[];
}

export interface SpecGroup {
  id: string;
  title: string;
  /** Icon key in model-sections.js: ruler | drop | gauge | bed | compass. */
  icon: string;
  rows: Array<{ label: string; value: number | string; quantity?: "length" | "volume" | "mass"; note?: string }>;
}

export interface ReviewVideo {
  /** YouTube id. */
  id: string;
  title: string;
  channel: string;
  duration: string;
  year: number;
  thumb: string;
  summary: string;
}

export interface ReviewQuote {
  /** Verbatim. */
  text: string;
  author: string;
  publication: string;
  url: string | null;
}

export interface SimilarModel {
  id: string;
  name: string;
  lengthM: number;
  image: string;
  text: string;
  forSale: number;
  fromUsd: number | null;
  /** Model page; falls back to ModelContent.modelsUrl. */
  url?: string | null;
}

export interface Dealer {
  name: string;
  area: string;
  location: string;
  logo: string;
  web: string | null;
  profile: string | null;
}

/** Static answer, or an answer built from live listings ("price" | "count" | "generation"). {model} = model name. */
export type FaqEntry = { q: string; a: string; keywords: string[] } | { auto: "price" | "count" | "generation"; q: string; keywords: string[] };

export interface ModelContent {
  generations: Generation[];
  successor: Generation | null;
  /** Specifications drawings; null hides them (needs at least `loa`). */
  drawings: {
    dimensions: { loa: number | null; draft: number | null; beam: number | null; beachMode: number | null };
    /** Underwater hull under the side render: left / width as shares of the render width, aspect = w / h. */
    underwater: { src: string; left: number; width: number; aspect: number } | null;
  } | null;
  specGroups: SpecGroup[];
  videos: ReviewVideo[];
  quotes: ReviewQuote[];
  models: SimilarModel[];
  /** Brand catalog on YachtWay ("All {brand} models", "See all … for sale"). */
  modelsUrl: string | null;
  /** "7 flybridge and Skydeck models from …" */
  modelsKind: string;
  dealers: Dealer[];
  faq: FaqEntry[];
}

/** "Notify me" subscription: POST /api/alerts { modelId, email, topics }. */
export interface AlertSubscription {
  email: string;
  topics: Array<"listings" | "price" | "models">;
}
