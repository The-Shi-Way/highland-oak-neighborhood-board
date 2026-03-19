export default {
  testEnvironment: "node",
  transform: {},
  extensionsToTreatAsEsm: [],
  testMatch: ["**/__tests__/**/*.test.mjs"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.mjs$": "$1.mjs",
  },
  testTimeout: 10000,
};
