import { computeSceneLayout, alphaBounds } from "../fx/scene-geometry.js";
import { supportsWebGL2 } from "../fx/gl.js";
import { createReflectionLayer } from "../fx/reflection-layer.js";
import { createHullCausticsLayer } from "../fx/hull-caustics-layer.js";
import { createWaterSurfaceLayer } from "../fx/water-surface-layer.js";

const TAU = Math.PI * 2;
const REFLECTION_PERIOD = 6; // s per 2π at speed 1
const WATER_PERIOD = 5;
const UNDERLIGHT_HEADROOM = 480; // px; ≥ FX_SCHEMA.pull.maxDistance max

// Groups/keys whose change moves a canvas box (everything else is uniforms only).
const LAYOUT_KEYS = new Set([
  "placement.waterlineY", "placement.scale", "placement.offsetX", "placement.offsetY",
  "reflection.fade", "reflection.offsetY",
  "water.widthScale", "water.overlap", "water.amplitude", "water.depth",
  "caustics.bandHeight", "underlight.width", "underlight.height", "underlight.offsetY",
]);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    // CDN images must be CORS-enabled, otherwise WebGL can't sample them (tainted texture).
    if (new URL(src, location.href).origin !== location.origin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function detectBounds(img) {
  const max = 512;
  const s = Math.min(1, max / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * s));
  const h = Math.max(1, Math.round(img.naturalHeight * s));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return alphaBounds(ctx.getImageData(0, 0, w, h).data, w, h);
}

/**
 * Side view: crisp PNG + independent reflection / caustics / water / underlight layers.
 * @param {object} opts
 * @param {HTMLElement} opts.stage       box whose bottom edge is the waterline
 * @param {HTMLElement} opts.underlight  sits behind the title, outside the stage
 * @param {import("../types").YachtHeroAsset} opts.asset
 * @param {ReturnType<import("../fx/store.js").createFxStore>} opts.store
 * @param {MediaQueryList} opts.reducedMotion
 * @param {(status: object) => void} [opts.onStatus]
 */
export function createYachtScene({ stage, underlight, asset, store, reducedMotion, onStatus }) {
  const yacht = stage.querySelector(".scene__yacht");
  const canvases = {
    reflection: stage.querySelector(".fx--reflection"),
    caustics: stage.querySelector(".fx--caustics"),
    water: stage.querySelector(".fx--water"),
  };
  const fallbackReflection = stage.querySelector(".scene__reflection-fallback");

  const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) <= 4;
  const dprCap = lowPower ? 1.25 : 2;

  const status = { renderer: "pending", reason: "", image: "loading", running: false, lowPower };
  const report = () => onStatus?.({ ...status });

  let layers = null; // { reflection, caustics, water }
  let image = null;
  let bounds = asset.visibleBounds ?? null;
  let layout = null;
  let active = true;
  let inView = true;
  let raf = 0;
  let last = 0;
  let time = 0;
  let phaseReflection = 0;
  let phaseWater = 0;
  let disposed = false;

  // Reserve space before the image arrives (no layout jump).
  if (asset.intrinsicWidth && asset.intrinsicHeight) {
    yacht.width = asset.intrinsicWidth;
    yacht.height = asset.intrinsicHeight;
  }
  yacht.alt = asset.alt;

  const waterlineY = () => Math.min(1, Math.max(0.05, asset.waterlineY + store.get().placement.waterlineY));

  function relayout() {
    // Bounds can come from data before the image loads; the size then needs the image or intrinsic metadata.
    if (!bounds || (!image && !(asset.intrinsicWidth && asset.intrinsicHeight))) return;
    const fx = store.get();
    const p = fx.placement;
    const stageWidth = stage.clientWidth;
    if (!stageWidth) return;
    const wl = waterlineY();
    layout = computeSceneLayout({
      stageWidth,
      intrinsic: { width: asset.intrinsicWidth ?? image.naturalWidth, height: asset.intrinsicHeight ?? image.naturalHeight },
      bounds,
      waterlineY: wl,
      anchorX: asset.anchorX,
      scale: p.scale,
      offsetX: p.offsetX,
      offsetY: p.offsetY,
    });
    stage.style.height = `${layout.stageHeight}px`;
    const { image: ib } = layout;
    Object.assign(yacht.style, { left: `${ib.left}px`, top: `${ib.top}px`, width: `${ib.width}px`, height: `${ib.height}px` });

    if (fallbackReflection) {
      // CSS-only reflection for the no-WebGL path: same box, flipped about the waterline.
      // The mask is in the element's own (unflipped) space: opaque at the waterline, fading upward.
      const fadeTop = ((wl * ib.height - layout.hull.height * fx.reflection.fade) / ib.height) * 100;
      const mask = `linear-gradient(to bottom, transparent ${fadeTop}%, #000 ${wl * 100}%, transparent ${wl * 100}%)`;
      Object.assign(fallbackReflection.style, {
        left: `${ib.left}px`,
        top: `${ib.top + fx.reflection.offsetY}px`,
        width: `${ib.width}px`,
        height: `${ib.height}px`,
        transformOrigin: `50% ${wl * 100}%`,
        maskImage: mask,
        webkitMaskImage: mask,
      });
    }

    if (layers) for (const l of Object.values(layers)) l.layout(layout, asset, wl, fx, dprCap);
    placeUnderlight(fx);
    draw();
  }

  function placeUnderlight(fx) {
    if (!layout || !underlight) return;
    const u = fx.underlight;
    // Measure the views container (same box as the stage) so the intro `translate` on the stage is ignored.
    const stageRect = (stage.closest("[data-parallax]") ?? stage).getBoundingClientRect();
    const parentRect = underlight.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    // Position relative to the hero using untransformed offsets (parallax transform is applied on top).
    const ty = currentTranslate(stage);
    const stageTop = stageRect.top - parentRect.top - ty;
    const stageLeft = stageRect.left - parentRect.left;
    const cx = stageLeft + layout.hull.left + layout.hull.width / 2;
    const cy = stageTop + layout.waterline + u.offsetY;
    const rx = layout.hull.width * u.width;
    const ry = layout.hull.height * u.height;
    // Like Figma's 48:1399 rect: may extend above the hero (behind the header), cut at the waterline.
    // The extra headroom (≥ max elastic pull) keeps the edge tone continuous when the page is pulled down.
    const top = cy - ry - UNDERLIGHT_HEADROOM;
    const bottom = stageTop + layout.waterline;
    Object.assign(underlight.style, {
      top: `${top}px`,
      height: `${Math.max(0, bottom - top)}px`,
      opacity: u.enabled ? String(u.opacity) : "0",
      background: `radial-gradient(${rx}px ${ry}px at ${cx}px ${cy - top}px,
        #f4f4f5 35%, #c3c6d0 43.65%, #9398ab 52.3%, #626a86 60.96%, #4a5374 65.28%, ${u.color} 69.6%)`,
    });
  }

  function currentTranslate(el) {
    const m = getComputedStyle(el.closest("[data-parallax]") ?? el).transform;
    if (!m || m === "none") return 0;
    return new DOMMatrixReadOnly(m).m42;
  }

  function fxAllowed() {
    return active && asset.enableWaterFx && layers && status.image === "ready";
  }

  function draw() {
    const fx = store.get();
    yacht.style.visibility = fx.debug.hideYacht ? "hidden" : "";
    stage.classList.toggle("is-contrast", fx.debug.contrastBackdrop);
    const on = fxAllowed();
    canvases.reflection.hidden = !(on && fx.reflection.enabled);
    canvases.caustics.hidden = !(on && fx.caustics.enabled);
    canvases.water.hidden = !(on && fx.water.enabled);
    if (fallbackReflection) {
      fallbackReflection.hidden = !(active && status.renderer === "fallback" && fx.reflection.enabled);
      fallbackReflection.style.setProperty("--reflection-opacity", fx.reflection.opacity);
    }
    if (!on || !layout) return;
    const wl = waterlineY();
    if (fx.reflection.enabled) layers.reflection.render(phaseReflection, fx, wl);
    if (fx.caustics.enabled) layers.caustics.render(time, fx, wl);
    if (fx.water.enabled) layers.water.render(phaseWater, fx);
  }

  function shouldRun() {
    return fxAllowed() && inView && !document.hidden && !store.paused && !reducedMotion.matches;
  }

  function tick(now) {
    raf = 0;
    if (!shouldRun()) return syncLoop();
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const fx = store.get();
    time += dt;
    phaseReflection = (phaseReflection + (dt * fx.reflection.speed * TAU) / REFLECTION_PERIOD) % TAU;
    phaseWater = (phaseWater + (dt * fx.water.speed * TAU) / WATER_PERIOD) % TAU;
    draw();
    raf = requestAnimationFrame(tick);
  }

  function syncLoop() {
    const run = shouldRun();
    if (run && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (status.running !== run) {
      status.running = run;
      report();
    }
  }

  function fallback(reason) {
    if (layers) for (const l of Object.values(layers)) l.layer.dispose();
    layers = null;
    status.renderer = "fallback";
    status.reason = reason;
    stage.classList.add("is-fallback");
    report();
    draw();
    syncLoop();
  }

  // ---- lifecycle ----
  const ro = new ResizeObserver(() => relayout());
  ro.observe(stage);

  const io = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    syncLoop();
  }, { rootMargin: "100px" });
  io.observe(stage);

  const onVisibility = () => syncLoop();
  document.addEventListener("visibilitychange", onVisibility);
  const onMotion = () => {
    draw();
    syncLoop();
  };
  reducedMotion.addEventListener("change", onMotion);

  const unsubscribe = store.subscribe((_, change) => {
    if (change.group && LAYOUT_KEYS.has(`${change.group}.${change.key}`)) relayout();
    else if (change.reset || change.preset) relayout();
    else if (change.group === "underlight") {
      placeUnderlight(store.get());
      draw();
    } else draw();
    syncLoop();
  });

  (async () => {
    try {
      image = await loadImage(asset.src);
      if (disposed) return;
      yacht.src = asset.src;
      if (fallbackReflection) fallbackReflection.src = asset.src;
      await yacht.decode().catch(() => {});
      if (!bounds) bounds = detectBounds(image); // once per asset
      status.image = "ready";
    } catch (err) {
      status.image = "error";
      status.reason = err.message;
      stage.classList.add("is-image-error");
      document.documentElement.classList.add("intro-yacht");
      report();
      return;
    }

    let hullMask = null;
    if (asset.hullMaskSrc) hullMask = await loadImage(asset.hullMaskSrc).catch(() => null);

    if (!supportsWebGL2()) {
      fallback("WebGL2 is not available in this browser");
    } else {
      try {
        const onLost = () => fallback("WebGL context lost");
        layers = {
          reflection: createReflectionLayer(canvases.reflection, { image, onLost }),
          caustics: createHullCausticsLayer(canvases.caustics, { image, hullMask, onLost }),
          water: createWaterSurfaceLayer(canvases.water, { onLost }),
        };
        status.renderer = "webgl2";
      } catch (err) {
        fallback(err.message);
      }
    }
    report();
    relayout();
    syncLoop();
    // Yacht entrance waits for the decoded image and its first layout.
    requestAnimationFrame(() => document.documentElement.classList.add("intro-yacht"));
  })();

  return {
    setActive(value) {
      active = value;
      draw();
      syncLoop();
    },
    relayoutUnderlight() {
      placeUnderlight(store.get());
    },
    get status() {
      return { ...status };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotion);
      if (layers) for (const l of Object.values(layers)) l.layer.dispose();
      layers = null;
    },
  };
}
