import { test, expect, devices } from "@playwright/test";

test.setTimeout(120_000);

async function waitForMapReady(page) {
  await page.goto("/maps", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".gmaps-canvas .maplibregl-canvas")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator(".gmaps-veil")).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(1500);
}

async function measureViewportFill(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".gmaps-canvas");
    const attrib = document.querySelector(".gmaps-canvas .maplibregl-ctrl-attrib");
    const layout = document.querySelector(".site-layout--maps");
    if (!canvas || !attrib || !layout) {
      return { ok: false, reason: "missing map shell nodes" };
    }
    const cr = canvas.getBoundingClientRect();
    const ar = attrib.getBoundingClientRect();
    const lr = layout.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    return {
      ok: true,
      htmlZoom: getComputedStyle(document.documentElement).zoom,
      layoutHeight: getComputedStyle(layout).height,
      innerWidth: vw,
      innerHeight: vh,
      layoutBottom: lr.bottom,
      canvasBottom: cr.bottom,
      canvasGap: vh - cr.bottom,
      layoutGap: vh - lr.bottom,
      attribDeltaRight: vw - ar.right,
      attribDeltaBottom: vh - ar.bottom,
      canvasDeltaBottom: vh - cr.bottom,
    };
  });
}

for (const { name, width, height } of [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
]) {
  test(`maps fills viewport chromium ${name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "chromium only");
    await page.setViewportSize({ width, height });
    await waitForMapReady(page);
    const m = await measureViewportFill(page);
    expect(m.ok, m.reason).toBe(true);
    expect(Math.abs(m.canvasDeltaBottom), JSON.stringify(m)).toBeLessThanOrEqual(2);
    expect(m.attribDeltaRight, JSON.stringify(m)).toBeLessThanOrEqual(10);
    expect(m.attribDeltaBottom, JSON.stringify(m)).toBeLessThanOrEqual(10);

    const shot = await page.screenshot({ fullPage: false });
    const band = await page.evaluate(({ vh, vw }) => {
      const canvas = document.querySelector(".gmaps-canvas");
      const cr = canvas.getBoundingClientRect();
      return { canvasBottom: cr.bottom, viewportH: vh, bandPx: vh - cr.bottom };
    }, { vh: height, vw: width });
    expect(band.bandPx, JSON.stringify(band)).toBeLessThanOrEqual(2);

    console.log(`[chromium ${name}]`, JSON.stringify(m));
    expect(shot.byteLength).toBeGreaterThan(1000);
  });
}

for (const { name, device } of [
  { name: "iPhone 13", device: devices["iPhone 13"] },
  { name: "iPhone 15 Pro", device: devices["iPhone 15 Pro"] },
]) {
  test(`maps fills viewport webkit ${name}`, async ({ page, browserName }) => {
    test.skip(browserName !== "webkit", "WebKit only");
    await page.setViewportSize(device.viewport);
    if (device.userAgent) {
      await page.addInitScript(() => {});
    }
    await waitForMapReady(page);
    const m = await measureViewportFill(page);
    expect(m.ok, m.reason).toBe(true);
    expect(Math.abs(m.canvasDeltaBottom), JSON.stringify(m)).toBeLessThanOrEqual(2);
    expect(m.attribDeltaRight, JSON.stringify(m)).toBeLessThanOrEqual(10);
    expect(m.attribDeltaBottom, JSON.stringify(m)).toBeLessThanOrEqual(10);
    console.log(`[webkit ${name}]`, JSON.stringify(m));
  });
}
