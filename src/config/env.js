import { normalizeApiBaseUrl, resolveApiBaseUrl } from "./normalizeApiUrl.js";

export const PRODUCTION_API_BASE_URL =
  "https://fixitnow-backand-production.up.railway.app/api";

export const PRODUCTION_SOCKET_URL =
  "https://fixitnow-backand-production.up.railway.app";

const DEV_API_BASE_URL = "http://localhost:5000/api";

const rawApiBase = resolveApiBaseUrl({
  fromEnv: import.meta.env.VITE_API_BASE_URL,
  prodDefault: PRODUCTION_API_BASE_URL,
  devDefault: DEV_API_BASE_URL,
  isProd: import.meta.env.PROD,
});

export const API_BASE_URL = rawApiBase.replace(/\/$/, "");
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export const SOCKET_URL = (() => {
  const explicit = import.meta.env.VITE_SOCKET_URL?.trim();
  if (explicit) return normalizeApiBaseUrl(explicit);
  if (!API_ORIGIN || API_BASE_URL.startsWith("/")) return "";
  return API_ORIGIN;
})();

export const IS_PROD = import.meta.env.PROD;
