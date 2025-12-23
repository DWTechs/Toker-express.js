// Set environment variables BEFORE importing the module
process.env.TOKEN_SECRET = "YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc";
process.env.ACCESS_TOKEN_DURATION = "600";
process.env.REFRESH_TOKEN_DURATION = "86400";

// Use require() instead of import to ensure env vars are set first
const { refresh } = require("../dist/toker-express.js");

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

describe("refresh middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      decodedAccessToken: null,
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

  describe("Valid issuer scenarios", () => {
    
    it("should generate tokens when valid iss is provided in decodedAccessToken", async () => {
      req.decodedAccessToken = { iss: 12345 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");
      expect(typeof res.locals.accessToken).toBe("string");
      expect(typeof res.locals.refreshToken).toBe("string");
      // Tokens should not be in req.body.rows when using decodedAccessToken
      expect(req.body.rows).toBeUndefined();
    });

    it("should generate tokens when valid iss is provided in res.locals.id", async () => {
      res.locals.id = 54321;
      req.body.rows = [{ name: "Test User" }];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
      expect(typeof req.body.rows[0].accessToken).toBe("string");
      expect(typeof req.body.rows[0].refreshToken).toBe("string");
    });

    it("should prioritize decodedAccessToken.iss over res.locals.id", async () => {
      req.decodedAccessToken = { iss: 11111 };
      res.locals.id = 22222;
      req.body.rows = [{ name: "Test" }];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");
      // Tokens should still be in rows when rows array exists
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle iss as string number in res.locals", async () => {
      res.locals.id = "98765";
      req.body.rows = [{ name: "Test" }];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle minimum valid iss value (1)", async () => {
      req.decodedAccessToken = { iss: 1 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");
    });

    it("should handle maximum valid iss value (999999999)", async () => {
      req.decodedAccessToken = { iss: 999999999 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");
    });

    it("should handle rows array with multiple items (only first row gets tokens)", async () => {
      res.locals.id = 11111;
      req.body.rows = [
        { name: "User 1" },
        { name: "User 2" },
        { name: "User 3" }
      ];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
      expect(req.body.rows[1].accessToken).toBeUndefined();
      expect(req.body.rows[2].accessToken).toBeUndefined();
    });

  });

  describe("Invalid issuer scenarios", () => {

    it("should return error when no iss is provided", async () => {
      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should return error when rows is not an array", async () => {
      req.body.rows = { id: 12345 }; // Object instead of array

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should return error when rows is an empty array", async () => {
      req.body.rows = [];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should return error when rows[0] has no id", async () => {
      req.body.rows = [{ name: "test" }];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should return error when iss is 0", async () => {
      req.decodedAccessToken = { iss: 0 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should return error when iss is negative", async () => {
      req.decodedAccessToken = { iss: -1 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should return error when iss exceeds maximum value", async () => {
      req.decodedAccessToken = { iss: 1000000000 }; // Over 999999999

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should return error when iss is not a number", async () => {
      req.decodedAccessToken = { iss: "invalid" };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should return error when iss is null", async () => {
      req.decodedAccessToken = { iss: null };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should return error when iss is undefined", async () => {
      req.decodedAccessToken = { iss: undefined };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should return error when rows[0].id is invalid string", async () => {
      req.body.rows = [{ id: "not-a-number" }];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

  });

  describe("Token generation error scenarios", () => {

    it("should handle token generation with successful flow", async () => {
      req.decodedAccessToken = { iss: 12345 };

      await refresh(req, res, next);

      // In successful case, next() is called without arguments
      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty('accessToken');
      expect(res.locals).toHaveProperty('refreshToken');
    });

  });

  describe("Edge cases and data validation", () => {

    it("should handle res.locals.id when id is number", async () => {
      res.locals.id = 12345;
      req.body.rows = [{ name: "Test" }];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle empty req.body", async () => {
      req.body = {};

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should handle missing decodedAccessToken", async () => {
      req.decodedAccessToken = undefined;
      res.locals.id = 12345;
      req.body.rows = [{ name: "Test" }];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle rows[0].id as boolean false (falsy)", async () => {
      req.body.rows = [{ id: false }];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should handle rows[0].id as empty string", async () => {
      req.body.rows = [{ id: "" }];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

    it("should handle rows[0] being null", async () => {
      req.body.rows = [null];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.locals.accessToken).toBeUndefined();
      expect(res.locals.refreshToken).toBeUndefined();
    });

  });

  describe("Token validation", () => {

    it("should generate valid JWT tokens", async () => {
      req.decodedAccessToken = { iss: 12345 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty('accessToken');
      expect(res.locals).toHaveProperty('refreshToken');
      
      const { accessToken, refreshToken } = res.locals;
      
      // Basic JWT format validation (3 parts separated by dots)
      expect(accessToken.split('.').length).toBe(3);
      expect(refreshToken.split('.').length).toBe(3);
      
      // Verify tokens are strings
      expect(typeof accessToken).toBe('string');
      expect(typeof refreshToken).toBe('string');
      
      // Verify tokens are not empty
      expect(accessToken.length).toBeGreaterThan(0);
      expect(refreshToken.length).toBeGreaterThan(0);
    });

    it("should generate different tokens on multiple calls", async () => {
      req.decodedAccessToken = { iss: 12345 };

      // First call
      await refresh(req, res, next);
      const firstTokens = { ...res.locals };

      // Reset res.locals for second call
      res.locals = {};
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second call
      await refresh(req, res, next);
      const secondTokens = { ...res.locals };

      // Tokens should be different due to different timestamps
      expect(firstTokens.accessToken).not.toBe(secondTokens.accessToken);
      expect(firstTokens.refreshToken).not.toBe(secondTokens.refreshToken);
    });

    it("should generate tokens in both res.locals and req.body.rows[0] when using rows", async () => {
      res.locals.id = 12345;
      req.body.rows = [{ name: "Test User" }];

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      
      // Tokens in res.locals
      expect(res.locals).toHaveProperty('accessToken');
      expect(res.locals).toHaveProperty('refreshToken');
      
      // Tokens in req.body.rows[0]
      expect(req.body.rows[0]).toHaveProperty('accessToken');
      expect(req.body.rows[0]).toHaveProperty('refreshToken');
      
      // Both should have the same tokens
      expect(res.locals.accessToken).toBe(req.body.rows[0].accessToken);
      expect(res.locals.refreshToken).toBe(req.body.rows[0].refreshToken);
      
      // Original data should be preserved
      expect(req.body.rows[0].name).toBe("Test User");
    });

  });

  describe("Environment variables handling", () => {

    it("should use default durations when environment variables are not numbers", async () => {
      req.decodedAccessToken = { iss: 12345 };
      
      const originalAccess = process.env.ACCESS_TOKEN_DURATION;
      const originalRefresh = process.env.REFRESH_TOKEN_DURATION;
      
      process.env.ACCESS_TOKEN_DURATION = "invalid";
      process.env.REFRESH_TOKEN_DURATION = "invalid";

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");

      // Restore original values
      process.env.ACCESS_TOKEN_DURATION = originalAccess;
      process.env.REFRESH_TOKEN_DURATION = originalRefresh;
    });

    it("should use default durations when environment variables are missing", async () => {
      req.decodedAccessToken = { iss: 12345 };
      
      const originalAccess = process.env.ACCESS_TOKEN_DURATION;
      const originalRefresh = process.env.REFRESH_TOKEN_DURATION;
      
      delete process.env.ACCESS_TOKEN_DURATION;
      delete process.env.REFRESH_TOKEN_DURATION;

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.locals).toHaveProperty("accessToken");
      expect(res.locals).toHaveProperty("refreshToken");

      // Restore original values
      process.env.ACCESS_TOKEN_DURATION = originalAccess;
      process.env.REFRESH_TOKEN_DURATION = originalRefresh;
    });

  });

  describe("Logging functionality", () => {

    it("should log debug messages during token creation", async () => {
      const { log } = require("@dwtechs/winstan");
      req.decodedAccessToken = { iss: 12345 };

      await refresh(req, res, next);

      expect(log.debug).toHaveBeenCalledWith("Toker-express: Create tokens for user 12345");
      expect(log.debug).toHaveBeenCalledWith(expect.stringContaining("refreshToken="));
      expect(log.debug).toHaveBeenCalledWith(expect.stringContaining("accessToken="));
    });

  });

});