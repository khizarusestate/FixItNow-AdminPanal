import { resolveMediaUrl } from "../lib/media.js";

/**
 * Resolve API origin (no trailing /api) for building absolute asset URLs.
 */
export function getApiOriginForAssets() {
  const base =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  return base.replace(/\/api\/?$/, "");
}

/**
 * Turn stored paths (/uploads/..., data:, or absolute URLs) into a browser-loadable URL.
 */
export function resolveUploadMediaUrl(url) {
  const resolved = resolveMediaUrl(url);
  return resolved || "";
}

export { resolveMediaUrl };
