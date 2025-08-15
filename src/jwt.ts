import { sign, verify, parseBearer } from "@dwtechs/toker";
import { isJWT, isNumber, isString, isValidNumber } from "@dwtechs/checkard";
import { log } from "@dwtechs/winstan";
import type { Request, Response, NextFunction } from 'express';
import type { MyResponse } from "./interfaces";

const { 
  TOKEN_SECRET, 
  ACCESS_TOKEN_DURATION,
  REFRESH_TOKEN_DURATION
} = process.env;

/**
 * Prefix for all Toker error messages
 */
const TE_PREFIX = "Toker-express: ";

if (!TOKEN_SECRET)
  throw new Error(`${TE_PREFIX} Missing TOKEN_SECRET environment variable`);
if (!isString(TOKEN_SECRET, "!0"))
  throw new Error(`${TE_PREFIX} Invalid TOKEN_SECRET environment variable`);

const secrets = [TOKEN_SECRET];
const accessDuration = isNumber(ACCESS_TOKEN_DURATION, false) ? ACCESS_TOKEN_DURATION : 600; // #10 * 60 => 10 mins
const refreshDuration = isNumber(REFRESH_TOKEN_DURATION, false) ? REFRESH_TOKEN_DURATION : 86400; // #24 * 60 * 60 => 1 day


/**
 * Refreshes the JWT tokens for a user.
 *
 * This function generates new access and refresh tokens for a user based on the provided
 * decoded access token or user ID in the request body. It validates the issuer (iss) and
 * creates new tokens if the validation is successful. The new tokens are then added to the
 * response object.
 *
 * @param {Request} req - The request object containing the decoded access token or user ID.
 * @param {MyResponse} res - The response object where the new tokens will be added.
 * @param {NextFunction} next - The next middleware function in the Express.js request-response cycle.
 *
 * @returns {Promise<void>} Calls the next middleware function with an error if the issuer is invalid,
 *          otherwise proceeds to the next middleware function.
 * 
 * @throws {Object} Will call next() with error object containing:
 *   - statusCode: 400 - When iss (issuer) is missing or invalid
 *   - statusCode: 400 - When iss is not a valid number between 1 and 999999999
 *   - statusCode: 400 - InvalidIssuerError from Passken sign() function
 *   - statusCode: 500 - InvalidSecretsError from Passken sign() function
 *   - statusCode: 400 - InvalidDurationError from Passken sign() function
 *   - statusCode: 500 - SecretDecodingError from Passken sign() function
 */
async function refresh(req: Request, res: MyResponse, next: NextFunction) {
  const iss = req.decodedAccessToken?.iss || req.body?.id?.toString();

  if (!isValidNumber(iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${TE_PREFIX} Missing iss` });

  log.debug(`Create tokens for user ${iss}`);

  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = sign(iss, accessDuration, "access", secrets);
    refreshToken = sign(iss, refreshDuration, "refresh", secrets);
  } catch (err) {
    return next(err);
  }
  log.debug(`refreshToken='${refreshToken}', accessToken='${accessToken}'`);
  res.rows = [{ accessToken, refreshToken }];
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
 * @throws {Object} Will call next() with error object containing:
 *   - statusCode: 401 - MissingAuthorizationError when Authorization header is missing
 *   - statusCode: 401 - InvalidBearerFormatError when Authorization header format is invalid
 *   - statusCode: 401 - When token is not a valid JWT format
 *   - statusCode: 401 - InvalidTokenError when token is malformed or has invalid structure
 *   - statusCode: 401 - TokenExpiredError when token has expired (ignored in this function)
 *   - statusCode: 401 - TokenNotActiveError when token cannot be used yet (nbf claim)
 *   - statusCode: 401 - InvalidSignatureError when token signature is invalid
 *   - statusCode: 500 - InvalidSecretsError when secrets configuration is invalid
 *   - statusCode: 500 - SecretDecodingError when secret cannot be decoded
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
  
  log.debug(`decode access token`);
  
  if (!req.isProtected) return next(); // if no jwt protection for this route

  let t: string;
  try {
    t = parseBearer(req.headers.authorization);
  } catch (e: any) {
    return next(e);
  }

  log.debug(`accessToken : ${t}`);

  if (!isJWT(t)) 
    return next({statusCode: 401, message: `${TE_PREFIX} Invalid access token`});

  let decodedToken = null;
  try {
    decodedToken = verify(t, secrets, true);
  } catch (e: any) {
    return next(e);
  }

  if (!isValidNumber(decodedToken.iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${TE_PREFIX} Missing iss` });

  log.debug(`Decoded access token : ${JSON.stringify(decodedToken)}`);
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
 * @throws {Object} Will call next() with error object containing:
 *   - statusCode: 401 - When refresh token is not a valid JWT format
 *   - statusCode: 401 - InvalidTokenError when token is malformed or has invalid structure
 *   - statusCode: 401 - TokenExpiredError when refresh token has expired
 *   - statusCode: 401 - TokenNotActiveError when token cannot be used yet (nbf claim)
 *   - statusCode: 401 - InvalidSignatureError when token signature is invalid
 *   - statusCode: 500 - InvalidSecretsError when secrets configuration is invalid
 *   - statusCode: 500 - SecretDecodingError when secret cannot be decoded
 *   - statusCode: 400 - When decoded token is missing required 'iss' claim
 */
async function decodeRefresh(req: Request, _res: Response, next: NextFunction) {
  const token = req.body.refreshToken;
  log.debug(`decodeRefresh(token=${token})`);

  if (!isJWT(token)) 
    return next({statusCode: 401, message: `${TE_PREFIX} Invalid refresh token`});

  let decodedToken = null;
  try {
    decodedToken = verify(token, secrets, false);
  } catch (e: any) {
    return next(e);
  }

  if (!isValidNumber(decodedToken.iss, 1, 999999999, false))
    return next({ statusCode: 400, message: `${TE_PREFIX} Missing iss` });

  log.debug(`Decoded refresh token : ${JSON.stringify(req.decodedRefreshToken)}`);
  req.decodedRefreshToken = decodedToken;
  next();
}

export {
  refresh,
  decodeAccess,
  decodeRefresh,
};
