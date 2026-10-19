// Listing card, two visual styles from Figma (node 48:1711):
//   "overlay" — full-bleed photo, dark gradient, white text (cards 1–2)
//   "classic" — photo on top, details on a light panel below (cards 3–4)
// The markup is the same; the style is a class on the grid.
//
// Media preview: on hover the photo area is split into vertical zones, one per
// media item; moving the cursor left→right flips through them. A video in
// first position autoplays (muted) while hovered. Touch devices get a native
// horizontal swipe instead. Extra media loads only on first interaction.

import { priceParts, monthlyPayment, compactMoney, formatLocation, flagEmoji, formatHours } from "../../lib/listing-format.js";

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
};

/** @param {import("../../types").ListingCard} l */
export function renderListingCard(l, { modelName, generationLabel = () => null }) {
  const card = el("article", "lcard");
  card.dataset.slug = l.slug;
  const title = `${l.year} ${modelName}`;
  const location = formatLocation(l.location);

  // ---- media ----
  const media = el("div", "lcard__media");
  const frames = el("div", "lcard__frames");
  l.media.forEach((m, i) => {
    let node;
    if (m.type === "video") {
      node = el("video", "lcard__frame lcard__frame--video");
      node.muted = true;
      node.loop = true;
      node.playsInline = true;
      node.preload = "none";
      node.poster = m.poster ?? "";
      node.dataset.src = m.src;
      node.setAttribute("aria-hidden", "true");
    } else {
      node = el("img", "lcard__frame");
      node.alt = i === 0 ? `${title} for sale in ${location}` : "";
      node.decoding = "async";
      if (i === 0 || (i === 1 && l.media[0].type === "video")) {
        node.src = m.src; // first photo (or video poster's twin) loads with the page
        node.loading = "lazy";
      } else {
        node.dataset.src = m.src;
      }
    }
    node.dataset.index = String(i);
    if (i === 0) node.classList.add("is-active");
    frames.append(node);
  });
  media.append(frames);

  if (l.media.length > 1) {
    const dots = el("div", "lcard__dots");
    dots.setAttribute("aria-hidden", "true");
    l.media.forEach((_, i) => dots.append(el("span", i === 0 ? "is-active" : "")));
    media.append(dots);
  }

  const badges = el("div", "lcard__badges");
  if (l.condition === "new") badges.append(el("span", "lcard__badge lcard__badge--new", "New"));
  const gen = l.generation && generationLabel(l.generation);
  if (gen) badges.append(el("span", "lcard__badge lcard__badge--gen", gen));
  if (l.oldPrice && l.price) badges.append(el("span", "lcard__badge lcard__badge--drop", `↓ ${compactMoney(l.oldPrice - l.price, l.currency)}`));
  if (l.media[0]?.type === "video") badges.append(el("span", "lcard__badge", "Video"));
  if (l.has3DTour) badges.append(el("span", "lcard__badge", "3D tour"));
  if (badges.childElementCount) media.append(badges);

  if (l.photosCount > l.media.length) {
    media.append(el("span", "lcard__count", `${l.photosCount} photos`));
  }

  // ---- body ----
  const body = el("div", "lcard__body");
  const meta = el("p", "lcard__meta");
  meta.append(el("span", "lcard__year", String(l.year)));
  const hours = formatHours(l.engineHours);
  if (hours) meta.append(el("span", "lcard__hours", hours));
  const loc = el("p", "lcard__location");
  loc.append(el("span", "", location), el("span", "lcard__flag", flagEmoji(l.location.countryCode)));
  loc.lastChild.setAttribute("aria-hidden", "true");

  const priceRow = el("div", "lcard__price-row");
  const priceBox = el("div", "lcard__price-box");
  if (l.price) {
    const { symbol, amount } = priceParts(l.price, l.currency);
    const price = el("p", "lcard__price");
    price.append(el("span", "lcard__currency", symbol), el("span", "", amount));
    priceBox.append(price);
    const mo = l.currency === "USD" ? monthlyPayment(l.price) : null;
    if (mo) {
      const p = el("p", "lcard__monthly");
      p.title = "Estimate: 10% down, 5% APR, 20-year term";
      const { symbol: s2, amount: a2 } = priceParts(mo, l.currency);
      p.append(el("span", "lcard__monthly-label", `From ${s2}`), el("span", "lcard__monthly-value", `${a2}/mo`));
      priceBox.append(p);
    }
  } else {
    priceBox.append(el("p", "lcard__price lcard__price--na", "Price on request"));
  }
  const arrow = el("span", "lcard__arrow");
  arrow.setAttribute("aria-hidden", "true");
  priceRow.append(priceBox, arrow);
  body.append(meta, loc, priceRow);

  // One link covers the whole card (stretched), so the media scrub never blocks the click.
  const link = el("a", "lcard__link");
  if (l.url) link.href = l.url; // unsafe/missing urls are null after normalizeListing
  link.target = "_blank";
  link.rel = "noopener";
  link.setAttribute(
    "aria-label",
    [title, location, l.price ? priceParts(l.price, l.currency).text : "Price on request", hours, "opens yachtway.com"].filter(Boolean).join(", "),
  );

  card.append(media, body, link);
  return card;
}

// A video cover plays this long on hover before the pointer scrub takes over.
const VIDEO_LEAD_MS = 6000;

/**
 * Hover/touch media behaviour for every card inside `grid` (event delegation,
 * one set of listeners regardless of card count).
 */
export function attachMediaPreview(grid, { reducedMotion }) {
  const hydrate = (card) => {
    if (card.dataset.hydrated) return;
    card.dataset.hydrated = "1";
    card.querySelectorAll("[data-src]").forEach((n) => {
      n.src = n.dataset.src;
      delete n.dataset.src;
    });
  };

  const show = (card, index) => {
    const frames = card.querySelectorAll(".lcard__frame");
    if (!frames.length || card.dataset.index === String(index)) return;
    card.dataset.index = String(index);
    frames.forEach((f, i) => f.classList.toggle("is-active", i === index));
    card.querySelectorAll(".lcard__dots span").forEach((d, i) => d.classList.toggle("is-active", i === index));
    const video = card.querySelector("video");
    if (!video) return;
    if (index === 0 && card.matches(":hover") && !reducedMotion.matches) video.play().catch(() => {});
    else video.pause();
  };

  const zoneOf = (card, clientX) => {
    const n = card.querySelectorAll(".lcard__frame").length;
    const r = card.querySelector(".lcard__media").getBoundingClientRect();
    return Math.min(n - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * n)));
  };

  // Video cover: let it play first (first dot fills as progress), then unlock the scrub.
  function startVideoLead(card) {
    const video = card.querySelector("video");
    card.classList.add("is-leading");
    card.dataset.index = "";
    show(card, 0);
    video.currentTime = 0;
    const unlock = () => {
      clearTimeout(card._leadTimer);
      card.classList.remove("is-leading");
    };
    // One pending "playing" handler per card (a quick re-hover replaces it).
    if (card._onPlaying) video.removeEventListener("playing", card._onPlaying);
    clearTimeout(card._leadTimer);
    card._onPlaying = () => {
      card._onPlaying = null;
      if (!card.classList.contains("is-leading")) return;
      card.style.setProperty("--lead-ms", `${VIDEO_LEAD_MS}ms`);
      card.classList.add("is-lead-running");
      card._leadTimer = setTimeout(unlock, VIDEO_LEAD_MS);
    };
    video.addEventListener("playing", card._onPlaying, { once: true });
    video.play().catch(unlock); // no autoplay → scrub right away
  }

  grid.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const card = e.target.closest(".lcard");
    if (!card || card.contains(e.relatedTarget)) return;
    hydrate(card);
    card.classList.add("is-previewing");
    if (card.querySelector("video") && !reducedMotion.matches) return startVideoLead(card);
    card.dataset.index = "";
    show(card, zoneOf(card, e.clientX));
  });
  grid.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const card = e.target.closest(".lcard");
    if (card && !card.classList.contains("is-leading")) show(card, zoneOf(card, e.clientX));
  });
  grid.addEventListener("pointerout", (e) => {
    const card = e.target.closest(".lcard");
    if (!card || card.contains(e.relatedTarget)) return;
    clearTimeout(card._leadTimer);
    card.classList.remove("is-previewing", "is-leading", "is-lead-running");
    show(card, 0);
    card.querySelector("video")?.pause();
  });

  // Touch: hydrate as cards approach the viewport; swipe is native scroll-snap.
  const coarse = matchMedia("(hover: none)");
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.isIntersecting && coarse.matches && hydrate(en.target)),
    { rootMargin: "200px" },
  );
  const onScroll = (e) => {
    const frames = e.target;
    if (!frames.classList?.contains("lcard__frames")) return;
    const card = frames.closest(".lcard");
    const i = Math.round(frames.scrollLeft / frames.clientWidth);
    card.querySelectorAll(".lcard__dots span").forEach((d, k) => d.classList.toggle("is-active", k === i));
  };
  grid.addEventListener("scroll", onScroll, { capture: true, passive: true });
  // On touch the swipeable strip sits above the stretched link; a tap still opens the listing.
  grid.addEventListener("click", (e) => {
    if (!coarse.matches || !e.target.closest(".lcard__frames")) return;
    e.target.closest(".lcard")?.querySelector(".lcard__link")?.click();
  });

  return {
    observe(cards) {
      cards.forEach((c) => io.observe(c));
    },
    disconnect() {
      io.disconnect();
    },
  };
}
