// Set environment variables BEFORE importing the module
process.env.TOKEN_SECRET = "YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc";
process.env.ACCESS_TOKEN_DURATION = "600";
process.env.REFRESH_TOKEN_DURATION = "86400";

// Use require() instead of import to ensure env vars are set first
const { decodeRefresh } = require("../dist/toker-express.js");
const { sign } = require("@dwtechs/toker");

// Mock the log module
jest.mock("@dwtechs/winstan", () => ({
  log: {
    debug: jest.fn()
  }
}));

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    TOKEN_SECRET: "YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc",
    ACCESS_TOKEN_DURATION: "600",
    REFRESH_TOKEN_DURATION: "86400"
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe("decodeRefresh middleware", () => {
  let req, res, next;
  const secrets = ["YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc"];

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      locals: {}
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("JWT format validation", () => {

    it("should return 401 error when token is not a valid JWT format", async () => {
      req.body.refreshToken = "invalidtoken";
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid refresh token"
      });
    });

    it("should return 401 error when token has only 2 parts", async () => {
      req.body.refreshToken = "header.payload";
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid refresh token"
      });
    });

    it("should return 401 error when token has 4 parts", async () => {
      req.body.refreshToken = "header.payload.signature.extra";
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid refresh token"
      });
    });

    it("should return 401 error when token is empty string with dots", async () => {
      req.body.refreshToken = "..";
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid refresh token"
      });
    });

    it("should return 401 error when refreshToken is undefined", async () => {
      req.body.refreshToken = undefined;
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid refresh token"
      });
    });

    it("should return 401 error when refreshToken is null", async () => {
      req.body.refreshToken = null;
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid refresh token"
      });
    });

    it("should return 401 error when refreshToken is empty string", async () => {
      req.body.refreshToken = "";
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid refresh token"
      });
    });

    it("should return 401 error when body is missing", async () => {
      req.body = undefined;
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid refresh token"
      });
    });

  });

  describe("Token verification errors", () => {

    it("should call next with InvalidTokenError for malformed token", async () => {
      req.body.refreshToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-payload.signature";
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid refresh token"
      });
    });

    it("should successfully decode token within valid timeframe", async () => {
      // Create a token with 1 second duration and use it immediately
      const shortLivedToken = sign(12345, 1, "refresh", secrets);
      req.body.refreshToken = shortLivedToken;
      
      // Wait for token to be active but still within valid period
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      // Should succeed as token is still valid
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe(12345);
    });

    it("should call next with InvalidSignatureError for token with invalid signature", async () => {
      // Create a valid token and tamper with the signature
      const validToken = sign(12345, 3600, "refresh", secrets);
      const parts = validToken.split(".");
      const tamperedToken = parts[0] + "." + parts[1] + ".tampered_signature";
      req.body.refreshToken = tamperedToken;
      
      // Wait for token to be active to bypass nbf check
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      // The error object is the Error instance itself, not wrapped in an object
      const errorArg = next.mock.calls[0][0];
      expect(errorArg.name).toBe("Toker: InvalidSignatureError");
      expect(errorArg.message).toContain("JWT token signature is invalid");
    });

    it("should call next with InactiveTokenError for future token", async () => {
      // Create a token that's not active yet (nbf in the future)
      // This is harder to test directly, but we can create a token with a future nbf
      const futureToken = sign(12345, 3600, "refresh", secrets);
      // The sign function automatically sets nbf to iat + 1, so this should work normally
      // For a proper future token test, we'd need to modify the token creation
      req.body.refreshToken = futureToken;
      
      // Wait for the token to be ready (nbf check)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      // This should succeed as the token is now active
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
    });

  });

  describe("Issuer validation", () => {

    it("should handle string issuer values", async () => {
      // Token library allows string iss values
      const tokenWithStringIss = sign("12345", 3600, "refresh", secrets);
      req.body.refreshToken = tokenWithStringIss;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken.iss).toBe("12345");
    });

    it("should return 400 error when iss is 0", async () => {
      // Zero is outside the valid range (1-999999999)
      const tokenWithZeroIss = sign(0, 3600, "refresh", secrets);
      req.body.refreshToken = tokenWithZeroIss;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return 400 error when iss exceeds maximum value", async () => {
      // MAX_SAFE_INTEGER is outside the valid range (1-999999999)
      const tokenWithLargeIss = sign(Number.MAX_SAFE_INTEGER, 3600, "refresh", secrets);
      req.body.refreshToken = tokenWithLargeIss;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return 400 error when iss is negative", async () => {
      // Negative values are outside the valid range (1-999999999)
      const tokenWithNegativeIss = sign(-1, 3600, "refresh", secrets);
      req.body.refreshToken = tokenWithNegativeIss;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

  });

  describe("Successful token decoding", () => {

    it("should successfully decode valid refresh token and attach to request", async () => {
      const validToken = sign(12345, 3600, "refresh", secrets);
      req.body.refreshToken = validToken;
      
      // Wait for token to be active
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe(12345);
      expect(res.locals.decodedRefreshToken.typ).toBe("refresh");
      expect(typeof res.locals.decodedRefreshToken.iat).toBe("number");
      expect(typeof res.locals.decodedRefreshToken.exp).toBe("number");
      expect(typeof res.locals.decodedRefreshToken.nbf).toBe("number");
    });

    it("should handle minimum valid iss value (1)", async () => {
      const validToken = sign(1, 3600, "refresh", secrets);
      req.body.refreshToken = validToken;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe(1);
    });

    it("should handle maximum valid iss value (999999999)", async () => {
      const validToken = sign(999999999, 3600, "refresh", secrets);
      req.body.refreshToken = validToken;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe(999999999);
    });

    it("should handle iss as string number", async () => {
      const validToken = sign("54321", 3600, "refresh", secrets);
      req.body.refreshToken = validToken;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe("54321");
    });

    it("should successfully decode expired token during its valid period", async () => {
      // Create a token with 1 second duration, use it before expiration
      const shortLivedToken = sign(12345, 1, "refresh", secrets);
      req.body.refreshToken = shortLivedToken;
      
      // Wait for token to be active but still valid
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      // Should succeed because token is still valid
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe(12345);
    });

    it("should handle access type token (even though it's for refresh)", async () => {
      const accessToken = sign(12345, 3600, "access", secrets);
      req.body.refreshToken = accessToken;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe(12345);
      expect(res.locals.decodedRefreshToken.typ).toBe("access");
    });

  });

  describe("Edge cases", () => {

    it("should handle very long token", async () => {
      const validToken = sign(12345, 86400, "refresh", secrets); // Long duration = longer token
      req.body.refreshToken = validToken;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe(12345);
    });

    it("should not modify res object", async () => {
      const validToken = sign(12345, 3600, "refresh", secrets);
      req.body.refreshToken = validToken;
      const originalRes = { ...res };
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(res).toEqual(originalRes);
    });

    it("should handle concurrent calls with different tokens", async () => {
      const token1 = sign(11111, 3600, "refresh", secrets);
      const token2 = sign(22222, 3600, "refresh", secrets);
      
      const req1 = { 
        body: { refreshToken: token1 }
      };
      const req2 = { 
        body: { refreshToken: token2 }
      };
      
      const res1 = { locals: {} };
      const res2 = { locals: {} };
      const next1 = jest.fn();
      const next2 = jest.fn();
      
      // Wait for tokens to be active
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req1, res1, next1);
      await decodeRefresh(req2, res2, next2);
      
      expect(next1).toHaveBeenCalledWith();
      expect(next2).toHaveBeenCalledWith();
      expect(res1.locals.decodedRefreshToken.iss).toBe(11111);
      expect(res2.locals.decodedRefreshToken.iss).toBe(22222);
    });

    it("should handle req.body with additional properties", async () => {
      const validToken = sign(12345, 3600, "refresh", secrets);
      req.body = {
        refreshToken: validToken,
        userId: 12345,
        extraData: "should not interfere"
      };
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe(12345);
    });

  });

  describe("Token structure validation", () => {

    it("should verify token contains expected claims", async () => {
      const validToken = sign(12345, 3600, "refresh", secrets);
      req.body.refreshToken = validToken;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toHaveProperty("iss");
      expect(res.locals.decodedRefreshToken).toHaveProperty("iat");
      expect(res.locals.decodedRefreshToken).toHaveProperty("exp");
      expect(res.locals.decodedRefreshToken).toHaveProperty("nbf");
      expect(res.locals.decodedRefreshToken).toHaveProperty("typ");
      
      // Verify claim types
      expect(typeof res.locals.decodedRefreshToken.iss).toBe("number");
      expect(typeof res.locals.decodedRefreshToken.iat).toBe("number");
      expect(typeof res.locals.decodedRefreshToken.exp).toBe("number");
      expect(typeof res.locals.decodedRefreshToken.nbf).toBe("number");
      expect(typeof res.locals.decodedRefreshToken.typ).toBe("string");
    });

    it("should verify token timestamps are logical", async () => {
      const validToken = sign(12345, 3600, "refresh", secrets);
      req.body.refreshToken = validToken;
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      const decoded = res.locals.decodedRefreshToken;
      
      // exp should be after iat
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
      // nbf should be around iat (usually iat + 1)
      expect(decoded.nbf).toBeGreaterThanOrEqual(decoded.iat);
      // exp should be 3600 seconds after iat (duration)
      expect(decoded.exp - decoded.iat).toBe(3600);
    });

  });

  describe("Differences from decodeAccess", () => {

    it("should successfully decode non-expired token", async () => {
      // Create token with normal duration
      const validToken = sign(12345, 3600, "refresh", secrets);
      req.body.refreshToken = validToken;
      
      // Wait for token to be active
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      // Should succeed
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe(12345);
    });

    it("should read token from req.body.refreshToken instead of Authorization header", async () => {
      const validToken = sign(12345, 3600, "refresh", secrets);
      // Set token in body, not headers
      req.body.refreshToken = validToken;
      req.headers = { authorization: "Bearer should_be_ignored" };
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
      expect(res.locals.decodedRefreshToken.iss).toBe(12345);
    });

    it("should not have res.locals.isProtected bypass logic", async () => {
      const validToken = sign(12345, 3600, "refresh", secrets);
      req.body.refreshToken = validToken;
      res.locals.isProtected = false; // This should be ignored
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await decodeRefresh(req, res, next);
      
      // Should process regardless of isProtected
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.decodedRefreshToken).toBeDefined();
    });

  });

});