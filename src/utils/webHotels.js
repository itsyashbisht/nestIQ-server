import { ApiError } from "./apiError.js";

const GOOGLE_PLACES_TEXTSEARCH_URL =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";

const toMapUrl = (placeId) =>
  placeId
    ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(
        placeId,
      )}`
    : undefined;

/**
 * Returns "real" hotel candidates from the web via Google Places Text Search.
 *
 * Important: this requires `GOOGLE_PLACES_API_KEY` in env (billing-enabled key).
 * If the key is missing, we return an empty list so callers can fallback to DB.
 */
export const searchWebHotels = async ({ query, city, limit = 10 }) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  if (typeof fetch !== "function") {
    throw new ApiError(
      500,
      "Global fetch is not available in this Node runtime",
    );
  }

  const q = city ? `${query} in ${city}` : `${query} hotels`;
  const url = new URL(GOOGLE_PLACES_TEXTSEARCH_URL);
  url.searchParams.set("query", q);
  // Keep results biased toward "lodging" keywords.
  url.searchParams.set("type", "lodging");
  url.searchParams.set("key", apiKey);

  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) {
    throw new ApiError(502, `Places API failed (${resp.status})`);
  }

  const data = await resp.json();
  const status = data?.status;
  if (status && status !== "OK" && status !== "ZERO_RESULTS") {
    // e.g. REQUEST_DENIED, OVER_QUERY_LIMIT, INVALID_REQUEST
    throw new ApiError(502, `Places API error: ${status}`);
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  return results.slice(0, limit).map((r) => ({
    source: "web",
    name: r.name,
    address: r.formatted_address,
    rating: typeof r.rating === "number" ? r.rating : undefined,
    userRatingsTotal:
      typeof r.user_ratings_total === "number"
        ? r.user_ratings_total
        : undefined,
    placeId: r.place_id,
    mapUrl: toMapUrl(r.place_id),
  }));
};

