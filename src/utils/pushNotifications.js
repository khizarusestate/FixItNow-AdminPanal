import { apiRequest } from "../lib/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function fetchDevicePushPreference() {
  const res = await apiRequest("/push/preferences");
  return res?.data?.devicePushEnabled !== false;
}

export async function saveDevicePushPreference(enabled) {
  const res = await apiRequest("/push/preferences", {
    method: "PATCH",
    body: JSON.stringify({ devicePushEnabled: enabled }),
  });
  return res?.data?.devicePushEnabled !== false;
}

async function getVapidPublicKey() {
  const res = await apiRequest("/push/vapid-public-key");
  return res?.data?.publicKey || "";
}

export async function registerWebPushAdmin() {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };

  const publicKey = await getVapidPublicKey();
  if (!publicKey) return { ok: false, reason: "disabled" };

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return {
      ok: false,
      reason: permission === "denied" ? "denied" : "dismissed",
    };
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await apiRequest("/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  return { ok: true };
}

export async function unregisterWebPushAdmin() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager?.getSubscription();
    if (subscription) {
      await apiRequest("/push/subscribe", {
        method: "DELETE",
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});
      await subscription.unsubscribe();
    }
  } catch {
    /* best effort */
  }
}

