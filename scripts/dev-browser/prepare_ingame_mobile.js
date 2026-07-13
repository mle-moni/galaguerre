const BASE_URL = "http://localhost:3333";
const VIEWPORT = { width: 390, height: 844 };

const page = await browser.getPage("galaguerre-mobile-ingame");
page.setDefaultTimeout(15_000);
await page.setViewportSize(VIEWPORT);

await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

if (page.url().endsWith("/login")) {
    await page.getByLabel("Email").fill("test@test.fr");
    await page.getByLabel("Mot de passe").fill("test");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL((url) => url.pathname !== "/login");
}

let gameReady = false;

for (let attempt = 0; attempt < 3 && !gameReady; attempt++) {
    await page.goto(`${BASE_URL}/matchmaking`, { waitUntil: "networkidle" });

    const dailyPackDialog = page.getByRole("dialog", { name: "Paquet quotidien" });
    if ((await dailyPackDialog.count()) > 0 && (await dailyPackDialog.isVisible())) {
        await dailyPackDialog.getByRole("button").first().click();
    }

    if (page.url().endsWith("/matchmaking")) {
        await page.getByRole("button", { name: "Jouer contre l'IA" }).click();
    }

    try {
        await page
            .getByRole("button", { name: "Abandonner la partie" })
            .waitFor({ timeout: 10_000 });
        gameReady = true;
    } catch (error) {
        if (attempt === 2) throw error;
    }
}

await page.waitForTimeout(1_500);

const keepHandButton = page.getByRole("button", { name: "Tout garder" });
if ((await keepHandButton.count()) > 0 && (await keepHandButton.isVisible())) {
    await keepHandButton.click();
    await page.waitForTimeout(1_500);
}

for (let index = 0; index < 8; index++) {
    const dismissTipButton = page.getByRole("button", { name: "Compris" });
    if ((await dismissTipButton.count()) === 0 || !(await dismissTipButton.isVisible())) break;
    await dismissTipButton.click();
    await page.waitForTimeout(400);
}

console.log("Mobile game ready for local test setup");
