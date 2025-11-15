import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const colorPaletteRules = {
  files: ["**/*.{js,jsx,ts,tsx}"],
  rules: {
    // Disallow hard-coded hex colors anywhere in JS/TS/JSX/TSX.
    "no-restricted-syntax": [
      "error",
      {
        selector: "Literal[value=/#(?:[0-9a-fA-F]{3}){1,2}/]",
        message:
          "Do not hard-code hex colors. Use Tailwind theme utilities (bg-primary, text-foreground, etc.) or CSS variables from globals.css.",
      },
      {
        selector: "Literal[value=/^(rgb|rgba|hsl|hsla)\\(/]",
        message:
          "Do not hard-code rgb/hsl colors. Use Tailwind theme utilities or CSS variables from globals.css.",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  colorPaletteRules,
]);

export default eslintConfig;
