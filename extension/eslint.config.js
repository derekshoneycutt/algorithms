module.exports = [
  {
    files: ["src/**/*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      curly: ["error", "all"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
