// Country handling for builder data. The backend should send an ISO 3166-1
// alpha-2 code ("PL"); a plain English name ("Poland") is accepted too.
// Short code goes on screen, the full name into the tooltip.

const ALIASES = { UK: "GB", EL: "GR" }; // common non-ISO codes
const COMMON_NAMES = { "united states of america": "US", usa: "US", "great britain": "GB", england: "GB", holland: "NL" };

let names = null;
let byName = null;

function displayNames() {
  try {
    return (names ??= new Intl.DisplayNames(["en"], { type: "region" }));
  } catch {
    return null; // very old engines: codes still work, names don't
  }
}

function nameIndex() {
  if (byName) return byName;
  byName = new Map(Object.entries(COMMON_NAMES));
  const dn = displayNames();
  if (!dn) return byName;
  const A = 65;
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      const name = dn.of(code);
      if (name && name !== code) byName.set(name.toLowerCase(), code);
    }
  }
  return byName;
}

/**
 * @param {{ countryCode?: string, country?: string }} input
 * @returns {{ code: string, name: string }}  code falls back to the raw input if unknown
 */
export function resolveCountry({ countryCode, country } = {}) {
  const dn = displayNames();
  let code = typeof countryCode === "string" ? countryCode.trim().toUpperCase() : "";
  code = ALIASES[code] ?? code;
  if (!/^[A-Z]{2}$/.test(code) && typeof country === "string") {
    code = nameIndex().get(country.trim().toLowerCase()) ?? "";
  }
  if (/^[A-Z]{2}$/.test(code)) {
    const name = dn?.of(code);
    return { code, name: name && name !== code ? name : country || code };
  }
  const raw = String(country ?? countryCode ?? "").trim();
  return { code: raw, name: raw };
}
