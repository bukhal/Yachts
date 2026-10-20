// Content sections under the listings: Generations, Specifications, Reviews,
// Models, Dealers, FAQ (+ Waylo). Plain DOM renderers. Every section opens with
// the same heading as "Current Yachts for Sale": a descriptive title and one
// muted summary line. Measurements render in both unit systems (.u-dual).

import { dualQuantity, dualText } from "../lib/units.js";
import { compactMoney, priceParts } from "../lib/listing-format.js";
import { createTourDialog } from "./tour-dialog.js";
import { createWaylo } from "./waylo.js";
import { urlHost } from "../lib/safe-url.js";

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
};
const svg = (d) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  ruler: svg('<path d="M3 15.5 15.5 3 21 8.5 8.5 21z"/><path d="m7 11.5 1.8 1.8M10 8.5l1.8 1.8M13 5.5l1.8 1.8"/>'),
  drop: svg('<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>'),
  gauge: svg('<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4-4"/>'),
  bed: svg('<path d="M3 18V7M3 13h18v5M21 18v-3.5a3 3 0 0 0-3-3h-7v3.5"/><circle cx="7" cy="10.5" r="1.8"/>'),
  compass: svg('<circle cx="12" cy="12" r="8.5"/><path d="m14.8 9.2-1.6 4-4 1.6 1.6-4z"/>'),
  play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  ext: svg('<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>'),
};

/** Section heading, same pattern and type as the listings title. `sub` may be text or a node. */
function head(section, { title, sub, tools }) {
  const h = el("div", "msec__head");
  const box = el("div", "msec__title-box");
  const h2 = section.querySelector("h2") ?? el("h2");
  h2.className = "msec__title";
  h2.textContent = title;
  box.append(h2);
  if (sub) {
    const p = el("p", "msec__sub");
    p.append(sub);
    box.append(p);
  }
  h.append(box);
  if (tools) h.append(tools);
  return h;
}

/**
 * Unit-aware content: values and {m:…} templates render in both systems at
 * once (switched by <html data-units>, no reflow). `bind` for numbers with a
 * unit, `bindText` for running text.
 */
const units = {
  bind(node, q, v) {
    node.replaceChildren(dualQuantity(q, v));
    return node;
  },
  bindText(node, tpl) {
    node.replaceChildren(/\{(m|L|kg):/.test(tpl) ? dualText(tpl, { block: true }) : tpl);
    return node;
  },
};

// ---------- Generations ----------
// One card per edition plus the successor, all identical in structure:
// line-art visual · badge · title · years · key changes · footer action.
function renderGenerations(section, { content, modelName, countFor, onShow }) {
  const grid = el("div", "gen-grid");
  const card = (g, { successor = false } = {}) => {
    const c = el("article", `gen-card${successor ? " gen-card--successor" : ""}`);
    // Figma 55:2811: a dark radial glow and a white one at the hull bottom, both under the yacht.
    const media = el("div", "gen-card__media");
    const img = el("img", "gen-card__yacht");
    img.src = g.image;
    img.alt = `${successor ? g.title : `${modelName}, ${g.title.toLowerCase()}`}, side view`;
    img.loading = "lazy";
    img.decoding = "async";
    media.append(el("span", "gen-card__glow"), img, el("span", "gen-card__badge", g.label));
    const body = el("div", "gen-card__body");
    body.append(el("h3", "gen-card__title", g.title), el("p", "gen-card__years", `${g.years[0]} – ${g.years[1] ?? "present"}`));
    const ul = el("ul", "gen-card__points");
    g.points.forEach((p) => ul.append(units.bindText(el("li"), p)));
    body.append(ul);
    const foot = el("div", "gen-card__foot");
    if (successor) {
      const a = el("a", "gen-card__cta", "Compare with similar models");
      a.href = "#models";
      foot.append(a);
    } else {
      const n = countFor(g.id);
      if (n) {
        const b = el("button", "gen-card__cta", `${n} for sale · Show only these`);
        b.type = "button";
        b.addEventListener("click", () => onShow(g.id));
        foot.append(b);
      } else foot.append(el("span", "gen-card__none", "None for sale right now"));
    }
    body.append(foot);
    c.append(media, body);
    // Whole card acts as its CTA (unless the text is being selected).
    const cta = foot.querySelector(".gen-card__cta");
    if (cta) {
      c.classList.add("is-link");
      c.addEventListener("click", (e) => {
        if (e.target.closest(".gen-card__cta") || getSelection()?.toString()) return;
        cta.click();
      });
    }
    return c;
  };
  content.generations.forEach((g) => grid.append(card(g)));
  if (content.successor) grid.append(card(content.successor, { successor: true }));

  const first = content.generations[0].years[0];
  const redesign = content.generations[1]?.years[0];
  section.replaceChildren(
    head(section, {
      title: `${modelName} editions since ${first}`,
      sub: `${redesign ? `The original build, the ${redesign} redesign` : "The original build"}${content.successor ? " and the model that followed" : ""} · listings are matched by model year`,
    }),
    grid,
  );
}

// ---------- Specifications ----------
function renderSpecs(section, { content, model }) {
  // Dimension drawings — Figma 55:2819. Side view (with the underwater hull)
  // and top view share one scale: each frame is laid out in Figma units and
  // its width in the grid is proportional to its unit width, so a metre is
  // the same length in both at any viewport. Positions are % of the frame.
  const { loa: LOA, draft: DRAFT, beam: BEAM, beachMode: BEACH } = content.drawings?.dimensions ?? {};
  const A = { w: 676, h: 202 }; // side frame
  const B = { w: 604, h: 202 }; // top frame, continues A to the right
  const place = (node, f, { x, y, w, h }) => {
    node.style.left = `${(x / f.w) * 100}%`;
    node.style.top = `${(y / f.h) * 100}%`;
    if (w !== undefined) node.style.width = `${(w / f.w) * 100}%`;
    if (h !== undefined) node.style.height = `${(h / f.h) * 100}%`;
    return node;
  };
  const img = (src, cls, alt) => {
    const i = el("img", cls);
    i.src = src;
    i.alt = alt;
    i.loading = "lazy";
    i.decoding = "async";
    return i;
  };
  const label = (cls, value, cap) => {
    const l = el("span", `sdim ${cls}`);
    l.append(units.bind(el("span", "sdim__value"), "length", value));
    if (cap) l.append(el("span", "sdim__cap", cap));
    return l;
  };

  const visual = el("div", "spec-visual");
  visual.style.setProperty("--cols", `minmax(0, ${A.w}fr) minmax(0, ${B.w}fr)`);
  visual.style.setProperty("--top-share", `${(B.w / A.w) * 100}%`);

  // Side: render 459 × 160 at x 116; waterline under it; underwater hull below.
  const SIDE = { x: 116, w: 459, h: 160 };
  const vb = model.side.visibleBounds ?? { x: 0, width: 1 };
  const hx0 = SIDE.x + vb.x * SIDE.w;
  const hx1 = SIDE.x + (vb.x + vb.width) * SIDE.w;
  const perM = (hx1 - hx0) / LOA; // frame units per metre, shared by both views
  const side = el("figure", "spec-visual__side");
  const sideFrame = el("div", "sframe");
  sideFrame.style.aspectRatio = `${A.w} / ${A.h}`;
  sideFrame.append(place(img(model.side.src, "sframe__img", `${model.name} side profile with length and draft`), A, { x: SIDE.x, y: 0, w: SIDE.w, h: SIDE.h }));
  const uw = content.drawings?.underwater;
  if (uw) {
    const w = uw.width * SIDE.w;
    sideFrame.append(place(img(uw.src, "sframe__img", ""), A, { x: SIDE.x + uw.left * SIDE.w, y: SIDE.h, w, h: w / uw.aspect }));
  }
  sideFrame.append(place(el("span", "sline sline--h"), A, { x: 16, y: SIDE.h, w: A.w - 16 })); // waterline
  const draftX = hx0 + (hx1 - hx0) * 0.58;
  if (DRAFT) {
    sideFrame.append(
      place(el("span", "sline sline--v"), A, { x: draftX, y: SIDE.h, h: DRAFT * perM }),
      place(label("sdim--draft", DRAFT, "draft"), A, { x: draftX, y: SIDE.h + (DRAFT * perM) / 2 }),
    );
  }
  const loa = el("div", "sloa");
  loa.style.marginLeft = `${(hx0 / A.w) * 100}%`;
  loa.style.marginRight = `${((A.w - hx1) / A.w) * 100}%`;
  loa.append(el("span", "sline sline--h sloa__line"), label("sdim--loa", LOA, "LOA"));
  side.append(sideFrame, loa);

  // Top: the main deck with both Beach Mode sides lowered (full plan width =
  // Beach Mode width), scaled so its hull length matches the side view.
  const main = model.cutaway?.decks.find((d) => d.id === "main") ?? model.cutaway?.decks[0];
  const top = el("figure", "spec-visual__top");
  const topFrame = el("div", "sframe");
  topFrame.style.aspectRatio = `${B.w} / ${B.h}`;
  if (main && BEAM && BEACH) {
    const pb = main.visibleBounds ?? { x: 0, y: 0, width: 1, height: 1 };
    const tw = (hx1 - hx0) / pb.width;
    const th = tw / (model.cutaway.intrinsicWidth / model.cutaway.intrinsicHeight);
    const tx = 50 - pb.x * tw; // visible stern at x 50, as in the design
    const ty = (B.h - th) / 2;
    topFrame.append(place(img(main.src, "sframe__img", `${model.name} main deck from above, with beam and Beach Mode width`), B, { x: tx, y: ty, w: tw, h: th }));
    const y0 = ty + pb.y * th;
    const span = pb.height * th;
    const beamSpan = (BEAM / BEACH) * span;
    topFrame.append(
      place(el("span", "sline sline--v sline--soft"), B, { x: 512, y: y0, h: span }),
      place(el("span", "sline sline--v"), B, { x: 533, y: y0 + (span - beamSpan) / 2, h: beamSpan }),
    );
    const labels = place(el("div", "sdim-stack"), B, { x: 533, y: y0 + span / 2 });
    labels.append(label("sdim--beam", BEAM, "beam"), label("sdim--beach", BEACH, "Beach Mode"));
    topFrame.append(labels);
  }
  top.append(topFrame);
  visual.append(side, top);

  // Spec groups as tabs in one card: no ragged grid when the group count
  // changes, and one group at a time. All panels share one grid cell, so the
  // card is as tall as the longest group and never jumps when switching.
  const tabs = el("div", "spec-tabs");
  const bar = el("div", "spec-tabs__bar");
  bar.setAttribute("role", "tablist");
  bar.setAttribute("aria-label", "Specification groups");
  const panels = el("div", "spec-tabs__panels");
  const tabBtns = content.specGroups.map((g, i) => {
    const t = el("button", "spec-tab");
    t.type = "button";
    t.id = `spec-tab-${g.id}`;
    t.setAttribute("role", "tab");
    t.setAttribute("aria-controls", `spec-${g.id}`);
    t.innerHTML = `${ICONS[g.icon] ?? ""}<span></span>`;
    t.lastChild.textContent = g.title;
    t.addEventListener("click", () => select(i));
    bar.append(t);

    const panel = el("div", "spec-panel");
    panel.id = `spec-${g.id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", t.id);
    const dl = el("dl", "spec-panel__rows");
    for (const r of g.rows) {
      const row = el("div", "spec-row");
      row.append(el("dt", "spec-row__label", r.label));
      const dd = el("dd", "spec-row__value");
      if (r.quantity) units.bind(dd, r.quantity, r.value);
      else dd.textContent = r.value;
      if (r.note) dd.append(el("span", "spec-row__note", r.note));
      row.append(dd);
      dl.append(row);
    }
    panel.append(dl);
    panels.append(panel);
    return t;
  });
  function select(i, { focus = false } = {}) {
    tabBtns.forEach((t, j) => {
      const on = i === j;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = panels.children[j];
      panel.classList.toggle("is-active", on);
      panel.inert = !on;
      panel.tabIndex = on ? 0 : -1;
    });
    if (focus) {
      tabBtns[i].focus();
      tabBtns[i].scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }
  bar.addEventListener("keydown", (e) => {
    const cur = tabBtns.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const n = tabBtns.length;
    const next = { ArrowRight: cur + 1, ArrowLeft: cur - 1, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select((next + n) % n, { focus: true });
  });
  select(0);
  tabs.append(bar, panels);

  section.replaceChildren(
    head(section, {
      title: `${model.name} dimensions & specifications`,
      sub: "Builder data for the current edition unless noted · draft and speed depend on the engines",
    }),
    ...(LOA ? [visual] : []), // drawings need at least the length to set the scale
    ...(content.specGroups.length ? [tabs] : []),
  );
}

// ---------- Reviews ----------
// Videos adapt to how many there are: 1 → one wide feature, 2 → two features
// side by side, 3+ → feature + list (list scrolls past four). Quotes sit on the
// page itself, divided by hairlines — no cards.
function renderReviews(section, { content, modelName, track }) {
  const videos = content.videos ?? [];
  const quotes = content.quotes ?? [];
  const player = createTourDialog({ title: `${modelName} · video review` });
  const open = (v, from) => {
    player.open(`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`, from, {
      title: `${v.title} · ${v.channel}`,
      newTabUrl: `https://www.youtube.com/watch?v=${v.id}`,
      newTabLabel: "Watch on YouTube",
    });
    track?.("review_video_open", { video: v.id });
  };
  const videoCard = (v, featured) => {
    const b = el("button", `vcard${featured ? " vcard--featured" : ""}`);
    b.type = "button";
    b.setAttribute("aria-label", `Play: ${v.title}, ${v.channel}, ${v.duration}`);
    const media = el("span", "vcard__media");
    const img = el("img");
    img.src = v.thumb;
    img.alt = "";
    img.loading = "lazy";
    const play = el("span", "vcard__play");
    play.innerHTML = ICONS.play;
    media.append(img, play, el("span", "vcard__dur", v.duration));
    const meta = el("span", "vcard__meta");
    meta.append(el("span", "vcard__by", `${v.channel} · ${v.year}`), el("span", "vcard__title", v.title));
    if (featured) meta.append(el("span", "vcard__sum", v.summary));
    b.append(media, meta);
    b.addEventListener("click", () => open(v, b));
    return b;
  };

  const wrap = el("div", "reviews__videos");
  wrap.dataset.count = String(Math.min(videos.length, 3));
  if (videos.length <= 2) videos.forEach((v) => wrap.append(videoCard(v, true)));
  else {
    const list = el("div", "reviews__list");
    videos.slice(1).forEach((v) => list.append(videoCard(v, false)));
    list.classList.toggle("is-scroll", videos.length - 1 > 4);
    wrap.append(videoCard(videos[0], true), list);
  }

  const qs = el("div", "reviews__quotes");
  for (const q of quotes) {
    const f = el("figure", "quote");
    const bq = el("blockquote", "quote__text", q.text);
    bq.cite = q.url;
    const cap = el("figcaption", "quote__by");
    const a = el("a", "", q.publication);
    a.href = q.url;
    a.target = "_blank";
    a.rel = "noopener";
    cap.append(el("span", "quote__author", q.author), a);
    f.append(bq, cap);
    qs.append(f);
  }
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  section.replaceChildren(
    head(section, {
      title: "Sea trials & expert reviews",
      sub: [count(videos.length, "video review", "video reviews"), quotes.length ? count(quotes.length, "quote from the testers", "quotes from the testers") : null].filter(Boolean).join(" · "),
    }),
    ...(videos.length ? [wrap] : []),
    ...(quotes.length ? [qs] : []),
  );
}

// ---------- Models ----------
// Carousel: native horizontal scroll with snap (touch/trackpad), arrow buttons
// for mouse/keyboard, and a closing "all models" card.
function renderModels(section, { content, modelName, brand }) {
  const track = el("div", "models-track");
  track.setAttribute("role", "list");
  for (const m of content.models) {
    const a = el("a", "mcard");
    const href = m.url ?? content.modelsUrl;
    if (href) a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("role", "listitem");
    const media = el("span", "mcard__media");
    const img = el("img", "mcard__img");
    img.src = m.image;
    img.alt = "";
    img.loading = "lazy";
    media.append(img);
    const body = el("span", "mcard__body");
    const sale = el("span", "mcard__sale", m.forSale ? `${m.forSale} for sale${m.fromUsd ? ` · from ${compactMoney(m.fromUsd)}` : ""}` : "None for sale");
    body.append(el("span", "mcard__name", m.name), units.bind(el("span", "mcard__len"), "length", m.lengthM), el("span", "mcard__text", m.text), sale);
    a.append(media, body);
    a.setAttribute("aria-label", `${m.name}: ${m.text} ${sale.textContent}. Opens yachtway.com`);
    track.append(a);
  }
  if (content.modelsUrl) {
    const all = el("a", "mcard mcard--all");
    all.href = content.modelsUrl;
    all.target = "_blank";
    all.rel = "noopener";
    all.setAttribute("role", "listitem");
    all.innerHTML = `<span class="mcard__all-title"></span><span class="mcard__all-text">Every model and yacht for sale on YachtWay</span><span class="mcard__all-arrow">${ICONS.arrow}</span>`;
    all.firstChild.textContent = `All ${brand} models`;
    track.append(all);
  }

  const nav = el("div", "carousel-nav");
  const prev = el("button", "carousel-btn carousel-btn--prev");
  const next = el("button", "carousel-btn");
  prev.type = next.type = "button";
  prev.setAttribute("aria-label", "Previous models");
  next.setAttribute("aria-label", "More models");
  prev.innerHTML = next.innerHTML = ICONS.arrow;
  nav.append(prev, next);
  const page = (dir) => {
    const card = track.querySelector(".mcard");
    const stepW = card ? card.getBoundingClientRect().width + 16 : track.clientWidth;
    const per = Math.max(1, Math.floor((track.clientWidth + 16) / stepW));
    track.scrollBy({ left: dir * per * stepW, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  prev.addEventListener("click", () => page(-1));
  next.addEventListener("click", () => page(1));
  const sync = () => {
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    nav.hidden = prev.disabled && next.disabled;
    track.classList.toggle("has-prev", !prev.disabled); // edge fog (desktop CSS)
    track.classList.toggle("has-next", !next.disabled);
  };
  track.addEventListener("scroll", sync, { passive: true });
  new ResizeObserver(sync).observe(track);

  const min = Math.min(...content.models.map((m) => m.lengthM));
  const max = Math.max(...content.models.map((m) => m.lengthM));
  const sub = el("span");
  sub.append(`${content.models.length} ${content.modelsKind ? `${content.modelsKind} ` : ""}models from `, dualQuantity("length", min), " to ", dualQuantity("length", max), ", with what’s for sale now");
  const short = modelName.startsWith(`${brand} `) ? modelName.slice(brand.length + 1) : modelName;
  section.replaceChildren(head(section, { title: `Similar ${brand} yachts to the ${short}`, sub, tools: nav }), track);
  sync();
}

// ---------- Dealers ----------
const YACHTWAY_CONTACT = "https://yachtway.com/contact-us/"; // site-wide, from yachtway.com's footer
// Card fades from white (logo area) to the card grey from its middle down, so
// logos on white backgrounds need no frame of their own.
function renderDealers(section, { content, brand }) {
  const grid = el("div", "dealers-grid");
  for (const d of content.dealers) {
    const card = el("article", "dcard");
    const logo = el("img", "dcard__logo");
    logo.src = d.logo;
    logo.alt = `${d.name} logo`;
    logo.loading = "lazy";
    const links = el("div", "dcard__links");
    const host = d.web && urlHost(d.web);
    if (host) {
      const web = el("a", "", host);
      web.href = d.web;
      web.target = "_blank";
      web.rel = "noopener";
      web.insertAdjacentHTML("beforeend", ICONS.ext);
      links.append(web);
    }
    if (d.profile) {
      const prof = el("a", "", "YachtWay profile");
      prof.href = d.profile;
      prof.target = "_blank";
      prof.rel = "noopener";
      links.append(prof);
    }
    card.append(logo, el("p", "dcard__area", d.area), el("h3", "dcard__name", d.name), el("p", "dcard__loc", d.location), links);
    grid.append(card);
  }
  // Closing card: invites dealers who aren't listed (fills the last grid slot).
  const cta = el("article", "dcard dcard--cta");
  const icon = el("span", "dcard__cta-icon");
  icon.innerHTML = svg('<path d="M12 5v14M5 12h14"/>');
  const go = el("a", "dcard__cta-btn", "Contact YachtWay");
  go.href = YACHTWAY_CONTACT;
  go.target = "_blank";
  go.rel = "noopener";
  go.insertAdjacentHTML("beforeend", ICONS.arrow);
  cta.append(
    icon,
    el("h3", "dcard__name", "Don’t see your company here?"),
    el("p", "dcard__cta-text", `Dealers and brokers can list their ${brand ? `${brand} ` : ""}yachts on YachtWay. Get in touch and we’ll set up your profile.`),
    go,
  );
  grid.append(cta);

  const regions = new Set(content.dealers.map((d) => d.area)).size;
  section.replaceChildren(
    head(section, {
      title: `Where to buy a new ${brand}`,
      sub: `${content.dealers.length} authorized ${brand} dealers in ${regions} ${regions === 1 ? "region" : "regions"} · brokers of pre-owned boats aren’t listed`,
    }),
    grid,
  );
}

// ---------- FAQ (+ Waylo) ----------
// [question, answer, keywords used by Waylo to match free-text questions].
// Static entries come from content.faq; "auto" ones are built from live data
// and skipped when that data is missing (e.g. no USD prices → no price answer).
export function faqItems({ modelName, listings, content }) {
  const fill = (t) => t.replaceAll("{model}", modelName);
  const usd = listings.filter((l) => l.currency === "USD" && l.price);
  const byGen = (id) => listings.filter((l) => l.generation === id).length;
  const countries = new Set(listings.map((l) => l.location?.countryCode).filter(Boolean)).size;
  const [g1, g2] = content.generations;
  const auto = {
    price: () =>
      usd.length && [
        `How much does a ${modelName} cost?`,
        `Listings on YachtWay currently range from ${priceParts(Math.min(...usd.map((l) => l.price)), "USD").text} to ${priceParts(Math.max(...usd.map((l) => l.price)), "USD").text} (USD listings). The price depends on the model year, edition, engines, hours, equipment and location.`,
        ["price", "cost", "much", "expensive", "cheap"],
      ],
    count: () => [
      `How many ${modelName} yachts are for sale?`,
      `${listings.length} right now${g1 && g2 ? `: ${byGen(g1.id)} of the original edition and ${byGen(g2.id)} of the redesigned edition` : ""}, in ${countries} ${countries === 1 ? "country" : "countries"}.`,
      ["many", "sale", "available", "listings"],
    ],
    generation: (f) =>
      g1?.years[1] &&
      g2 && [
        fill(f.q),
        `Boats up to model year ${g1.years[1]} are usually the original edition; the redesign arrived for the ${g2.years[0]} season. Hulls from the changeover can be either, so check the build with the seller.`,
        f.keywords,
      ],
  };
  return content.faq
    .map((f) => (f.auto ? auto[f.auto](f) : [fill(f.q), fill(f.a), f.keywords]))
    .filter(Boolean);
}

function renderFaq(section, { modelName, listings, prefs, content }) {
  const items = faqItems({ modelName, listings, content });
  const list = el("div", "faq");
  for (const [q, a] of items) {
    const d = el("details", "faq__item");
    const s = el("summary", "faq__q", q);
    const body = el("div", "faq__a");
    units.bindText(body, a);
    d.append(s, body);
    list.append(d);
    // Smooth height animation (native <details> snaps).
    // The intended state is tracked separately: during the close animation
    // `open` is still true, and a second click must reopen, not close again.
    let wantOpen = d.open;
    let anim = null;
    d.addEventListener("toggle", () => {
      if (!anim) wantOpen = d.open; // native toggles (reduced motion, scripts)
    });
    s.addEventListener("click", (e) => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      e.preventDefault();
      wantOpen = !wantOpen;
      const start = d.offsetHeight;
      anim?.cancel();
      if (wantOpen) d.open = true;
      const end = wantOpen ? d.scrollHeight : s.offsetHeight + 2;
      anim = d.animate([{ height: `${start}px` }, { height: `${end}px` }], { duration: 280, easing: "cubic-bezier(0.23,1,0.32,1)" });
      anim.onfinish = () => {
        anim = null;
        if (!wantOpen) d.open = false;
      };
    });
  }
  const layout = el("div", "faq-layout");
  layout.append(list, createWaylo({ modelName, items, prefs }));
  section.replaceChildren(head(section, { title: `Questions about the ${modelName}`, sub: "Price, size, speed and editions — or ask Waylo, YachtWay’s AI assistant" }), layout);
  // FAQPage structured data: src/lib/structured-data.js (with the Product offer).
}

/**
 * @param {object} o
 * @param {import("../types").ModelHeroData} o.model
 * @param {import("../types").ModelContent} o.content
 * @param {import("../types").ListingCard[]} o.listings
 * @param {ReturnType<import("../lib/preferences.js").createPreferences>} o.prefs
 * @param {{ showGeneration: (id: string) => void, countByGeneration: (id: string) => number } | null} o.listingsApi
 * @param {(id: string) => void} o.scrollTo
 * @param {(event: string, props?: object) => void} [o.track]
 */
export function renderModelSections({ model, content, listings, prefs, listingsApi, scrollTo, track }) {
  const name = model.name;
  const brand = model.builder?.name ?? "";
  // Each section renders on its own: a section without data (or one that
  // throws on bad data) is hidden with its anchor, the others still render.
  const run = (id, hasData, render) => {
    const section = document.getElementById(id);
    if (!section) return;
    try {
      if (hasData) return render(section);
    } catch (err) {
      console.error(`[sections] #${id} failed:`, err);
    }
    section.hidden = true;
    document.querySelector(`[data-section-nav] a[href="#${id}"]`)?.setAttribute("hidden", "");
  };
  run("generations", content.generations.length > 0, (s) =>
    renderGenerations(s, {
      content,
      modelName: name,
      countFor: (id) => listingsApi?.countByGeneration(id) ?? 0,
      onShow: (id) => {
        listingsApi?.showGeneration(id);
        scrollTo("for-sale");
        track?.("generation_show", { generation: id });
      },
    }),
  );
  run("specifications", content.specGroups.length > 0 || Boolean(content.drawings), (s) => renderSpecs(s, { content, model }));
  run("reviews", content.videos.length + content.quotes.length > 0, (s) => renderReviews(s, { content, modelName: name, track }));
  run("models", content.models.length > 0, (s) => renderModels(s, { content, modelName: name, brand }));
  run("dealers", content.dealers.length > 0, (s) => renderDealers(s, { content, brand }));
  run("faq", content.faq.length > 0, (s) => renderFaq(s, { modelName: name, listings, prefs, content }));
}
