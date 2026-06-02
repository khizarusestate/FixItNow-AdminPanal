/** Build location picker value from API user object */
export function geoFromUser(user) {
  if (!user) {
    return { location: "", latitude: null, longitude: null, placeId: "" };
  }
  return {
    location:
      user.location || user.address || user.serviceArea || "",
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    placeId: user.placeId || "",
  };
}

export function hasLocation(user) {
  return Boolean(geoFromUser(user).location?.trim());
}
