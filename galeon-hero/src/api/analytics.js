// Analytics hook for the hero. No-op until wired.
// TODO(analytics): forward to the site's tracker (GA4 / Segment / dataLayer).

/**
 * @param {"hero_view_change" | "hero_inventory_click" | "listings_filter" | "listings_sort" | "hero_deck_change" | "hero_tour_open" | "hero_gallery_open" | "units_change" | "model_save" | "model_share" | "generation_show" | "review_video_open" | "listings_see_all" | "model_alert_subscribe"} event
 * @param {Record<string, string | number | boolean>} [props]
 */
export function track(event, props = {}) {
  window.dataLayer?.push({ event, ...props });
}
