// Sort control: borderless pill that hugs its label, an icon per option, and a
// listbox popover (WAI-ARIA listbox: arrows, Home/End, Enter/Space, Escape).

import { createPopover } from "./popover.js";

const icon = (d) =>
  `<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const SORT_ICONS = {
  recommended: icon('<path d="M10 3.2l1.9 4 4.3.5-3.2 2.9.9 4.3L10 12.8l-3.9 2.1.9-4.3-3.2-2.9 4.3-.5z"/>'),
  "price-asc": icon('<path d="M6 15V5M3.5 7.5 6 5l2.5 2.5"/><path d="M12 6h5M12 10h3.5M12 14h2"/>'),
  "price-desc": icon('<path d="M6 5v10M3.5 12.5 6 15l2.5-2.5"/><path d="M12 6h2M12 10h3.5M12 14h5"/>'),
  "year-desc": icon('<rect x="3.5" y="4.5" width="13" height="12" rx="2"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/>'),
  "hours-asc": icon('<circle cx="10" cy="10.5" r="6.5"/><path d="M10 10.5 13 8M10 4v1.2"/>'),
};

const CHECK = icon('<path d="m5 10.5 3.2 3L15 6.5"/>');

/**
 * @param {Array<{ id: string, label: string }>} sorts
 * @param {{ value: string, onChange: (id: string) => void }} o
 */
export function createSortMenu(sorts, { value, onChange }) {
  const wrap = document.createElement("div");
  wrap.className = "sort-menu";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "sort-menu__trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  const list = document.createElement("ul");
  list.className = "sort-menu__list";
  list.setAttribute("role", "listbox");
  list.tabIndex = -1;
  list.id = "sort-listbox";
  list.setAttribute("aria-label", "Sort by");
  trigger.setAttribute("aria-controls", list.id);
  wrap.append(trigger);

  let current = value;
  let active = 0;
  const items = sorts.map((s, i) => {
    const li = document.createElement("li");
    li.id = `sort-opt-${s.id}`;
    li.className = "sort-menu__opt";
    li.setAttribute("role", "option");
    li.innerHTML = `${SORT_ICONS[s.id] ?? ""}<span>${s.label}</span><span class="sort-menu__check">${CHECK}</span>`;
    li.addEventListener("click", () => choose(i));
    li.addEventListener("pointermove", () => setActive(i));
    list.append(li);
    return li;
  });

  const pop = createPopover(trigger, list, {
    align: "end",
    onOpen: () => {
      setActive(Math.max(0, sorts.findIndex((s) => s.id === current)));
      list.focus();
    },
  });

  function setActive(i) {
    active = (i + items.length) % items.length;
    items.forEach((li, k) => li.classList.toggle("is-active", k === active));
    list.setAttribute("aria-activedescendant", items[active].id);
  }

  function render() {
    const s = sorts.find((x) => x.id === current) ?? sorts[0];
    trigger.innerHTML = `${SORT_ICONS[s.id] ?? ""}<span class="sort-menu__label">${s.label}</span><span class="sort-menu__chev" aria-hidden="true"></span>`;
    trigger.setAttribute("aria-label", `Sort by: ${s.label}`);
    items.forEach((li, k) => li.setAttribute("aria-selected", String(sorts[k].id === current)));
  }

  function choose(i) {
    const id = sorts[i].id;
    pop.close();
    if (id === current) return;
    current = id;
    render();
    onChange(id);
  }

  list.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowDown") setActive(active + 1);
    else if (k === "ArrowUp") setActive(active - 1);
    else if (k === "Home") setActive(0);
    else if (k === "End") setActive(items.length - 1);
    else if (k === "Enter" || k === " ") choose(active);
    else if (k === "Tab") pop.close({ focus: false });
    else return;
    e.preventDefault();
  });
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      pop.open();
    }
  });

  render();
  return { el: wrap, set: (id) => ((current = id), render()) };
}
