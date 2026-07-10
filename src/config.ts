import { isString, isNumber } from "@dwtechs/checkard";

/**
 * Prefix for all Toker error messages
 */
const LOGS_PREFIX = "Toker-express: ";

const {
  TOKEN_SECRET,
  ACCESS_TOKEN_DURATION,
  REFRESH_TOKEN_DURATION,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE_SAMESITE,
  REFRESH_TOKEN_COOKIE_HTTPS_ONLY,
} = process.env;

if (!TOKEN_SECRET)
  throw new Error(`${LOGS_PREFIX}Missing TOKEN_SECRET environment variable`);
if (!isString(TOKEN_SECRET, "!0"))
  throw new Error(`${LOGS_PREFIX}Invalid TOKEN_SECRET environment variable`);
if (TOKEN_SECRET.length < 32)
  throw new Error(`${LOGS_PREFIX}TOKEN_SECRET must be at least 32 characters`);

const secrets = [TOKEN_SECRET];
const accessDuration = isNumber(ACCESS_TOKEN_DURATION, false) ? Number(ACCESS_TOKEN_DURATION) : 600; // #10 * 60 => 10 mins
const refreshDuration = isNumber(REFRESH_TOKEN_DURATION, false) ? Number(REFRESH_TOKEN_DURATION) : 86400; // #24 * 60 * 60 => 1 day

// Optional refresh token cookie transport. Disabled by default so existing
// consumers relying on req.body/res.body behavior are unaffected.
type SameSite = "strict" | "lax" | "none";
const SAME_SITE_VALUES: SameSite[] = ["strict", "lax", "none"];

const cookieEnabled = REFRESH_TOKEN_COOKIE === "true";
const cookieName = isString(REFRESH_TOKEN_COOKIE_NAME, "!0") ? (REFRESH_TOKEN_COOKIE_NAME as string) : "refreshToken";
const cookiePath = isString(REFRESH_TOKEN_COOKIE_PATH, "!0") ? (REFRESH_TOKEN_COOKIE_PATH as string) : "/";
const requestedSameSite = (REFRESH_TOKEN_COOKIE_SAMESITE || "").toLowerCase();
const cookieSameSite: SameSite = (SAME_SITE_VALUES as string[]).includes(requestedSameSite)
  ? (requestedSameSite as SameSite)
  : "strict";
const cookieSecure = REFRESH_TOKEN_COOKIE_HTTPS_ONLY === "false" ? false : true;

export {
  LOGS_PREFIX,
  secrets,
  accessDuration,
  refreshDuration,
  cookieEnabled,
  cookieName,
  cookiePath,
  cookieSameSite,
  cookieSecure,
};
export type { SameSite };
