import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

const typescriptRules = {
  "@typescript-eslint/ban-ts-comment": "off",
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": ["error", {argsIgnorePattern: "^_", varsIgnorePattern: "^_"}]
};

export default [
  {
    ignores: ["dist/**", "wailsjs/**"]
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "vitest.setup.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json"
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: reactPlugin,
      "react-hooks": reactHooks
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...typescriptRules,
      "no-unused-vars": "off"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },
  {
    files: ["vite.config.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.node.json"
      },
      globals: {
        __dirname: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      ...typescriptRules,
      "no-unused-vars": "off"
    }
  },
  prettier
];
