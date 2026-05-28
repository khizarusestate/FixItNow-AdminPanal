import { createApiClientError } from "../utils/apiError.js";
import { API_BASE_URL } from "../config/env.js";
import { USE_HTTPONLY_COOKIES, SESSION_ROLE_KEY } from "../config/auth.js";
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY_BASE = 1000;

// Track ongoing refresh to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

// ================= TOKEN HANDLING =================
export function getAdminToken() {
  if (USE_HTTPONLY_COOKIES) return null;
  return localStorage.getItem("fixitnow_admin_token");
}

export function getAdminRefreshToken() {
  if (USE_HTTPONLY_COOKIES) return null;
  return localStorage.getItem("fixitnow_admin_refresh_token");
}

// Alias for socket context
export function getToken() {
  return localStorage.getItem("fixitnow_admin_token");
}

export function setAdminToken(token) {
  if (USE_HTTPONLY_COOKIES) return;
  localStorage.setItem("fixitnow_admin_token", token);
}

export function setAdminRefreshToken(token) {
  if (USE_HTTPONLY_COOKIES) return;
  localStorage.setItem("fixitnow_admin_refresh_token", token);
}

export function markAdminCookieSession() {
  if (USE_HTTPONLY_COOKIES) {
    localStorage.setItem(SESSION_ROLE_KEY, "1");
  }
}

export function clearAdminToken() {
  localStorage.removeItem("fixitnow_admin_token");
  localStorage.removeItem("fixitnow_admin_refresh_token");
  localStorage.removeItem(SESSION_ROLE_KEY);
  clearStoredAdminSession();
}

export function isAdminAuthenticated() {
  if (USE_HTTPONLY_COOKIES) {
    return (
      !!localStorage.getItem(SESSION_ROLE_KEY) && !!getStoredAdminSession()
    );
  }
  return !!getAdminToken();
}

const ADMIN_SESSION_KEY = "fixitnow_admin_session";

export function getStoredAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAdminSession(session) {
  if (session) {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  }
}

export function clearStoredAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function isSuperAdminRole(role) {
  return role === "super_admin";
}

// ================= HELPER FUNCTIONS =================
async function fetchWithTimeout(url, options, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection.");
    }
    throw error;
  }
}

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(newToken, newRefreshToken) {
  refreshSubscribers.forEach((callback) => callback(newToken, newRefreshToken));
  refreshSubscribers = [];
}

async function refreshAccessToken() {
  const refreshToken = getAdminRefreshToken();
  if (!USE_HTTPONLY_COOKIES && !refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Token refresh failed");
  }

  if (!USE_HTTPONLY_COOKIES) {
    setAdminToken(data.accessToken || data.token);
    if (data.refreshToken) {
      setAdminRefreshToken(data.refreshToken);
    }
  }

  return {
    accessToken: data.accessToken || data.token,
    refreshToken: data.refreshToken,
  };
}

// ================= CORE REQUEST =================
export async function apiRequest(
  path,
  options = {},
  retryCount = 0,
  isRetry = false,
) {
  const token = getAdminToken();
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body || null,
    });

    // If a proxy/CDN redirects (302) to an HTML login page, treat as session end.
    // The admin API should return JSON 401/403; redirects cause false "deactivated" style UX.
    if (response.redirected || response.status === 302) {
      clearAdminToken();
      window.dispatchEvent(
        new CustomEvent("admin-logout", {
          detail: { reason: "Session expired. Please login again." },
        }),
      );
      throw new Error("Session expired. Please login again.");
    }

    let data = {};

    try {
      data = await response.json();
    } catch {
      // non-JSON response safe fallback
    }

    if (
      response.status === 403 &&
      (data.code === "ADMIN_DEACTIVATED" || data.code === "ADMIN_NOT_FOUND")
    ) {
      clearAdminToken();
      window.dispatchEvent(
        new CustomEvent("admin-logout", {
          detail: { reason: data.message || "Access revoked." },
        }),
      );
      throw new Error(data.message || "Access revoked.");
    }

    const isCredentialRequest =
      path === "/admin/login" || options.skipAuthRefresh === true;

    if (response.status === 401 && !isRetry && isCredentialRequest) {
      throw createApiClientError(data, response.status);
    }

    // 🔐 Unauthorized → try token refresh
    if (response.status === 401 && !isRetry) {
      const refreshToken = getAdminRefreshToken();
      const canRefresh = refreshToken || USE_HTTPONLY_COOKIES;
      if (canRefresh && !isRefreshing) {
        isRefreshing = true;
        try {
          const { accessToken, refreshToken: newRefreshToken } =
            await refreshAccessToken();
          onTokenRefreshed(accessToken, newRefreshToken);
          isRefreshing = false;

          // Retry with refreshed Bearer token (required when API is on another domain)
          const retryHeaders = { ...(options.headers || {}) };
          if (accessToken) {
            retryHeaders.Authorization = `Bearer ${accessToken}`;
          }
          return apiRequest(
            path,
            { ...options, headers: retryHeaders },
            retryCount,
            true,
          );
        } catch (refreshError) {
          isRefreshing = false;
          console.error("Token refresh failed:", refreshError);
          clearAdminToken();
          // Dispatch custom event to notify app of logout
          window.dispatchEvent(
            new CustomEvent("admin-logout", {
              detail: { reason: "Session expired. Please login again." },
            }),
          );
          throw new Error("Session expired. Please login again.");
        }
      } else if (canRefresh && isRefreshing) {
        // Wait for the ongoing refresh to complete
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken, newRefreshToken) => {
            resolve(apiRequest(path, options, retryCount, true));
          });
        });
      } else {
        // No refresh token available, logout
        clearAdminToken();
        // Dispatch custom event to notify app of logout
        window.dispatchEvent(
          new CustomEvent("admin-logout", {
            detail: { reason: "Session expired. Please login again." },
          }),
        );
        throw new Error("Session expired. Please login again.");
      }
    }

    // Retry on 5xx server errors
    if (response.status >= 500 && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
      await new Promise((r) => setTimeout(r, delay));
      return apiRequest(path, options, retryCount + 1, isRetry);
    }

    // ❌ API error
    if (!response.ok || data.success === false) {
      throw createApiClientError(data, response.status);
    }

    return data;
  } catch (error) {
    // Retry on network errors
    if (
      (error.message === "Failed to fetch" ||
        error.message.includes("timed out")) &&
      retryCount < MAX_RETRIES
    ) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
      await new Promise((r) => setTimeout(r, delay));
      return apiRequest(path, options, retryCount + 1, isRetry);
    }

    if (error?.name === "ApiClientError") {
      throw error;
    }
    console.error("API Error:", error.message);
    throw new Error(error.message || "Network error. Please try again.");
  }
}

// ================= PAGINATED REQUEST =================
export async function paginatedRequest(path, params = {}) {
  const { page = 1, limit = 10, sort = "-createdAt", ...otherParams } = params;

  let sortBy = "createdAt";
  let order = "desc";
  if (typeof sort === "string" && sort.startsWith("-")) {
    sortBy = sort.slice(1) || "createdAt";
    order = "desc";
  } else if (typeof sort === "string" && sort) {
    sortBy = sort;
    order = "asc";
  }

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    order,
    ...Object.fromEntries(
      Object.entries(otherParams).filter(
        ([, v]) => v != null && v !== "",
      ),
    ),
  });

  const queryString = queryParams.toString();
  const url = queryString ? `${path}?${queryString}` : path;

  const data = await apiRequest(url);
  if (data?.pagination) {
    data.pagination.totalPages =
      data.pagination.totalPages ?? data.pagination.pages ?? 1;
  }
  return data;
}
