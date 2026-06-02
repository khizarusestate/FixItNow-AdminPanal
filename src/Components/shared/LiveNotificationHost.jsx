import { useCallback, useEffect, useRef, useState } from "react";
import { useAdmin } from "../../context/AdminContext.jsx";
import LiveNotificationPanel from "./LiveNotificationPanel.jsx";
import {
  resolveAdminLiveNotification,
  runAdminLiveAction,
} from "../../utils/liveNotificationActions.js";

const AUTO_DISMISS_MS = 8000;

function normalizeDetail(raw) {
  if (!raw || typeof raw !== "object") {
    return { title: "Live update", message: "" };
  }
  const message = raw.message || raw.body || "";
  const title =
    raw.title ||
    (raw.type && raw.type !== "notification" && raw.type !== "info"
      ? `New ${String(raw.type).replace(/_/g, " ")}`
      : "Live update");

  return {
    ...raw,
    title,
    message,
    sectionType: raw.sectionType || raw.type,
  };
}

export default function LiveNotificationHost() {
  const { admin } = useAdmin();
  const isSuperAdmin = admin?.role === "super_admin";
  const variant = isSuperAdmin ? "super_admin" : "admin";

  const [current, setCurrent] = useState(null);
  const queueRef = useRef([]);
  const showingRef = useRef(false);

  const dismiss = useCallback(() => {
    showingRef.current = false;
    setCurrent(null);
    const next = queueRef.current.shift();
    if (next) {
      setTimeout(() => {
        showingRef.current = true;
        setCurrent(next);
      }, 200);
    }
  }, []);

  const enqueue = useCallback(
    (detail) => {
      const normalized = normalizeDetail(detail);
      const key = normalized.id || `${normalized.title}-${normalized.message}`;
      if (
        queueRef.current.some(
          (q) => (q.id || `${q.title}-${q.message}`) === key,
        ) ||
        (current &&
          (current.id || `${current.title}-${current.message}`) === key)
      ) {
        return;
      }

      if (!showingRef.current && !current) {
        showingRef.current = true;
        setCurrent(normalized);
        return;
      }
      queueRef.current.push(normalized);
    },
    [current],
  );

  useEffect(() => {
    if (!current) return undefined;
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [current, dismiss]);

  useEffect(() => {
    const onPersisted = (e) => {
      enqueue(e.detail || {});
    };
    const onLegacy = (e) => {
      enqueue(e.detail || {});
    };

    window.addEventListener("admin-notification-new", onPersisted);
    window.addEventListener("admin-live-alert", onLegacy);
    return () => {
      window.removeEventListener("admin-notification-new", onPersisted);
      window.removeEventListener("admin-live-alert", onLegacy);
    };
  }, [enqueue]);

  if (!admin || !current) return null;

  const resolved = resolveAdminLiveNotification(current);
  const panelActions = resolved.actions.map((a) => ({
    label: a.label,
    onClick: () => {
      runAdminLiveAction(a.section);
      dismiss();
    },
  }));

  return (
    <LiveNotificationPanel
      variant={variant}
      title={resolved.title}
      message={resolved.message}
      actions={panelActions}
      dismissOnly={resolved.dismissOnly}
      onDismiss={dismiss}
    />
  );
}
