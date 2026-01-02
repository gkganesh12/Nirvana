module.exports = {
  root: true,
  ignorePatterns: ["dist", ".next", "node_modules"],
  env: {
    es2022: true,
    node: true,
    browser: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module"
  },
  extends: ["eslint:recommended"]
};
