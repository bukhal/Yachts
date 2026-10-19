// Waylo — YachtWay's AI assistant (name, avatar and greeting from yachtway.com
// listing pages), placed next to the FAQ. Until it's connected it answers from
// this page's FAQ by keyword match and says so; anything else gets an honest
// "not connected yet" reply.
// TODO(backend): send questions to YachtWay's Waylo endpoint (api.yachtway.com
// /api/listings/v2/waylo/…) with the model context instead of matchFaq().

import { fillUnits } from "../lib/units.js";

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
};
const SEND = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16V4M5 9l5-5 5 5"/></svg>';

/** Best FAQ entry for a free-text question (keyword overlap), or null. */
export function matchFaq(question, items) {
  const q = question.toLowerCase();
  let best = null;
  let score = 0;
  for (const item of items) {
    const s = item[2].reduce((n, k) => n + (q.includes(k) ? 1 : 0), 0);
    if (s > score) {
      score = s;
      best = item;
    }
  }
  return best;
}

/**
 * @param {object} o
 * @param {string} o.modelName
 * @param {Array<[string, string, string[]]>} o.items  FAQ: question, answer (unit template), keywords
 * @param {{ get: () => { units: string } }} o.prefs
 */
export function createWaylo({ modelName, items, prefs }) {
  const root = el("aside", "waylo");
  root.setAttribute("aria-label", "Ask Waylo, YachtWay AI assistant");

  const head = el("div", "waylo__head");
  const avatar = el("img", "waylo__avatar");
  avatar.src = "./assets/ai/waylo.webp";
  avatar.loading = "lazy";
  avatar.decoding = "async";
  avatar.alt = "";
  avatar.width = 46;
  avatar.height = 48;
  const names = el("div");
  names.append(el("p", "waylo__name", "Ask Waylo"), el("p", "waylo__role", "AI Bot · YachtWay"));
  head.append(avatar, names);

  const log = el("div", "waylo__log");
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");
  const msg = (who, text) => {
    const m = el("p", `waylo__msg waylo__msg--${who}`, text);
    log.append(m);
    log.scrollTop = log.scrollHeight;
    return m;
  };
  msg("bot", `Hi there! I’m here to help answer your questions about the ${modelName}. Let’s dive in!`);

  const chips = el("div", "waylo__chips");
  // Speed, size and cabins: the questions people ask first (picked by keyword, not position).
  const suggestions = ["speed", "length", "cabin"].map((k) => items.find((i) => i[2].includes(k))).filter(Boolean);
  for (const s of suggestions) {
    const b = el("button", "waylo__chip", s[0].replace(`the ${modelName}`, "it"));
    b.type = "button";
    b.addEventListener("click", () => ask(s[0]));
    chips.append(b);
  }

  const form = el("form", "waylo__form");
  const input = el("input", "waylo__input");
  input.type = "text";
  input.placeholder = "Enter your question here...";
  input.setAttribute("aria-label", `Ask Waylo about the ${modelName}`);
  const send = el("button", "waylo__send");
  send.type = "submit";
  send.setAttribute("aria-label", "Send question");
  send.innerHTML = SEND;
  form.append(input, send);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    ask(q);
  });

  const note = el("p", "waylo__note", "Preview: answers come from this page’s FAQ until Waylo is connected.");

  let busy = false;
  function ask(q) {
    if (busy) return;
    busy = true;
    msg("me", q);
    const typing = msg("bot", "");
    typing.classList.add("is-typing");
    typing.setAttribute("aria-label", "Waylo is typing");
    const hit = matchFaq(q, items);
    setTimeout(() => {
      typing.classList.remove("is-typing");
      typing.removeAttribute("aria-label");
      typing.textContent = hit
        ? fillUnits(hit[1], prefs.get().units)
        : `I can’t answer that here yet — once I’m connected I will. Meanwhile, try one of the questions below or contact a dealer.`;
      log.scrollTop = log.scrollHeight;
      busy = false;
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
  }

  root.append(head, log, chips, form, note);
  return root;
}
