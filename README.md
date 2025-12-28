
[![License: MIT](https://img.shields.io/npm/l/@dwtechs/toker-express.svg?color=brightgreen)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40dwtechs%2Ftoker-express.svg)](https://www.npmjs.com/package/@dwtechs/toker-express)
[![last version release date](https://img.shields.io/github/release-date/DWTechs/Toker-express.js)](https://www.npmjs.com/package/@dwtechs/toker-express)
![Jest:coverage](https://img.shields.io/badge/Jest:coverage-93%25-brightgreen.svg)


- [Synopsis](#synopsis)
- [Support](#support)
- [Installation](#installation)
- [Usage](#usage)
- [Environment variables](#environment-variables)
- [API Reference](#api-reference)
- [Logs](#logs)
- [Contributors](#contributors)
- [Stack](#stack)


## Synopsis

**[Toker-express.js](https://github.com/DWTechs/Toker-express.js)** is an open source JWT management library for Express.js to refresh and decode tokens safely.  
It includes @dwtechs/toker library and adds Express middlewares to be used in a node.js service.

- 🪶 Very lightweight
- 🧪 Thoroughly tested
- 🚚 Shipped as EcmaScrypt Express module
- 📝 Written in Typescript


## Support

- node: 22

This is the oldest targeted versions.  


## Installation

```bash
$ npm i @dwtechs/toker-express
```


## Usage


```javascript

// @ts-check
import * as tk from "@dwtechs/toker-express";
import express from "express";
const router = express.Router();

import cEntity from "../entities/consumer.js";
import uEntity from "../entities/user.js";
import checkToken from "../middlewares/validators/check-token.js";
import login from "../middlewares/login.js";

const add = [
  uEntity.normalize,
  uEntity.validate,
  login,
  tk.refresh,
  cEntity.add,
];

const refresh = [
  cEntity.validate,
  tk.parseBearerToken,
  tk.decodeAccess,
  tk.decodeRefresh,
  checkToken,
  tk.refresh,
  cEntity.update,
];

const del = [
  checkToken,
  tk.parseBearerToken,
  tk.decodeAccess,
  cEntity.delete,
];

// Routes

// add a consumer. Log a user
router.post("/", add);

// Update a consumer with new tokens
// Used for login and refresh tokens
router.put("/", refresh);

// delete a consumer. Used when logging out
router.delete("/", del);


```


### Environment variables

You can intialise the library using the following environment variables:
 
```bash
  ACCESS_TOKEN_DURATION, 
  REFRESH_TOKEN_DURATION
  TOKEN_SECRET,
```

These environment variables will update the default values of the lib at start up.
So you do not need to init the library in the code.

Note that **TOKEN_SECRET** is mandatory.

Default values : 

```javascript
const accessDuration = isNumber(ACCESS_TOKEN_DURATION, false) ? ACCESS_TOKEN_DURATION : 600; // #10 * 60 => 10 mins
const refreshDuration = isNumber(REFRESH_TOKEN_DURATION, false) ? REFRESH_TOKEN_DURATION : 86400; // #24 * 60 * 60 => 1 day
```

## API Reference


```typescript

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
function refresh(req: Request, res: Response, next: NextFunction): void {}

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
function parseBearerToken(req: Request, res: Response, next: NextFunction): void {}

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
function decodeAccess(req: Request, res: Response, next: NextFunction): void {}

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
function decodeRefresh(req: Request, _res: Response, next: NextFunction): void {}

```

### JWT Refresh

This function will look for an ISS (user ID) from two possible sources:

```Javascript
let iss = res.locals?.decodedAccessToken?.iss;

if (!iss)
  iss = res.locals.id ?? null;
```

It will then send both new refresh and access tokens in the res.locals object and in req.body.rows[0].

**Note:** If `req.body.rows` doesn't exist or is not an array, it will be automatically created as `[{}]`. If `req.body.rows[0]` is not an object, it will be replaced with `{}`.

```Javascript
res.locals.accessToken = accessToken;
res.locals.refreshToken = refreshToken;

// req.body.rows is automatically created if needed
req.body.rows[0].accessToken = accessToken;
req.body.rows[0].refreshToken = refreshToken;
```

### JWT Decoding

#### Route Protection with isProtected

The `parseBearerToken()` and `decodeAccess()` middlewares only process requests when `res.locals.isProtected` is set to `true`. This allows you to selectively protect routes that require authentication.

You should set this flag in a middleware before calling these functions:

```Javascript
// Example middleware to mark route as protected
function protectRoute(req, res, next) {
  res.locals.isProtected = true;
  next();
}

// Usage
router.get('/protected-route', protectRoute, tk.parseBearerToken, tk.decodeAccess, yourHandler);
```

If `res.locals.isProtected` is `false`, `undefined`, or `null`, these middlewares will simply call `next()` without processing the token, allowing the request to continue to the next middleware.

#### Access Token Processing

The access token processing is now split into two separate middlewares for better flexibility:

1. **parseBearerToken()** - Extracts the bearer token from the Authorization header
2. **decodeAccess()** - Validates and decodes the JWT token

##### parseBearerToken()

This middleware extracts the JWT token from the Authorization header using the Bearer scheme.

```Javascript
const bearer = req.headers.authorization; // "Bearer <token>"
```

The parsed token is then stored in `res.locals.accessToken`:

```Javascript
res.locals.accessToken = token;
```

##### decodeAccess()

This middleware takes the token from `res.locals.accessToken`, validates it, and decodes it.

```Javascript
const token = res.locals.accessToken;
```

The decoded token is then stored in `res.locals.decodedAccessToken`:

```Javascript
res.locals.decodedAccessToken = decodedToken;
```

**Note:** You should use both middlewares in sequence for full access token processing, or you can use just `parseBearerToken()` if you only need to extract the token without decoding it.

#### Refresh Token Decoding

decodeRefresh() functions will look for a token in the client request body.

```Javascript
const token = req.body.refreshToken;
```

It will then send the decoded token in the res object.

```Javascript
res.locals.decodedRefreshToken = decodedToken;
```


## Logs

**Token-express.js** uses **[@dwtechs/Winstan](https://www.npmjs.com/package/@dwtechs/winstan)** library for logging.
All logs are in debug mode. Meaning they should not appear in production mode.

## Contributors

**Token-express.js** is still in development and we would be glad to get all the help you can provide.
To contribute please read **[contributor.md](https://github.com/DWTechs/Token-express.js/blob/main/contributor.md)** for detailed installation guide.


## Stack

| Purpose         |                    Choice                    |                                                     Motivation |
| :-------------- | :------------------------------------------: | -------------------------------------------------------------: |
| repository      |        [Github](https://github.com/)         |     hosting for software development version control using Git |
| package manager |     [npm](https://www.npmjs.com/get-npm)     |                                default node.js package manager |
| language        | [TypeScript](https://www.typescriptlang.org) | static type checking along with the latest ECMAScript features |
| module bundler  |      [Rollup](https://rollupjs.org)          |                        advanced module bundler for ES6 modules |
| unit testing    |          [Jest](https://jestjs.io/)          |                  delightful testing with a focus on simplicity |
