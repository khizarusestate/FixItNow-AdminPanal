import { useState, useRef, useEffect } from "react";
import { Lock, Mail, Crown, Shield, ArrowLeft, Sparkles } from "lucide-react";
import {
  setAdminToken,
  setAdminRefreshToken,
  setStoredAdminSession,
  apiRequest,
  markAdminCookieSession,
} from "../lib/api";
import { useAdmin } from "../context/AdminContext";
import AdminLogo from "./shared/AdminLogo";
import { ADMIN_THEME, SUPER_ADMIN_THEME } from "../config/theme";

export default function PinLogin({ onLogin, sessionExpired = false, logoutMessage = "" }) {
  const { setAdminSession } = useAdmin();
  const [loginAs, setLoginAs] = useState(null);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", "", "", ""]);
  const [error, setError] = useState(
    logoutMessage || (sessionExpired ? "Session expired. Please login again." : ""),
  );
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const theme = loginAs === "super_admin" ? SUPER_ADMIN_THEME : ADMIN_THEME;
  const isSuperPortal = loginAs === "super_admin";

  useEffect(() => {
    if (loginAs) inputRefs.current[0]?.focus();
  }, [loginAs]);

  const resetPin = () => {
    setPin(["", "", "", "", "", "", "", ""]);
    setTimeout(() => inputRefs.current[0]?.focus(), 80);
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError("");
    if (value && index < 7) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (pasted.length === 8) {
      setPin(pasted.split(""));
      inputRefs.current[7]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pinCode = pin.join("");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (pinCode.length !== 8) {
      setError("Please enter an 8-digit PIN.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, pin: pinCode, loginAs }),
      });

      setAdminToken(response.token || response.accessToken);
      if (response.refreshToken) setAdminRefreshToken(response.refreshToken);
      markAdminCookieSession();

      if (response.admin) {
        const session = {
          id: String(response.admin.id),
          name: response.admin.name,
          email: response.admin.email,
          phone: response.admin.phone,
          role: response.admin.role || loginAs,
          isActive: response.admin.isActive ?? true,
          loginAs,
        };
        if (session.role !== loginAs) {
          setError("This account cannot use this login portal.");
          setLoading(false);
          return;
        }
        setStoredAdminSession(session);
        setAdminSession(session);
      }

      window.dispatchEvent(new Event("admin-auth-restored"));
      onLogin?.();
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
      resetPin();
    } finally {
      setLoading(false);
    }
  };

  const pickPortal = (type) => {
    setLoginAs(type);
    setError("");
    setEmail("");
    resetPin();
  };

  if (!loginAs) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50/30 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <AdminLogo size="xl" className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900">Fix It Now</h1>
            <p className="text-slate-500 mt-2">Choose how you want to sign in</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => pickPortal("super_admin")}
              className="group text-left rounded-2xl border-2 border-violet-300/60 bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 p-6 shadow-xl shadow-violet-900/30 hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-violet-500/20 border border-violet-400/30">
                  <Crown className="text-amber-300" size={28} />
                </div>
                <Sparkles className="text-violet-400 ml-auto" size={20} />
              </div>
              <h2 className="text-lg font-bold text-white">Super Admin</h2>
              <p className="text-sm text-violet-300/90 mt-2 leading-relaxed">
                Full control: all admin tools plus team management & platform settings.
              </p>
              <p className="text-xs text-violet-400/70 mt-4 font-medium uppercase tracking-wider">
                Single owner account
              </p>
            </button>

            <button
              type="button"
              onClick={() => pickPortal("admin")}
              className="group text-left rounded-2xl border-2 border-orange-200 bg-white p-6 shadow-lg hover:border-orange-400 hover:scale-[1.02] transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-orange-100">
                  <Shield className="text-orange-600" size={28} />
                </div>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Admin</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Day-to-day operations: bookings, workers, customers, services & reviews.
              </p>
              <p className="text-xs text-orange-500 mt-4 font-medium uppercase tracking-wider">
                Team accounts
              </p>
            </button>
          </div>

          {sessionExpired && (
            <p className="text-center text-sm text-amber-700 mt-6 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3">
              Your session expired. Please sign in again.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${isSuperPortal ? theme.pageBg : "bg-slate-50"}`}
    >
      <div className="w-full max-w-sm">
        <div
          className={`rounded-2xl p-8 border ${
            isSuperPortal
              ? "bg-slate-900/80 backdrop-blur border-violet-500/30 shadow-2xl shadow-violet-900/40"
              : "bg-white shadow-lg border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setLoginAs(null)}
            className={`flex items-center gap-1 text-sm mb-6 ${
              isSuperPortal ? "text-violet-300 hover:text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ArrowLeft size={16} />
            Change login type
          </button>

          <div className="flex flex-col items-center mb-6">
            {isSuperPortal ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/30 mb-4">
                <Crown size={40} className="text-amber-300" />
              </div>
            ) : (
              <AdminLogo size="xl" className="mb-4" />
            )}
            <h2
              className={`text-xl font-bold ${isSuperPortal ? "text-white" : "text-slate-900"}`}
            >
              {theme.loginTitle}
            </h2>
            <p
              className={`text-sm mt-1 text-center ${isSuperPortal ? "text-violet-300/80" : "text-slate-500"}`}
            >
              {theme.loginSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label
                className={`block text-sm font-medium mb-2 ${isSuperPortal ? "text-violet-200" : "text-slate-700"}`}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${isSuperPortal ? "text-violet-400" : "text-slate-400"}`}
                  size={18}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isSuperPortal ? "superadmin@email.com" : "admin@email.com"}
                  disabled={loading}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border outline-none focus:ring-2 transition ${
                    isSuperPortal
                      ? "bg-slate-800/80 border-violet-700/50 text-white placeholder:text-violet-500 focus:ring-violet-500"
                      : "border-slate-300 focus:ring-orange-500 focus:border-orange-500"
                  }`}
                />
              </div>
            </div>

            <div className="mb-6">
              <label
                className={`block text-sm font-medium mb-2 ${isSuperPortal ? "text-violet-200" : "text-slate-700"}`}
              >
                8-digit PIN
              </label>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading}
                    className={`w-9 h-12 text-center text-xl font-semibold rounded-lg border focus:ring-2 transition ${
                      isSuperPortal
                        ? "bg-slate-800 border-violet-700/60 text-white focus:ring-violet-500"
                        : "border-slate-300 focus:ring-orange-500"
                    }`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div
                className={`mb-4 rounded-lg px-3 py-2 text-sm text-center border ${
                  isSuperPortal
                    ? "bg-red-950/50 border-red-800 text-red-300"
                    : "bg-red-50 border-red-200 text-red-600"
                }`}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.some((d) => !d) || !email}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-white disabled:opacity-50 transition ${theme.primary}`}
            >
              <Lock size={18} />
              {loading ? "Verifying..." : `Enter as ${theme.label}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
