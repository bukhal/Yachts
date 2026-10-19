// Shared fetch for the API modules: base URL from the page config, JSON accept
// header, a timeout (a hung API must not leave "Loading…" forever) and typed errors.

export const API_BASE = globalThis.__YW_CONFIG__?.apiBase ?? null;
const TIMEOUT_MS = 15000;

export class ApiError extends Error {}

/**
 * @param {string} path  e.g. "/models/galeon-500-fly/hero"
 * @param {{ signal?: AbortSignal, method?: string, body?: unknown }} [opts]
 */
export async function apiJson(path, { signal, method = "GET", body } = {}) {
  const timeout = AbortSignal.timeout?.(TIMEOUT_MS);
  const signals = [signal, timeout].filter(Boolean);
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    signal: signals.length > 1 && AbortSignal.any ? AbortSignal.any(signals) : signals[0],
    headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new ApiError(`${method} ${path} → HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}
