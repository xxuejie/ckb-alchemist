import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginSvelte from "eslint-plugin-svelte";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginSvelte.configs["flat/recommended"],
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".svelte"],
      },
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
