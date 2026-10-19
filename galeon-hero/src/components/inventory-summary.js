// "N yachts for sale · from $X" — prices of actual listings on the platform,
// never a factory price. Null/0 never renders an invented number.
// The whole block is one link to the listings section.
// `inv` is null when the summary failed to load: the link stays, numbers don't.

/** @param {import("../types").InventorySummary | null} inv */
export function renderInventorySummary(container, inv, { targetId = "for-sale" } = {}) {
  const count = inv?.listingCount ?? 0;
  const hasPrice = count > 0 && typeof inv.minimumAskingPrice === "number" && inv.minimumAskingPrice > 0;

  const link = document.createElement("a");
  link.className = "inventory";
  link.href = `#${targetId}`;

  const label = document.createElement("span");
  label.className = "inventory__label";
  if (!inv || inv.listingCount === null) {
    label.textContent = "Yachts for sale";
  } else if (count > 0) {
    label.textContent = `${count} ${count === 1 ? "yacht" : "yachts"} for sale${hasPrice ? " · from" : ""}`;
  } else {
    label.textContent = "No yachts listed right now";
  }
  link.append(label);

  if (hasPrice) {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: inv.currency,
      maximumFractionDigits: 0,
    }).formatToParts(inv.minimumAskingPrice);
    const price = document.createElement("span");
    price.className = "inventory__price";
    for (const part of parts) {
      const span = document.createElement("span");
      span.textContent = part.value;
      if (part.type === "currency") span.className = "inventory__currency";
      price.append(span);
    }
    link.append(price);
  } else if (count > 0) {
    const price = document.createElement("span");
    price.className = "inventory__price inventory__price--none";
    price.textContent = "Price on request";
    link.append(price);
  }

  if (inv?.isDemo) {
    const badge = document.createElement("span");
    badge.className = "inventory__demo";
    badge.textContent = "Demo inventory";
    link.append(badge);
  }
  // Freshness lives in the listings section ("updated …"), not under the hero price.

  container.replaceWith(link);
  return link;
}
