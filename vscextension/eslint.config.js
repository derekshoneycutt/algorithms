const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    ignores: ["dist/**", "out/**", "node_modules/**"],
  },
  {
    ...js.configs.recommended,
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
      sourceType: "script",
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
      sourceType: "module",
    },
    rules: {
      curly: ["error", "all"],
      eqeqeq: ["error", "always", { "null": "ignore" }],
      "no-undef": "off",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["test/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);