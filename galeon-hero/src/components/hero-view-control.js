// Reusable segmented view switcher implemented as a full WAI-ARIA tabs pattern:
// roving tabindex, Arrow/Home/End navigation, automatic activation,
// aria-selected + aria-controls ↔ aria-labelledby.

// Matches the longest .is-leaving transition in CSS.
const LEAVE_MS = 600;

/**
 * @param {HTMLElement} root  container; receives the tablist
 * @param {object} opts
 * @param {Array<{id: string, label: string, panel: HTMLElement}>} opts.views
 * @param {string} opts.initial
 * @param {string} opts.label  accessible name of the tablist
 * @param {(id: string) => void} opts.onChange
 * @param {"horizontal" | "vertical"} [opts.orientation]
 * @param {string} [opts.idPrefix]  keeps tab ids unique when several controls exist
 */
export function createHeroViewControl(root, { views, initial, label, onChange, orientation = "horizontal", idPrefix = "view" }) {
  const vertical = orientation === "vertical";
  const list = document.createElement("div");
  list.className = vertical ? "view-control view-control--vertical" : "view-control";
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", label);
  if (vertical) list.setAttribute("aria-orientation", "vertical");

  const indicator = document.createElement("span");
  indicator.className = "view-control__indicator";
  indicator.setAttribute("aria-hidden", "true");
  list.append(indicator);

  const tabs = views.map((view) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "view-control__tab";
    tab.id = `${idPrefix}-tab-${view.id}`;
    tab.textContent = view.label;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", view.panel.id);
    view.panel.setAttribute("role", "tabpanel");
    view.panel.setAttribute("aria-labelledby", tab.id);
    view.panel.tabIndex = 0;
    tab.addEventListener("click", () => select(view.id, false));
    list.append(tab);
    return tab;
  });

  list.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    select(views[next].id, true);
  });

  root.append(list);

  let current = null;

  function moveIndicator() {
    const tab = tabs[views.findIndex((v) => v.id === current)];
    if (!tab) return;
    // Size + position on both axes: the same control can be laid out as a row or a column (CSS decides).
    indicator.style.width = `${tab.offsetWidth}px`;
    indicator.style.height = `${tab.offsetHeight}px`;
    indicator.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
  }

  function select(id, focus) {
    const idx = views.findIndex((v) => v.id === id);
    if (idx < 0) return;
    if (focus) tabs[idx].focus();
    if (id === current) return;
    const prev = views.find((v) => v.id === current)?.panel;
    current = id;
    views.forEach((view, i) => {
      const on = i === idx;
      tabs[i].setAttribute("aria-selected", String(on));
      tabs[i].tabIndex = on ? 0 : -1;
      view.panel.classList.toggle("is-active", on);
      if (on) view.panel.classList.remove("is-leaving");
      // inert keeps hidden panels out of tab order and the a11y tree while they fade.
      view.panel.inert = !on;
    });
    // The outgoing panel keeps moving out (CSS .is-leaving) before it resets to
    // its waiting position; rapid re-selection simply cancels the exit.
    if (prev && prev !== views[idx].panel) {
      prev.classList.add("is-leaving");
      clearTimeout(prev._leaveTimer);
      prev._leaveTimer = setTimeout(() => {
        if (!prev.classList.contains("is-active")) prev.classList.remove("is-leaving");
      }, LEAVE_MS);
    }
    moveIndicator();
    onChange?.(id);
  }

  // Fonts change tab widths after first paint.
  new ResizeObserver(moveIndicator).observe(list);
  document.fonts?.ready.then(moveIndicator);

  select(initial, false);
  list.classList.add("is-ready");

  return { select: (id) => select(id, false), get value() { return current; } };
}
