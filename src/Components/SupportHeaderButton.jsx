import { Headset } from "lucide-react";
import { useEffect, useState } from "react";
import { useSocketEvent } from "../context/SocketContext";

export default function SupportHeaderButton({ onNavigate }) {
  const [unread, setUnread] = useState(0);

  useSocketEvent("support-message-new", (message = {}) => {
    if (message.senderRole === "admin") return;
    setUnread((count) => Math.min(count + 1, 99));
  });

  useEffect(() => {
    const onNavigateSupport = (event) => {
      if (event.detail?.section === "support-messages") setUnread(0);
    };
    window.addEventListener("admin-navigate", onNavigateSupport);
    return () => window.removeEventListener("admin-navigate", onNavigateSupport);
  }, []);

  const open = () => {
    setUnread(0);
    onNavigate?.("support-messages");
  };

  return (
    <button
      type="button"
      onClick={open}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
      title="Support Messages"
      aria-label="Support Messages"
    >
      <Headset size={18} />
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
