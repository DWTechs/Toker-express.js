import { log } from "@dwtechs/winstan";
import type { Request, Response, NextFunction } from 'express';
import {
  LOGS_PREFIX,
  refreshDuration,
  cookieEnabled,
  cookieName,
  cookiePath,
  cookieSameSite,
  cookieSecure,
} from './config';

/**
 * Sets the refresh token as an httpOnly cookie on the response when the
 * REFRESH_TOKEN_COOKIE environment variable is enabled. No-op otherwise.
 *
 * @param {Response} res - The Express response object
 * @param {string} rt - The refresh token to store in the cookie
 *
 * @returns {void}
 */
function setRefreshCookie(res: Response, rt: string): void {
  if (!cookieEnabled)
    return;

  res.cookie(cookieName, rt, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: cookiePath,
    maxAge: refreshDuration * 1000,
  });
}

/**
 * Express middleware to clear the refresh token cookie set by createTokens/refreshTokens.
 * 
 * This middleware clears the cookie named after `REFRESH_TOKEN_COOKIE_NAME`
 * (default `"refreshToken"`) using the same `path`, `sameSite`, `secure` and
 * `httpOnly` attributes it was set with, so browsers reliably remove it.
 * Intended for use in logout stacks. It is a no-op from the client's
 * perspective if the cookie transport was never enabled or the cookie
 * was never set, since `res.clearCookie` simply instructs the browser to
 * expire a cookie with that name/path if present.
 * 
 * @param {Request} _req - The Express request object (unused)
 * @param {Response} res - The Express response object on which the cookie is cleared
 * @param {NextFunction} next - Express next middleware function
 *
 * @returns {void}
 *
 * @example
 * // Use in a logout stack
 * app.delete('/', checkToken, parseBearer, decodeAccess, clearRefreshCookie, cEntity.delete);
 */
function clearRefreshCookie(_req: Request, res: Response, next: NextFunction): void {
  log.debug(() => `${LOGS_PREFIX}Clearing refresh token cookie`);
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: cookiePath,
  });
  next();
}

export { setRefreshCookie, clearRefreshCookie };
