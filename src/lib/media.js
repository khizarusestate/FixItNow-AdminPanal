import { API_BASE_URL, API_ORIGIN } from "../config/env.js";

/** Resolve upload paths for admin UI (split-host prod needs API origin). */
export function resolveMediaUrl(path) {
  if (!path) return null;
  const raw = String(path).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("data:")) return raw;

  let normalized = raw.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  const uploadsIdx = lower.indexOf("/uploads/");
  if (uploadsIdx >= 0) {
    normalized = normalized.slice(uploadsIdx);
  }
  normalized = normalized.replace(/^\/api\/uploads\//i, "/uploads/");
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  if (!normalized.startsWith("/uploads/")) {
    return normalized;
  }

  // Absolute API URL in env → always load media from API host
  if (API_BASE_URL.startsWith("http") && API_ORIGIN) {
    return `${API_ORIGIN}${normalized}`;
  }

  // Relative /api (same admin origin) → /uploads must be proxied on admin host
  if (typeof window !== "undefined") {
    return normalized;
  }

  return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
}
