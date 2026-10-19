// Dev-only geometry fixture (?fixture=padded). Re-pads the current asset with
// uneven transparent margins and a different aspect ratio, then derives the
// metadata a backend would send. Never shown in the public UI.

const PAD = { left: 420, right: 60, top: 380, bottom: 210 };

export async function createPaddedFixture(asset) {
  const img = new Image();
  img.src = asset.src;
  await img.decode();
  const w = img.naturalWidth + PAD.left + PAD.right;
  const h = img.naturalHeight + PAD.top + PAD.bottom;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").drawImage(img, PAD.left, PAD.top);
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  return {
    ...asset,
    src: URL.createObjectURL(blob),
    alt: `${asset.alt} (padded test fixture)`,
    intrinsicWidth: w,
    intrinsicHeight: h,
    waterlineY: (PAD.top + asset.waterlineY * img.naturalHeight) / h,
    anchorX: undefined, // centre of detected bounds
    causticBandHeight: (asset.causticBandHeight * img.naturalHeight) / h,
    visibleBounds: undefined, // force the one-time alpha scan
  };
}
