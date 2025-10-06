import { sign, verify, parseBearer } from "@dwtechs/toker";
import { isJWT, isNumber, isString, isValidNumber } from "@dwtechs/checkard";
import { log } from "@dwtechs/winstan";
import type { Request, Response, NextFunction } from 'express';
import './interfaces'; // Import to ensure global augmentation is applied

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
 * Refreshes the JWT tokens for a user.
 *
 * This function generates new access and refresh tokens for a consumer based on the provided
 * decoded access token or user ID in the request body. It validates the issuer (iss) and
 * creates new tokens if the validation is successful. The new tokens are then added to the
 * response local and the request body objects.
 *
 * @param {Request} req - The request object containing the decoded access token or user ID. Where the new tokens will be added
 * @param {Response} res - The response object where the new tokens will be added.
 * @param {NextFunction} next - The next middleware function in the Express.js request-response cycle.
 *
 * @returns {Promise<void>} Calls the next middleware function with an error if the issuer is invalid,
 *          otherwise proceeds to the next middleware function.
 * 
 * @throws {InvalidIssuerError} If the issuer (iss) is not a string or number (HTTP 400)
 * @throws {InvalidSecretsError} If the secrets array is empty or invalid (HTTP 500)
 * @throws {InvalidDurationError} If the duration is not a positive number (HTTP 400)
 * @throws {InvalidBase64Secret} If the secret cannot be decoded from base64 (HTTP 500)
 * @throws {Object} Will call next() with error object containing:
 *   - statusCode: 400 - When iss (issuer) is missing or invalid
 */
async function refresh(req: Request, res: Response, next: NextFunction) {
  const iss = req.decodedAccessToken?.iss || req.body?.id?.toString();

  if (!isValidNumber(iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });

  log.debug(`${LOGS_PREFIX}Create tokens for user ${iss}`);

  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = sign(iss, accessDuration, "access", secrets);
    refreshToken = sign(iss, refreshDuration, "refresh", secrets);
  } catch (err) {
    return next(err);
  }
  log.debug(`refreshToken='${refreshToken}', accessToken='${accessToken}'`);

  res.locals.accessToken = accessToken;
  res.locals.refreshToken = refreshToken;
  req.body.accessToken = accessToken;
  req.body.refreshToken = refreshToken;
  
  next();

}



/**
 * Express middleware function to decode and verify an access token from the Authorization header.
 * 
 * This middleware extracts the JWT access token from the Authorization header, validates its format,
 * verifies its signature, and attaches the decoded token to the request object for use by subsequent
 * middleware. It only processes requests that have `req.isProtected` set to true.
 * 
 * @param {Request} req - The Express request object containing the Authorization header
 * @param {Response} _res - The Express response object (not used in this function)
 * @param {NextFunction} next - The next middleware function to be called
 * 
 * @returns {void} Calls the next middleware function, either with an error or successfully
 * 
 * @throws {MissingAuthorizationError} If the Authorization header is missing (HTTP 401)
 * @throws {InvalidBearerFormatError} If the Authorization header format is invalid (HTTP 401)
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
 * @example
 * ```typescript
 * // Usage in Express route with protection middleware
 * const protect = (req: Request, res: Response, next: NextFunction) => {
 *   req.isProtected = true;
 *   next();
 * };
 * 
 */
function decodeAccess(req: Request, _res: Response, next: NextFunction) {
  
  log.debug(`${LOGS_PREFIX}decode access token`);
  
  if (!req.isProtected) return next(); // if no jwt protection for this route

  let t: string;
  try {
    t = parseBearer(req.headers.authorization);
  } catch (e: any) {
    return next(e);
  }

  log.debug(`${LOGS_PREFIX}accessToken : ${t}`);

  if (!isJWT(t)) 
    return next({statusCode: 401, message: `${LOGS_PREFIX}Invalid access token`});

  let decodedToken = null;
  try {
    decodedToken = verify(t, secrets, true);
  } catch (e: any) {
    return next(e);
  }

  if (!isValidNumber(decodedToken.iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });

  log.debug(`${LOGS_PREFIX}Decoded access token : ${JSON.stringify(decodedToken)}`);
  req.decodedAccessToken = decodedToken;
  next();
}


/**
 * Middleware function to decode and verify a refresh token from the request body.
 * 
 * @param {Request} req - The request object containing the refresh token in the body.
 * @param {Response} _res - The response object (not used in this function).
 * @param {NextFunction} next - The next middleware function to be called.
 * 
 * @returns {Promise<void>} Calls the next middleware function with an error object if the token is invalid or missing required fields.
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
async function decodeRefresh(req: Request, _res: Response, next: NextFunction) {
  const token = req.body.refreshToken;
  log.debug(`${LOGS_PREFIX}decodeRefresh(token=${token})`);

  if (!isJWT(token)) 
    return next({statusCode: 401, message: `${LOGS_PREFIX}Invalid refresh token`});

  let decodedToken = null;
  try {
    decodedToken = verify(token, secrets, false);
  } catch (e: any) {
    return next(e);
  }

  if (!isValidNumber(decodedToken.iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });

  log.debug(`${LOGS_PREFIX}Decoded refresh token : ${JSON.stringify(req.decodedRefreshToken)}`);
  req.decodedRefreshToken = decodedToken;
  next();
}

export {
  refresh,
  decodeAccess,
  decodeRefresh,
};
