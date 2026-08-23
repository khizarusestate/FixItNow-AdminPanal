/**
 * The admin SPA is deployed separately from the API. Use the same explicit
 * bearer-token transport as the customer/worker SPA so a reload cannot switch
 * between cookie and localStorage authentication semantics.
 */
export const USE_HTTPONLY_COOKIES = false;

export const SESSION_ROLE_KEY = "fixitnow_admin_session_active";
