import { apiRequest } from "../lib/api";

let cachedSummary = null;

export function getCachedAdminSummary() {
  return cachedSummary;
}

export function clearCachedAdminSummary() {
  cachedSummary = null;
}

export async function runAdminBootstrap(onStep) {
  onStep?.("Checking session…");
  const tasks = [
    apiRequest("/admin/me").catch(() => null),
    (async () => {
      onStep?.("Loading dashboard…");
      const res = await apiRequest("/admin/summary");
      cachedSummary = res?.data || null;
      return res;
    })(),
  ];
  await Promise.allSettled(tasks);
  onStep?.("");
  return { summary: cachedSummary };
}
