/*
MIT License

Copyright (c) 2025 DWTechs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

https://github.com/DWTechs/Toker-express.js
*/

import { sign, parseBearer, verify } from '@dwtechs/toker';
import { isString, isNumber, isValidNumber, isArray, isObject, isJWT } from '@dwtechs/checkard';
import { log } from '@dwtechs/winstan';

const { TOKEN_SECRET, ACCESS_TOKEN_DURATION, REFRESH_TOKEN_DURATION } = process.env;
const LOGS_PREFIX = "Toker-express: ";
if (!TOKEN_SECRET)
    throw new Error(`${LOGS_PREFIX}Missing TOKEN_SECRET environment variable`);
if (!isString(TOKEN_SECRET, "!0"))
    throw new Error(`${LOGS_PREFIX}Invalid TOKEN_SECRET environment variable`);
const secrets = [TOKEN_SECRET];
const accessDuration = isNumber(ACCESS_TOKEN_DURATION, false) ? Number(ACCESS_TOKEN_DURATION) : 600;
const refreshDuration = isNumber(REFRESH_TOKEN_DURATION, false) ? Number(REFRESH_TOKEN_DURATION) : 86400;
function refresh(req, res, next) {
    var _a, _b, _c, _d;
    let iss = (_b = (_a = res.locals) === null || _a === void 0 ? void 0 : _a.decodedAccessToken) === null || _b === void 0 ? void 0 : _b.iss;
    if (!iss)
        iss = (_c = res.locals.id) !== null && _c !== void 0 ? _c : null;
    if (!isValidNumber(iss, 1, 999999999, false))
        return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });
    log.debug(`${LOGS_PREFIX}Create tokens for user ${iss}`);
    let at;
    let rt;
    try {
        at = sign(iss, accessDuration, "access", secrets);
        rt = sign(iss, refreshDuration, "refresh", secrets);
    }
    catch (err) {
        return next(err);
    }
    log.debug(`refreshToken='${rt}', accessToken='${at}'`);
    res.locals.accessToken = at;
    res.locals.refreshToken = rt;
    const rbr = (_d = req.body) === null || _d === void 0 ? void 0 : _d.rows;
    if (isArray(rbr, ">=", 1) && isObject(rbr[0])) {
        rbr[0].accessToken = at;
        rbr[0].refreshToken = rt;
    }
    next();
}
function decodeAccess(req, res, next) {
    log.debug(`${LOGS_PREFIX}decode access token`);
    if (!res.locals.isProtected)
        return next();
    let t;
    try {
        t = parseBearer(req.headers.authorization);
    }
    catch (e) {
        return next(e);
    }
    log.debug(`${LOGS_PREFIX}accessToken : ${t}`);
    if (!isJWT(t))
        return next({ statusCode: 401, message: `${LOGS_PREFIX}Invalid access token` });
    let dt = null;
    try {
        dt = verify(t, secrets, true);
    }
    catch (e) {
        return next(e);
    }
    if (!isValidNumber(dt.iss, 1, 999999999, false))
        return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });
    log.debug(`${LOGS_PREFIX}Decoded access token : ${JSON.stringify(dt)}`);
    res.locals.decodedAccessToken = dt;
    next();
}
function decodeRefresh(req, res, next) {
    var _a;
    const token = (_a = req.body) === null || _a === void 0 ? void 0 : _a.refreshToken;
    log.debug(`${LOGS_PREFIX}decodeRefresh(token=${token})`);
    if (!isJWT(token))
        return next({ statusCode: 401, message: `${LOGS_PREFIX}Invalid refresh token` });
    let dt = null;
    try {
        dt = verify(token, secrets, false);
    }
    catch (e) {
        return next(e);
    }
    if (!isValidNumber(dt.iss, 1, 999999999, false))
        return next({ statusCode: 400, message: `${LOGS_PREFIX}Missing iss` });
    log.debug(`${LOGS_PREFIX}Decoded refresh token : ${JSON.stringify(dt)}`);
    res.locals.decodedRefreshToken = dt;
    next();
}

export { decodeAccess, decodeRefresh, refresh };
