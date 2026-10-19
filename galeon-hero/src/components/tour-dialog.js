// 360° tour in a large modal. The iframe is created on open and removed on
// close (stops the provider's WebGL/audio). Close: button, Escape, backdrop.
// A cross-origin iframe gives no error event, so a load timeout shows the
// "Open tour in new tab" fallback; that link is also always in the header.

import { afterAnimation } from "../lib/after-animation.js";

const LOAD_TIMEOUT_MS = 15000;
let dialogSeq = 0;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** @param {{ title: string }} o */
export function createTourDialog({ title }) {
  const dialog = el("dialog", "tour");
  const titleId = `tour-title-${++dialogSeq}`; // two instances (360° tour, video reviews) → unique ids
  dialog.setAttribute("aria-labelledby", titleId);
  const head = el("div", "tour__head");
  const h = el("h2", "tour__title", title);
  h.id = titleId;
  const newTab = el("a", "tour__newtab", "Open in new tab");
  newTab.target = "_blank";
  newTab.rel = "noopener";
  const close = el("button", "tour__close");
  close.type = "button";
  close.setAttribute("aria-label", "Close 360° tour");
  close.textContent = "×";
  head.append(h, newTab, close);

  const frameBox = el("div", "tour__frame");
  const status = el("div", "tour__status");
  status.setAttribute("role", "status");
  frameBox.append(status);
  dialog.append(head, frameBox);
  document.body.append(dialog);

  let iframe = null;
  let timer = 0;
  let returnFocus = null;
  let iframeTitle = title;

  function setStatus(kind, url) {
    status.replaceChildren();
    status.dataset.kind = kind;
    if (kind === "loading") status.append(el("span", "tour__spinner"), el("span", "", "Loading tour…"));
    if (kind === "error") {
      const a = el("a", "btn btn--primary", "Open tour in new tab");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      status.append(el("p", "tour__error", "The tour couldn't be loaded here."), a);
    }
  }

  function teardown() {
    clearTimeout(timer);
    iframe?.remove();
    iframe = null;
  }

  function finishClose() {
    dialog.classList.remove("is-closing");
    if (dialog.open) dialog.close();
    teardown();
    returnFocus?.focus();
  }

  function requestClose() {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return finishClose();
    dialog.classList.add("is-closing");
    afterAnimation(dialog, 400, finishClose);
  }

  close.addEventListener("click", requestClose);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    requestClose();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) requestClose();
  });

  return {
    /**
     * @param {string} url  @param {HTMLElement} trigger
     * @param {{ title?: string, newTabUrl?: string, newTabLabel?: string }} [opts]
     */
    open(url, trigger, opts = {}) {
      if (dialog.open) return;
      returnFocus = trigger;
      h.textContent = opts.title ?? title;
      iframeTitle = opts.title ?? title;
      newTab.href = opts.newTabUrl ?? url;
      newTab.textContent = opts.newTabLabel ?? "Open in new tab";
      teardown();
      if (navigator.onLine === false) {
        // An offline iframe would still fire "load" (browser error page), so don't create one.
        setStatus("error", url);
        dialog.showModal();
        close.focus();
        return;
      }
      setStatus("loading");
      iframe = el("iframe", "tour__iframe");
      iframe.title = iframeTitle;
      iframe.allow = "fullscreen; autoplay; encrypted-media; picture-in-picture; xr-spatial-tracking; gyroscope; accelerometer";
      iframe.setAttribute("allowfullscreen", "");
      iframe.addEventListener("load", () => {
        clearTimeout(timer);
        status.dataset.kind = "ready";
        iframe.classList.add("is-loaded");
      });
      iframe.src = url;
      frameBox.append(iframe);
      timer = setTimeout(() => setStatus("error", url), LOAD_TIMEOUT_MS);
      dialog.showModal();
      close.focus();
    },
    get isOpen() {
      return dialog.open;
    },
  };
}
