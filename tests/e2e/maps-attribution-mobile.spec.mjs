import { test, expect } from "@playwright/test";

test.setTimeout(120_000);

async function waitForMapReady(page) {
  await page.goto("/maps", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".gmaps-canvas .maplibregl-canvas")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator(".gmaps-veil")).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(1500);
}

test("attribution flush bottom-right webkit iPhone 13", async ({ page }) => {
  await waitForMapReady(page);
  const m = await page.evaluate(() => {
    const canvas = document.querySelector(".gmaps-canvas");
    const attrib = document.querySelector(".gmaps-canvas .maplibregl-ctrl-attrib");
    if (!canvas || !attrib) return { ok: false, reason: "missing" };
    const cr = canvas.getBoundingClientRect();
    const ar = attrib.getBoundingClientRect();
    return {
      ok: true,
      classes: attrib.className,
      innerHeight: window.innerHeight,
      deltaRight: cr.right - ar.right,
      deltaBottom: cr.bottom - ar.bottom,
      canvas: { right: cr.right, bottom: cr.bottom },
      attrib: { right: ar.right, bottom: ar.bottom, width: ar.width, height: ar.height },
    };
  });
  expect(m.ok, m.reason).toBe(true);
  expect(m.classes).toContain("maplibregl-compact");
  expect(m.deltaRight, JSON.stringify(m)).toBeLessThanOrEqual(10);
  expect(m.deltaBottom, JSON.stringify(m)).toBeLessThanOrEqual(10);
  console.log("[webkit iPhone 13]", JSON.stringify(m));
});
