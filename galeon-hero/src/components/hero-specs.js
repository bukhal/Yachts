// Compact spec row. Each item shows label / value / unit only; definitions,
// alternate values and sources go into a tooltip (hover or keyboard focus).
// Tooltip follows WCAG 1.4.13: hoverable, persistent while hovered/focused,
// dismissible with Escape. Specs with a `quantity` render both unit systems
// (value, unit and tooltip); <html data-units> shows one, with no reflow.

import { toSystem, formatQuantity, unitLabel, dual, dualText } from "../lib/units.js";

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function formatValue(spec) {
  if (spec.value === null || spec.value === undefined) return "—";
  if (typeof spec.value === "number") {
    try {
      return spec.value.toLocaleString("en-US", spec.format ?? {});
    } catch {
      return spec.value.toLocaleString("en-US"); // invalid `format` options from data
    }
  }
  return spec.value;
}

let tipSeq = 0;

// value / unit may be a string or a ready node (dual-unit span).
function specItem({ label, value, unit, tooltip }) {
  const item = el("div", "spec");
  item.append(el("dt", "spec__label", label));
  const dd = el("dd", "spec__body");
  const v = el("span", "spec__value");
  v.append(value);
  dd.append(v);
  if (unit) {
    const u = el("span", "spec__unit");
    u.append(unit);
    dd.append(u);
  }
  item.append(dd);

  const lines = (tooltip ?? []).filter(Boolean);
  if (lines.length) {
    const tip = el("span", "spec__tip");
    tip.id = `spec-tip-${++tipSeq}`;
    tip.setAttribute("role", "tooltip");
    lines.forEach((line, i) => {
      const node = el("span", i === 0 ? "spec__tip-lead" : "spec__tip-line");
      node.append(/\{(m|L|kg):/.test(line) ? dualText(line) : line);
      tip.append(node);
    });
    dd.append(tip);
    item.classList.add("has-tip");
    item.tabIndex = 0;
    item.setAttribute("aria-describedby", tip.id);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Escape") item.classList.add("tip-dismissed");
    });
    const restore = () => item.classList.remove("tip-dismissed");
    item.addEventListener("mouseleave", restore);
    item.addEventListener("blur", restore);
  }
  return item;
}

// Open each tip towards the side with room. Runs on layout changes (not just
// on hover) so hidden tips never widen the page either.
function placeTips(container) {
  const vw = document.documentElement.clientWidth;
  const items = [...container.querySelectorAll(".spec.has-tip")];
  // All reads first, then all writes: one layout, not one per item.
  const right = items.map((item) => item.getBoundingClientRect().left + Math.min(280, item.querySelector(".spec__tip").offsetWidth) + 16 > vw);
  items.forEach((item, i) => item.classList.toggle("tip-right", right[i]));
}

function tooltipFor(spec, sources) {
  // Unit tokens ({m:…}) stay in the template; filled per unit system.
  const source = sources[spec.sourceId];
  return [spec.secondary, spec.note, source ? `Source: ${source.shortLabel ?? source.label}` : null];
}

// Visual grouping follows the Figma row: builder | dimensions | accommodation | performance.
const GROUPS = [["length", "beam", "draft"], ["capacity", "sleeps", "crew"], ["speed", "power"]];
// Phones show one line — size, accommodation, performance — and the rest behind "Show details".
const PRIMARY = new Set(["length", "sleeps", "speed"]);
const CHEVRON = '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l5 5 5-5"/></svg>';

/**
 * @param {HTMLElement} container
 * @param {import("../types").ModelHeroData} model
 */
export function renderHeroSpecs(container, model) {
  const sources = model.sources ?? {};
  const b = model.builder;
  const builder = el("dl", "spec-group spec-group--builder");
  builder.append(
    specItem({
      label: "builder",
      value: `${b.name} · ${b.countryCode}`,
      unit: model.series,
      tooltip: [
        `${b.name}, ${b.country}${b.founded ? ` · since ${b.founded}` : ""}`,
        b.note,
        [model.series, model.type].filter(Boolean).join(" · "),
        sources[b.sourceId] ? `Source: ${sources[b.sourceId].shortLabel ?? sources[b.sourceId].label}` : null,
      ],
    }),
  );
  container.append(builder);

  const byId = Object.fromEntries(model.specs.map((s) => [s.id, s]));
  for (const ids of GROUPS) {
    const group = el("dl", "spec-group");
    for (const id of ids) {
      const s = byId[id];
      if (!s) continue;
      const q = s.quantity && typeof s.value === "number" ? s.quantity : null;
      const both = (fn) => dual(fn("metric"), fn("imperial"));
      const item = specItem({
        label: s.label,
        value: q ? both((sys) => formatQuantity(q, toSystem(q, s.value, sys), sys)) : formatValue(s),
        unit: q ? both((sys) => unitLabel(q, sys)) : s.unit,
        tooltip: tooltipFor(s, sources),
      });
      if (PRIMARY.has(id)) item.classList.add("spec--primary");
      group.append(item);
    }
    if (group.childElementCount) container.append(group);
  }

  // Phone-only toggle (hidden by CSS on wider screens, where every spec shows).
  const facts = container.closest(".hero__facts") ?? container;
  const more = el("button", "specs-more");
  more.type = "button";
  more.setAttribute("aria-expanded", "false");
  more.innerHTML = `<span>Show details</span>${CHEVRON}`;
  more.addEventListener("click", () => {
    const open = !facts.classList.contains("is-expanded");
    facts.classList.toggle("is-expanded", open);
    more.setAttribute("aria-expanded", String(open));
    more.firstChild.textContent = open ? "Hide details" : "Show details";
  });
  container.append(more);

  // Only the viewport width matters; page height changes (images, FAQ, listings) are ignored.
  let lastWidth = -1;
  new ResizeObserver(() => {
    const w = document.documentElement.clientWidth;
    if (w === lastWidth) return;
    lastWidth = w;
    placeTips(container);
  }).observe(document.documentElement);
  document.fonts?.ready.then(() => placeTips(container));
}
