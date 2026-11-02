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

async function measureAttribution(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".gmaps-canvas");
    const attrib = document.querySelector(".gmaps-canvas .maplibregl-ctrl-attrib");
    if (!canvas || !attrib) {
      return { ok: false, reason: "missing canvas or attribution" };
    }
    const cr = canvas.getBoundingClientRect();
    const ar = attrib.getBoundingClientRect();
    const style = getComputedStyle(attrib);
    return {
      ok: true,
      classes: attrib.className,
      innerHeight: window.innerHeight,
      layoutBottom: document.querySelector(".site-layout--maps")?.getBoundingClientRect().bottom,
      canvas: { right: cr.right, bottom: cr.bottom, width: cr.width, height: cr.height },
      attrib: {
        right: ar.right,
        bottom: ar.bottom,
        width: ar.width,
        height: ar.height,
        display: style.display,
        visibility: style.visibility,
      },
      deltaRight: cr.right - ar.right,
      deltaBottom: cr.bottom - ar.bottom,
    };
  });
}

for (const { name, width, height } of [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 900 },
]) {
  test(`attribution flush bottom-right chromium ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await waitForMapReady(page);
    const m = await measureAttribution(page);
    expect(m.ok, m.reason).toBe(true);
    expect(m.attrib.display).not.toBe("none");
    expect(m.attrib.visibility).not.toBe("hidden");
    expect(m.classes).toContain("maplibregl-compact");
    expect(m.deltaRight, JSON.stringify(m)).toBeLessThanOrEqual(10);
    expect(m.deltaBottom, JSON.stringify(m)).toBeLessThanOrEqual(10);
    expect(m.layoutBottom, JSON.stringify(m)).toBeLessThanOrEqual(m.innerHeight + 1);
    console.log(`[chromium ${name}]`, JSON.stringify(m));
  });
}

test("attribution expands on click", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForMapReady(page);
  const button = page.locator(".gmaps-canvas .maplibregl-ctrl-attrib-button");
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator(".gmaps-canvas .maplibregl-ctrl-attrib.maplibregl-compact-show")).toBeVisible();
  await expect(page.locator(".gmaps-canvas .maplibregl-ctrl-attrib-inner")).not.toBeEmpty();
});
