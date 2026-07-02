import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PASSWORD = "111111";

const shots = [
  { file: "01-dashboard.png", path: "/", waitFor: "text=Total Collected" },
  { file: "02-invoices.png", path: "/invoices", waitFor: "text=INV-1042" },
  { file: "03-create-invoice.png", path: "/invoices?action=new", waitFor: "text=New Invoice" },
  { file: "04-clients.png", path: "/clients", waitFor: "text=Sarah Chen" },
  { file: "05-expenses.png", path: "/expenses", waitFor: "text=Figma" },
  { file: "06-analytics.png", path: "/analytics", waitFor: "text=Revenue vs Receivables" },
  { file: "07-todo.png", path: "/todo", waitFor: "text=Acme dashboard wireframes" },
  { file: "08-outsourcing.png", path: "/outsourcing", waitFor: "text=Pixel Forge LLC" },
  { file: "09-catalog.png", path: "/catalog", waitFor: "text=Brand Identity Package" },
  { file: "10-settings-appearance.png", path: "/settings?tab=appearance", waitFor: "text=Themes, colors, and typography" },
];

async function unlockProfile(page) {
  const passwordField = page.locator('input[type="password"]').first();
  if (await passwordField.isVisible({ timeout: 5000 }).catch(() => false)) {
    await passwordField.fill(PASSWORD);
    await page.getByRole("button", { name: "Unlock" }).click();
    await passwordField.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
}

async function dismissOverlays(page, profileId) {
  await page.evaluate((activeProfileId) => {
    if (activeProfileId) {
      window.localStorage.setItem("billcraft.active-profile.v1", activeProfileId);
    }

    for (const key of Object.keys(window.localStorage)) {
      if (key.includes("profile-onboarding")) {
        window.localStorage.setItem(
          key,
          JSON.stringify({ dismissed: true, completedStepIds: ["business", "client", "invoice"] }),
        );
      }
    }
  }, profileId);

  const closeButtons = page.locator('button[aria-label="Close"], button:has-text("Dismiss"), button:has-text("Skip"), button:has-text("Got it")');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const button = closeButtons.first();
    if (!(await button.isVisible({ timeout: 500 }).catch(() => false))) break;
    await button.click().catch(() => {});
    await page.waitForTimeout(250);
  }

  await page.evaluate(() => {
    document.querySelectorAll('[data-sonner-toast], [data-sileo-toast], .sileo-toast, [role="status"]').forEach((node) => {
      node.remove();
    });
  });
}

async function getProfileId() {
  const response = await fetch(`${BASE}/api/user-data`);
  const snapshot = await response.json();
  return snapshot.activeProfile?.id || snapshot.profiles?.[0]?.id || null;
}

async function preparePage(page, profileId) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await unlockProfile(page);
  await dismissOverlays(page, profileId);
}

async function capture(page, shot, profileId) {
  await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });
  await unlockProfile(page);
  await page.locator(shot.waitFor).first().waitFor({ timeout: 15000 }).catch(() => {});
  await dismissOverlays(page, profileId);
  await page.waitForTimeout(1500);

  if (shot.path.includes("action=new")) {
    const modal = page.locator('[role="dialog"]').first();
    if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await modal.screenshot({ path: path.join(ASSETS, shot.file) });
      return;
    }
  }

  await page.screenshot({ path: path.join(ASSETS, shot.file), fullPage: false });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    colorScheme: "dark",
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    const profileId = await getProfileId();
    await preparePage(page, profileId);

    for (const shot of shots) {
      console.log(`Capturing ${shot.file}...`);
      await capture(page, shot, profileId);
    }

    console.log(`Saved ${shots.length} screenshots to ${ASSETS}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
