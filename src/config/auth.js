import { API_BASE_URL } from "./env.js";

/**
 * HttpOnly auth is safe for the production FixItNow domains because
 * fixitnow.cloud and fixitnow.pk are different origins but the same site.
 */
function isFixItNowProductionSite() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === "fixitnow.cloud" ||
    host.endsWith(".fixitnow.cloud") ||
    host === "fixitnow.pk" ||
    host.endsWith(".fixitnow.pk")
  );
}

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

// cloud -> pk is cross-origin but same-site, so credentialed HttpOnly cookies work.
export const USE_HTTPONLY_COOKIES =
  envPrefersCookies &&
  (isFixItNowProductionSite() || !isCrossOriginApi());

export const SESSION_ROLE_KEY = "fixitnow_admin_session_active";
