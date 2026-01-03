import { sign, verify, parseBearer as pb } from "@dwtechs/toker";
import { isJWT, isNumber, isString, isValidInteger } from "@dwtechs/checkard";
import { log } from "@dwtechs/winstan";
import type { Request, Response, NextFunction } from 'express';

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
 * Express middleware to create new access and refresh JWT tokens for a user.
 *
 * This middleware generates new access and refresh tokens using the user ID
 * from `res.locals.user.id` and stores them in `req.body.rows[0]` for
 * subsequent processing (e.g., database insertion).
 * Note that this middleware assumes that `req.body.rows[0]` already exists 
 * with some user data like nickname and roles.
 *
 * @param {Request} req - The Express request object. Should contain:
 *   - `req.body.rows`: Array where tokens will be added to the first element
 * @param {Response} res - The Express response object. Should contain:
 *   - `res.locals.user.id`: User ID to use as issuer (iss) in the tokens
 * @param {NextFunction} next - Express next middleware function
 *
 * @returns {void}
 *
 * @throws Will call next() with error object containing:
 *   - statusCode: 400 - When user ID (iss) is missing or invalid (not a number between 1-999999999)
 *   - statusCode: 500 - When token signing fails (invalid secrets, duration, or base64 secret)
 *
 * @example
 * // After user creation/registration, call createTokens to generate tokens
 * app.post('/login', validateUser, createTokens, saveConsumer, ...);
 */
function createTokens(req: Request, res: Response, next: NextFunction): void {

   const iss = res.locals?.user?.id;

  if (!isValidInteger(iss, 1, 999999999, false))
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
  
  // req.body.rows[0] already exists because user has already been validated at this stage
  // so we have user nickname and roles.
  // Consumer is gonna be added to database at next stage using req.body.rows array.
  req.body.rows[0].accessToken = at; 
  req.body.rows[0].refreshToken = rt;
  
  next();

}

/**
 * Express middleware to refresh and generate new access and refresh JWT tokens.
 *
 * This middleware creates new access and refresh tokens using the user ID (iss)
 * from a previously decoded access token stored by decodeAccess middleware 
 * in `res.locals.tokens.decodedAccess.iss`.
 * The generated tokens are stored in `req.body.rows[0]` for subsequent processing.
 * This is typically used in token refresh flows where an existing access token 
 * has been decoded and validated.
 * Note that req.body.rows[0] must already exist at this stage because with consumer id
 * because consumer id has already been found at this stage and will be used top update
 * the consumer in the database.
 *
 * @param {Request} req - The Express request object. Should contain:
 *   - `req.body.rows`: Array where tokens will be added to the first element
 * @param {Response} res - The Express response object. Should contain:
 *   - `res.locals.tokens.decodedAccess.iss`: User ID from the decoded access token
 * @param {NextFunction} next - Express next middleware function
 *
 * @returns {void}
 *
 * @throws Will call next() with error object containing:
 *   - statusCode: 400 - When issuer (iss) is missing or invalid (not a number between 1-999999999)
 *   - statusCode: 500 - When token signing fails (invalid secrets, duration, or base64 secret)
 *
 * @example
 * // Token refresh flow with decoded access token
 * app.post('/refresh', decodeAccess, refreshTokens, updateDatabase, ...);
 */
function refreshTokens(req: Request, res: Response, next: NextFunction): void {

  const iss = res.locals?.tokens?.decodedAccess?.iss;

  if (!isValidInteger(iss, 1, 999999999, false))
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

  // req.body.rows[0] should already exist because consumer id has already been found at this stage
  req.body.rows[0].accessToken = at;
  req.body.rows[0].refreshToken = rt;
  
  next();

}



/**
 * Express middleware to extract the JWT bearer token from the Authorization header.
 * 
 * This middleware extracts the JWT token from the Authorization header (Bearer scheme)
 * and stores it in `res.locals.tokens.access` for use by subsequent middleware (typically decodeAccess).
 * It only processes requests that have `res.locals.route.isProtected` set to true.
 * For non-protected routes, it simply passes control to the next middleware.
 * 
 * @param {Request} req - The Express request object. Should contain:
 *   - `req.headers.authorization`: Authorization header with Bearer token format
 * @param {Response} res - The Express response object. Should contain:
 *   - `res.locals.route.isProtected`: Boolean flag to determine if route requires JWT protection
 *   Parsed token will be added to `res.locals.tokens.access`
 * @param {NextFunction} next - The next middleware function to be called
 * 
 * @returns {void}
 *
 * @throws Will call next() with error when:
 *   - Authorization header is missing (HTTP 401)
 *   - Authorization header format is invalid or not Bearer scheme (HTTP 401)
 * 
 * @example
 * // Use in protected route chain
 * app.get('/profile', parseBearer, decodeAccess, ...);
 */
function parseBearer(req: Request, res: Response, next: NextFunction): void {
  
  if (!res.locals?.route?.isProtected) return next(); // if no jwt protection for this route
  
  log.debug(`${LOGS_PREFIX}parse bearer to get access token`);
  
  try {
    res.locals.tokens = { ...res.locals.tokens, access: pb(req.headers.authorization) };
  } catch (e: any) {
    return next(e);
  }

  next();
}


/**
 * Express middleware to decode and verify an access token.
 * 
 * This middleware validates the JWT access token from `res.locals.tokens.access`,
 * verifies its signature and structure, validates the issuer (iss) claim,
 * and stores the decoded token in `res.locals.tokens.decodedAccess` for use by 
 * subsequent middleware. It only processes requests that have `res.locals.route.isProtected` 
 * set to true. For non-protected routes, it simply passes control to the next middleware.
 * 
 * Note: This middleware IGNORES token expiration (exp claim) by design, allowing 
 * expired access tokens to be decoded. This is useful for token refresh flows where 
 * you need to identify the user even after their access token has expired.
 * 
 * @param {Request} _req - The Express request object (unused)
 * @param {Response} res - The Express response object. Should contain:
 *   - `res.locals.route.isProtected`: Boolean flag to determine if route requires JWT protection
 *   - `res.locals.tokens.access`: The JWT token to decode (from parseBearer middleware)
 *   Decoded token will be added to `res.locals.tokens.decodedAccess`
 * @param {NextFunction} next - The next middleware function to be called
 * 
 * @returns {void}
 *
 * @throws Will call next() with error when:
 *   - Token is not a valid JWT format (HTTP 401)
 *   - Token is malformed or has invalid structure (HTTP 401)
 *   - Token cannot be used yet (nbf claim) (HTTP 401)
 *   - Token signature is invalid (HTTP 401)
 *   - Issuer (iss) is missing or invalid - not a number between 1-999999999 (HTTP 400)
 *   - Secrets configuration is invalid (HTTP 500)
 *   - Secret cannot be decoded from base64 (HTTP 500)
 * 
 * @example
 * // Use in protected route chain for token refresh
 * app.post('/refresh', parseBearer, decodeAccess, refreshTokens, ...);
 */
function decodeAccess(_req: Request, res: Response, next: NextFunction): void {
  
  log.debug(`${LOGS_PREFIX}decode access token`);
  
  if (!res.locals?.route?.isProtected) return next(); // if no jwt protection for this route

  const t = res.locals?.tokens?.access;

  if (!isJWT(t)) 
    return next({statusCode: 401, message: `${LOGS_PREFIX}Invalid access token`});

  let dt = null;
  try {
    dt = verify(t, secrets, true); // decoded token
  } catch (e: any) {
    return next(e);
  }

  if (!isValidInteger(dt.iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });

  log.debug(`${LOGS_PREFIX}Decoded access token : ${JSON.stringify(dt)}`);
  res.locals.tokens = { ...res.locals.tokens, decodedAccess: dt };
  next();
}


/**
 * Express middleware to decode and verify a refresh token from the request body.
 * 
 * This middleware validates the JWT refresh token from `req.body.refreshToken`,
 * verifies its signature, structure, expiration, and the issuer (iss) claim,
 * then stores the decoded token in `res.locals.tokens.decodedRefresh` for use
 * by subsequent middleware.
 * 
 * Note: Unlike decodeAccess, this middleware DOES check token expiration (exp claim).
 * Refresh tokens must be valid and not expired.
 * 
 * @param {Request} req - The Express request object. Should contain:
 *   - `req.body.refreshToken`: The JWT refresh token to decode and verify
 * @param {Response} res - The Express response object.
 *   Decoded token will be added to `res.locals.tokens.decodedRefresh`
 * @param {NextFunction} next - The next middleware function to be called
 * 
 * @returns {void}
 *
 * @throws Will call next() with error when:
 *   - Token is not a valid JWT format (HTTP 401)
 *   - Token is malformed or has invalid structure (HTTP 401)
 *   - Token has expired (exp claim) (HTTP 401)
 *   - Token cannot be used yet (nbf claim) (HTTP 401)
 *   - Token signature is invalid (HTTP 401)
 *   - Issuer (iss) is missing or invalid - not a number between 1-999999999 (HTTP 400)
 *   - Secrets configuration is invalid (HTTP 500)
 *   - Secret cannot be decoded from base64 (HTTP 500)
 * 
 * @example
 * // Use in refresh token flow
 * app.post('/refresh', parseBearer, decodeAccess, decodeRefresh, refreshTokens, ...);
 */
function decodeRefresh(req: Request, res: Response, next: NextFunction): void {
  const t = req.body?.refreshToken;
  log.debug(`${LOGS_PREFIX}decodeRefresh(token=${t})`);

  if (!isJWT(t)) 
    return next({statusCode: 401, message: `${LOGS_PREFIX}Invalid refresh token`});

  let dt = null;
  try {
    dt = verify(t, secrets, false); // decoded token
  } catch (e: any) {
    return next(e);
  }

  if (!isValidInteger(dt.iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });

  log.debug(`${LOGS_PREFIX}Decoded refresh token : ${JSON.stringify(dt)}`);
  res.locals.tokens = { ...res.locals.tokens, decodedRefresh: dt };
  next();
}

export {
  createTokens,
  refreshTokens,
  parseBearer,
  decodeAccess,
  decodeRefresh,
};
