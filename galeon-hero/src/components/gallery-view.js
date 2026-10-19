// Gallery view in the hero, on the same 4-column grid as the listing cards:
//   cols 1–2: cover · col 3: two medium photos · col 4: three small + "View all"
// Sizes step down left → right. Hovering a smaller photo grows it and its
// neighbours give way (CSS grid tracks animate; see .gallery in hero.css).
// Any tile or "View all" opens the photo viewer.

import { createPhotoViewer } from "./photo-viewer.js";

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/**
 * @param {HTMLElement} panel  #view-panel-gallery
 * @param {object} o
 * @param {import("../types").GalleryPhoto[]} o.photos
 * @param {string} o.modelName
 * @param {(event: string, props?: object) => void} [o.track]
 */
export function createGalleryView(panel, { photos, modelName, track }) {
  const viewer = createPhotoViewer({ photos, title: modelName, track });
  const root = el("div", "gallery");
  root.setAttribute("aria-label", `${modelName} photos`);
  root.setAttribute("role", "group");

  let order = 0;
  const tile = (i, cls) => {
    const p = photos[i];
    const b = el("button", `g-tile ${cls}`);
    b.type = "button";
    b.style.setProperty("--i", String(order++)); // entrance stagger, left → right
    b.setAttribute("aria-label", `Open photo ${i + 1} of ${photos.length}: ${p.alt}`);
    const img = el("img");
    // The cover is large enough to need the big file. Sources are set by load()
    // (the panel is hidden until Gallery is chosen).
    img.dataset.src = i === 0 ? p.src : p.thumb;
    img.alt = "";
    img.decoding = "async";
    b.append(img);
    b.addEventListener("click", () => viewer.open(i, b));
    return b;
  };

  const n = photos.length;
  root.append(tile(0, "g-tile--cover"));
  const mid = el("div", "g-col g-col--mid");
  for (let i = 1; i <= 2 && i < n; i++) mid.append(tile(i, ""));
  const small = el("div", "g-col g-col--small");
  for (let i = 3; i <= 5 && i < n; i++) small.append(tile(i, ""));
  // "View all": glass over a blurred photo, like the 360° tour button.
  const all = el("button", "g-tile g-all");
  all.type = "button";
  all.style.setProperty("--i", String(order++));
  all.setAttribute("aria-label", `View all ${n} photos`);
  // Absolute URL: a relative one inside a CSS variable resolves against the stylesheet.
  const allImg = photos[6] ? `url("${new URL(photos[6].thumb, document.baseURI).href}")` : null;
  all.append(el("span", "g-all__label", "View all"), el("span", "g-all__count", `${n} photos`));
  all.addEventListener("click", () => viewer.open(0, all));
  small.append(all);
  root.append(mid, small);
  panel.replaceChildren(root);

  return {
    /** Fetch the tiles (idempotent). */
    load() {
      for (const img of root.querySelectorAll("img[data-src]")) {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
      }
      if (allImg) all.style.setProperty("--g-all-img", allImg);
    },
  };
}
