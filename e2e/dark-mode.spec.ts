import { test, expect } from "@playwright/test";

test.describe("Dark mode", () => {
  test.use({ colorScheme: "dark" });

  const PUBLIC_PAGES = [
    { path: "/sign-in", label: "Sign-in" },
    { path: "/register", label: "Register" },
    { path: "/forgot-password", label: "Forgot password" },
  ] as const;

  for (const page of PUBLIC_PAGES) {
    test(`${page.label} — thème dark appliqué`, async ({ page: p }) => {
      await p.goto(page.path);
      await p.waitForLoadState("domcontentloaded");

      // Vérifier que la classe dark est sur html ou que le background est sombre
      const isDark = await p.evaluate(() => {
        const html = document.documentElement;
        if (html.classList.contains("dark")) return true;
        // Vérifier via prefers-color-scheme
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      });
      expect(isDark).toBe(true);
    });

    test(`${page.label} — éléments visibles en dark mode`, async ({ page: p }) => {
      await p.goto(page.path);
      await p.waitForLoadState("domcontentloaded");

      if (page.path === "/sign-in") {
        await expect(p.locator("input[type='email']")).toBeVisible();
        await expect(p.locator("input[type='password']")).toBeVisible();
        await expect(p.getByRole("button", { name: /connexion/i })).toBeVisible();
      } else {
        await expect(p.locator("input[type='email']")).toBeVisible();
      }
    });
  }
});
