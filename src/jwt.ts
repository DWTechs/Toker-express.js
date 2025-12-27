import { sign, verify, parseBearer } from "@dwtechs/toker";
import { isArray, isJWT, isNumber, isObject, isString, isValidNumber } from "@dwtechs/checkard";
import { log } from "@dwtechs/winstan";
import type { Request, Response, NextFunction } from 'express';
import type { RowWithTokens } from './interfaces';

const { 
  TOKEN_SECRET, 
  ACCESS_TOKEN_DURATION,
  REFRESH_TOKEN_DURATION
} = process.env;

/**
 * Prefix for all Toker error messages
 */
const LOGS_PREFIX = "Toker-express: ";

if (!TOKEN_SECRET)
  throw new Error(`${LOGS_PREFIX}Missing TOKEN_SECRET environment variable`);
if (!isString(TOKEN_SECRET, "!0"))
  throw new Error(`${LOGS_PREFIX}Invalid TOKEN_SECRET environment variable`);

const secrets = [TOKEN_SECRET];
const accessDuration = isNumber(ACCESS_TOKEN_DURATION, false) ? Number(ACCESS_TOKEN_DURATION) : 600; // #10 * 60 => 10 mins
const refreshDuration = isNumber(REFRESH_TOKEN_DURATION, false) ? Number(REFRESH_TOKEN_DURATION) : 86400; // #24 * 60 * 60 => 1 day


/**
 * Express middleware to generate new access and refresh JWT tokens for a user.
 *
 * This middleware creates new access and refresh tokens based on:
 * 1. The issuer (iss) from `res.locals.decodedAccessToken.iss` if available, OR
 * 2. The user ID from `res.locals.id` if no decoded token is present
 *
 * The generated tokens are stored in:
 * - `res.locals.accessToken` and `res.locals.refreshToken`
 * - `req.body.rows[0].accessToken` and `req.body.rows[0].refreshToken` (if rows array exists)
 *
 * @param {Request} req - The Express request object. May contain:
 *   - `req.body.rows`: Optional array where tokens will be added to first element
 * @param {Response} res - The Express response object. Should contain:
 *   - `res.locals.decodedAccessToken.iss`: User ID from decoded access token (checked first), OR
 *   - `res.locals.id`: User ID (used if decodedAccessToken is not available)
 *   Tokens will be added to `res.locals.accessToken` and `res.locals.refreshToken`
 * @param {NextFunction} next - Express next middleware function
 *
 * @returns {void}
 *
 * @throws Will call next() with error object containing:
 *   - statusCode: 400 - When issuer (iss) is missing or invalid (not a number between 1-999999999)
 *   - statusCode: 500 - When token signing fails (invalid secrets, duration, or base64 secret)
 *
 * @example
 * // After successful authentication, call refresh to generate tokens
 * app.post('/login', authenticate, refresh, (req, res) => {
 *   res.json({ 
 *     accessToken: res.locals.accessToken, 
 *     refreshToken: res.locals.refreshToken 
 *   });
 * });
 */
function refresh(req: Request, res: Response, next: NextFunction): void {

  let iss = res.locals?.decodedAccessToken?.iss;

  if (!iss)
    iss = res.locals.id ?? null;

  if (!isValidNumber(iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });

  log.debug(`${LOGS_PREFIX}Create tokens for user ${iss}`);

  let at: string; // access token
  let rt: string; // refresh token
  try {
    at = sign(iss, accessDuration, "access", secrets);
    rt = sign(iss, refreshDuration, "refresh", secrets);
  } catch (err) {
    return next(err);
  }
  log.debug(`refreshToken='${rt}', accessToken='${at}'`);
  res.locals.accessToken = at;
  res.locals.refreshToken = rt;

  const rbr: RowWithTokens[] = req.body?.rows;
  if (isArray(rbr, ">=", 1) && isObject(rbr[0])) {
    rbr[0].accessToken = at;
    rbr[0].refreshToken = rt;
  }
  
  next();

}



/**
 * Express middleware function to parse the bearer token from the Authorization header.
 * 
 * This middleware extracts the JWT token from the Authorization header (Bearer scheme)
 * and stores it in res.locals.accessToken for use by subsequent middleware.
 * It only processes requests that have `res.locals.isProtected` set to true.
 * 
 * @param {Request} req - The Express request object containing the Authorization header
 * @param {Response} res - The Express response object. Should contain:
 *   - `res.locals.isProtected`: Boolean flag to determine if route requires JWT protection
 *   Parsed token will be added to `res.locals.accessToken`
 * @param {NextFunction} next - The next middleware function to be called
 * 
 * @returns {void} Calls the next middleware function with an error object if parsing fails.
 *
 * @throws {MissingAuthorizationError} If the Authorization header is missing (HTTP 401)
 * @throws {InvalidBearerFormatError} If the Authorization header format is invalid (HTTP 401)
 * 
 */
function parseBearerToken(req: Request, res: Response, next: NextFunction): void {
  
  if (!res.locals.isProtected) return next(); // if no jwt protection for this route
  
  log.debug(`${LOGS_PREFIX}parse bearer token`);
  
  try {
    res.locals.accessToken = parseBearer(req.headers.authorization);
  } catch (e: any) {
    return next(e);
  }

  next();
}


/**
 * Express middleware function to decode and verify an access token.
 * 
 * This middleware validates the JWT access token from res.locals.accessToken,
 * verifies its signature, and attaches the decoded token to res.locals.decodedAccessToken 
 * for use by subsequent middleware. It only processes requests that have `res.locals.isProtected` set to true.
 * 
 * @param {Request} req - The Express request object
 * @param {Response} res - The Express response object. Should contain:
 *   - `res.locals.isProtected`: Boolean flag to determine if route requires JWT protection
 *   - `res.locals.accessToken`: The JWT token to decode
 *   Decoded token will be added to `res.locals.decodedAccessToken`
 * @param {NextFunction} next - The next middleware function to be called
 * 
 * @returns {void} Calls the next middleware function with an error object if the token is invalid or iss is missing.
 *
 * @throws {InvalidTokenError} If the token is malformed or has invalid structure (HTTP 401)
 * @throws {ExpiredTokenError} If the token has expired (exp claim) (HTTP 401)
 * @throws {InactiveTokenError} If the token cannot be used yet (nbf claim) (HTTP 401)
 * @throws {InvalidSignatureError} If the token signature is invalid (HTTP 401)
 * @throws {InvalidSecretsError} If the secrets configuration is invalid (HTTP 500)
 * @throws {InvalidBase64Secret} If the secret cannot be decoded from base64 (HTTP 500)
 * @throws {Object} Will call next() with error object containing:
 *   - statusCode: 401 - When token is not a valid JWT format
 *   - statusCode: 400 - When decoded token is missing required 'iss' claim
 * 
 */
function decodeAccess(_req: Request, res: Response, next: NextFunction): void {
  
  log.debug(`${LOGS_PREFIX}decode access token`);
  
  if (!res.locals.isProtected) return next(); // if no jwt protection for this route

  const t = res.locals.accessToken;

  if (!isJWT(t)) 
    return next({statusCode: 401, message: `${LOGS_PREFIX}Invalid access token`});

  let dt = null;
  try {
    dt = verify(t, secrets, true); // decoded token
  } catch (e: any) {
    return next(e);
  }

  if (!isValidNumber(dt.iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });

  log.debug(`${LOGS_PREFIX}Decoded access token : ${JSON.stringify(dt)}`);
  res.locals.decodedAccessToken = dt;
  next();
}


/**
 * Middleware function to decode and verify a refresh token from the request body.
 * 
 * @param {Request} req - The request object containing the refresh token in `req.body.refreshToken`
 * @param {Response} res - The response object. Decoded token will be added to `res.locals.decodedRefreshToken`
 * @param {NextFunction} next - The next middleware function to be called.
 * 
 * @returns {void} Calls the next middleware function with an error object if the token is invalid or iss is missing.
 *
 * @throws {InvalidTokenError} If the token is malformed or has invalid structure (HTTP 401)
 * @throws {InvalidSecretsError} If the secrets configuration is invalid (HTTP 500)
 * @throws {ExpiredTokenError} If the refresh token has expired (exp claim) (HTTP 401)
 * @throws {InactiveTokenError} If the token cannot be used yet (nbf claim) (HTTP 401)
 * @throws {InvalidSignatureError} If the token signature is invalid (HTTP 401)
 * @throws {InvalidBase64Secret} If the secret cannot be decoded from base64 (HTTP 500)
 * @throws {Object} Will call next() with error object containing:
 *   - statusCode: 401 - When refresh token is not a valid JWT format
 *   - statusCode: 400 - When decoded token is missing required 'iss' claim
 */
function decodeRefresh(req: Request, res: Response, next: NextFunction): void {
  const token = req.body?.refreshToken;
  log.debug(`${LOGS_PREFIX}decodeRefresh(token=${token})`);

  if (!isJWT(token)) 
    return next({statusCode: 401, message: `${LOGS_PREFIX}Invalid refresh token`});

  let dt = null;
  try {
    dt = verify(token, secrets, false); // decoded token
  } catch (e: any) {
    return next(e);
  }

  if (!isValidNumber(dt.iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });

  log.debug(`${LOGS_PREFIX}Decoded refresh token : ${JSON.stringify(dt)}`);
  res.locals.decodedRefreshToken = dt;
  next();
}

export {
  refresh,
  parseBearerToken,
  decodeAccess,
  decodeRefresh,
};
