import { test as setup, expect } from "@playwright/test";

const E2E_EMAIL = "e2e-test@ojp-test.com";
const E2E_PASSWORD = "test1234!";

setup("authenticate", async ({ page }) => {
  await page.goto("/sign-in");

  await page.fill("input[type='email']", E2E_EMAIL);
  await page.fill("input[type='password']", E2E_PASSWORD);
  await page.getByRole("button", { name: /se connecter/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

  // Save signed-in state
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
