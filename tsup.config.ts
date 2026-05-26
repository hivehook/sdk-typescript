import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: ["src/webhook/index.ts"],
    outDir: "dist/webhook",
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
  },
]);
