
[![License: MIT](https://img.shields.io/npm/l/@dwtechs/toker-express.svg?color=brightgreen)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40dwtechs%2Ftoker-express.svg)](https://www.npmjs.com/package/@dwtechs/toker-express)
[![last version release date](https://img.shields.io/github/release-date/DWTechs/Toker-express.js)](https://www.npmjs.com/package/@dwtechs/toker-express)


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
The library uses node:crypto.   


## Installation

```bash
$ npm i @dwtechs/toker-express
```


## Usage


```javascript

import * as tk from "@dwtechs/toker-express";
import express from "express";
const router = express.Router();

import user from "../controllers/user.js";
import mail from "../controllers/mail.js";
import consumer from "../controllers/consumer.js";

const passwordOptions = {
  len: 14,
  num: true,
  ucase: false,
  lcase: false,
  sym: false,
  strict: true,
  similarChars: true,
};
pk.init(passwordOptions);

// middleware sub-stacks

// add users
const addMany = [
  user.validate,
  tk.create,
  user.addMany,
  mail.sendRegistration,
];

// Login user
const login = [
  user.validate,
  user.getPwd,
  tk.compare,
  user.isActive,
];

const addConsumer = [
  consumer.validate,
  tk.decodeAccess,
  tk.refresh,
  consumer.addOne
];

const refresh = [
  consumer.validate,
  tk.decodeRefresh,
  consumer.match,
  tk.refresh,
  consumer.updateOne,
];

// Routes

// log a user with his email & password
router.post("/", login);

// Add new users
router.post("/", addMany);

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
  - **ACCESS_TOKEN_DURATION**: 600 (10 mins)
  - **REFRESH_TOKEN_DURATION**: 86400 (1 day)


## API Reference


```javascript

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
 * @throws {InvalidIssuerError} If the issuer (iss) is not a string or number (HTTP 400)
 * @throws {InvalidSecretsError} If the secrets array is empty or invalid (HTTP 500)
 * @throws {InvalidDurationError} If the duration is not a positive number (HTTP 400)
 * @throws {InvalidBase64Secret} If the secret cannot be decoded from base64 (HTTP 500)
 * @throws {Object} Will call next() with error object containing:
 *   - statusCode: 400 - When iss (issuer) is missing or invalid
 *   - statusCode: 400 - When iss is not a valid number between 1 and 999999999
 */
function refresh(req: Request, res: MyResponse, next: NextFunction): void {}

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
function decodeAccess(req: Request, _res: Response, next: NextFunction): void {}

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
function decodeRefresh(req: Request, _res: Response, next: NextFunction): void {}

```

### JWT Refresh

This function will look for an ISS in the client request body :

```Javascript
const iss = req.body.decodedAccessToken?.iss || req.body?.id?.toString();
```

It will then send both new refresh and access tokens in the res object.

```Javascript
res.rows = [{ accessToken, refreshToken }];
```

### JWT Decoding

decodeAccess() functions will look for a bearer in authorization headers.

```Javascript
const bearer = req.headers.authorization;
```

It will then send the decoded token in the res object.

```Javascript
req.decodedAccessToken = decodedToken;
```

decodeRefresh() functions will look for a token in the client request body.

```Javascript
const token = req.body.refreshToken;
```

It will then send the decoded token in the res object.

```Javascript
req.decodedRefreshToken = decodedToken;
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
