// Set environment variables BEFORE importing the module
process.env.TOKEN_SECRET = "YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc";
process.env.ACCESS_TOKEN_DURATION = "600";
process.env.REFRESH_TOKEN_DURATION = "86400";

// Use require() instead of import to ensure env vars are set first
const { clearRefreshCookie } = require("../dist/toker-express.js");

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

describe("clearRefreshCookie middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      clearCookie: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Default options", () => {

    it("should clear the refresh token cookie with default name and attributes", async () => {
      await clearRefreshCookie(req, res, next);

      expect(res.clearCookie).toHaveBeenCalledTimes(1);
      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
      });
    });

    it("should call next() after clearing the cookie", async () => {
      await clearRefreshCookie(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should not throw when req has no properties", async () => {
      await expect(clearRefreshCookie({}, res, next)).resolves.not.toThrow();
      expect(next).toHaveBeenCalledWith();
    });

    it("should ignore req entirely (unused parameter)", async () => {
      await clearRefreshCookie(undefined, res, next);

      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", expect.any(Object));
      expect(next).toHaveBeenCalledWith();
    });

  });

  describe("Custom options via environment variables", () => {

    const baseEnv = {
      TOKEN_SECRET: "YS1zdHJpbmctc2VjcmV0LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc",
      ACCESS_TOKEN_DURATION: "600",
      REFRESH_TOKEN_DURATION: "86400",
    };

    afterEach(() => {
      process.env = originalEnv;
      jest.resetModules();
    });

    it("should clear the cookie using a custom name and path", async () => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        ...baseEnv,
        REFRESH_TOKEN_COOKIE_NAME: "myRefresh",
        REFRESH_TOKEN_COOKIE_PATH: "/api/auth",
      };
      const { clearRefreshCookie: clearRefreshCookieCustom } = require("../dist/toker-express.js");

      const resCustom = { clearCookie: jest.fn() };
      const nextCustom = jest.fn();

      await clearRefreshCookieCustom({}, resCustom, nextCustom);

      expect(resCustom.clearCookie).toHaveBeenCalledWith("myRefresh", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/api/auth",
      });
    });

    it("should clear the cookie using a custom sameSite and secure=false", async () => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        ...baseEnv,
        REFRESH_TOKEN_COOKIE_SAMESITE: "lax",
        REFRESH_TOKEN_COOKIE_HTTPS_ONLY: "false",
      };
      const { clearRefreshCookie: clearRefreshCookieCustom } = require("../dist/toker-express.js");

      const resCustom = { clearCookie: jest.fn() };
      const nextCustom = jest.fn();

      await clearRefreshCookieCustom({}, resCustom, nextCustom);

      expect(resCustom.clearCookie).toHaveBeenCalledWith("refreshToken", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
      });
    });

    it("should fall back to strict sameSite for an invalid configured value", async () => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        ...baseEnv,
        REFRESH_TOKEN_COOKIE_SAMESITE: "invalid-value",
      };
      const { clearRefreshCookie: clearRefreshCookieCustom } = require("../dist/toker-express.js");

      const resCustom = { clearCookie: jest.fn() };
      const nextCustom = jest.fn();

      await clearRefreshCookieCustom({}, resCustom, nextCustom);

      expect(resCustom.clearCookie).toHaveBeenCalledWith("refreshToken", expect.objectContaining({
        sameSite: "strict",
      }));
    });

  });

  describe("Logging functionality", () => {

    it("should log a debug message when clearing the cookie", async () => {
      const { log } = require("@dwtechs/winstan");

      await clearRefreshCookie(req, res, next);

      const calls = log.debug.mock.calls;
      expect(calls[0][0]()).toBe("Toker-express: Clearing refresh token cookie");
    });

  });

});
