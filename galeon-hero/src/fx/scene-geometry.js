// Pure layout math for the yacht scene. All asset metadata is normalized
// (0..1 of the source image); everything returned is in CSS px relative to
// the stage box, whose top-left is (0, 0) and whose bottom edge is the
// waterline. Used for the PNG, reflection, caustics and water alike, so all
// layers share one scale/offset.

/**
 * @param {object} p
 * @param {number} p.stageWidth   width the visible hull should occupy (px)
 * @param {{width:number,height:number}} p.intrinsic  source image size (px)
 * @param {{x:number,y:number,width:number,height:number}} p.bounds  opaque area, normalized
 * @param {number} p.waterlineY   normalized waterline in the image
 * @param {number} [p.anchorX]    normalized x placed at the stage centre (defaults to bounds centre)
 * @param {number} [p.scale]      extra scale (tuning)
 * @param {number} [p.offsetX]    px
 * @param {number} [p.offsetY]    px
 */
export function computeSceneLayout({
  stageWidth,
  intrinsic,
  bounds,
  waterlineY,
  anchorX,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
}) {
  const wl = clamp01(waterlineY);
  const top = Math.min(bounds.y, wl);
  // Pixels of the visible hull width → stage width.
  const imgW = (stageWidth / Math.max(bounds.width, 1e-4)) * scale;
  const imgH = imgW * (intrinsic.height / intrinsic.width);
  const ax = anchorX ?? bounds.x + bounds.width / 2;

  // Stage height = visible top → waterline, at base scale (no tuning scale),
  // so tuning the scale doesn't reflow the page.
  const baseImgH = (stageWidth / Math.max(bounds.width, 1e-4)) * (intrinsic.height / intrinsic.width);
  const stageHeight = (wl - top) * baseImgH;

  const imgLeft = stageWidth / 2 - ax * imgW + offsetX;
  const imgTop = stageHeight - wl * imgH + offsetY;
  const waterline = imgTop + wl * imgH;

  return {
    stageHeight,
    image: { left: imgLeft, top: imgTop, width: imgW, height: imgH },
    waterline,
    hull: {
      left: imgLeft + bounds.x * imgW,
      width: bounds.width * imgW,
      top: imgTop + top * imgH,
      height: (wl - top) * imgH,
    },
  };
}

/** Caustics canvas box: the band of the image just above the waterline. */
export function causticsBox(layout, waterlineY, bandHeight) {
  const { image } = layout;
  const band = Math.max(0.01, Math.min(waterlineY, bandHeight));
  const top = image.top + (waterlineY - band) * image.height;
  return {
    left: image.left,
    top,
    width: image.width,
    height: layout.waterline - top,
    // image-uv rect covered by the canvas
    uv: { x0: 0, y0: waterlineY - band, x1: 1, y1: waterlineY },
  };
}

/** Reflection canvas box: mirror of the hull, hanging below the waterline. */
export function reflectionBox(layout, waterlineY, fade, offsetY = 0) {
  const { image, hull } = layout;
  const height = Math.max(1, hull.height * Math.min(1, fade * 1.15));
  return {
    left: image.left,
    top: layout.waterline + offsetY,
    width: image.width,
    height,
    // how many image-uv units the canvas spans vertically
    uvSpan: height / image.height,
  };
}

/** Water strip around the waterline, centred on the visible hull. */
export function waterBox(layout, { widthScale = 1, offsetX = 0, overlap = 3, amplitude = 1, depth = 26 }) {
  const w = layout.hull.width * widthScale;
  const above = overlap + amplitude * 2 + 4;
  return {
    left: layout.hull.left + layout.hull.width / 2 - w / 2 + offsetX,
    top: layout.waterline - above,
    width: w,
    height: above + depth,
    waterlineInBox: above,
  };
}

/**
 * Opaque bounds from RGBA pixels, normalized. Run once per asset load, never per frame.
 * @param {Uint8ClampedArray|Uint8Array} data
 */
export function alphaBounds(data, width, height, threshold = 8) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, width: 1, height: 1 };
  return {
    x: minX / width,
    y: minY / height,
    width: (maxX + 1 - minX) / width,
    height: (maxY + 1 - minY) / height,
  };
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}
