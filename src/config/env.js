const rawApiBase =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const API_BASE_URL = rawApiBase.replace(/\/$/, "");
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export const SOCKET_URL = (() => {
  const explicit = import.meta.env.VITE_SOCKET_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (!API_ORIGIN || API_BASE_URL.startsWith("/")) return "";
  return API_ORIGIN;
})();

export const IS_PROD = import.meta.env.PROD;
