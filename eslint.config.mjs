import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Pure domain/config files cannot contain Next.js navigation links.
    files: ["src/lib/**/*.ts", "tests/unit/**/*.ts", "next.config.ts"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  globalIgnores([".next/**", "node_modules/**", "legacy-original/**"]),
]);
