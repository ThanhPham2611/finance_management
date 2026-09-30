module.exports = {
  preset: "jest-expo",
  rootDir: ".",
  testMatch: ["<rootDir>/test/**/*.component.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
