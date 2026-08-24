import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  apiRequest,
  clearAdminToken,
  clearStoredAdminSession,
} from "../lib/api";

export default function AdminAccountDangerZone({ role }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (role === "super_admin") {
    return null;
  }

  const handleDelete = async () => {
    if (!/^\d{8}$/.test(pin)) {
      setError("Enter your current 8-digit PIN.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiRequest("/admin/profile/delete-account", {
        method: "DELETE",
        body: JSON.stringify({
          currentPassword: pin,
        }),
      });

      clearAdminToken();
      clearStoredAdminSession();

      window.dispatchEvent(
        new CustomEvent("admin-logout", {
          detail: { reason: "Account deleted." },
        }),
      );

      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Failed to delete account.");
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-red-100 p-3 shrink-0">
          <AlertTriangle size={22} className="text-red-600" />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-red-900">
            Danger Zone
          </h3>

          <p className="text-sm text-red-700 mt-1">
            Permanently remove your admin account. This action cannot be undone.
          </p>

          {!open ? (
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setError("");
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              <Trash2 size={16} />
              Delete Account
            </button>
          ) : (
            <div className="mt-4 space-y-3 max-w-sm">
              <p className="text-sm font-semibold text-red-900">
                Confirm with your current 8-digit PIN.
              </p>

              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                placeholder="Current 8-digit PIN"
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-red-200"
              />

              {error && (
                <div className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setPin("");
                    setError("");
                  }}
                  className="flex-1 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDelete}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
