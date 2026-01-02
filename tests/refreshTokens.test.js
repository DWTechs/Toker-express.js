// Set environment variables BEFORE importing the module
process.env.TOKEN_SECRET = "YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc";
process.env.ACCESS_TOKEN_DURATION = "600";
process.env.REFRESH_TOKEN_DURATION = "86400";

// Use require() instead of import to ensure env vars are set first
const { refreshTokens } = require("../dist/toker-express.js");

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

describe("refreshTokens middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        rows: [{}]  // refreshTokens expects this to exist
      }
    };
    res = {
      locals: {
        tokens: {}
      }
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Valid issuer scenarios", () => {
    
    it("should generate tokens when valid iss is provided in decodedAccess", async () => {
      res.locals.tokens.decodedAccess = { iss: 12345 };

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
      expect(typeof req.body.rows[0].accessToken).toBe("string");
      expect(typeof req.body.rows[0].refreshToken).toBe("string");
    });

    it("should handle minimum valid iss value (1)", async () => {
      res.locals.tokens.decodedAccess = { iss: 1 };

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle maximum valid iss value (999999999)", async () => {
      res.locals.tokens.decodedAccess = { iss: 999999999 };

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
    });

    it("should preserve existing data in req.body.rows[0]", async () => {
      res.locals.tokens.decodedAccess = { iss: 12345 };
      req.body.rows = [{ name: "Test User", email: "test@test.com" }];

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
      expect(req.body.rows[0].name).toBe("Test User");
      expect(req.body.rows[0].email).toBe("test@test.com");
    });

  });

  describe("Invalid issuer scenarios", () => {

    it("should return error when no iss is provided", async () => {
      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when iss is 0", async () => {
      res.locals.tokens.decodedAccess = { iss: 0 };

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when iss is negative", async () => {
      res.locals.tokens.decodedAccess = { iss: -1 };

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when iss exceeds maximum value", async () => {
      res.locals.tokens.decodedAccess = { iss: 1000000000 }; // Over 999999999

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when iss is not a number", async () => {
      res.locals.tokens.decodedAccess = { iss: "invalid" };

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when iss is null", async () => {
      res.locals.tokens.decodedAccess = { iss: null };

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when iss is undefined", async () => {
      res.locals.tokens.decodedAccess = { iss: undefined };

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

  });

  describe("Token generation error scenarios", () => {

    it("should handle token generation with successful flow", async () => {
      res.locals.tokens.decodedAccess = { iss: 12345 };

      await refreshTokens(req, res, next);

      // In successful case, next() is called without arguments
      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty('accessToken');
      expect(req.body.rows[0]).toHaveProperty('refreshToken');
    });

  });

  describe("Edge cases and data validation", () => {

    it("should handle missing decodedAccess object", async () => {
      res.locals.tokens.decodedAccess = undefined;

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

  });

  describe("Token validation", () => {

    it("should generate valid JWT tokens", async () => {
      res.locals.tokens.decodedAccess = { iss: 12345 };

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty('accessToken');
      expect(req.body.rows[0]).toHaveProperty('refreshToken');
      
      const { accessToken, refreshToken } = req.body.rows[0];
      
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
      res.locals.tokens.decodedAccess = { iss: 12345 };

      // First call
      await refreshTokens(req, res, next);
      const firstTokens = { ...req.body.rows[0] };

      // Reset for second call
      req.body.rows = [{}];
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second call
      await refreshTokens(req, res, next);
      const secondTokens = { ...req.body.rows[0] };

      // Tokens should be different due to different timestamps
      expect(firstTokens.accessToken).not.toBe(secondTokens.accessToken);
      expect(firstTokens.refreshToken).not.toBe(secondTokens.refreshToken);
    });

  });

  describe("Environment variables handling", () => {

    it("should use default durations when environment variables are not numbers", async () => {
      res.locals.tokens.decodedAccess = { iss: 12345 };
      
      const originalAccess = process.env.ACCESS_TOKEN_DURATION;
      const originalRefresh = process.env.REFRESH_TOKEN_DURATION;
      
      process.env.ACCESS_TOKEN_DURATION = "invalid";
      process.env.REFRESH_TOKEN_DURATION = "invalid";

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");

      // Restore original values
      process.env.ACCESS_TOKEN_DURATION = originalAccess;
      process.env.REFRESH_TOKEN_DURATION = originalRefresh;
    });

    it("should use default durations when environment variables are missing", async () => {
      res.locals.tokens.decodedAccess = { iss: 12345 };
      
      const originalAccess = process.env.ACCESS_TOKEN_DURATION;
      const originalRefresh = process.env.REFRESH_TOKEN_DURATION;
      
      delete process.env.ACCESS_TOKEN_DURATION;
      delete process.env.REFRESH_TOKEN_DURATION;

      await refreshTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");

      // Restore original values
      process.env.ACCESS_TOKEN_DURATION = originalAccess;
      process.env.REFRESH_TOKEN_DURATION = originalRefresh;
    });

  });

  describe("Logging functionality", () => {

    it("should log debug messages during token creation", async () => {
      const { log } = require("@dwtechs/winstan");
      res.locals.tokens.decodedAccess = { iss: 12345 };

      await refreshTokens(req, res, next);

      expect(log.debug).toHaveBeenCalledWith("Toker-express: Create tokens for user 12345");
      expect(log.debug).toHaveBeenCalledWith(expect.stringContaining("refreshToken="));
      expect(log.debug).toHaveBeenCalledWith(expect.stringContaining("accessToken="));
    });

  });

});