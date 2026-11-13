import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      DATABASE_URL: "postgresql://requerimientos:requerimientos@127.0.0.1:5432/requerimientos_test",
      AUTH_SECRET: "test-secret-test-secret-test-secret-32",
      AUTH_ALLOWED_EMAIL_DOMAIN: "cifes.edu.co",
      DEV_AUTH_ENABLED: "true",
      EMAIL_PROVIDER: "console",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
