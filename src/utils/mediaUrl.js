import { API_ORIGIN } from "../config/env.js";
import { resolveMediaUrl } from "../lib/media.js";

/**
 * Resolve API origin (no trailing /api) for building absolute asset URLs.
 */
export function getApiOriginForAssets() {
  return API_ORIGIN;
}

/**
 * Turn stored paths (/uploads/..., data:, or absolute URLs) into a browser-loadable URL.
 */
export function resolveUploadMediaUrl(url) {
  const resolved = resolveMediaUrl(url);
  return resolved || "";
}

export { resolveMediaUrl };
