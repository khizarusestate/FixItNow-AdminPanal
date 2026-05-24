export class ApiClientError extends Error {
  constructor(message, { code, status, details } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = code || null;
    this.status = status || 0;
    this.details = details || {};
  }

  get refreshRecommended() {
    return Boolean(this.details?.refreshRecommended);
  }
}

export function createApiClientError(data = {}, status = 0) {
  return new ApiClientError(
    data.message || "Something went wrong. Please try again.",
    { code: data.code, status, details: data.details || {} },
  );
}
