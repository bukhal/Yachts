// Minimal full-screen photo viewer (modal dialog): one large photo, thin
// arrows, counter + caption, thumbnail strip. Keyboard ←/→/Home/End/Esc,
// swipe on touch, neighbours preloaded, focus returns to the opener.

import { afterAnimation } from "../lib/after-animation.js";

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/**
 * @param {object} o
 * @param {import("../types").GalleryPhoto[]} o.photos
 * @param {string} o.title
 * @param {(event: string, props?: object) => void} [o.track]
 */
export function createPhotoViewer({ photos, title, track }) {
  const dialog = el("dialog", "viewer");
  dialog.setAttribute("aria-label", `${title} photos`);

  const top = el("div", "viewer__top");
  const counter = el("p", "viewer__counter");
  counter.setAttribute("aria-live", "polite");
  const close = el("button", "viewer__close");
  close.type = "button";
  close.setAttribute("aria-label", "Close photos");
  top.append(el("p", "viewer__title", title), counter, close);

  const stage = el("div", "viewer__stage");
  const prev = el("button", "viewer__nav viewer__nav--prev");
  const next = el("button", "viewer__nav viewer__nav--next");
  prev.type = next.type = "button";
  prev.setAttribute("aria-label", "Previous photo");
  next.setAttribute("aria-label", "Next photo");
  const frame = el("div", "viewer__frame");
  stage.append(prev, frame, next);

  const caption = el("p", "viewer__caption");
  const strip = el("div", "viewer__strip");
  const thumbs = photos.map((p, i) => {
    const b = el("button", "viewer__thumb");
    b.type = "button";
    b.setAttribute("aria-label", `Photo ${i + 1}: ${p.alt}`);
    const img = el("img");
    img.src = p.thumb;
    img.alt = "";
    img.loading = "lazy";
    b.append(img);
    b.addEventListener("click", () => show(i));
    strip.append(b);
    return b;
  });

  dialog.append(top, stage, caption, strip);
  document.body.append(dialog);

  let index = 0;
  let opener = null;
  let current = null;
  const cache = new Map();
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function load(i) {
    if (cache.has(i)) return cache.get(i);
    const img = new Image();
    img.decoding = "async";
    img.src = photos[i].src;
    img.alt = photos[i].alt;
    img.className = "viewer__img";
    if (photos[i].width) img.width = photos[i].width;
    if (photos[i].height) img.height = photos[i].height;
    cache.set(i, img);
    return img;
  }

  function show(i, dir = Math.sign(i - index) || 1) {
    const n = photos.length;
    i = ((i % n) + n) % n;
    const img = load(i).cloneNode();
    img.style.setProperty("--dir", String(dir));
    if (current && !reduced()) {
      const old = current;
      old.classList.add("is-out");
      old.style.setProperty("--dir", String(dir));
      setTimeout(() => old.remove(), 320);
    } else current?.remove();
    frame.append(img);
    current = img;
    index = i;
    counter.textContent = `${i + 1} / ${n}`;
    caption.textContent = photos[i].alt;
    thumbs.forEach((t, k) => t.setAttribute("aria-current", String(k === i)));
    const t = thumbs[i];
    strip.scrollTo({ left: t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2, behavior: reduced() ? "auto" : "smooth" });
    load((i + 1) % n);
    load((i - 1 + n) % n); // preload neighbours
  }

  function requestClose() {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    const done = () => {
      dialog.classList.remove("is-closing");
      if (dialog.open) dialog.close();
      opener?.focus();
    };
    if (reduced()) return done();
    dialog.classList.add("is-closing");
    afterAnimation(dialog, 300, done);
  }

  prev.addEventListener("click", () => show(index - 1, -1));
  next.addEventListener("click", () => show(index + 1, 1));
  close.addEventListener("click", requestClose);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    requestClose();
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.target.closest?.(".viewer__strip") && (e.key === "Enter" || e.key === " ")) return;
    const k = { ArrowRight: () => show(index + 1, 1), ArrowLeft: () => show(index - 1, -1), Home: () => show(0, -1), End: () => show(photos.length - 1, 1) }[e.key];
    if (k) {
      e.preventDefault();
      k();
    }
  });
  // Click on the empty stage (not the photo or a control) closes.
  stage.addEventListener("click", (e) => {
    if (e.target === stage || e.target === frame) requestClose();
  });
  // Swipe (touch / pen).
  let sx = null;
  frame.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") sx = e.clientX;
  });
  frame.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 40) dx < 0 ? show(index + 1, 1) : show(index - 1, -1);
  });

  return {
    open(i, from) {
      opener = from;
      current?.remove();
      current = null;
      dialog.showModal();
      show(i, 1);
      close.focus();
      track?.("hero_gallery_open", { photo: i + 1 });
    },
  };
}
