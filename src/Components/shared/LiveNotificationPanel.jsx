import { Bell } from "lucide-react";

const VARIANT_STYLES = {
  admin: {
    panel: "bg-orange-500 border-orange-600",
    action: "bg-white text-orange-600 hover:bg-orange-50",
    dismiss: "bg-white/20 hover:bg-white/30 text-white",
  },
  super_admin: {
    panel: "bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400",
    action: "bg-white text-cyan-800 hover:bg-cyan-50",
    dismiss: "bg-white/20 hover:bg-white/30 text-white",
  },
};

export default function LiveNotificationPanel({
  variant = "admin",
  title,
  message,
  actions = [],
  dismissOnly = false,
  onDismiss,
}) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.admin;

  return (
    <div className="fixed top-20 right-4 z-[60] max-w-sm w-[min(100%,22rem)] animate-slideInRight">
      <div
        className={`text-white rounded-xl shadow-2xl p-4 border-l-4 ${styles.panel}`}
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white mb-1 text-sm">{title}</h4>
            {message ? (
              <p className="text-sm text-white/90 leading-snug">{message}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={`text-xs px-3 py-1.5 rounded font-semibold transition-colors ${styles.action}`}
                >
                  {action.label}
                </button>
              ))}
              {dismissOnly || actions.length === 0 ? (
                <button
                  type="button"
                  onClick={onDismiss}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${styles.dismiss}`}
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
