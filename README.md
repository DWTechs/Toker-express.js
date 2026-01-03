
[![License: MIT](https://img.shields.io/npm/l/@dwtechs/toker-express.svg?color=brightgreen)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40dwtechs%2Ftoker-express.svg)](https://www.npmjs.com/package/@dwtechs/toker-express)
[![last version release date](https://img.shields.io/github/release-date/DWTechs/Toker-express.js)](https://www.npmjs.com/package/@dwtechs/toker-express)
![Jest:coverage](https://img.shields.io/badge/Jest:coverage-94%25-brightgreen.svg)


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
import { parseBearer, createTokens, refreshTokens, decodeAccess, decodeRefresh, } from "@dwtechs/toker-express";
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
  createTokens,
  cEntity.add,
];

const refresh = [
  cEntity.validate,
  parseBearer,
  decodeAccess,
  decodeRefresh,
  checkToken,
  refreshTokens,
  cEntity.update,
];

const del = [
  checkToken,
  parseBearer,
  decodeAccess,
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
function createTokens(req: Request, res: Response, next: NextFunction): void {}

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
function refreshTokens(req: Request, res: Response, next: NextFunction): void {}

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
function parseBearer(req: Request, res: Response, next: NextFunction): void {}

/**
 * Express middleware to decode and verify an access token.
 * 
 * This middleware validates the JWT access token from `res.locals.tokens.access`,
 * verifies its signature and structure, validates the issuer (iss) claim,
 * and stores the decoded token in `res.locals.tokens.decodedAccess` for use by 
 * subsequent middleware. It only processes requests that have `res.locals.route.isProtected` 
 * set to true. For non-protected routes, it simply passes control to the next middleware.
 * 
 * Note: By default, this middleware checks token expiration (exp claim) and will reject
 * expired tokens. For token refresh flows where you need to identify the user even after 
 * their access token has expired, set `res.locals.tokens.ignoreExpiration` to true before 
 * calling decodeAccess function.
 * 
 * @param {Request} _req - The Express request object (unused)
 * @param {Response} res - The Express response object. Should contain:
 *   - `res.locals.route.isProtected`: Boolean flag to determine if route requires JWT protection
 *   - `res.locals.tokens.access`: The JWT token to decode (from parseBearer middleware)
 *   - `res.locals.tokens.ignoreExpiration`: Optional boolean to skip expiration checking (default: false)
 *   Decoded token will be added to `res.locals.tokens.decodedAccess`
 * @param {NextFunction} next - The next middleware function to be called
 * 
 * @returns {void}
 *
 * @throws Will call next() with error when:
 *   - Token is not a valid JWT format (HTTP 401)
 *   - Token is malformed or has invalid structure (HTTP 401)
 *   - Token has expired (exp claim) - unless ignoreExpiration is true (HTTP 401)
 *   - Token cannot be used yet (nbf claim) (HTTP 401)
 *   - Token signature is invalid (HTTP 401)
 *   - Issuer (iss) is missing or invalid - not a number between 1-999999999 (HTTP 400)
 *   - Secrets configuration is invalid (HTTP 500)
 *   - Secret cannot be decoded from base64 (HTTP 500)
 * 
 * @example
 * // Use in protected route chain (checks expiration by default)
 * app.get('/protected', parseBearer, decodeAccess, ...);
 * 
 * @example
 * // Use in token refresh flow (ignores expiration)
 * app.post('/refresh', (req, res, next) => {
 *   res.locals.tokens = { ignoreExpiration: true };
 *   next();
 * }, parseBearer, decodeAccess, refreshTokens, ...);
 */
function decodeAccess(_req: Request, res: Response, next: NextFunction): void {}

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
function decodeRefresh(req: Request, res: Response, next: NextFunction): void {}

```

### JWT Token Generation

#### createTokens

This function creates new tokens for a new user or during initial login. It looks for the user ID from:

```Javascript
const iss = res.locals.user.id;
```

It stores both new refresh and access tokens in `req.body.rows[0]`:

```Javascript
req.body.rows[0].accessToken = at;
req.body.rows[0].refreshToken = rt;
```

**Note:** This function assumes that `req.body.rows[0]` already exists with user data like nickname and roles.

#### refreshTokens

This function refreshes tokens for existing users. It looks for the user ID (iss) from a decoded access token:

```Javascript
let iss = res.locals?.tokens?.decodedAccess?.iss;
```

It stores both new refresh and access tokens in `req.body.rows[0]`:

```Javascript
req.body.rows[0].accessToken = at;
req.body.rows[0].refreshToken = rt;
```

**Note:** This function assumes that `req.body.rows[0]` already exists with consumer data that will be updated in the database.

### JWT Decoding

#### Route Protection with isProtected

The `parseBearer()` and `decodeAccess()` middlewares only process requests when `res.locals.route.isProtected` is set to `true`. This allows you to selectively protect routes that require authentication.

You should set this flag in a middleware before calling these functions:

```Javascript
// Example middleware to mark route as protected
function protectRoute(req, res, next) {
  res.locals.route = { isProtected: true };
  next();
}

// Usage
router.get('/protected-route', protectRoute, tk.parseBearer, tk.decodeAccess, yourHandler);
```

If `res.locals.route.isProtected` is `false`, `undefined`, or `null`, these middlewares will simply call `next()` without processing the token, allowing the request to continue to the next middleware.

#### Access Token Processing

The access token processing is split into two separate middlewares for better flexibility:

1. **parseBearer()** - Extracts the bearer token from the Authorization header
2. **decodeAccess()** - Validates and decodes the JWT token

##### parseBearer()

This middleware extracts the JWT token from the Authorization header using the Bearer scheme.

```Javascript
const bearer = req.headers.authorization; // "Bearer <token>"
```

The parsed token is then stored in `res.locals.tokens.access`:

```Javascript
res.locals.tokens.access = token;
```

##### decodeAccess()

This middleware takes the token from `res.locals.tokens.access`, validates it, and decodes it.

```Javascript
const token = res.locals.tokens.access;
```

The decoded token is then stored in `res.locals.tokens.decodedAccess`:

```Javascript
res.locals.tokens.decodedAccess = decodedToken;
```

**Important:** This middleware **ignores token expiration** by design. This allows expired access tokens to be decoded, which is useful for token refresh flows where you need to identify the user even after their access token has expired.

**Note:** You should use both middlewares in sequence for full access token processing, or you can use just `parseBearer()` if you only need to extract the token without decoding it.

#### Refresh Token Decoding

decodeRefresh() function will look for a token in the client request body.

```Javascript
const token = req.body.refreshToken;
```

It will then send the decoded token in the res object.

```Javascript
res.locals.tokens.decodedRefresh = decodedToken;
```

**Important:** Unlike `decodeAccess()`, this middleware **does check token expiration**. Refresh tokens must be valid and not expired.


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
