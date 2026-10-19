// Links that come from data (listings, content, sources). Only http(s) URLs and
// same-site paths / in-page anchors pass; javascript:, data: and malformed
// values become null, and the caller renders no link.

/** @param {unknown} value @returns {string | null} */
export function safeUrl(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("#") || (v.startsWith("/") && !v.startsWith("//"))) return v;
  try {
    const { protocol } = new URL(v);
    return protocol === "https:" || protocol === "http:" ? v : null;
  } catch {
    return null;
  }
}

/** "https://www.mnyachts.com/x" → "mnyachts.com"; null when not an absolute http(s) URL. */
export function urlHost(value) {
  try {
    return new URL(value).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}
