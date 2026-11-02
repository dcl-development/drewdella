import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SHOT_DIR = "/opt/cursor/artifacts/screenshots";
const LIVE_MAPS = "https://drewdella.com/maps";

function collectConsoleErrors(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    errors.push(String(err));
  });
  return errors;
}

async function waitForMapReady(page) {
  await page.goto("/maps", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".gmaps-canvas .maplibregl-canvas")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator(".gmaps-veil")).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(1500);
}

async function waitForLiveMapReady(page) {
  await page.goto(LIVE_MAPS, { waitUntil: "domcontentloaded" });
  await expect(
    page.locator(".gmaps-canvas .mapboxgl-canvas, .gmaps-canvas .maplibregl-canvas")
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(".gmaps-veil")).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(1500);
}

async function exerciseMapUi(page, narrow) {
  if (narrow) {
    await page.locator("#venue-search").click();
    await page.locator("#venue-suggestions button").first().click();
  } else {
    const firstVenue = page.locator(".gmaps-results button").first();
    await expect(firstVenue).toBeVisible();
    await firstVenue.click();
  }
  await expect(page.locator(".gmaps-popup, .maplibregl-popup")).toBeVisible();

  await page.locator("#venue-search").fill("Pianos");
  await expect(page.locator("#venue-suggestions")).toBeVisible();
  await page.locator("#venue-suggestions button").first().click();
  await expect(page.locator(".gmaps-popup, .maplibregl-popup")).toBeVisible();
}

for (const { name, width, height } of [
  { name: "phone-390", width: 390, height: 844 },
  { name: "desktop-1440", width: 1440, height: 900 },
]) {
  test(`maps preview ${name}`, async ({ page }) => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    const errors = collectConsoleErrors(page);
    await page.setViewportSize({ width, height });

    await waitForMapReady(page);
    await exerciseMapUi(page, width <= 768);

    const previewPath = path.join(SHOT_DIR, `maps-preview-${name}.png`);
    await page.screenshot({ path: previewPath, fullPage: true });

    const ignored = errors.filter(
      (line) =>
        !line.includes("favicon") &&
        !line.includes("404") &&
        !line.includes("Failed to load resource") &&
        !line.includes("_vercel/insights") &&
        !line.includes("_vercel/speed-insights")
    );
    expect(ignored, `console errors: ${ignored.join("\n")}`).toEqual([]);
  });

  test(`maps live comparison ${name}`, async ({ page }) => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.setViewportSize({ width, height });
    await waitForLiveMapReady(page);
    const livePath = path.join(SHOT_DIR, `maps-live-${name}.png`);
    await page.screenshot({ path: livePath, fullPage: true });
  });
}
