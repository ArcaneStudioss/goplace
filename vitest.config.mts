import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"], testTimeout: 60_000, hookTimeout: 120_000, fileParallelism: false },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" so existe pra quebrar import no navegador; nos testes de servidor nao atrapalha
      "server-only": path.resolve(import.meta.dirname, "src/lib/__tests__/stub-server-only.ts"),
    },
  },
});
