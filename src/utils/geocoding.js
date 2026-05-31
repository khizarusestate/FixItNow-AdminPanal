import { API_BASE_URL } from "../config/env.js";

async function parseGeocodeResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || "Geocoding request failed.");
  }
  if (!body.success) {
    throw new Error(body.message || "Geocoding request failed.");
  }
  return body.data;
}

export async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  });
  const response = await fetch(`${API_BASE_URL}/geocode/reverse?${params}`);
  return parseGeocodeResponse(response);
}

export async function searchPlaces(query) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${API_BASE_URL}/geocode/search?${params}`);
  const data = await parseGeocodeResponse(response);
  return Array.isArray(data) ? data : [];
}
