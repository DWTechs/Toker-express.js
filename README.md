
[![License: MIT](https://img.shields.io/npm/l/@dwtechs/toker-express.svg?color=brightgreen)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40dwtechs%2Ftoker-express.svg)](https://www.npmjs.com/package/@dwtechs/toker-express)
[![last version release date](https://img.shields.io/github/release-date/DWTechs/Toker-express.js)](https://www.npmjs.com/package/@dwtechs/toker-express)


- [Synopsis](#synopsis)
- [Support](#support)
- [Installation](#installation)
- [Usage](#usage)
  - [ES6](#es6)
  - [Configure](#configure)
  - [Environment variables](#environment-variables)
- [API Reference](#api-reference)
- [options](#pwd-options)
- [Logs](#logs)
- [Contributors](#contributors)
- [Stack](#stack)


## Synopsis

**[Toker-express.js](https://github.com/DWTechs/Toker-express.js)** is an open source JWT management library for Express.js.  
It includes @dwtechs/toker library and adds Express middlewares to be used in a node.js service.

- Very lightweight
- Thoroughly tested
- Imported as EcmaScrypt module
- Works in Javascript and Typescript
- Written in Typescript


## Support

- node: 22

This is the oldest targeted versions.  
The library uses node:crypto.   


## Installation

```bash
$ npm i @dwtechs/passken-express
```


## Usage


### ES6 / TypeScript

```javascript

import * as pk from "@dwtechs/passken-express";
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
  pk.create,
  user.addMany,
  mail.sendRegistration,
];

// Login user
const login = [
  user.validate,
  user.getPwd,
  pk.compare,
  user.isActive,
];

const addConsumer = [
  consumer.validate,
  pk.decodeAccess,
  pk.refresh,
  consumer.addOne
];

const refresh = [
  consumer.validate,
  pk.decodeRefresh,
  consumer.match,
  pk.refresh,
  consumer.updateOne,
];

// Routes

// log a user with his email & password
router.post("/", login);

// Add new users
router.post("/", addMany);

```

### Configure

You do not need to initialise the library using **pwd.init()** if the default config is fine for you.

Passken will start with the following default password configuration : 

```Javascript
Options = {
  len: 12,
  num: true,
  ucase: true,
  lcase: true,
  sym: false,
  strict: true,
  similarChars: false,
};
```


### Environment variables

You do not need to intialise the library using **pwd.init()** if you are using the following environment variables:
 
```bash
  PWD_LENGTH,
  PWD_NUMBERS,
  PWD_UPPERCASE,
  PWD_LOWERCASE,
  PWD_SYMBOLS,
  PWD_STRICT,
  PWD_SIMILAR_CHARS,
  PWD_SECRET,
  ACCESS_TOKEN_DURATION, 
  REFRESH_TOKEN_DURATION
  TOKEN_SECRET,
```

These environment variables will update the default values of the lib at start up.
So you do not need to init the library in the code.

Note that **PWD_SECRET** and **TOKEN_SECRET** are mandatory.


## API Reference


### Types

```javascript

type Options = {
  len: number,
  num: boolean,
  ucase: boolean,
  lcase: boolean,
  sym: boolean,
  strict: boolean,
  similarChars: boolean,
};

```

### PWD Functions

```javascript

/**
 * Initializes the password generation options for the Passken-express library.
 * 
 * This function sets the global password options that will be used by the `create` function
 * when generating random passwords. The options control password characteristics such as
 * length, character sets, and complexity requirements.
 * 
 * @param {Options} options - Password generation options from @dwtechs/passken
 * @param {number}  options.len - Password length (minimum characters)
 * @param {boolean} options.num - Include numbers in password
 * @param {boolean} options.ucase - Include uppercase letters
 * @param {boolean} options.lcase - Include lowercase letters  
 * @param {boolean} options.sym - Include symbols in password
 * @param {boolean} options.strict - Password must include at least one character from each enabled pool
 * @param {boolean} options.similarChars - Allow visually similar characters (l, I, 1, o, O, 0)
 * 
 * @returns {void}
 * 
 * **Input Properties:**
 * - `options` (Options object) - Password generation configuration
 * 
 * **Output Properties:**
 * - None (sets global configuration)
 * 
 * @example
 * ```typescript
 * import { init } from '@dwtechs/passken-express';
 * 
 * // Initialize with custom password options
 * init({
 *   len: 16,
 *   num: true,
 *   ucase: true,
 *   lcase: true,
 *   sym: true,
 *   strict: true,
 *   similarChars: false
 * });
 * ```
 */
function init(options: Options): void {}

/**
 * Express middleware to compare a user-provided password with a stored hashed password.
 * 
 * This middleware validates that a plaintext password from the request matches a hashed
 * password from the database. It extracts the password from the request body and the
 * hash from either the response rows or response object, then uses Passken's secure
 * comparison function to verify the match.
 * 
 * @param {Request} req - Express request object containing the password
 * @param {MyResponse} res - Express response object containing the database hash
 * @param {NextFunction} next - Express next function to continue middleware chain
 * 
 * @returns {void} Calls next() to continue, or next(error) on failure
 * 
 * **Input Properties Required:**
 * - `req.body.password` OR `req.body.pwd` (string) - User's plaintext password
 * - `res.rows[0].password` OR `res.rows[0].pwd` OR `res.password` OR `res.pwd` (string) - Hashed password from database
 * 
 * **Output Properties:**
 * - None (validation only - continues middleware chain on success)
 * 
 * @throws {Object} Will call next() with error object containing:
 *   - statusCode: 400 - When password is missing from request body
 *   - statusCode: 400 - When hash is missing from response data
 *   - statusCode: 401 - When password doesn't match the stored hash
 *   - statusCode: 400 - InvalidPasswordError from Passken compare() function
 *   - statusCode: 400 - InvalidBase64SecretError from Passken compare() function
 * 
 * @example
 * ```typescript
 * import { compare } from '@dwtechs/passken-express';
 * 
 * // Usage in Express route after database query
 * app.post('/login', getUserFromDB, compare, (req, res) => {
 *   res.json({ message: 'Login successful' });
 * });
 * 
 * // Request body should contain:
 * // { "password": "user-password" } or { "pwd": "user-password" }
 * 
 * // Response should contain hash from database:
 * // res.rows[0].password or res.rows[0].pwd or res.password or res.pwd
 * ```
 */
function compare(req: Request, res: MyResponse, next: NextFunction): void {}

/**
 * Express middleware to generate random passwords and encrypt them for multiple users.
 * 
 * This middleware generates secure random passwords for multiple user records and encrypts
 * them using Passken's encryption function. It processes an array of user objects in the
 * request body, adding both plaintext and encrypted password fields to each record.
 * The plaintext passwords can be sent to users (e.g., via email) while encrypted passwords
 * are stored in the database.
 * 
 * @param {Request} req - Express request object containing user records in body.rows
 * @param {Response} _res - Express response object (not used in this function)
 * @param {NextFunction} next - Express next function to continue middleware chain
 * 
 * @returns {void} Calls next() to continue, or next(error) on failure
 * 
 * **Input Properties Required:**
 * - `req.body.rows` (array) - Array of user objects to generate passwords for
 * 
 * **Output Properties:**
 * - `req.body.rows[i].pwd` (string) - Generated plaintext password for each user
 * - `req.body.rows[i].encryptedPwd` (string) - Encrypted password hash for database storage
 * 
 * @throws {Object} Will call next() with error object containing:
 *   - statusCode: 400 - When req.body.rows is missing or not an array
 *   - statusCode: 400 - InvalidPasswordError from Passken encrypt() function
 *   - statusCode: 400 - InvalidBase64SecretError from Passken encrypt() function
 * 
 * @example
 * ```typescript
 * import { create } from '@dwtechs/passken-express';
 * 
 * // Usage in Express route for bulk user creation
 * app.post('/users/bulk', create, saveUsersToDatabase, (req, res) => {
 *   // Send plaintext passwords to users via email
 *   req.body.rows.forEach(user => {
 *     sendPasswordEmail(user.email, user.pwd);
 *   });
 *   res.json({ message: 'Users created successfully' });
 * });
 * 
 * // Request body should contain:
 * // { "rows": [{ "name": "User1", "email": "user1@example.com" }, ...] }
 * 
 * // After processing, each row will have:
 * // { "name": "User1", "email": "user1@example.com", "pwd": "generated-password", "encryptedPwd": "encrypted-hash" }
 * ```
 */
function create(req: Request, res: Response, next: NextFunction): void {}

```

### JWT Functions

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
 * **Input Properties Required:**
 * - `req.decodedAccessToken.iss` OR `req.body.id` (number/string) - User ID/issuer for token generation
 * 
 * **Output Properties:**
 * - `res.rows[0].accessToken` (string) - New JWT access token
 * - `res.rows[0].refreshToken` (string) - New JWT refresh token
 * 
 * @throws {Object} Will call next() with error object containing:
 *   - statusCode: 400 - When iss (issuer) is missing or invalid
 *   - statusCode: 400 - When iss is not a valid number between 1 and 999999999
 *   - statusCode: 400 - InvalidIssuerError from Passken sign() function
 *   - statusCode: 500 - InvalidSecretsError from Passken sign() function
 *   - statusCode: 400 - InvalidDurationError from Passken sign() function
 *   - statusCode: 500 - SecretDecodingError from Passken sign() function
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
 * **Input Properties Required:**
 * - `req.isProtected` (boolean) - Must be true to process the request
 * - `req.headers.authorization` (string) - Bearer token in format "Bearer <token>"
 * 
 * **Output Properties:**
 * - `req.decodedAccessToken` (object) - Decoded JWT payload
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
 * **Input Properties Required:**
 * - `req.body.refreshToken` (string) - JWT refresh token to decode and verify
 * 
 * **Output Properties:**
 * - `req.decodedRefreshToken` (object) - Decoded JWT refresh token payload
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
function decodeRefresh(req: Request, _res: Response, next: NextFunction): void {}

```

### Password Comparison

The function will look for a password value from the client request body :  

```Javascript
const pwd = req.body?.password || req.body?.pwd.
```

It will then look for the hashed password stored in the database :

```Javascript
const hash = res.rows[0].password || res.rows[0].pwd || res.password || res.pwd;
```

It will throw an error if the password or the hash are missing.
It will throw an error if the password does not match the hash.

### Password generation

The function will loop through an array in **req.body.rows**.

It will throw an error if **req.body.rows** is missing or empty.

New **passwords** will be added into **req.body.rows[i].pwd**.
Encrypted passwords will be added into **req.body.rows[i].encryptedPwd** .

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

decodeAccess() functions will look for a token in the client request body.

```Javascript
const token = req.body.accessToken;
const ignoreExpiration = req.body.ignoreExpiration || false;
```

It will then send the decoded token in the res object.

```Javascript
req.body.decodedAccessToken = decodedToken;
```

decodeRefresh() functions will look for a token in the client request body.

```Javascript
const token = req.body.refreshToken;
```

It will then send the decoded token in the res object.

```Javascript
req.body.decodedRefreshToken = decodedToken;
```


## PWD Options

Any of these can be passed into the options object for each function.

| Name         | type    |              Description                                     | Default |  
| :----------- | :------ | :----------------------------------------------------------- | :------ |
| len	         | Integer | Minimal length of password.                                  | 12      |
| num*	       | Boolean | use numbers in password.                                     | true    |
| sym*	       | Boolean | use symbols in password                                      | true    |
| lcase*	     | Boolean | use lowercase in password                                    | true    |
| ucase*	     | Boolean | use uppercase letters in password.                           | true    |
| strict	     | Boolean | password must include at least one character from each pool.	| true    |
| similarChars | Boolean | allow close looking chars.                                   | false   | 

*At least one of those options must be true.  

Symbols used : !@#%*_-+=:;?><,./()
Similar characters : l, I, 1, o, O, 0


## Logs

**Passken-express.js** uses **[@dwtechs/Winstan](https://www.npmjs.com/package/@dwtechs/winstan)** library for logging.
All logs are in debug mode. Meaning they should not appear in production mode.

## Contributors

**Passken-express.js** is still in development and we would be glad to get all the help you can provide.
To contribute please read **[contributor.md](https://github.com/DWTechs/Passken-express.js/blob/main/contributor.md)** for detailed installation guide.


## Stack

| Purpose         |                    Choice                    |                                                     Motivation |
| :-------------- | :------------------------------------------: | -------------------------------------------------------------: |
| repository      |        [Github](https://github.com/)         |     hosting for software development version control using Git |
| package manager |     [npm](https://www.npmjs.com/get-npm)     |                                default node.js package manager |
| language        | [TypeScript](https://www.typescriptlang.org) | static type checking along with the latest ECMAScript features |
| module bundler  |      [Rollup](https://rollupjs.org)          |                        advanced module bundler for ES6 modules |
| unit testing    |          [Jest](https://jestjs.io/)          |                  delightful testing with a focus on simplicity |
