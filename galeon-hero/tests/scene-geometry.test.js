import test from "node:test";
import assert from "node:assert/strict";
import { computeSceneLayout, causticsBox, reflectionBox, waterBox, alphaBounds } from "../src/fx/scene-geometry.js";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("waterline lands on the stage bottom for the Galeon asset", () => {
  const l = computeSceneLayout({
    stageWidth: 783,
    intrinsic: { width: 1566, height: 549 },
    bounds: { x: 0.00447, y: 0.02186, width: 0.98787, height: 0.97814 },
    waterlineY: 0.997,
    anchorX: 0.5,
  });
  close(l.waterline, l.stageHeight);
  close(l.hull.width, 783, 1e-3);
  close(l.hull.top, 0, 1e-6);
});

test("padding and aspect ratio don't move the hull, only the image box", () => {
  const base = { width: 1000, height: 400 };
  const a = computeSceneLayout({ stageWidth: 600, intrinsic: base, bounds: { x: 0, y: 0.1, width: 1, height: 0.8 }, waterlineY: 0.9 });
  // same yacht inside a canvas with 500 px transparent on the left, 300 px on top, 200 px below
  const padded = { width: 1500, height: 900 };
  const b = computeSceneLayout({
    stageWidth: 600,
    intrinsic: padded,
    bounds: { x: 500 / 1500, y: (300 + 40) / 900, width: 1000 / 1500, height: 320 / 900 },
    waterlineY: (300 + 360) / 900,
  });
  close(a.stageHeight, b.stageHeight, 1e-6);
  close(a.hull.left, b.hull.left, 1e-6);
  close(a.hull.width, b.hull.width, 1e-6);
  close(a.waterline, b.waterline, 1e-6);
  assert.ok(b.image.left < 0, "padded image extends left of the stage");
  assert.ok(b.image.width > a.image.width);
});

test("tuning scale keeps the waterline anchored and stage height stable", () => {
  const args = { stageWidth: 500, intrinsic: { width: 800, height: 300 }, bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.85 }, waterlineY: 0.95 };
  const a = computeSceneLayout(args);
  const b = computeSceneLayout({ ...args, scale: 1.2 });
  close(a.stageHeight, b.stageHeight);
  close(a.waterline, b.waterline);
  close(b.hull.width, a.hull.width * 1.2);
});

test("caustics box ends exactly at the waterline and covers the band", () => {
  const l = computeSceneLayout({ stageWidth: 400, intrinsic: { width: 400, height: 200 }, bounds: { x: 0, y: 0, width: 1, height: 1 }, waterlineY: 0.9 });
  const c = causticsBox(l, 0.9, 0.2);
  close(c.top + c.height, l.waterline);
  close(c.height, 0.2 * l.image.height);
  close(c.uv.y1, 0.9);
});

test("reflection starts at the waterline; water strip straddles it", () => {
  const l = computeSceneLayout({ stageWidth: 400, intrinsic: { width: 400, height: 200 }, bounds: { x: 0.1, y: 0, width: 0.8, height: 1 }, waterlineY: 1 });
  const r = reflectionBox(l, 1, 0.4);
  close(r.top, l.waterline);
  const w = waterBox(l, { widthScale: 1, overlap: 3, amplitude: 1, depth: 20 });
  close(w.top + w.waterlineInBox, l.waterline);
  close(w.left + w.width / 2, l.hull.left + l.hull.width / 2);
});

test("alphaBounds finds the opaque rectangle", () => {
  const w = 10, h = 5, data = new Uint8Array(w * h * 4);
  for (let y = 1; y <= 3; y++) for (let x = 2; x <= 6; x++) data[(y * w + x) * 4 + 3] = 255;
  assert.deepEqual(alphaBounds(data, w, h), { x: 0.2, y: 0.2, width: 0.5, height: 0.6 });
});
