// schema.org JSON-LD for search engines, built from the same data the page
// renders: Product (+ AggregateOffer from live listings) and FAQPage.
// Best served by SSR; injecting it client-side still works for Google.

import { fillUnits } from "./units.js";

/**
 * @param {object} o
 * @param {import("../types").ModelHeroData} o.model
 * @param {import("../types").ListingCard[]} o.listings
 * @param {Array<[string, string, string[]]>} [o.faq]  rendered FAQ items
 */
export function buildStructuredData({ model, listings, faq = [] }) {
  const usd = listings.filter((l) => l.currency === "USD" && l.price).map((l) => l.price);
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: model.name,
    brand: { "@type": "Brand", name: model.builder.name },
    category: model.type,
    image: model.gallery.slice(0, 3).map((g) => new URL(g.src, document.baseURI).href),
    description: document.querySelector('meta[name="description"]')?.content,
    ...(usd.length && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: Math.min(...usd),
        highPrice: Math.max(...usd),
        offerCount: listings.length,
      },
    }),
  };
  const faqPage = faq.length && {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: fillUnits(a, "metric") } })),
  };
  return [product, faqPage].filter(Boolean);
}

/** Replace the page's generated JSON-LD (idempotent). */
export function injectStructuredData(items) {
  document.querySelectorAll('script[type="application/ld+json"][data-generated]').forEach((s) => s.remove());
  for (const item of items) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.dataset.generated = "";
    s.textContent = JSON.stringify(item).replace(/</g, "\\u003c"); // can't close the <script> early
    document.head.append(s);
  }
}
