// The section bar's side groups: m / ft (left) and Save · Share (right).
// They live in the sticky bar next to the anchors, so all three dock together.
// The unit choice is mirrored on <html data-units>, which switches every
// dual-rendered value at once (see .u-dual in hero.css). Save is local for now
// (TODO(backend): account "saved yachts" API).

const SVG = (d, extra = "") =>
  `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"${extra}>${d}</svg>`;
const ICON_HEART = SVG('<path d="M10 16.5s-6-3.6-6-8.1A3.4 3.4 0 0 1 10 6.3a3.4 3.4 0 0 1 6 2.1c0 4.5-6 8.1-6 8.1z"/>');
const ICON_SHARE = SVG('<path d="M10 3v9M6.5 6.5 10 3l3.5 3.5M5 10.5V15a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 15 15v-4.5"/>');

const el = (tag, className, html) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

/** Small status toast (bottom centre), one at a time. */
export function toast(text) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = el("div", "toast");
    t.setAttribute("role", "status");
    document.body.append(t);
  }
  t.textContent = text;
  t.classList.remove("is-on");
  void t.offsetWidth;
  t.classList.add("is-on");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("is-on"), 2200);
}

/**
 * @param {object} o
 * @param {import("../types").ModelHeroData} o.model
 * @param {ReturnType<import("../lib/preferences.js").createPreferences>} o.prefs
 * @param {(event: string, props?: object) => void} [o.track]
 * @param {HTMLElement} o.unitsSlot    left slot of the section bar
 * @param {HTMLElement} o.actionsSlot  right slot of the section bar
 */
export function createModelActions({ model, prefs, track, unitsSlot, actionsSlot }) {
  const actions = el("div", "bar-pill bar-actions");
  actions.setAttribute("role", "group");
  actions.setAttribute("aria-label", "Model actions");

  const save = el("button", "ma-btn", `${ICON_HEART}<span class="ma-btn__label">Save</span>`);
  save.type = "button";
  const share = el("button", "ma-btn", `${ICON_SHARE}<span class="ma-btn__label">Share</span>`);
  share.type = "button";

  const units = el("div", "bar-pill ma-units");
  units.setAttribute("role", "radiogroup");
  units.setAttribute("aria-label", "Units");
  const opts = [
    ["metric", "m", "Metric units"],
    ["imperial", "ft", "Imperial (US) units"],
  ].map(([id, text, label]) => {
    const b = el("button", "ma-units__opt", text);
    b.type = "button";
    b.dataset.units = id;
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", label);
    b.addEventListener("click", () => {
      prefs.setUnits(id);
      track?.("units_change", { units: id });
    });
    units.append(b);
    return b;
  });
  // Radio-group keyboard: arrows move the choice.
  units.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = prefs.get().units === "metric" ? "imperial" : "metric";
    prefs.setUnits(next);
    opts.find((b) => b.dataset.units === next).focus();
  });

  actions.append(save, share);
  unitsSlot.append(units);
  actionsSlot.append(actions);

  function sync() {
    const { units: u } = prefs.get();
    units.dataset.units = u;
    document.documentElement.dataset.units = u;
    for (const b of opts) {
      const on = b.dataset.units === u;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    }
    const saved = prefs.isSaved(model.id);
    save.setAttribute("aria-pressed", String(saved));
    save.querySelector(".ma-btn__label").textContent = saved ? "Saved" : "Save";
    save.setAttribute("aria-label", saved ? `Remove ${model.name} from saved` : `Save ${model.name}`);
  }

  save.addEventListener("click", () => {
    const on = prefs.toggleSaved(model.id);
    save.classList.remove("is-popping");
    void save.offsetWidth;
    if (on) save.classList.add("is-popping");
    toast(on ? `${model.name} saved` : "Removed from saved");
    track?.("model_save", { saved: on });
  });

  share.addEventListener("click", async () => {
    const data = { title: `${model.name} for sale | YachtWay`, url: location.href.split("#")[0] };
    track?.("model_share", { native: Boolean(navigator.share) });
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // user closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(data.url);
      toast("Link copied");
    } catch {
      toast(data.url);
    }
  });

  prefs.subscribe(sync);
  sync();
}
