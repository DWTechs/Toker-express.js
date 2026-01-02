// Set environment variables BEFORE importing the module
process.env.TOKEN_SECRET = "YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc";
process.env.ACCESS_TOKEN_DURATION = "600";
process.env.REFRESH_TOKEN_DURATION = "86400";

// Use require() instead of import to ensure env vars are set first
const { createTokens } = require("../dist/toker-express.js");

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

describe("createTokens middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        rows: [{}]  // createTokens expects this to exist with user data
      }
    };
    res = {
      locals: {
        user: {}
      }
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Valid issuer scenarios", () => {
    
    it("should generate tokens when valid user.id is provided", async () => {
      res.locals.user.id = 12345;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
      expect(typeof req.body.rows[0].accessToken).toBe("string");
      expect(typeof req.body.rows[0].refreshToken).toBe("string");
    });

    it("should handle minimum valid user.id value (1)", async () => {
      res.locals.user.id = 1;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle maximum valid user.id value (999999999)", async () => {
      res.locals.user.id = 999999999;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
    });

    it("should preserve existing data in req.body.rows[0]", async () => {
      res.locals.user.id = 12345;
      req.body.rows = [{ nickname: "Test User", roles: ["user"] }];

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
      expect(req.body.rows[0].nickname).toBe("Test User");
      expect(req.body.rows[0].roles).toEqual(["user"]);
    });

    it("should generate different access and refresh tokens", async () => {
      res.locals.user.id = 12345;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0].accessToken).not.toBe(req.body.rows[0].refreshToken);
    });

    it("should generate tokens that are JWT format (3 parts separated by dots)", async () => {
      res.locals.user.id = 12345;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0].accessToken.split('.').length).toBe(3);
      expect(req.body.rows[0].refreshToken.split('.').length).toBe(3);
    });

  });

  describe("Invalid issuer scenarios", () => {

    it("should return error when no user.id is provided", async () => {
      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when user.id is 0", async () => {
      res.locals.user.id = 0;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when user.id is negative", async () => {
      res.locals.user.id = -1;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when user.id exceeds maximum value", async () => {
      res.locals.user.id = 1000000000; // Over 999999999

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when user.id is not a number", async () => {
      res.locals.user.id = "invalid";

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when user.id is null", async () => {
      res.locals.user.id = null;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when user.id is undefined", async () => {
      res.locals.user.id = undefined;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when user object is missing", async () => {
      res.locals.user = undefined;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when user.id is a float", async () => {
      res.locals.user.id = 123.45;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when user.id is NaN", async () => {
      res.locals.user.id = NaN;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should return error when user.id is Infinity", async () => {
      res.locals.user.id = Infinity;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

  });

  describe("Token generation success scenarios", () => {

    it("should handle token generation with successful flow", async () => {
      res.locals.user.id = 12345;

      await createTokens(req, res, next);

      // In successful case, next() is called without arguments
      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty('accessToken');
      expect(req.body.rows[0]).toHaveProperty('refreshToken');
    });

    it("should add tokens to existing row data without overwriting", async () => {
      res.locals.user.id = 12345;
      req.body.rows[0] = {
        id: 12345,
        nickname: "testuser",
        roles: ["user", "admin"],
        email: "test@example.com"
      };

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0].id).toBe(12345);
      expect(req.body.rows[0].nickname).toBe("testuser");
      expect(req.body.rows[0].roles).toEqual(["user", "admin"]);
      expect(req.body.rows[0].email).toBe("test@example.com");
      expect(req.body.rows[0]).toHaveProperty('accessToken');
      expect(req.body.rows[0]).toHaveProperty('refreshToken');
    });

  });

  describe("Edge cases and data validation", () => {

    it("should handle missing res.locals", async () => {
      res.locals = undefined;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should handle boundary value just below minimum", async () => {
      res.locals.user.id = 0.99999;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should handle boundary value just above maximum", async () => {
      res.locals.user.id = 1000000000.1;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith({
        statusCode: 400,
        message: "Toker-express: Missing iss"
      });
    });

    it("should not mutate the original user object", async () => {
      res.locals.user = { id: 12345, name: "Test" };
      const originalUser = { ...res.locals.user };

      await createTokens(req, res, next);

      expect(res.locals.user).toEqual(originalUser);
    });

    it("should handle multiple calls with different user IDs", async () => {
      const req1 = { body: { rows: [{ data: "user1" }] } };
      const req2 = { body: { rows: [{ data: "user2" }] } };
      const res1 = { locals: { user: { id: 11111 } } };
      const res2 = { locals: { user: { id: 22222 } } };
      const next1 = jest.fn();
      const next2 = jest.fn();

      await createTokens(req1, res1, next1);
      await createTokens(req2, res2, next2);

      expect(next1).toHaveBeenCalledWith();
      expect(next2).toHaveBeenCalledWith();
      expect(req1.body.rows[0]).toHaveProperty('accessToken');
      expect(req2.body.rows[0]).toHaveProperty('accessToken');
      expect(req1.body.rows[0].accessToken).not.toBe(req2.body.rows[0].accessToken);
    });

    it("should handle string numeric user.id that could be converted", async () => {
      res.locals.user.id = "12345";

      await createTokens(req, res, next);

      // isValidInteger accepts string numbers and converts them
      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty("accessToken");
      expect(req.body.rows[0]).toHaveProperty("refreshToken");
    });

    it("should handle user.id with scientific notation", async () => {
      res.locals.user.id = 1e5; // 100000

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty('accessToken');
      expect(req.body.rows[0]).toHaveProperty('refreshToken');
    });

  });

  describe("Request body validation", () => {

    it("should work when req.body.rows is an array with pre-existing object", async () => {
      res.locals.user.id = 12345;
      req.body.rows = [{ existingField: "value" }];

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty('accessToken');
      expect(req.body.rows[0]).toHaveProperty('refreshToken');
      expect(req.body.rows[0].existingField).toBe("value");
    });

    it("should work when req.body.rows[0] has complex nested data", async () => {
      res.locals.user.id = 12345;
      req.body.rows = [{
        user: {
          profile: {
            name: "Test",
            settings: { theme: "dark" }
          }
        },
        metadata: ["tag1", "tag2"]
      }];

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.rows[0]).toHaveProperty('accessToken');
      expect(req.body.rows[0]).toHaveProperty('refreshToken');
      expect(req.body.rows[0].user.profile.name).toBe("Test");
      expect(req.body.rows[0].metadata).toEqual(["tag1", "tag2"]);
    });

  });

  describe("Token format validation", () => {

    it("should generate tokens with proper JWT structure", async () => {
      res.locals.user.id = 12345;

      await createTokens(req, res, next);

      expect(next).toHaveBeenCalledWith();
      
      const accessToken = req.body.rows[0].accessToken;
      const refreshToken = req.body.rows[0].refreshToken;

      // JWT tokens have 3 parts: header.payload.signature
      expect(accessToken.split('.').length).toBe(3);
      expect(refreshToken.split('.').length).toBe(3);

      // Each part should be base64url encoded (no special chars except - and _)
      const parts = accessToken.split('.');
      parts.forEach(part => {
        expect(part.length).toBeGreaterThan(0);
        expect(/^[A-Za-z0-9_-]+$/.test(part)).toBe(true);
      });
    });

    it("should generate unique tokens on successive calls", async () => {
      res.locals.user.id = 12345;
      const req2 = { body: { rows: [{}] } };
      const next2 = jest.fn();

      await createTokens(req, res, next);
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await createTokens(req2, res, next2);

      expect(next).toHaveBeenCalledWith();
      expect(next2).toHaveBeenCalledWith();
      
      // Tokens should be different due to different timestamps
      expect(req.body.rows[0].accessToken).not.toBe(req2.body.rows[0].accessToken);
      expect(req.body.rows[0].refreshToken).not.toBe(req2.body.rows[0].refreshToken);
    });

  });

});
