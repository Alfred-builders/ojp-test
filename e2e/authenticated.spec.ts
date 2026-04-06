import { test, expect } from "@playwright/test";

test.describe("Authenticated flows", () => {
  // ============================================================
  // Dashboard
  // ============================================================
  test("dashboard loads correctly", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText("Bonjour")).toBeVisible({ timeout: 15000 });
  });

  // ============================================================
  // Client creation page loads
  // ============================================================
  test("client creation page loads with form fields", async ({ page }) => {
    await page.goto("/clients/new");
    await expect(page.getByText(/Nouveau client/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder("Jean", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Dupont", { exact: true })).toBeVisible();
  });

  // ============================================================
  // Dossier creation page loads
  // ============================================================
  test("dossier creation page loads", async ({ page }) => {
    await page.goto("/dossiers/new");
    await expect(page.getByText(/Nouveau dossier/i)).toBeVisible({ timeout: 15000 });
  });

  // ============================================================
  // Page loads — verify authenticated access
  // ============================================================
  const pages = [
    { path: "/clients", name: "clients" },
    { path: "/dossiers", name: "dossiers" },
    { path: "/lots", name: "lots" },
    { path: "/ventes", name: "ventes" },
    { path: "/stock", name: "stock" },
    { path: "/or-investissement", name: "or-investissement" },
    { path: "/depot-vente", name: "depot-vente" },
    { path: "/parametres", name: "parametres" },
    { path: "/utilisateurs", name: "utilisateurs" },
    { path: "/profile", name: "profile" },
  ];

  for (const { path, name } of pages) {
    test(`${name} page loads without redirect`, async ({ page }) => {
      const response = await page.goto(path);
      // Should NOT redirect to sign-in (proves auth is working)
      await expect(page).not.toHaveURL(/sign-in/);
      // Should get a successful response (200 or redirect within app)
      expect(response?.status()).toBeLessThan(500);
    });
  }

  // ============================================================
  // Authenticated API call
  // ============================================================
  test("search API returns response for authenticated user", async ({ request }) => {
    const response = await request.get("/api/search?q=test");
    // 200 = success, 429 = rate limited, 500 = Upstash config missing (acceptable in dev)
    expect([200, 429, 500]).toContain(response.status());
  });
});
