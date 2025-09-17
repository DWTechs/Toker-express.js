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
      rows: []
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
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty("accessToken");
      expect(res.rows[0]).toHaveProperty("refreshToken");
      expect(typeof res.rows[0].accessToken).toBe("string");
      expect(typeof res.rows[0].refreshToken).toBe("string");
    });

    it("should generate tokens when valid iss is provided in req.body.id", async () => {
      req.body.id = 54321;

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty("accessToken");
      expect(res.rows[0]).toHaveProperty("refreshToken");
    });

    it("should prioritize decodedAccessToken.iss over req.body.id", async () => {
      req.decodedAccessToken = { iss: 11111 };
      req.body.id = 22222;

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty("accessToken");
      expect(res.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle iss as string number", async () => {
      req.body.id = "98765";

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty("accessToken");
      expect(res.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle minimum valid iss value (1)", async () => {
      req.decodedAccessToken = { iss: 1 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty("accessToken");
      expect(res.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle maximum valid iss value (999999999)", async () => {
      req.decodedAccessToken = { iss: 999999999 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty("accessToken");
      expect(res.rows[0]).toHaveProperty("refreshToken");
    });

  });

  describe("Invalid issuer scenarios", () => {

    it("should return error when no iss is provided", async () => {
      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

    it("should return error when iss is 0", async () => {
      req.decodedAccessToken = { iss: 0 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

    it("should return error when iss is negative", async () => {
      req.decodedAccessToken = { iss: -1 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

    it("should return error when iss exceeds maximum value", async () => {
      req.decodedAccessToken = { iss: 1000000000 }; // Over 999999999

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

    it("should return error when iss is not a number", async () => {
      req.decodedAccessToken = { iss: "invalid" };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

    it("should return error when iss is null", async () => {
      req.decodedAccessToken = { iss: null };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

    it("should return error when iss is undefined", async () => {
      req.decodedAccessToken = { iss: undefined };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

    it("should return error when req.body.id is invalid string", async () => {
      req.body.id = "not-a-number";

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

  });

  describe("Token generation error scenarios", () => {

    it("should handle token generation with successful flow", async () => {
      req.decodedAccessToken = { iss: 12345 };

      await refresh(req, res, next);

      // In successful case, next() is called without arguments
      expect(next).toHaveBeenCalledWith();
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty('accessToken');
      expect(res.rows[0]).toHaveProperty('refreshToken');
    });

  });

  describe("Edge cases and data validation", () => {

    it("should handle req.body.id.toString() when id is number", async () => {
      req.body.id = 12345;

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty("accessToken");
      expect(res.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle empty req.body", async () => {
      req.body = {};

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

    it("should handle missing decodedAccessToken", async () => {
      req.decodedAccessToken = undefined;
      req.body.id = 12345;

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty("accessToken");
      expect(res.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle req.body.id as boolean false (falsy)", async () => {
      req.body.id = false;

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

    it("should handle req.body.id as empty string", async () => {
      req.body.id = "";

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
      expect(res.rows).toHaveLength(0);
    });

  });

  describe("Token validation", () => {

    it("should generate valid JWT tokens", async () => {
      req.decodedAccessToken = { iss: 12345 };

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.rows).toHaveLength(1);
      
      const { accessToken, refreshToken } = res.rows[0];
      
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
      const firstTokens = res.rows[0];

      // Reset res.rows for second call
      res.rows = [];
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second call
      await refresh(req, res, next);
      const secondTokens = res.rows[0];

      // Tokens should be different due to different timestamps
      expect(firstTokens.accessToken).not.toBe(secondTokens.accessToken);
      expect(firstTokens.refreshToken).not.toBe(secondTokens.refreshToken);
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
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty("accessToken");
      expect(res.rows[0]).toHaveProperty("refreshToken");

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
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toHaveProperty("accessToken");
      expect(res.rows[0]).toHaveProperty("refreshToken");

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