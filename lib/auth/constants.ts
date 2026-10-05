/** Shared between proxy.ts and server code — keep free of server-only imports. */
export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

/** Used when the backend doesn't return `expiresIn`. */
export const DEFAULT_ACCESS_TTL = 60 * 15; // 15 minutes
export const DEFAULT_REFRESH_TTL = 60 * 60 * 24 * 30; // 30 days

/** Routes that require a signed-in user (prefix match). */
export const PROTECTED_ROUTES = ["/dashboard"];
/** Routes a signed-in user should be bounced away from. */
export const AUTH_ROUTES = ["/login", "/signup"];
export const AFTER_LOGIN_PATH = "/dashboard";
export const LOGIN_PATH = "/login";

/**
 * Backend auth endpoints. Adjust these to match your API — this is the only
 * place the frontend knows about backend auth URLs.
 */
export const AUTH_ENDPOINTS = {
  login: "/auth/login", // POST { email, password }          -> AuthResponse
  register: "/auth/register", // POST { name, email, password } -> AuthResponse
  google: "/auth/google", // POST { idToken }                  -> AuthResponse
  refresh: "/auth/refresh", // POST { refreshToken }          -> AuthResponse (user optional)
  logout: "/auth/logout", // POST { refreshToken }, Bearer   -> 2xx
  me: "/auth/me", // GET, Bearer                               -> User
} as const;

/** Only allow same-origin relative redirects (prevents open redirects). */
export function safeRedirect(path: string | null | undefined, fallback = AFTER_LOGIN_PATH) {
  if (!path || !path.startsWith("/") || path.startsWith("//") || /[\\\x00-\x20]/.test(path)) {
    return fallback;
  }
  return path;
}

export const OAUTH_STATE_COOKIE = "oauth_state";
