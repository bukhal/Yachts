import { FX_SCHEMA, PRESETS } from "../config/fx-defaults.js";
import { diffFromFactory } from "../fx/store.js";

// Demo-only tuning panel. Generated from FX_SCHEMA and writes to the one store.

const h = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k in node && typeof v !== "string") node[k] = v;
    else node.setAttribute(k, v);
  }
  node.append(...children.filter((c) => c !== null && c !== undefined));
  return node;
};

const fmt = (v, step) => {
  const d = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return Number(v).toFixed(d);
};

export function createFxControls({ store, sources = {}, getStatus, fixtureActive }) {
  const toggleBtn = h("button", { class: "fx-toggle", type: "button", "aria-expanded": "false", "aria-controls": "fx-panel" }, "Tune effects");
  const panel = h("aside", { class: "fx-panel", id: "fx-panel", "aria-label": "Effect tuning (demo)", hidden: true });
  const inputs = new Map();

  const close = h("button", { class: "fx-panel__close", type: "button", "aria-label": "Close effect tuning" }, "×");
  const pause = h("button", { class: "fx-btn", type: "button", "aria-pressed": "false" }, "Pause animation");
  const reset = h("button", { class: "fx-btn", type: "button" }, "Reset to defaults");
  const preset = h("select", { class: "fx-select", "aria-label": "Preset" },
    ...Object.entries(PRESETS).map(([id, p]) => h("option", { value: id }, p.label)));
  const save = h("button", { class: "fx-btn fx-btn--primary", type: "button" }, "Save as defaults");
  const copy = h("button", { class: "fx-btn", type: "button" }, "Copy settings");
  const saveNote = h("p", { class: "fx-note fx-save-note", role: "status" });
  const statusLine = h("p", { class: "fx-status", role: "status" });

  panel.append(
    h("div", { class: "fx-panel__head" }, h("h2", {}, "Tune effects"), close),
    h("p", { class: "fx-note" }, "Demo tool for reviewing the hero. Not part of the product UI."),
    statusLine,
    h("div", { class: "fx-row" }, pause, reset),
    h("div", { class: "fx-row" }, save, copy),
    saveNote,
    h("label", { class: "fx-field fx-field--inline" }, h("span", {}, "Preset"), preset),
  );

  for (const [group, { label, params }] of Object.entries(FX_SCHEMA)) {
    const body = h("div", { class: "fx-group__body" });
    for (const [key, spec] of Object.entries(params)) {
      const id = `fx-${group}-${key}`;
      let input;
      let out = null;
      if (spec.type === "range") {
        input = h("input", { id, type: "range", min: String(spec.min), max: String(spec.max), step: String(spec.step) });
        out = h("output", { for: id });
        input.addEventListener("input", () => store.set(group, key, input.valueAsNumber));
      } else if (spec.type === "toggle") {
        input = h("input", { id, type: "checkbox" });
        input.addEventListener("change", () => store.set(group, key, input.checked));
      } else if (spec.type === "color") {
        input = h("input", { id, type: "color" });
        input.addEventListener("input", () => store.set(group, key, input.value));
      } else {
        input = h("select", { id }, ...spec.options.map((o) => h("option", { value: o }, o)));
        input.addEventListener("change", () => store.set(group, key, input.value));
      }
      const field = h("div", { class: `fx-field fx-field--${spec.type}` });
      inputs.set(`${group}.${key}`, { input, out, spec, field });
      body.append(field);
      field.append(
        h("label", { for: id }, spec.label, spec.unit ? h("small", {}, ` ${spec.unit}`) : null),
        input,
        out ?? "",
      );
    }
    panel.append(h("details", { class: "fx-group", open: group === "listings" || group === "caustics" || group === "debug" }, h("summary", {}, label), body));
  }

  const sourcesGroup = h("details", { class: "fx-group" }, h("summary", {}, "Data sources"),
    h("ul", { class: "fx-sources" }, ...Object.values(sources).map((s) =>
      h("li", {}, h("a", { href: s.url, target: "_blank", rel: "noopener" }, s.label), ` — ${s.market}, verified ${s.verifiedAt}`))));
  const fixtureLink = h("a", { class: "fx-link", href: fixtureActive ? "?" : "?fixture=padded" },
    fixtureActive ? "Back to the Galeon asset" : "Load padded test fixture (geometry check)");
  panel.append(sourcesGroup, h("p", { class: "fx-note" }, fixtureLink));

  function sync() {
    const s = store.get();
    for (const [path, { input, out, spec, field }] of inputs) {
      const [g, k] = path.split(".");
      const v = s[g][k];
      // Dot marks values that differ from the current defaults (unsaved tuning).
      field.classList.toggle("is-changed", store.isChanged(g, k));
      if (spec.type === "toggle") input.checked = v;
      else input.value = String(v);
      if (out) out.textContent = fmt(v, spec.step);
    }
    pause.setAttribute("aria-pressed", String(store.paused));
    pause.textContent = store.paused ? "Resume animation" : "Pause animation";
    const st = getStatus();
    statusLine.textContent = [
      st.renderer === "webgl2" ? "Renderer: WebGL2" : st.renderer === "fallback" ? `Renderer: static fallback — ${st.reason}` : st.image === "error" ? "Renderer: off" : "Renderer: starting…",
      st.image === "error" ? "Image failed to load" : null,
      st.reducedMotion ? "Reduced motion: static frame" : st.running ? "Running" : "Idle (paused, off-screen, hidden tab or other view)",
      st.lowPower ? "Low-power quality" : null,
    ].filter(Boolean).join(" · ");
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggleBtn.setAttribute("aria-expanded", String(open));
    if (open) {
      sync();
      close.focus();
    } else toggleBtn.focus();
  }

  toggleBtn.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => setOpen(false));
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
  pause.addEventListener("click", () => store.setPaused(!store.paused));
  reset.addEventListener("click", () => {
    preset.value = "figma";
    store.reset();
  });
  preset.addEventListener("change", () => store.applyPreset(preset.value));

  const settingsJson = () => JSON.stringify(diffFromFactory(store.get()), null, 2);
  async function copySettings(prefix = "") {
    try {
      await navigator.clipboard.writeText(settingsJson());
      saveNote.textContent = `${prefix}Copied as JSON (changes from factory values). Paste it to the developer.`;
    } catch {
      saveNote.textContent = `${prefix}Clipboard blocked — copy this:\n${settingsJson()}`;
    }
  }
  copy.addEventListener("click", () => copySettings());
  save.addEventListener("click", async () => {
    save.disabled = true;
    try {
      const res = await fetch("/__dev/fx-defaults", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(store.get()),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { file, tuned } = await res.json();
      store.rebaseDefaults(tuned);
      saveNote.textContent = `Saved to ${file}. Reset now returns to these values.`;
    } catch {
      await copySettings("Saving needs the local dev server (npm start). ");
    } finally {
      save.disabled = false;
    }
  });
  store.subscribe(() => !panel.hidden && sync());

  document.body.append(toggleBtn, panel);
  return { sync: () => !panel.hidden && sync() };
}
