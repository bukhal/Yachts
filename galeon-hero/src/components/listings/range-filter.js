// Range filter: histogram + slider (one or two handles) + text inputs.
// Two native <input type="range"> share one track, so each handle is keyboard
// and screen-reader accessible on its own. Only the thumbs take pointer
// events — clicking the track doesn't jump a handle (Baymard, dual sliders).
// Text inputs are the precise fallback; values snap to `step`.

const RES = 1000; // slider positions
const BINS = 28;

const el = (tag, className) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  return n;
};

/**
 * @param {object} o
 * @param {string} o.id
 * @param {string} o.label             e.g. "price"
 * @param {{min:number,max:number}} o.bounds
 * @param {{toValue:(t:number)=>number,toPos:(v:number)=>number}} o.scale
 * @param {number} o.step
 * @param {boolean} o.dual             false → single "up to" handle
 * @param {(v:number)=>string} o.format        display, e.g. "$1.2M"
 * @param {(v:number)=>string} o.formatInput   input field text, e.g. "1,200,000"
 * @param {string} [o.prefix]          shown inside inputs, e.g. "$"
 * @param {string} [o.suffix]          e.g. "hrs"
 * @param {(range:{min:number,max:number}|null)=>void} o.onInput   live while dragging
 */
export function createRangeFilter({ id, label, bounds, scale, step, dual, format, formatInput, prefix = "", suffix = "", onInput }) {
  const root = el("div", `range${dual ? "" : " range--single"}`);
  const hist = el("div", "range__hist");
  hist.setAttribute("aria-hidden", "true");
  const bars = Array.from({ length: BINS }, () => hist.appendChild(el("span")));

  const track = el("div", "range__track");
  const fill = el("div", "range__fill");
  track.append(fill);
  const lo = el("input", "range__input");
  const hi = el("input", "range__input");
  for (const [inp, which] of [[lo, "Minimum"], [hi, dual ? "Maximum" : "Up to"]]) {
    inp.type = "range";
    inp.min = "0";
    inp.max = String(RES);
    inp.step = "1";
    inp.setAttribute("aria-label", `${which} ${label}`);
  }
  if (dual) track.append(lo);
  track.append(hi);

  const fields = el("div", "range__fields");
  const mk = (name) => {
    const wrap = el("label", "range__field");
    const cap = el("span", "range__cap");
    cap.textContent = name;
    const box = el("span", "range__box");
    if (prefix) box.append(Object.assign(el("span", "range__affix"), { textContent: prefix }));
    const input = el("input", "range__text");
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.id = `${id}-${name.toLowerCase().replace(/\s+/g, "-")}`;
    box.append(input);
    if (suffix) box.append(Object.assign(el("span", "range__affix"), { textContent: suffix }));
    wrap.append(cap, box);
    return { wrap, input };
  };
  const fMin = mk("Min");
  const fMax = mk(dual ? "Max" : "Up to");
  if (dual) fields.append(fMin.wrap, Object.assign(el("span", "range__dash"), { textContent: "–" }), fMax.wrap);
  else fields.append(fMax.wrap);

  root.append(hist, track, fields);

  const snap = (v) => Math.min(bounds.max, Math.max(bounds.min, Math.round(v / step) * step));
  let value = { min: bounds.min, max: bounds.max };

  function paint() {
    const a = dual ? scale.toPos(value.min) : 0;
    const b = scale.toPos(value.max);
    lo.value = String(Math.round(a * RES));
    hi.value = String(Math.round(b * RES));
    fill.style.left = `${a * 100}%`;
    fill.style.right = `${(1 - b) * 100}%`;
    lo.setAttribute("aria-valuetext", format(value.min));
    hi.setAttribute("aria-valuetext", format(value.max));
    if (document.activeElement !== fMin.input) fMin.input.value = formatInput(value.min);
    if (document.activeElement !== fMax.input) fMax.input.value = formatInput(value.max);
    bars.forEach((bar, i) => {
      const mid = (i + 0.5) / BINS;
      bar.classList.toggle("is-in", mid >= a && mid <= b);
    });
  }

  function emit() {
    const full = (!dual || value.min <= bounds.min) && value.max >= bounds.max;
    onInput(full ? null : { min: dual ? value.min : bounds.min, max: value.max });
  }

  function fromSlider(which) {
    let a = dual ? snap(scale.toValue(+lo.value / RES)) : bounds.min;
    let b = snap(scale.toValue(+hi.value / RES));
    if (dual && a > b) (which === "lo" ? (a = b) : (b = a)); // handles can meet, never cross
    value = { min: a, max: b };
    paint();
    emit();
  }
  lo.addEventListener("input", () => fromSlider("lo"));
  hi.addEventListener("input", () => fromSlider("hi"));

  // Keyboard moves by real value steps (a native 1/1000 step would be undone by snapping).
  function onKey(e, which) {
    const k = e.key;
    const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[k];
    if (d === undefined && k !== "Home" && k !== "End") return;
    e.preventDefault();
    const cur = which === "lo" ? value.min : value.max;
    let v = k === "Home" ? bounds.min : k === "End" ? bounds.max : snap(cur + d * step);
    if (which === "lo") value = { min: Math.min(v, value.max), max: value.max };
    else value = { min: value.min, max: Math.max(v, dual ? value.min : bounds.min) };
    paint();
    emit();
  }
  lo.addEventListener("keydown", (e) => onKey(e, "lo"));
  hi.addEventListener("keydown", (e) => onKey(e, "hi"));

  function fromText(which) {
    const parse = (s) => Number(String(s).replace(/[^\d.]/g, ""));
    const raw = parse(which === "min" ? fMin.input.value : fMax.input.value);
    if (!Number.isFinite(raw) || String(which === "min" ? fMin.input.value : fMax.input.value).trim() === "") {
      paint(); // restore the last valid value
      return;
    }
    const v = snap(raw);
    value = which === "min" ? { min: Math.min(v, value.max), max: value.max } : { min: Math.min(value.min, v), max: Math.max(v, dual ? value.min : bounds.min) };
    paint();
    emit();
  }
  for (const [f, which] of [[fMin, "min"], [fMax, "max"]]) {
    f.input.addEventListener("change", () => fromText(which));
    f.input.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), fromText(which)));
    f.input.addEventListener("blur", () => paint());
  }

  return {
    root,
    /** @param {{min:number,max:number}|null} r */
    set(r) {
      value = r ? { min: dual ? r.min : bounds.min, max: r.max } : { min: bounds.min, max: bounds.max };
      paint();
    },
    /** Histogram of the listings that match the *other* filters. */
    setDistribution(values) {
      const counts = new Array(BINS).fill(0);
      for (const v of values) counts[Math.min(BINS - 1, Math.floor(scale.toPos(v) * BINS))]++;
      const peak = Math.max(1, ...counts);
      bars.forEach((bar, i) => {
        bar.style.height = counts[i] ? `${18 + (counts[i] / peak) * 82}%` : "6%";
        bar.classList.toggle("is-empty", !counts[i]);
      });
    },
  };
}
