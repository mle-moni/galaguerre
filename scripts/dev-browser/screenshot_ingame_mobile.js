const SCREENSHOT_NAME = "galaguerre-mobile-ingame.png";
const VIEWPORT = { width: 390, height: 844 };

const page = await browser.getPage("galaguerre-mobile-ingame");
page.setDefaultTimeout(15_000);
await page.setViewportSize(VIEWPORT);
await page.reload({ waitUntil: "networkidle" });

await page.getByLabel("Statistiques de l'arme").first().waitFor();
if ((await page.getByLabel("Statistiques de l'arme").count()) !== 2) {
    throw new Error("Expected both players to have a test weapon");
}

await page.mouse.move(1, 1);
await page.waitForTimeout(2_500);

const screenshotPath = await saveScreenshot(
    await page.screenshot({ fullPage: false }),
    SCREENSHOT_NAME,
);

console.log(`Screenshot in-game mobile (${VIEWPORT.width}x${VIEWPORT.height}): ${screenshotPath}`);
