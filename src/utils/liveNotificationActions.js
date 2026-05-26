const SECTION_ACTIONS = {
  bookings: { label: "Open Bookings", section: "bookings" },
  workers: { label: "View Workers", section: "workers" },
  customers: { label: "View Customers", section: "customers" },
  services: { label: "View Services", section: "services" },
  advertisements: { label: "View Advertisements", section: "advertisements" },
  reviews: { label: "View Reviews", section: "reviews" },
  revenue: { label: "View Revenue", section: "revenue" },
};

export function resolveAdminLiveNotification(detail) {
  const title = detail?.title || "Live update";
  const message = detail?.message || "";
  const titleLower = title.toLowerCase();
  const messageLower = message.toLowerCase();

  const sectionKey =
    detail?.sectionType ||
    (SECTION_ACTIONS[detail?.type] ? detail.type : null);

  const actions = [];

  if (sectionKey && SECTION_ACTIONS[sectionKey]) {
    const mapped = SECTION_ACTIONS[sectionKey];
    actions.push({ label: mapped.label, section: mapped.section });
  }

  if (!actions.length) {
    if (titleLower.includes("booking") || messageLower.includes("booking")) {
      actions.push(SECTION_ACTIONS.bookings);
    } else if (
      titleLower.includes("worker") ||
      messageLower.includes("worker")
    ) {
      actions.push(SECTION_ACTIONS.workers);
    } else if (
      titleLower.includes("advertisement") ||
      titleLower.includes("advertis")
    ) {
      actions.push(SECTION_ACTIONS.advertisements);
    } else if (titleLower.includes("review")) {
      actions.push(SECTION_ACTIONS.reviews);
    } else if (titleLower.includes("customer")) {
      actions.push(SECTION_ACTIONS.customers);
    }
  }

  const isAdDecision =
    (titleLower.includes("advertisement") || titleLower.includes("advertis")) &&
    (titleLower.includes("approved") || titleLower.includes("rejected"));

  const dismissOnly =
    detail?.dismissOnly === true || isAdDecision || actions.length === 0;

  return {
    title,
    message,
    actions: actions.map((a) => ({
      label: a.label,
      section: a.section,
    })),
    dismissOnly,
  };
}

export function runAdminLiveAction(section) {
  if (!section) return;
  window.dispatchEvent(
    new CustomEvent("admin-navigate", { detail: { section } }),
  );
}
