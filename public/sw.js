/* FixItNow Admin — Web Push service worker */
self.addEventListener("push", (event) => {
  let payload = { title: "FixItNow Admin", message: "", url: "/" };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    /* ignore malformed payload */
  }

  const title = payload.title || "FixItNow Admin";
  const options = {
    body: payload.message || "",
    icon: "/Assets/Logo.png",
    badge: "/Assets/Logo.png",
    data: { url: payload.url || "/" },
    tag: payload.tag || "fixitnow-admin-notification",
    requireInteraction: payload.type === "urgent",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            if ("navigate" in client) {
              return client.navigate(targetUrl).then(() => client.focus());
            }
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});

