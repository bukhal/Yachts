// "Notify me" call to action between the listings and the content sections,
// drawn like the hero: the model name in big white display type with the yacht
// over it and its reflection on still water. Subscribing is local for now
// (src/api/alerts.js, TODO(backend)).

import { ALERT_TOPICS, getAlertSubscription, subscribeModelAlerts, clearAlertSubscription, isEmail } from "../api/alerts.js";

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
};
const CHECK = '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10.5l3.2 3L15 7"/></svg>';
const MAIL = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="14" height="10.5" rx="2"/><path d="M3.5 6l6.5 5 6.5-5"/></svg>';

/**
 * @param {HTMLElement} root  the <section data-alerts> placeholder
 * @param {object} o
 * @param {import("../types").ModelHeroData} o.model
 * @param {(event: string, props?: object) => void} [o.track]
 * @param {MediaQueryList} [o.reducedMotion]
 */
export function createAlertsCta(root, { model, track, reducedMotion }) {
  const short = model.name.replace(model.builder?.name ?? "", "").trim() || model.name;
  const titleId = root.getAttribute("aria-labelledby") || "alerts-title";

  // Visual: word + yacht + reflection (decorative; the heading carries the meaning).
  const visual = el("div", "alerts__visual");
  visual.setAttribute("aria-hidden", "true");
  const word = el("p", "alerts__word", short);
  const boat = el("div", "alerts__boat");
  const yacht = el("img", "alerts__yacht");
  yacht.src = model.side.src;
  yacht.alt = "";
  yacht.loading = "lazy";
  yacht.decoding = "async";
  if (model.side.intrinsicWidth) {
    yacht.width = model.side.intrinsicWidth;
    yacht.height = model.side.intrinsicHeight;
  }
  const reflection = yacht.cloneNode();
  reflection.className = "alerts__reflection";
  boat.append(yacht, reflection);
  visual.append(word, boat);

  // Copy + form.
  const body = el("div", "alerts__body");
  const title = el("h2", "alerts__title", `Be the first to know when a ${short} is listed`);
  title.id = titleId;
  const sub = el("p", "alerts__sub", `We’ll email you about new ${model.name} listings and price drops on YachtWay — nothing else.`);

  const topics = el("div", "alerts__topics");
  topics.setAttribute("role", "group");
  topics.setAttribute("aria-label", "Notify me about");
  const labels = { listings: "New listings", price: "Price drops", models: `New ${model.builder?.name ?? ""} models`.replace("  ", " ") };
  const defaults = new Set(["listings", "price"]);
  const topicBtns = ALERT_TOPICS.map((id) => {
    const b = el("button", "alerts__topic");
    b.type = "button";
    b.dataset.topic = id;
    b.setAttribute("aria-pressed", String(defaults.has(id)));
    b.innerHTML = `<span class="alerts__tick">${CHECK}</span>`;
    b.append(labels[id]);
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      // At least one topic stays on.
      if (!on && topicBtns.filter((x) => x.getAttribute("aria-pressed") === "true").length === 1) return;
      b.setAttribute("aria-pressed", String(on));
    });
    topics.append(b);
    return b;
  });

  const form = el("form", "alerts__form");
  form.noValidate = true;
  const field = el("label", "alerts__field");
  const icon = el("span", "alerts__mail");
  icon.innerHTML = MAIL;
  const input = el("input", "alerts__input");
  input.type = "email";
  input.name = "email";
  input.autocomplete = "email";
  input.required = true;
  input.placeholder = "Your email";
  input.setAttribute("aria-label", "Email address");
  field.append(icon, input);
  const submit = el("button", "alerts__submit", "Notify me");
  submit.type = "submit";
  form.append(field, submit);

  const error = el("p", "alerts__error");
  error.id = `${titleId}-error`;
  error.setAttribute("aria-live", "polite");
  input.setAttribute("aria-describedby", error.id);

  const fine = el("p", "alerts__fine");
  fine.innerHTML = 'One email per change, unsubscribe in one click. By subscribing you agree to YachtWay’s <a href="#" data-demo-link>Terms</a> and <a href="#" data-demo-link>Privacy Policy</a>.';

  const formWrap = el("div", "alerts__compose");
  formWrap.append(topics, form, error, fine);

  // Confirmation (replaces the form).
  const done = el("div", "alerts__done");
  done.setAttribute("role", "status");
  const doneIcon = el("span", "alerts__done-icon");
  doneIcon.innerHTML = CHECK;
  const doneText = el("div");
  const doneTitle = el("p", "alerts__done-title", "You’re on the list");
  const doneSub = el("p", "alerts__done-sub");
  const change = el("button", "alerts__change", "Change");
  change.type = "button";
  doneText.append(doneTitle, doneSub);
  done.append(doneIcon, doneText, change);

  body.append(title, sub, formWrap, done);

  const card = el("div", "alerts__card");
  card.append(visual, body);
  root.replaceChildren(card);

  const topicNames = (list) => list.map((t) => labels[t].toLowerCase()).join(", ").replace(/, ([^,]*)$/, " and $1");
  function showDone(subscription, { focus = false } = {}) {
    doneSub.textContent = `We’ll write to ${subscription.email} about ${topicNames(subscription.topics)}.`;
    root.classList.add("is-done");
    formWrap.hidden = true;
    done.hidden = false;
    if (focus) change.focus({ preventScroll: true });
  }
  function showForm({ focus = false } = {}) {
    root.classList.remove("is-done");
    formWrap.hidden = false;
    done.hidden = true;
    if (focus) input.focus({ preventScroll: true });
  }

  const setError = (text) => {
    error.textContent = text;
    input.setAttribute("aria-invalid", String(Boolean(text)));
  };
  input.addEventListener("input", () => error.textContent && isEmail(input.value) && setError(""));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    if (!isEmail(input.value)) {
      setError(input.value.trim() ? "That email doesn’t look right." : "Enter your email to get notified.");
      input.focus();
      return;
    }
    setError("");
    const chosen = topicBtns.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.topic);
    submit.disabled = true;
    root.classList.add("is-busy");
    try {
      const s = await subscribeModelAlerts({ modelId: model.id, email: input.value, topics: chosen });
      track?.("model_alert_subscribe", { topics: chosen.join(",") });
      showDone(s, { focus: true });
    } catch {
      setError("Couldn’t subscribe right now. Please try again.");
    } finally {
      submit.disabled = false;
      root.classList.remove("is-busy");
    }
  });

  change.addEventListener("click", () => {
    const s = getAlertSubscription(model.id);
    clearAlertSubscription(model.id);
    if (s) input.value = s.email;
    showForm({ focus: true });
  });

  const existing = getAlertSubscription(model.id);
  if (existing) {
    for (const b of topicBtns) b.setAttribute("aria-pressed", String(existing.topics.includes(b.dataset.topic)));
    showDone(existing);
  } else showForm();

  // Reveal like the hero intro: word rises, the yacht glides in from the left.
  if (reducedMotion?.matches || !("IntersectionObserver" in window)) {
    root.classList.add("is-in");
  } else {
    root.classList.add("is-armed");
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        root.classList.add("is-in");
        io.disconnect();
      },
      { threshold: 0.25 },
    );
    io.observe(card);
  }
}
