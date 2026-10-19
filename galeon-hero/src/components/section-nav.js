// Section navigation: anchor links (not tabs) styled like the hero view
// control, with a sliding active pill.
//
// Behaviour
// - Scrollspy: the link of the section under the nav is aria-current="true".
// - Sticky: the whole bar (units · anchors · save/share, [data-section-bar])
//   docks under the header at once, as one row of frosted pills.
// - Header hand-off: while docked, the header moves 1:1 with the scroll (so fast
//   scrolling hides/reveals it fast, slow scrolling slowly) and the nav glides
//   into its place; when scrolling stops half-way it snaps to the nearest end.
// - Click: smooth scroll (instant for reduced motion) with the correct offset
//   for whichever bar will be visible on arrival; focus moves to the section.

const SPY_LINE = 0.3; // section becomes current once its top passes 30% of the viewport

/**
 * @param {object} o
 * @param {HTMLElement} o.nav          nav.section-nav
 * @param {HTMLElement} o.header       fixed site header
 * @param {MediaQueryList} o.reducedMotion
 */
export function createSectionNav({ nav, header, reducedMotion }) {
  // The sticky element: the bar around the nav (falls back to the nav itself).
  const bar = nav.closest("[data-section-bar]") ?? nav;
  const track = nav.querySelector(".section-nav__track");
  const links = [...nav.querySelectorAll("a[href^='#']")];
  const sections = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const indicator = document.createElement("span");
  indicator.className = "section-nav__indicator";
  indicator.setAttribute("aria-hidden", "true");
  track.prepend(indicator);

  const sentinel = document.createElement("div");
  sentinel.className = "section-nav__sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  bar.before(sentinel);

  let current = null;
  let stuck = false;
  let lastY = window.scrollY;
  let lockUntil = 0; // while a click-scroll runs, the spy doesn't fight it
  let raf = 0;

  const root = document.documentElement;
  // CSS lengths read on every scroll frame: cached, refreshed on resize (media queries may change them).
  let cssCache = null;
  const readCss = () => {
    const rs = getComputedStyle(root);
    return {
      "--header-top": parseFloat(rs.getPropertyValue("--header-top")) || 0,
      "--header-h": parseFloat(rs.getPropertyValue("--header-h")) || 0,
      barMargin: parseFloat(getComputedStyle(bar).marginTop) || 0,
    };
  };
  const css = () => (cssCache ??= readCss());
  window.addEventListener("resize", () => (cssCache = null));
  const px = (name) => css()[name];
  // --header-offset is a calc() in CSS, so derive it from its parts.
  const headerOffset = () => px("--header-top") + px("--header-h");

  function setCurrent(id, { scrollTrack = true } = {}) {
    if (id === current) return;
    current = id;
    links.forEach((a) => {
      if (a.hash.slice(1) === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    moveIndicator();
    // Keep the active link visible when the track scrolls (mobile).
    const a = links.find((l) => l.hash.slice(1) === id);
    if (a && scrollTrack && track.scrollWidth > track.clientWidth) {
      const left = a.offsetLeft - (track.clientWidth - a.offsetWidth) / 2;
      track.scrollTo({ left, behavior: reducedMotion.matches ? "auto" : "smooth" });
    }
  }

  function moveIndicator() {
    const a = links.find((l) => l.hash.slice(1) === current);
    indicator.style.opacity = a ? "1" : "0";
    if (!a) return;
    indicator.style.width = `${a.offsetWidth}px`;
    indicator.style.transform = `translateX(${a.offsetLeft}px)`;
  }

  function spy() {
    if (performance.now() < lockUntil) return;
    const line = window.innerHeight * SPY_LINE;
    let id = sections[0]?.id ?? null; // "For sale" is current by default
    const shown = sections.filter((s) => !s.hidden); // sections without data are hidden
    for (const s of shown) if (s.getBoundingClientRect().top <= line) id = s.id;
    // At the very bottom the last section wins even if it's short.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) id = shown.at(-1)?.id ?? id;
    setCurrent(id);
  }

  // ---- header hand-off, driven by scroll distance (so it follows scroll speed) ----
  // `hide` = how far the header is pushed up (0 … fully out). The docked nav
  // moves up proportionally, ending at the header's top position.
  let hide = 0;
  let lastDir = 0;
  let idleTimer = 0;
  let snapTimer = 0;
  const hideMax = () => headerOffset() + 6;
  const navTravel = () => px("--header-h") + 8;

  function applyHide() {
    const H = hideMax();
    header.style.transform = hide ? `translate3d(0, ${(-hide).toFixed(1)}px, 0)` : "";
    const lift = hide ? `translate3d(0, ${(-(hide / H) * navTravel()).toFixed(1)}px, 0)` : "";
    bar.style.transform = stuck ? lift : "";
    header.toggleAttribute("inert", hide >= H); // fully hidden header isn't focusable
  }

  function snapTo(value) {
    if (value === hide) return;
    header.classList.add("is-snapping");
    bar.classList.add("is-snapping");
    hide = value;
    applyHide();
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      header.classList.remove("is-snapping");
      bar.classList.remove("is-snapping");
    }, 240);
  }

  function onScroll() {
    raf = 0;
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    const overshoot = updateStuck();
    spy();
    if (!stuck || y <= 0) return snapTo(0);
    if (!dy) return;
    // In the docking frame only the part past the docking point moves the header.
    const step = overshoot ?? dy;
    lastDir = Math.sign(dy);
    header.classList.remove("is-snapping");
    bar.classList.remove("is-snapping");
    hide = Math.min(hideMax(), Math.max(0, hide + step)); // 1:1 with the scroll
    applyHide();
    // When scrolling stops half-way, finish in the direction it was going.
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (hide > 0 && hide < hideMax()) snapTo(lastDir > 0 ? hideMax() : 0);
    }, 140);
  }

  const request = () => {
    if (!raf) raf = requestAnimationFrame(onScroll);
  };

  // Docked = the sentinel above the nav has passed under the header. Measured
  // on every scroll frame (an IntersectionObserver misses instant jumps that
  // skip over the zero-height sentinel: anchors, deep links, reduced motion).
  function updateStuck() {
    // The bar's natural (unstuck) top = sentinel + the bar's own top margin.
    // Docked once that reaches the sticky offset — not earlier, or the header
    // hand-off would lift a bar that's still in the flow (a visible jump).
    const natural = sentinel.getBoundingClientRect().top + css().barMargin;
    const dockAt = headerOffset() + 8;
    const next = natural <= dockAt + 0.5;
    if (next === stuck) return null;
    stuck = next;
    bar.classList.toggle("is-stuck", stuck);
    if (!stuck) snapTo(0);
    // Just docked: how far this frame's scroll went past the docking point.
    return stuck ? Math.max(0, dockAt - natural) : null;
  }

  /** Scroll so the section starts just below whichever bar will be visible on arrival. */
  function scrollToSection(id, { push = true } = {}) {
    const target = document.getElementById(id);
    if (!target) return;
    const goingDown = target.getBoundingClientRect().top > 0;
    const navH = bar.offsetHeight;
    // Going down hides the header (nav at the top); going up shows it (nav below it).
    const barBottom = goingDown ? px("--header-top") + navH : headerOffset() + 8 + navH;
    const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - barBottom - 20);
    const smooth = !reducedMotion.matches;
    lockUntil = performance.now() + (smooth ? 900 : 50);
    setCurrent(id);
    window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
    if (push) history.replaceState(history.state, "", `#${id}`);
    // Runs once: on scrollend, or by the fallback timer when there's no scroll
    // (already there) — a leftover listener would steal focus on a later scroll.
    let timer = 0;
    const settle = () => {
      window.removeEventListener("scrollend", settle);
      clearTimeout(timer);
      lockUntil = 0;
      target.focus({ preventScroll: true });
      spy();
    };
    const distance = Math.abs(top - window.scrollY);
    if (distance < 1 || !smooth) timer = setTimeout(settle, 0);
    else {
      if ("onscrollend" in window) window.addEventListener("scrollend", settle);
      timer = setTimeout(settle, "onscrollend" in window ? 1200 : 900);
    }
  }

  // Any in-page link to a known section uses the same scroll (nav, hero price, etc.).
  const ids = new Set(sections.map((s) => s.id));
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.("a[href^='#']");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = a.hash.slice(1);
    if (!ids.has(id)) return;
    e.preventDefault();
    scrollToSection(id);
  });

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", () => {
    moveIndicator();
    request();
  });
  new ResizeObserver(moveIndicator).observe(track);
  document.fonts?.ready.then(moveIndicator);

  // Deep link (#reviews) on load.
  if (location.hash && ids.has(location.hash.slice(1))) {
    requestAnimationFrame(() => scrollToSection(location.hash.slice(1), { push: false }));
  }
  updateStuck();
  spy();
  nav.classList.add("is-ready");

  return { scrollToSection };
}
