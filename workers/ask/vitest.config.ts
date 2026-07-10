import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  server: {
    fs: {
      // The chunker tests import scripts/lib/chunker.mjs from the repo root
      // (the module is shared with scripts/build-ask-index.mjs).
      allow: ["../.."],
    },
  },
});
