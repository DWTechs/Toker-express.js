// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  // Stop running tests after `n` failures
  bail: true,

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "./tests/coverage",

  // Make calling deprecated APIs throw helpful error messages
  errorOnDeprecated: true,

  // An array of file extensions your modules use
  moduleFileExtensions: [
    "js",
    "mjs"
  ],

  // The test environment that will be used for testing
  testEnvironment: "node",

  // A map from regular expressions to paths to transformers
  transform: {
    "^.+\.jsx?$": "babel-jest",
  },

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: ["/node_modules/(?!(checkard|@dwtechs)/)"],

  // Indicates whether each individual test should be reported during the run
  verbose: true
};
