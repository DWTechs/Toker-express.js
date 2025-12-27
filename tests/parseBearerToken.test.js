// Set environment variables BEFORE importing the module
process.env.TOKEN_SECRET = "YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc";
process.env.ACCESS_TOKEN_DURATION = "600";
process.env.REFRESH_TOKEN_DURATION = "86400";

// Use require() instead of import to ensure env vars are set first
const { parseBearerToken } = require("../dist/toker-express.js");

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

describe("parseBearerToken middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      locals: {
        isProtected: true
      }
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Route protection bypass", () => {
    
    it("should bypass middleware when res.locals.isProtected is false", () => {
      res.locals.isProtected = false;
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.locals.accessToken).toBeUndefined();
    });

    it("should bypass middleware when res.locals.isProtected is undefined", () => {
      res.locals.isProtected = undefined;
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.locals.accessToken).toBeUndefined();
    });

    it("should bypass middleware when res.locals.isProtected is null", () => {
      res.locals.isProtected = null;
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.locals.accessToken).toBeUndefined();
    });

  });

  describe("Authorization header validation", () => {

    it("should call next with MissingAuthorizationError when authorization header is missing", () => {
      // No authorization header set
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Authorization header is missing")
        })
      );
      expect(res.locals.accessToken).toBeUndefined();
    });

    it("should call next with MissingAuthorizationError when authorization header is undefined", () => {
      req.headers.authorization = undefined;
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Authorization header is missing")
        })
      );
    });

    it("should call next with MissingAuthorizationError when authorization header is empty string", () => {
      req.headers.authorization = "";
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Authorization header is missing")
        })
      );
    });

    it("should call next with InvalidBearerFormatError when authorization header format is invalid", () => {
      req.headers.authorization = "Basic dXNlcjpwYXNzd29yZA==";
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Authorization header must be in the format")
        })
      );
    });

    it("should call next with InvalidBearerFormatError when Bearer has no token", () => {
      req.headers.authorization = "Bearer";
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Authorization header must be in the format")
        })
      );
    });

    it("should call next with InvalidBearerFormatError when Bearer has only spaces", () => {
      req.headers.authorization = "Bearer   ";
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Authorization header must be in the format")
        })
      );
    });

  });

  describe("Successful bearer token parsing", () => {

    it("should successfully parse bearer token and store in res.locals", () => {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOjEyMzQ1fQ.signature";
      req.headers.authorization = `Bearer ${token}`;
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.accessToken).toBe(token);
    });

    it("should handle Bearer with multiple spaces", () => {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOjEyMzQ1fQ.signature";
      req.headers.authorization = `Bearer    ${token}`;
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.accessToken).toBe(token);
    });

    it("should handle Bearer with exactly one space", () => {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOjEyMzQ1fQ.signature";
      req.headers.authorization = `Bearer ${token}`;
      
      parseBearerToken(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.locals.accessToken).toBe(token);
    });

  });

});
