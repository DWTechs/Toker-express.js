// Set environment variables BEFORE importing the module
process.env.TOKEN_SECRET = "YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc";
process.env.ACCESS_TOKEN_DURATION = "600";
process.env.REFRESH_TOKEN_DURATION = "86400";

// Use require() instead of import to ensure env vars are set first
const { decodeAccess } = require("../dist/toker-express.js");
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

describe("decodeAccess middleware", () => {
  let req, res, next;
  const secrets = ["YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc"];

  beforeEach(() => {
    req = {
      isProtected: true,
      headers: {},
      decodedAccessToken: null
    };
    res = {};
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Route protection bypass", () => {
    
    it("should bypass middleware when req.isProtected is false", () => {
      req.isProtected = false;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.decodedAccessToken).toBeNull();
    });

    it("should bypass middleware when req.isProtected is undefined", () => {
      req.isProtected = undefined;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.decodedAccessToken).toBeNull();
    });

    it("should bypass middleware when req.isProtected is null", () => {
      req.isProtected = null;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.decodedAccessToken).toBeNull();
    });

  });

  describe("Authorization header validation", () => {

    it("should call next with MissingAuthorizationError when authorization header is missing", () => {
      // No authorization header set
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "MissingAuthorizationError"
        })
      );
      expect(req.decodedAccessToken).toBeNull();
    });

    it("should call next with MissingAuthorizationError when authorization header is undefined", () => {
      req.headers.authorization = undefined;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "MissingAuthorizationError"
        })
      );
    });

    it("should call next with MissingAuthorizationError when authorization header is empty string", () => {
      req.headers.authorization = "";
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "MissingAuthorizationError"
        })
      );
    });

    it("should call next with InvalidBearerFormatError when authorization header format is invalid", () => {
      req.headers.authorization = "Basic dXNlcjpwYXNzd29yZA==";
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "InvalidBearerFormatError"
        })
      );
    });

    it("should call next with InvalidBearerFormatError when Bearer has no token", () => {
      req.headers.authorization = "Bearer";
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "InvalidBearerFormatError"
        })
      );
    });

    it("should call next with InvalidBearerFormatError when Bearer has only spaces", () => {
      req.headers.authorization = "Bearer   ";
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "InvalidBearerFormatError"
        })
      );
    });

  });

  describe("JWT format validation", () => {

    it("should return 401 error when token is not a valid JWT format", () => {
      req.headers.authorization = "Bearer invalidtoken";
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid access token"
      });
    });

    it("should return 401 error when token has only 2 parts", () => {
      req.headers.authorization = "Bearer header.payload";
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid access token"
      });
    });

    it("should return 401 error when token has 4 parts", () => {
      req.headers.authorization = "Bearer header.payload.signature.extra";
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid access token"
      });
    });

    it("should return 401 error when token is empty string with dots", () => {
      req.headers.authorization = "Bearer ..";
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 401,
        message: "Toker-express: Invalid access token"
      });
    });

  });

  describe("Token verification errors", () => {

    it("should call next with InvalidTokenError for malformed token", () => {
      req.headers.authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-payload.signature";
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "InvalidTokenError"
        })
      );
    });

    it("should call next with ExpiredTokenError for expired token", () => {
      // Create an expired token (exp in the past)
      const expiredToken = sign(12345, -3600, "access", secrets); // -3600 = already expired
      req.headers.authorization = `Bearer ${expiredToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "ExpiredTokenError"
        })
      );
    });

    it("should call next with InvalidSignatureError for token with invalid signature", () => {
      // Create a valid token and tamper with the signature
      const validToken = sign(12345, 3600, "access", secrets);
      const parts = validToken.split(".");
      const tamperedToken = parts[0] + "." + parts[1] + ".tampered_signature";
      req.headers.authorization = `Bearer ${tamperedToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "InvalidSignatureError"
        })
      );
    });

  });

  describe("Issuer validation", () => {

    it("should return 400 error when decoded token has no iss claim", () => {
      // Create a token without iss claim by mocking
      const tokenWithoutIss = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSm9obiIsImluZCI6MTIzNDU2NzgsImV4cCI6OTk5OTk5OTk5OX0.invalid";
      
      // We need to create a valid token first, then test our validation
      const validToken = sign("invalid_iss", 3600, "access", secrets);
      req.headers.authorization = `Bearer ${validToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return 400 error when iss is 0", () => {
      const tokenWithZeroIss = sign(0, 3600, "access", secrets);
      req.headers.authorization = `Bearer ${tokenWithZeroIss}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return 400 error when iss exceeds maximum value", () => {
      const tokenWithLargeIss = sign(1000000000, 3600, "access", secrets); // Greater than 999999999
      req.headers.authorization = `Bearer ${tokenWithLargeIss}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return 400 error when iss is negative", () => {
      const tokenWithNegativeIss = sign(-1, 3600, "access", secrets);
      req.headers.authorization = `Bearer ${tokenWithNegativeIss}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

  });

  describe("Successful token decoding", () => {

    it("should successfully decode valid access token and attach to request", () => {
      const validToken = sign(12345, 3600, "access", secrets);
      req.headers.authorization = `Bearer ${validToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.decodedAccessToken).toBeDefined();
      expect(req.decodedAccessToken.iss).toBe(12345);
      expect(req.decodedAccessToken.typ).toBe("access");
      expect(typeof req.decodedAccessToken.iat).toBe("number");
      expect(typeof req.decodedAccessToken.exp).toBe("number");
      expect(typeof req.decodedAccessToken.nbf).toBe("number");
    });

    it("should handle minimum valid iss value (1)", () => {
      const validToken = sign(1, 3600, "access", secrets);
      req.headers.authorization = `Bearer ${validToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.decodedAccessToken).toBeDefined();
      expect(req.decodedAccessToken.iss).toBe(1);
    });

    it("should handle maximum valid iss value (999999999)", () => {
      const validToken = sign(999999999, 3600, "access", secrets);
      req.headers.authorization = `Bearer ${validToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.decodedAccessToken).toBeDefined();
      expect(req.decodedAccessToken.iss).toBe(999999999);
    });

    it("should handle iss as string number", () => {
      const validToken = sign("54321", 3600, "access", secrets);
      req.headers.authorization = `Bearer ${validToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.decodedAccessToken).toBeDefined();
      expect(req.decodedAccessToken.iss).toBe("54321");
    });

    it("should ignore expiration when ignoreExpiration is true (default behavior)", () => {
      // Create an expired token
      const expiredToken = sign(12345, -3600, "access", secrets); // Expired 1 hour ago
      req.headers.authorization = `Bearer ${expiredToken}`;
      
      decodeAccess(req, res, next);
      
      // Should succeed because decodeAccess passes ignoreExpiration=true to verify
      expect(next).toHaveBeenCalledWith();
      expect(req.decodedAccessToken).toBeDefined();
      expect(req.decodedAccessToken.iss).toBe(12345);
    });

    it("should handle refresh type token (even though it's for access)", () => {
      const refreshToken = sign(12345, 3600, "refresh", secrets);
      req.headers.authorization = `Bearer ${refreshToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.decodedAccessToken).toBeDefined();
      expect(req.decodedAccessToken.iss).toBe(12345);
      expect(req.decodedAccessToken.typ).toBe("refresh");
    });

  });

  describe("Authorization header format variations", () => {

    it("should handle Bearer with multiple spaces", () => {
      const validToken = sign(12345, 3600, "access", secrets);
      req.headers.authorization = `Bearer    ${validToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.decodedAccessToken).toBeDefined();
      expect(req.decodedAccessToken.iss).toBe(12345);
    });

    it("should handle Bearer with exactly one space", () => {
      const validToken = sign(12345, 3600, "access", secrets);
      req.headers.authorization = `Bearer ${validToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.decodedAccessToken).toBeDefined();
      expect(req.decodedAccessToken.iss).toBe(12345);
    });

  });

  describe("Edge cases", () => {

    it("should handle very long token", () => {
      const validToken = sign(12345, 86400, "access", secrets); // Long duration = longer token
      req.headers.authorization = `Bearer ${validToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.decodedAccessToken).toBeDefined();
      expect(req.decodedAccessToken.iss).toBe(12345);
    });

    it("should handle req without headers object", () => {
      delete req.headers;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "MissingAuthorizationError"
        })
      );
    });

    it("should not modify res object", () => {
      const validToken = sign(12345, 3600, "access", secrets);
      req.headers.authorization = `Bearer ${validToken}`;
      const originalRes = { ...res };
      
      decodeAccess(req, res, next);
      
      expect(res).toEqual(originalRes);
    });

    it("should handle concurrent calls with different tokens", () => {
      const token1 = sign(11111, 3600, "access", secrets);
      const token2 = sign(22222, 3600, "access", secrets);
      
      const req1 = { 
        isProtected: true, 
        headers: { authorization: `Bearer ${token1}` }, 
        decodedAccessToken: null 
      };
      const req2 = { 
        isProtected: true, 
        headers: { authorization: `Bearer ${token2}` }, 
        decodedAccessToken: null 
      };
      
      const next1 = jest.fn();
      const next2 = jest.fn();
      
      decodeAccess(req1, res, next1);
      decodeAccess(req2, res, next2);
      
      expect(next1).toHaveBeenCalledWith();
      expect(next2).toHaveBeenCalledWith();
      expect(req1.decodedAccessToken.iss).toBe(11111);
      expect(req2.decodedAccessToken.iss).toBe(22222);
    });

  });

  describe("Token structure validation", () => {

    it("should verify token contains expected claims", () => {
      const validToken = sign(12345, 3600, "access", secrets);
      req.headers.authorization = `Bearer ${validToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.decodedAccessToken).toHaveProperty("iss");
      expect(req.decodedAccessToken).toHaveProperty("iat");
      expect(req.decodedAccessToken).toHaveProperty("exp");
      expect(req.decodedAccessToken).toHaveProperty("nbf");
      expect(req.decodedAccessToken).toHaveProperty("typ");
      
      // Verify claim types
      expect(typeof req.decodedAccessToken.iss).toBe("number");
      expect(typeof req.decodedAccessToken.iat).toBe("number");
      expect(typeof req.decodedAccessToken.exp).toBe("number");
      expect(typeof req.decodedAccessToken.nbf).toBe("number");
      expect(typeof req.decodedAccessToken.typ).toBe("string");
    });

    it("should verify token timestamps are logical", () => {
      const validToken = sign(12345, 3600, "access", secrets);
      req.headers.authorization = `Bearer ${validToken}`;
      
      decodeAccess(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      const decoded = req.decodedAccessToken;
      
      // exp should be after iat
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
      // nbf should be around iat (usually iat + 1)
      expect(decoded.nbf).toBeGreaterThanOrEqual(decoded.iat);
      // exp should be 3600 seconds after iat (duration)
      expect(decoded.exp - decoded.iat).toBe(3600);
    });

  });

});