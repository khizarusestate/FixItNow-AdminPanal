const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

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
