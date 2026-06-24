import { API_BASE_URL } from "./env.js";

/**
 * HttpOnly cookies only work when the admin UI and API share the same site
 * (e.g. Vite proxy /api on localhost). Vercel admin + Railway API are cross-origin;
 * browsers block third-party cookies, so we use Bearer tokens in localStorage.
 */
function isCrossOriginApi() {
  if (typeof window === "undefined") return false;
  const raw = import.meta.env.VITE_API_BASE_URL?.trim() || API_BASE_URL;
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    return false;
  }
  try {
    const apiOrigin = new URL(raw.replace(/\/api\/?$/, "") || raw).origin;
    return apiOrigin !== window.location.origin;
  } catch {
    return false;
  }
}

const envPrefersCookies =
  import.meta.env.VITE_USE_HTTPONLY_COOKIES !== "false";

export const USE_HTTPONLY_COOKIES = envPrefersCookies && !isCrossOriginApi();

export const SESSION_ROLE_KEY = "fixitnow_admin_session_active";
