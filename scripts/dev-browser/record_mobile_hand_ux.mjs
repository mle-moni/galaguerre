import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const BASE_URL = "http://localhost:3333";
const OUTPUT_DIR = "/tmp/galaguerre-playwright";
const OUTPUT_PATH = resolve(OUTPUT_DIR, "mobile-hand-ux.webm");
const VIEWPORT = { width: 390, height: 844 };
const TEST_EMAIL = "test@test.fr";

mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
});
const context = await browser.newContext({
    viewport: VIEWPORT,
    screen: VIEWPORT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    recordVideo: {
        dir: OUTPUT_DIR,
        size: VIEWPORT,
    },
});
const page = await context.newPage();

await page.addInitScript(() => {
    window.addEventListener("DOMContentLoaded", () => {
        const finger = document.createElement("div");
        finger.id = "playwright-finger";
        finger.style.cssText = [
            "position:fixed",
            "width:34px",
            "height:34px",
            "border-radius:50%",
            "border:3px solid rgba(255,255,255,.95)",
            "background:rgba(76,174,255,.38)",
            "box-shadow:0 0 0 5px rgba(76,174,255,.18)",
            "transform:translate(-50%,-50%)",
            "pointer-events:none",
            "z-index:99999",
            "opacity:0",
            "transition:opacity 100ms ease",
        ].join(";");

        const caption = document.createElement("div");
        caption.id = "playwright-caption";
        caption.style.cssText = [
            "position:fixed",
            "left:50%",
            "top:96px",
            "transform:translateX(-50%)",
            "max-width:340px",
            "padding:8px 14px",
            "border-radius:999px",
            "background:rgba(5,12,24,.9)",
            "border:1px solid rgba(210,164,75,.8)",
            "color:white",
            "font:700 12px/1.2 sans-serif",
            "text-align:center",
            "pointer-events:none",
            "z-index:99998",
            "opacity:0",
        ].join(";");

        document.body.append(finger, caption);

        const moveFinger = (event) => {
            finger.style.left = `${event.clientX}px`;
            finger.style.top = `${event.clientY}px`;
        };

        document.addEventListener("pointerdown", (event) => {
            moveFinger(event);
            finger.style.opacity = "1";
        });
        document.addEventListener("pointermove", moveFinger);
        document.addEventListener("pointerup", () => {
            window.setTimeout(() => {
                finger.style.opacity = "0";
            }, 280);
        });
    });
});

const pause = (duration = 800) => page.waitForTimeout(duration);

const setCaption = async (text) => {
    await page.evaluate((nextText) => {
        const caption = document.querySelector("#playwright-caption");
        if (!(caption instanceof HTMLElement)) return;
        caption.textContent = nextText;
        caption.style.opacity = nextText ? "1" : "0";
    }, text);
};

const moveWithPauses = async (from, to, steps = 12, duration = 720) => {
    for (let step = 1; step <= steps; step++) {
        const ratio = step / steps;
        await page.mouse.move(from.x + (to.x - from.x) * ratio, from.y + (to.y - from.y) * ratio);
        await pause(duration / steps);
    }
};

const ensureGameReady = async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

    await page.getByLabel("Email").waitFor();
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Mot de passe").fill("test");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL((url) => url.pathname !== "/login");

    const authState = await page.evaluate(async () => {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/auth/me", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return { ok: response.ok, data: await response.json() };
    });
    assert(authState.ok, "The Playwright session must be authenticated");

    if (authState.data.currentGameId) {
        await page.goto(`${BASE_URL}/play`, { waitUntil: "networkidle" });
    } else {
        await page.goto(`${BASE_URL}/matchmaking`, { waitUntil: "networkidle" });

        const dailyPackDialog = page.getByRole("dialog", { name: "Paquet quotidien" });
        if ((await dailyPackDialog.count()) > 0 && (await dailyPackDialog.isVisible())) {
            await dailyPackDialog.getByRole("button").first().click();
        }

        await page.getByRole("button", { name: "Jouer contre l'IA" }).click();
    }

    await page.getByRole("button", { name: "Abandonner la partie" }).waitFor();

    const keepHandButton = page.getByRole("button", { name: "Tout garder" });
    if ((await keepHandButton.count()) > 0 && (await keepHandButton.isVisible())) {
        await keepHandButton.click();
        await pause(900);
    }

    for (let index = 0; index < 8; index++) {
        const dismissTipButton = page.getByRole("button", { name: "Compris" });
        if ((await dismissTipButton.count()) === 0 || !(await dismissTipButton.isVisible())) break;
        await dismissTipButton.click();
        await pause(220);
    }
};

const resetFixture = async () => {
    execFileSync(
        process.execPath,
        [resolve(ROOT, "ace.js"), "dev:prepare-mobile-hand", TEST_EMAIL],
        {
            cwd: ROOT,
            stdio: "ignore",
        },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-mobile-hand-count="10"]').waitFor();
    assert.equal(await page.locator("[data-hand-card-index]").count(), 10);
};

const getHandGeometry = async () => {
    const hand = page.locator(".card-hand--mobile");
    const handBox = await hand.boundingBox();
    const cardBox = await page
        .locator("[data-hand-card-index] [data-playing-card]")
        .first()
        .boundingBox();
    assert(handBox && cardBox, "The mobile hand must be visible");

    return { handBox, cardWidth: cardBox.width };
};

const cardCenterX = (handBox, cardWidth, index, cardCount = 10) =>
    handBox.x + cardWidth / 2 + ((handBox.width - cardWidth) * index) / (cardCount - 1);

const pressAndBrowseTo = async (index) => {
    const { handBox, cardWidth } = await getHandGeometry();
    const start = { x: handBox.x + 12, y: handBox.y + 56 };
    const selected = { x: cardCenterX(handBox, cardWidth, index), y: start.y };

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await pause(500);
    await moveWithPauses(start, selected, Math.max(4, index * 3), Math.max(420, index * 180));
    await pause(500);

    assert.equal(
        await page.locator(".card-hand__card--selected").getAttribute("data-hand-card-index"),
        String(index),
    );

    return { start: selected, handBox };
};

const liftCard = async (from, distance = 82) => {
    const lifted = { x: from.x, y: from.y - distance };
    await moveWithPauses(from, lifted, 10, 650);
    await pause(550);
    return lifted;
};

await ensureGameReady();
await resetFixture();

await setCaption("10 cartes visibles, sans défilement");
await pause(1500);

await setCaption("Appui maintenu puis navigation horizontale");
const browse = await pressAndBrowseTo(5);
assert.equal(
    await page.locator("[data-mobile-hand-preview] .playing-card-face__label").textContent(),
    "Déploiement Réussi",
);
await pause(900);
await page.mouse.up();
await pause(1200);

await resetFixture();
await setCaption("Retour dans la main : le geste est annulé");
const canceledSpell = await pressAndBrowseTo(1);
const liftedCanceledSpell = await liftCard(canceledSpell.start);
await moveWithPauses(liftedCanceledSpell, canceledSpell.start, 10, 750);
await pause(700);
const cancelPreviewShadow = await page
    .locator("[data-mobile-hand-preview] .mobile-hand__preview-card")
    .evaluate((element) => getComputedStyle(element).boxShadow);
const cancelHandShadow = await page
    .locator(".card-hand--mobile")
    .evaluate((element) => getComputedStyle(element).boxShadow);
assert.doesNotMatch(cancelPreviewShadow, /239,\s*68,\s*68/);
assert.doesNotMatch(cancelHandShadow, /239,\s*68,\s*68/);
await page.mouse.up();
await pause(1200);
assert.equal(await page.locator("[data-hand-card-index]").count(), 10);
assert.equal(
    await page
        .locator(".card-hand--mobile .playing-card-face__label")
        .filter({ hasText: "Déploiement Réussi" })
        .count(),
    3,
);
assert.equal(await page.locator(".playing-card--armed").count(), 0);

await resetFixture();
await setCaption("Serviteur : glisser vers une zone d’insertion");
const minion = await pressAndBrowseTo(0);
const liftedMinion = await liftCard(minion.start);
const dropZoneBox = await page
    .locator('[data-minion-drop-zone][data-spot-owner="PLAYER"]')
    .boundingBox();
assert(dropZoneBox, "The player drop zone must be visible");
const minionTarget = {
    x: dropZoneBox.x + dropZoneBox.width / 2,
    y: dropZoneBox.y + dropZoneBox.height / 2,
};
await moveWithPauses(liftedMinion, minionTarget, 16, 1000);
await pause(850);
await page.mouse.up();
await pause(1800);
assert.equal(await page.locator("[data-hand-card-index]").count(), 9);
assert.equal(
    await page.locator('[data-target-zone][data-spot-owner="PLAYER"][data-minion-uuid]').count(),
    1,
);

await resetFixture();
await setCaption("Sort sans cible : monter puis relâcher");
const spell = await pressAndBrowseTo(1);
await liftCard(spell.start);
await pause(700);
await page.mouse.up();
await pause(1800);
assert.equal(
    await page
        .locator(".card-hand--mobile .playing-card-face__label")
        .filter({ hasText: "Déploiement Réussi" })
        .count(),
    2,
);

await resetFixture();
await setCaption("Arme : même geste, équipement immédiat");
const weapon = await pressAndBrowseTo(2);
await liftCard(weapon.start);
await pause(700);
await page.mouse.up();
await pause(1800);
assert.equal(
    await page
        .locator(".card-hand--mobile .playing-card-face__label")
        .filter({ hasText: "Tasse à Café Ébréchée" })
        .count(),
    1,
);

await resetFixture();
await setCaption("Sort ciblé : le premier dépôt ouvre seulement le choix de cible");
const targetedSpell = await pressAndBrowseTo(3);
const liftedSpell = await liftCard(targetedSpell.start);
const opponentTarget = page
    .locator('[data-target-zone][data-spot-owner="OPPONENT"][data-minion-uuid]')
    .first();
const opponentTargetBox = await opponentTarget.boundingBox();
assert(opponentTargetBox, "The opponent target must be visible");
const targetPoint = {
    x: opponentTargetBox.x + opponentTargetBox.width / 2,
    y: opponentTargetBox.y + opponentTargetBox.height / 2,
};
await moveWithPauses(liftedSpell, targetPoint, 18, 1200);
await pause(900);
await page.mouse.up();
await pause(1200);
const cancelTargetButton = page.getByRole("button", {
    name: "Annuler la sélection de cible",
});
assert.equal(await cancelTargetButton.count(), 1);
assert.equal(await page.locator("#targeting-arrow-head").count(), 0);
assert.equal(await page.locator("[data-hand-card-index]").count(), 10);
assert.equal(
    await page.locator('[data-target-zone][data-spot-owner="OPPONENT"][data-minion-uuid]').count(),
    1,
);

await setCaption("Annuler rend la main intacte");
await cancelTargetButton.click();
await pause(900);
assert.equal(await cancelTargetButton.count(), 0);
assert.equal(await page.locator("[data-hand-card-index]").count(), 10);
assert.equal(
    await page.locator('[data-target-zone][data-spot-owner="OPPONENT"][data-minion-uuid]').count(),
    1,
);

await resetFixture();
await setCaption("Sort ciblé : déposer, puis toucher la cible");
const twoStepSpell = await pressAndBrowseTo(3);
const liftedTwoStep = await liftCard(twoStepSpell.start);
const neutralPoint = { x: VIEWPORT.width / 2, y: 390 };
await moveWithPauses(liftedTwoStep, neutralPoint, 14, 900);
await page.mouse.up();
await pause(1200);
assert.equal(await cancelTargetButton.count(), 1);
assert.equal(await page.locator("#targeting-arrow-head").count(), 0);

await setCaption("Le second appui confirme la cible");
const secondTarget = page
    .locator('[data-target-zone][data-spot-owner="OPPONENT"][data-minion-uuid]')
    .first();
await secondTarget.click();
await pause(2000);
assert.equal(
    await page.locator('[data-target-zone][data-spot-owner="OPPONENT"][data-minion-uuid]').count(),
    0,
);

await resetFixture();
await setCaption("Cri de guerre ciblé : Annuler abandonne entièrement la pose");
const targetedBattlecry = await pressAndBrowseTo(8);
const liftedBattlecry = await liftCard(targetedBattlecry.start);
const battlecryDropZone = await page
    .locator('[data-minion-drop-zone][data-spot-owner="PLAYER"]')
    .boundingBox();
assert(battlecryDropZone, "The player drop zone must be visible");
const battlecryDropPoint = {
    x: battlecryDropZone.x + battlecryDropZone.width / 2,
    y: battlecryDropZone.y + battlecryDropZone.height / 2,
};
await moveWithPauses(liftedBattlecry, battlecryDropPoint, 16, 1000);
await page.mouse.up();
await pause(1200);
assert.equal(await cancelTargetButton.count(), 1);
assert.equal(await page.locator("[data-hand-card-index]").count(), 10);
assert.equal(
    await page.locator('[data-target-zone][data-spot-owner="PLAYER"][data-minion-uuid]').count(),
    0,
);
await cancelTargetButton.click();
await pause(900);
assert.equal(await cancelTargetButton.count(), 0);
assert.equal(await page.locator("#targeting-arrow-head").count(), 0);
assert.equal(await page.locator("[data-hand-card-index]").count(), 10);
assert.equal(
    await page.locator('[data-target-zone][data-spot-owner="PLAYER"][data-minion-uuid]').count(),
    0,
);

await setCaption("Tous les parcours tactiles sont validés");
await pause(1800);
await setCaption("");

const video = page.video();
await context.close();
assert(video, "Playwright video recording must be enabled");
const recordedPath = await video.path();
copyFileSync(recordedPath, OUTPUT_PATH);
await browser.close();

console.log(`Playwright mobile hand video: ${OUTPUT_PATH}`);
