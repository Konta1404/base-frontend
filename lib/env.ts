import "server-only";

/**
 * Server-side environment. Read at request time (not inlined at build time),
 * so one Docker image can be promoted across environments.
 */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  /** Base URL of your backend API, as reachable from the Next.js server. */
  get apiUrl() {
    return required("API_URL", "http://localhost:4000").replace(/\/$/, "");
  },
  /** Public URL of this frontend (used for OAuth redirects). */
  get appUrl() {
    return required("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  },
  get cookieSecure() {
    const explicit = process.env.COOKIE_SECURE;
    if (explicit) return explicit === "true";
    return this.appUrl.startsWith("https://");
  },
  get googleClientId() {
    return process.env.GOOGLE_CLIENT_ID ?? "";
  },
  get googleClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET ?? "";
  },
  get googleEnabled() {
    return Boolean(this.googleClientId && this.googleClientSecret);
  },
};
