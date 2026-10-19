// Location quick filters above the grid:
//   [All locations] [United States · 9] [Greece · 1] [Spain · 1] [+1 location]
// The busiest locations are visible; the rest live in a popover (multi-select
// checkboxes). A location picked from the popover is promoted into the visible
// row while selected, so active filters are always on screen. Counts respect
// all other active filters. Multi-select = yachts in any selected location.

import { createPopover } from "./popover.js";
import { flagEmoji } from "../../lib/listing-format.js";

const VISIBLE = 3;

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
};

/**
 * @param {object} o
 * @param {string[]} o.codes                      all location codes in the data
 * @param {(code: string) => string} o.countryName
 * @param {() => string[]} o.getSelected
 * @param {(codes: string[]) => void} o.onChange
 * @param {(code: string) => number} o.countFor   count with the other filters applied
 */
export function createQuickLocations({ codes, countryName, getSelected, onChange, countFor }) {
  const root = el("div", "qloc");
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", "Location");
  const row = el("div", "qloc__row");
  const moreWrap = el("div", "qloc__more");
  const more = el("button", "qchip qchip--more");
  more.type = "button";
  more.setAttribute("aria-haspopup", "true");
  moreWrap.append(more);
  const panel = el("div", "qloc__panel");
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "More locations");
  root.append(row);

  const pop = createPopover(more, panel, { onOpen: () => panel.querySelector("input:not(:disabled)")?.focus() });

  const toggle = (code) => {
    const sel = getSelected();
    onChange(sel.includes(code) ? sel.filter((c) => c !== code) : [...sel, code]);
  };

  function chip(code, count, selected) {
    const b = el("button", "qchip");
    b.type = "button";
    b.dataset.key = `chip:${code}`;
    b.setAttribute("aria-pressed", String(selected));
    const flag = el("span", "qchip__flag", flagEmoji(code));
    flag.setAttribute("aria-hidden", "true");
    b.append(flag, el("span", "qchip__name", countryName(code)), el("span", "qchip__count", String(count)));
    b.setAttribute("aria-label", `${countryName(code)}, ${count} ${count === 1 ? "yacht" : "yachts"}`);
    b.disabled = count === 0 && !selected;
    b.addEventListener("click", () => toggle(code));
    return b;
  }

  function render() {
    const sel = getSelected();
    const ranked = codes
      .map((code) => ({ code, count: countFor(code) }))
      .sort((a, b) => b.count - a.count || countryName(a.code).localeCompare(countryName(b.code)));
    const top = ranked.slice(0, VISIBLE);
    // Selected locations from the "more" list are promoted into view.
    const promoted = ranked.slice(VISIBLE).filter((r) => sel.includes(r.code));
    const hidden = ranked.slice(VISIBLE).filter((r) => !sel.includes(r.code));

    // Remember what had focus (a chip by its code, "all", or a panel checkbox) to restore it after the rebuild.
    const active = document.activeElement;
    const focusedKey = root.contains(active) ? active.closest?.("[data-key]")?.dataset.key ?? null : null;
    row.replaceChildren();
    const all = el("button", "qchip");
    all.dataset.key = "all";
    all.type = "button";
    all.textContent = "All locations";
    all.setAttribute("aria-pressed", String(sel.length === 0));
    all.addEventListener("click", () => onChange([]));
    row.append(all);
    for (const r of [...top, ...promoted]) row.append(chip(r.code, r.count, sel.includes(r.code)));

    if (hidden.length) {
      more.textContent = `+${hidden.length} ${hidden.length === 1 ? "location" : "locations"}`;
      row.append(moreWrap);
      panel.replaceChildren(
        ...hidden.map((r) => {
          const lab = el("label", "qloc__opt");
          lab.dataset.key = `opt:${r.code}`;
          const input = el("input");
          input.type = "checkbox";
          input.checked = sel.includes(r.code);
          input.disabled = r.count === 0;
          input.addEventListener("change", () => toggle(r.code));
          const flag = el("span", "qloc__flag", flagEmoji(r.code));
          flag.setAttribute("aria-hidden", "true");
          lab.append(input, el("span", "check__box"), flag, el("span", "qloc__name", countryName(r.code)), el("span", "qloc__count", String(r.count)));
          return lab;
        }),
      );
    } else {
      pop.close({ focus: false });
    }
    // Keep keyboard focus on the same control across re-renders; a chip promoted
    // out of the panel (or vice versa) is found by its code; else the "+N" trigger.
    if (focusedKey) {
      const code = focusedKey.split(":")[1];
      const target =
        root.querySelector(`[data-key="${focusedKey}"]`) ??
        (code && (root.querySelector(`[data-key="chip:${code}"]`) ?? root.querySelector(`[data-key="opt:${code}"]`))) ??
        (more.isConnected ? more : all);
      (target.matches("label") ? target.querySelector("input") : target)?.focus();
    }
  }

  render();
  return { el: root, render };
}
