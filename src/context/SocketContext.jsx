import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io } from "socket.io-client";
import {
  apiRequest,
  getToken,
  getStoredAdminSession,
  clearAdminToken,
} from "../lib/api";
import { SOCKET_URL } from "../config/env.js";
import { USE_HTTPONLY_COOKIES, SESSION_ROLE_KEY } from "../config/auth.js";

const SocketContext = createContext(null);

let audioContext = null;

const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
};

const playNotificationSound = () => {
  try {
    initAudioContext();
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1200, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.start(now);
    osc1.stop(now + 0.25);
  } catch {
    /* ignore */
  }
};

const loadBadgesFromStorage = () => {
  try {
    const stored = localStorage.getItem("fixitnow_admin_badges");
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore */
  }
  return {
    bookings: 0,
    workers: 0,
    customers: 0,
    services: 0,
    advertisements: 0,
    reviews: 0,
  };
};

const saveBadgesToStorage = (badges) => {
  try {
    localStorage.setItem("fixitnow_admin_badges", JSON.stringify(badges));
  } catch {
    /* ignore */
  }
};

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [badges, setBadges] = useState(loadBadgesFromStorage);
  const socketRef = useRef(null);

  const clearBadge = useCallback((type) => {
    setBadges((prev) => {
      const newBadges = { ...prev, [type]: 0 };
      saveBadgesToStorage(newBadges);
      return newBadges;
    });
  }, []);

  const clearAllBadges = useCallback(() => {
    const empty = {
      bookings: 0,
      workers: 0,
      customers: 0,
      services: 0,
      advertisements: 0,
      reviews: 0,
    };
    saveBadgesToStorage(empty);
    setBadges(empty);
  }, []);

  const joinAdminRooms = useCallback((sock) => {
    if (!sock?.connected) return;
    const token = getToken();
    if (token) {
      sock.emit("join-admin", token);
    } else if (USE_HTTPONLY_COOKIES && localStorage.getItem(SESSION_ROLE_KEY)) {
      sock.emit("join-admin");
    }
  }, []);

  const loadInitialBadges = useCallback(async () => {
    if (!getToken() && !(USE_HTTPONLY_COOKIES && localStorage.getItem(SESSION_ROLE_KEY))) {
      return;
    }

    try {
      const response = await apiRequest("/admin/summary");
      const summary = response.data || {};
      setBadges((prev) => {
        const newBadges = {
          ...prev,
          bookings: summary.pendingBookings || 0,
          workers: summary.pendingWorkers || 0,
        };
        saveBadgesToStorage(newBadges);
        return newBadges;
      });
    } catch {
      // Ignore badge sync failures during initial connection
    }
  }, []);

  useEffect(() => {
    const handleFirstClick = () => {
      initAudioContext();
      document.removeEventListener("click", handleFirstClick);
    };
    document.addEventListener("click", handleFirstClick);
    return () => document.removeEventListener("click", handleFirstClick);
  }, []);

  useEffect(() => {
    const socketUrl = SOCKET_URL;

    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      withCredentials: true,
    });

    socketRef.current = newSocket;

    newSocket.on("connect", async () => {
      setConnected(true);
      joinAdminRooms(newSocket);
      await loadInitialBadges();
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.warn("Admin socket connect error:", error);
    });

    newSocket.on("notification", (data) => {
      const isNewItem =
        data.action === "created" ||
        data.action === "new" ||
        data.message?.toLowerCase().includes("new") ||
        data.message?.toLowerCase().includes("created");

      if (isNewItem && data.type) {
        playNotificationSound();
        setBadges((prev) => {
          const newCount = Math.min((prev[data.type] || 0) + 1, 9);
          const newBadges = { ...prev, [data.type]: newCount };
          saveBadgesToStorage(newBadges);
          return newBadges;
        });
      }

      window.dispatchEvent(
        new CustomEvent("admin-notification-new", {
          detail: {
            id: data.id || `legacy-${data.type}-${Date.now()}`,
            title: data.title || "Live update",
            message: data.message || "",
            sectionType: data.type,
            type: data.type,
          },
        }),
      );
    });

    newSocket.on("notification-new", (data) => {
      playNotificationSound();
      window.dispatchEvent(
        new CustomEvent("admin-notification-new", {
          detail: {
            id: data.id || `persisted-${Date.now()}`,
            title: data.title || "Notification",
            message: data.message || "",
            type: data.type,
            link: data.link,
            sectionType: data.type,
          },
        }),
      );
    });

    newSocket.on("admin-force-logout", (payload) => {
      const myId = String(getStoredAdminSession()?.id || "");
      const targetId = String(payload?.adminId || "");
      if (!myId || (targetId && targetId !== myId)) return;

      clearAdminToken();
      window.dispatchEvent(
        new CustomEvent("admin-logout", {
          detail: {
            reason:
              payload?.reason || "Your access was revoked by the super admin.",
            forced: true,
          },
        }),
      );
    });

    newSocket.on("admin-team-updated", () => {
      window.dispatchEvent(new CustomEvent("admin-team-updated"));
    });
    newSocket.on("admin-status-updated", async (payload = {}) => {
      window.dispatchEvent(new CustomEvent("admin-team-updated"));

      // Super admin live feed: "Khizar is active now" / "Khizar is inactive".
      try {
        const me = getStoredAdminSession();
        if (me?.role !== "super_admin") return;

        const adminId = String(payload?.adminId || "");
        let adminName = adminId ? `Admin ${adminId.slice(-4)}` : "An admin";

        if (adminId) {
          const res = await apiRequest("/admin/team");
          const team = Array.isArray(res?.data) ? res.data : [];
          const match = team.find(
            (a) => String(a.id || a._id || "") === adminId,
          );
          if (match?.name) adminName = match.name;
        }

        const isActiveNow = payload?.status === "active";
        playNotificationSound();
        window.dispatchEvent(
          new CustomEvent("admin-notification-new", {
            detail: {
              id: `admin-status-${adminId || Date.now()}-${Date.now()}`,
              title: "Admin Activity",
              message: `${adminName} is ${isActiveNow ? "active now" : "inactive"}.`,
              type: "admins",
              sectionType: "admins",
            },
          }),
        );
      } catch {
        /* ignore live status notification failures */
      }
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [joinAdminRooms]);

  useEffect(() => {
    const onReconnectAuth = async () => {
      if (socketRef.current?.connected) {
        joinAdminRooms(socketRef.current);
        await loadInitialBadges();
      }
    };
    window.addEventListener("admin-auth-restored", onReconnectAuth);
    return () =>
      window.removeEventListener("admin-auth-restored", onReconnectAuth);
  }, [joinAdminRooms, loadInitialBadges]);

  return (
    <SocketContext.Provider
      value={{ socket, connected, badges, clearBadge, clearAllBadges }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}

export function useSocketEvent(event, callback) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, [socket, event, callback]);
}

export function useRefresh(type, callback) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleRefresh = (data) => {
      if (type === "all" || data.type === type || data.type === "all") {
        callback();
      }
    };

    socket.on("refresh", handleRefresh);
    return () => socket.off("refresh", handleRefresh);
  }, [socket, type, callback]);
}

export default SocketContext;
