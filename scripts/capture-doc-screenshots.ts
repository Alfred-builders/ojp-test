import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:3001";
const OUTPUT_DIR = path.resolve(__dirname, "../public/docs");

// Supabase auth to get session cookies
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const USER_EMAIL = process.env.DOC_USER_EMAIL!;
const USER_PASSWORD = process.env.DOC_USER_PASSWORD!;

interface Screenshot {
  name: string;
  path: string;
  /** CSS selector to screenshot (optional — full page if omitted) */
  selector?: string;
  /** Wait for this selector to appear before screenshotting */
  waitFor?: string;
  /** Viewport width override */
  width?: number;
}

const screenshots: Screenshot[] = [
  // Dossier — bouton Nouveau lot
  {
    name: "dossier-nouveau-lot",
    path: "/dossiers",
    waitFor: "table",
    width: 1280,
  },
  // Dashboard
  {
    name: "dashboard",
    path: "/dashboard",
    waitFor: "h2",
    width: 1280,
  },
  // Fiche client
  {
    name: "client-fiche",
    path: "/clients",
    waitFor: "table",
    width: 1280,
  },
  // Ventes
  {
    name: "ventes-liste",
    path: "/ventes",
    waitFor: "table",
    width: 1280,
  },
  // Stock bijoux
  {
    name: "stock-bijoux",
    path: "/stock",
    waitFor: "table",
    width: 1280,
  },
  // Commandes
  {
    name: "commandes",
    path: "/commandes",
    waitFor: "[data-slot=card]",
    width: 1280,
  },
  // Paramètres
  {
    name: "parametres",
    path: "/parametres",
    waitFor: "[data-slot=card]",
    width: 1280,
  },
];

async function main() {
  if (!USER_EMAIL || !USER_PASSWORD) {
    console.error(
      "Set DOC_USER_EMAIL and DOC_USER_PASSWORD env vars.\n" +
      "Usage: DOC_USER_EMAIL=x DOC_USER_PASSWORD=y npx tsx scripts/capture-doc-screenshots.ts"
    );
    process.exit(1);
  }

  // Auth via Supabase to get access token
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });

  if (authError || !authData.session) {
    console.error("Auth failed:", authError?.message);
    process.exit(1);
  }

  console.log("Authenticated as", USER_EMAIL);

  // Ensure output dir
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
  });

  const page = await context.newPage();

  // Login via the sign-in page
  await page.goto(BASE_URL + "/sign-in", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', USER_EMAIL);
  await page.fill('input[type="password"]', USER_PASSWORD);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("Logged in via UI");

  console.log(`Taking ${screenshots.length} screenshots...`);

  for (const shot of screenshots) {
    try {
      if (shot.width) {
        await page.setViewportSize({ width: shot.width, height: 800 });
      }

      await page.goto(BASE_URL + shot.path, { waitUntil: "networkidle", timeout: 15000 });

      if (shot.waitFor) {
        await page.waitForSelector(shot.waitFor, { timeout: 10000 });
      }

      // Small delay for animations
      await page.waitForTimeout(500);

      const outputPath = path.join(OUTPUT_DIR, `${shot.name}.png`);

      if (shot.selector) {
        const el = await page.$(shot.selector);
        if (el) {
          await el.screenshot({ path: outputPath });
          console.log(`  ✓ ${shot.name} (element)`);
        } else {
          console.log(`  ✗ ${shot.name} — selector not found: ${shot.selector}`);
        }
      } else {
        await page.screenshot({ path: outputPath, fullPage: false });
        console.log(`  ✓ ${shot.name}`);
      }
    } catch (err) {
      console.log(`  ✗ ${shot.name} — ${(err as Error).message}`);
    }
  }

  await browser.close();
  console.log(`\nDone. Screenshots saved to ${OUTPUT_DIR}`);
}

main();
