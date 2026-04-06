import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1024, height: 768 },
] as const;

const PUBLIC_PAGES = [
  { path: "/sign-in", label: "Sign-in" },
  { path: "/register", label: "Register" },
  { path: "/forgot-password", label: "Forgot password" },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`Responsive — ${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const page of PUBLIC_PAGES) {
      test(`${page.label} — pas de scroll horizontal`, async ({ page: p }) => {
        await p.goto(page.path);
        await p.waitForLoadState("domcontentloaded");

        const bodyWidth = await p.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await p.evaluate(() => window.innerWidth);
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
      });

      test(`${page.label} — éléments principaux visibles`, async ({ page: p }) => {
        await p.goto(page.path);
        await p.waitForLoadState("domcontentloaded");

        // Le formulaire doit toujours être visible
        if (page.path === "/sign-in") {
          await expect(p.locator("input[type='email']")).toBeVisible();
          await expect(p.locator("input[type='password']")).toBeVisible();
          await expect(p.getByRole("button", { name: /connexion/i })).toBeVisible();
        } else if (page.path === "/register") {
          await expect(p.locator("input[type='email']")).toBeVisible();
        } else if (page.path === "/forgot-password") {
          await expect(p.locator("input[type='email']")).toBeVisible();
        }
      });
    }
  });
}
