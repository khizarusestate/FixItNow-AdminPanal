import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  apiRequest,
  getAdminToken,
  getStoredAdminSession,
  setStoredAdminSession,
  clearStoredAdminSession,
  clearAdminToken,
} from "../lib/api";

const AdminContext = createContext(null);

function buildSession(data, stored = null) {
  const id = String(data._id || data.id || "");
  return {
    id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role || "admin",
    // NOTE: Deactivation is enforced by backend 403 (ADMIN_DEACTIVATED).
    // Keep this field defensive to avoid false negatives from malformed responses.
    isActive: data.isActive !== false,
    profilePicture: data.profilePicture || "",
    loginAs: stored?.loginAs || (data.role === "super_admin" ? "super_admin" : "admin"),
  };
}

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(() => getStoredAdminSession());
  const [loading, setLoading] = useState(!!getAdminToken());

  const refreshAdmin = useCallback(async () => {
    const stored = getStoredAdminSession();
    if (!getAdminToken()) {
      setAdmin(null);
      setLoading(false);
      return null;
    }
    try {
      const res = await apiRequest("/admin/me");
      const data = res.data || {};
      const session = buildSession(data, stored);

      if (stored?.id && String(stored.id) !== session.id) {
        clearAdminToken();
        window.dispatchEvent(
          new CustomEvent("admin-logout", {
            detail: { reason: "Session mismatch detected. Please sign in again." },
          }),
        );
        setAdmin(null);
        return null;
      }

      if (stored?.loginAs && stored.loginAs !== session.role) {
        clearAdminToken();
        window.dispatchEvent(
          new CustomEvent("admin-logout", {
            detail: { reason: "Session role mismatch. Please sign in again." },
          }),
        );
        setAdmin(null);
        return null;
      }

      setAdmin(session);
      setStoredAdminSession(session);
      return session;
    } catch {
      if (!getAdminToken()) {
        setAdmin(null);
        return null;
      }
      setAdmin(stored);
      return stored;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAdmin();
    const onProfileUpdated = () => refreshAdmin();
    window.addEventListener("admin-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("admin-profile-updated", onProfileUpdated);
  }, [refreshAdmin]);

  const setAdminSession = (session) => {
    if (session?.id) {
      const normalized = { ...session, id: String(session.id) };
      setAdmin(normalized);
      setStoredAdminSession(normalized);
    } else {
      setAdmin(null);
      clearStoredAdminSession();
    }
  };

  const isSuperAdmin = admin?.role === "super_admin";

  return (
    <AdminContext.Provider
      value={{
        admin,
        loading,
        isSuperAdmin,
        refreshAdmin,
        setAdminSession,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return ctx;
}
