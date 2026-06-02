/** Ensure absolute API URLs always include a protocol (fixes Vercel env typos). */
export function normalizeApiBaseUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("/")) return trimmed.replace(/\/$/, "");
  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, "")}`;
  }
  return url.replace(/\/$/, "");
}

export function resolveApiBaseUrl({ fromEnv, prodDefault, devDefault, isProd }) {
  let raw = fromEnv?.trim() || (isProd ? prodDefault : devDefault);
  raw = normalizeApiBaseUrl(raw);
  if (
    isProd &&
    raw &&
    !raw.startsWith("/") &&
    (raw.includes("localhost") || raw.includes("127.0.0.1"))
  ) {
    raw = normalizeApiBaseUrl(prodDefault);
  }
  return raw;
}
