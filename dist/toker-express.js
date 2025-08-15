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
import { isString, isNumber, isValidNumber, isJWT } from '@dwtechs/checkard';
import { log } from '@dwtechs/winstan';

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { TOKEN_SECRET, ACCESS_TOKEN_DURATION, REFRESH_TOKEN_DURATION } = process.env;
const TE_PREFIX = "Toker-express: ";
if (!TOKEN_SECRET)
    throw new Error(`${TE_PREFIX}Missing TOKEN_SECRET environment variable`);
if (!isString(TOKEN_SECRET, "!0"))
    throw new Error(`${TE_PREFIX}Invalid TOKEN_SECRET environment variable`);
const secrets = [TOKEN_SECRET];
const accessDuration = isNumber(ACCESS_TOKEN_DURATION, false) ? ACCESS_TOKEN_DURATION : 600;
const refreshDuration = isNumber(REFRESH_TOKEN_DURATION, false) ? REFRESH_TOKEN_DURATION : 86400;
function refresh(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const iss = ((_a = req.decodedAccessToken) === null || _a === void 0 ? void 0 : _a.iss) || ((_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.id) === null || _c === void 0 ? void 0 : _c.toString());
        if (!isValidNumber(iss, 1, 999999999, false))
            return next({ statusCode: 400, message: `${TE_PREFIX}Missing iss` });
        log.debug(`${TE_PREFIX}Create tokens for user ${iss}`);
        let accessToken;
        let refreshToken;
        try {
            accessToken = sign(iss, accessDuration, "access", secrets);
            refreshToken = sign(iss, refreshDuration, "refresh", secrets);
        }
        catch (err) {
            return next(err);
        }
        log.debug(`refreshToken='${refreshToken}', accessToken='${accessToken}'`);
        res.rows = [{ accessToken, refreshToken }];
        next();
    });
}
function decodeAccess(req, _res, next) {
    log.debug(`${TE_PREFIX}decode access token`);
    if (!req.isProtected)
        return next();
    let t;
    try {
        t = parseBearer(req.headers.authorization);
    }
    catch (e) {
        return next(e);
    }
    log.debug(`${TE_PREFIX}accessToken : ${t}`);
    if (!isJWT(t))
        return next({ statusCode: 401, message: `${TE_PREFIX}Invalid access token` });
    let decodedToken = null;
    try {
        decodedToken = verify(t, secrets, true);
    }
    catch (e) {
        return next(e);
    }
    if (!isValidNumber(decodedToken.iss, 1, 999999999, false))
        return next({ statusCode: 400, message: `${TE_PREFIX}Missing iss` });
    log.debug(`${TE_PREFIX}Decoded access token : ${JSON.stringify(decodedToken)}`);
    req.decodedAccessToken = decodedToken;
    next();
}
function decodeRefresh(req, _res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = req.body.refreshToken;
        log.debug(`${TE_PREFIX}decodeRefresh(token=${token})`);
        if (!isJWT(token))
            return next({ statusCode: 401, message: `${TE_PREFIX}Invalid refresh token` });
        let decodedToken = null;
        try {
            decodedToken = verify(token, secrets, false);
        }
        catch (e) {
            return next(e);
        }
        if (!isValidNumber(decodedToken.iss, 1, 999999999, false))
            return next({ statusCode: 400, message: `${TE_PREFIX}Missing iss` });
        log.debug(`${TE_PREFIX}Decoded refresh token : ${JSON.stringify(req.decodedRefreshToken)}`);
        req.decodedRefreshToken = decodedToken;
        next();
    });
}

export { decodeAccess, decodeRefresh, refresh };
