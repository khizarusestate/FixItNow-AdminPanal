export class ApiClientError extends Error {
  constructor(message, { code, status, details } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = code || null;
    this.status = status || 0;
    this.details = details || {};
  }
}

const FRIENDLY_BY_CODE = {
  ADMIN_NOT_FOUND: "No admin account found for this email.",
  INVALID_PIN: "Incorrect PIN. Please try again.",
  ADMIN_LOCKED: "Too many attempts. Your account is temporarily locked.",
  ADMIN_DEACTIVATED:
    "Your admin account has been deactivated. Contact the super admin.",
  WRONG_LOGIN_PORTAL:
    "This account cannot use this login portal. Try the other login option.",
  TOKEN_EXPIRED: "Your session has expired. Please sign in again.",
  INVALID_TOKEN: "Your session is invalid. Please sign in again.",
};

export function createApiClientError(data = {}, status = 0) {
  const code = data.code || null;
  const message =
    data.message ||
    (code && FRIENDLY_BY_CODE[code]) ||
    "Something went wrong. Please try again.";

  return new ApiClientError(message, {
    code,
    status,
    details: data.details || {},
  });
}

export function isApiClientError(err) {
  return err instanceof ApiClientError;
}
