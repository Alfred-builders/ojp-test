import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    // Setup project — authenticates and saves state
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Public tests (no auth needed)
    {
      name: "public",
      testMatch: /auth\.spec\.ts|security\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Authenticated tests
    {
      name: "authenticated",
      testMatch: /authenticated\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
    },
  ],
  webServer: {
    command: "npm run dev -- -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
  },
});
