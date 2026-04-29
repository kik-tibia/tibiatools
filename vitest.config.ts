import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@components": r("./src/components"),
      "@data": r("./src/data"),
      "@layouts": r("./src/layouts"),
      "@lib": r("./src/lib"),
      "@styles": r("./src/styles"),
    },
  },
});
