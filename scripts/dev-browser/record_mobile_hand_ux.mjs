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
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    args: ["--disable-gpu"],
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

const resetFixture = async ({ mana = 10, combat = false } = {}) => {
    const commandArguments = [
        resolve(ROOT, "ace.js"),
        "dev:prepare-mobile-hand",
        TEST_EMAIL,
        `--mana=${mana}`,
    ];
    if (combat) commandArguments.push("--combat");

    execFileSync(process.execPath, commandArguments, {
        cwd: ROOT,
        stdio: "ignore",
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-mobile-hand-count="10"]').waitFor();
    assert.equal(await page.locator("[data-hand-card-index]").count(), 10);
};

const getHandGeometry = async () => {
    const hand = page.locator(".card-hand--mobile");
    const handBox = await hand.boundingBox();
    const cardCount = await page.locator("[data-hand-card-index]").count();
    const cardBox = await page
        .locator("[data-hand-card-index] [data-playing-card]")
        .first()
        .boundingBox();
    assert(handBox && cardBox, "The mobile hand must be visible");

    return { handBox, cardCount, cardWidth: cardBox.width };
};

const cardCenterX = (handBox, cardWidth, index, cardCount = 10) =>
    handBox.x + cardWidth / 2 + ((handBox.width - cardWidth) * index) / (cardCount - 1);

const pressCardAtIndex = async (index) => {
    const card = page.locator(`[data-hand-card-index="${index}"]`);
    const cardBox = await card.boundingBox();
    assert(cardBox, `Card index ${index} must be visible`);

    const start = {
        x: cardBox.x + Math.min(12, cardBox.width / 2),
        y: cardBox.y + Math.min(52, cardBox.height / 2),
    };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await pause(450);
    return start;
};

const pressAndBrowseTo = async (index) => {
    const { handBox, cardCount, cardWidth } = await getHandGeometry();
    assert(index < cardCount, `Card index ${index} must exist in a ${cardCount}-card hand`);
    const start = { x: handBox.x + 12, y: handBox.y + 56 };
    const selected = { x: cardCenterX(handBox, cardWidth, index, cardCount), y: start.y };

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

const moveCardIntoBattlefield = async (from) => {
    const battlefieldBox = await page.locator(".mobile-game-layout__board").boundingBox();
    assert(battlefieldBox, "The mobile battlefield must be visible");

    const releasePoint = {
        x: from.x,
        y: battlefieldBox.y + battlefieldBox.height - 24,
    };
    await moveWithPauses(from, releasePoint, 10, 650);
    await pause(450);
    return releasePoint;
};

// The marker id carries the current validity (targeting-arrow-head-valid, …).
const targetingArrowHead = () => page.locator('[id^="targeting-arrow-head"]');

const getPlayerHealth = async () => {
    const text = await page.locator(".mobile-bar--player .mobile-bar__badge--health").innerText();
    return Number(text.replace(/\D/g, ""));
};

const getPlayerBoardUuids = () =>
    page
        .locator('[data-target-zone][data-spot-owner="PLAYER"][data-minion-uuid]')
        .evaluateAll((elements) =>
            elements.map((element) => ({
                boardIndex: Number(element.getAttribute("data-board-index")),
                uuid: element.getAttribute("data-minion-uuid"),
            })),
        );

const moveMinionToInsertionZone = async (from, boardIndex) => {
    const dropZoneBox = await page
        .locator('[data-minion-drop-zone][data-spot-owner="PLAYER"]')
        .boundingBox();
    assert(dropZoneBox, "The player drop zone must be visible");

    const dropZoneCenter = {
        x: dropZoneBox.x + dropZoneBox.width / 2,
        y: dropZoneBox.y + dropZoneBox.height / 2,
    };
    await moveWithPauses(from, dropZoneCenter, 12, 750);
    await pause(500);

    const insertionZone = page.locator(
        `[data-board-insertion-zone][data-board-index="${boardIndex}"][data-spot-owner="PLAYER"]`,
    );
    await insertionZone.waitFor();
    const insertionBox = await insertionZone.boundingBox();
    assert(insertionBox && insertionBox.width > 0, `Insertion zone ${boardIndex} must be active`);
    const insertionStyle = await insertionZone.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
            backgroundColor: style.backgroundColor,
            borderColor: style.borderTopColor,
            markerDisplay: getComputedStyle(element, "::before").display,
        };
    });
    assert.equal(insertionStyle.backgroundColor, "rgba(0, 0, 0, 0)");
    assert.equal(insertionStyle.borderColor, "rgba(0, 0, 0, 0)");
    assert.equal(insertionStyle.markerDisplay, "none");

    const insertionPoint = {
        x: insertionBox.x + insertionBox.width / 2,
        y: insertionBox.y + insertionBox.height / 2,
    };
    await moveWithPauses(dropZoneCenter, insertionPoint, 10, 700);
    await pause(750);
    return insertionPoint;
};

const dragAttack = async ({ attacker, target, getStartPoint, getTargetPoint, expectedHint }) => {
    const attackerBox = await attacker.boundingBox();
    const targetBox = await target.boundingBox();
    assert(attackerBox && targetBox, "The attacker and target must be visible");

    const start = getStartPoint(attackerBox);
    const end = getTargetPoint(targetBox);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await pause(450);
    await moveWithPauses(start, end, 16, 1000);
    assert.equal(await targetingArrowHead().count(), 1);
    assert.equal(await page.locator(".armed-card-hint").textContent(), expectedHint);
    await pause(650);
    await page.mouse.up();
    await target.waitFor({ state: "detached", timeout: 10_000 });
    assert.equal(
        await page
            .locator('[data-target-zone][data-spot-owner="OPPONENT"][data-minion-uuid]')
            .count(),
        0,
    );
    assert.equal(await targetingArrowHead().count(), 0);
};

await ensureGameReady();

await resetFixture();
const playerWeaponBox = await page
    .locator(".mobile-bar--player .mobile-bar__weapon-panel")
    .boundingBox();
const playerHealthBox = await page
    .locator(".mobile-bar--player .mobile-bar__badge--health")
    .boundingBox();
assert(playerWeaponBox && playerHealthBox, "The player weapon and health stat must be visible");
assert(
    playerWeaponBox.x + playerWeaponBox.width <= playerHealthBox.x,
    "The player health stat must not overlap the equipped weapon",
);
const handImageAllowsContextMenu = await page
    .locator(".card-hand--mobile .playing-card-face__image-area img")
    .first()
    .evaluate((image) =>
        image.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })),
    );
assert.equal(handImageAllowsContextMenu, false);

await setCaption("10 cartes visibles, sans défilement");
await pause(1500);

await resetFixture();
await setCaption("Un geste diagonal conserve la carte touchée");
const diagonalStart = await pressCardAtIndex(0);
const diagonalDropZone = await page
    .locator('[data-minion-drop-zone][data-spot-owner="PLAYER"]')
    .boundingBox();
assert(diagonalDropZone, "The player drop zone must be visible");
const diagonalTarget = {
    x: diagonalStart.x + 90,
    y: diagonalDropZone.y + diagonalDropZone.height / 2,
};
await moveWithPauses(diagonalStart, diagonalTarget, 16, 1000);
assert.equal(
    await page.locator(".card-hand__card--selected").getAttribute("data-hand-card-index"),
    "0",
);
await pause(600);
await page.mouse.up();
const diagonallyPlayedMinion = page.locator(
    '[data-target-zone][data-spot-owner="PLAYER"][data-minion-uuid] img[alt="Stagiaire Dev"]',
);
await diagonallyPlayedMinion.waitFor({ timeout: 10_000 });

await resetFixture({ mana: 0 });
await setCaption("Mana insuffisant : la carte reste dans la main");
const unaffordableCard = await pressAndBrowseTo(0);
await liftCard(unaffordableCard.start);
await pause(600);
assert.equal(await page.locator(".mobile-hand__preview--dragging").count(), 0);
assert.equal(await page.locator(".board-player-drop-zone--active").count(), 0);
assert.equal(
    await page.locator("[data-mobile-hand-preview] .mobile-hand__preview-hint").textContent(),
    "Glissez pour parcourir · montez pour jouer",
);
await moveCardIntoBattlefield({
    x: unaffordableCard.start.x,
    y: unaffordableCard.start.y - 82,
});
await page.mouse.up();
await pause(1200);
assert.equal(await page.locator("[data-hand-card-index]").count(), 10);
assert.equal(
    await page.locator('[data-target-zone][data-spot-owner="PLAYER"][data-minion-uuid]').count(),
    0,
);

await resetFixture();
await setCaption("Appui maintenu puis navigation horizontale");
const browse = await pressAndBrowseTo(5);
assert.equal(
    await page.locator("[data-mobile-hand-preview] .playing-card-face__label").textContent(),
    "Déploiement Réussi",
);
await pause(900);
await page.mouse.up();
assert.equal(await page.locator("[data-mobile-hand-preview]").count(), 0);
assert.equal(await page.locator(".card-hand__card--selected").count(), 0);
assert.equal(await page.locator(".playing-card--armed").count(), 0);
await pause(1200);

await resetFixture();
await setCaption("Retour dans la main : le geste est annulé");
const canceledSpell = await pressAndBrowseTo(1);
const liftedCanceledSpell = await liftCard(canceledSpell.start);
const cancelFromBattlefield = await moveCardIntoBattlefield(liftedCanceledSpell);
const handCancelPoint = {
    x: canceledSpell.start.x,
    y: canceledSpell.handBox.y + canceledSpell.handBox.height / 2,
};
await moveWithPauses(cancelFromBattlefield, handCancelPoint, 10, 750);
await pause(700);
assert.equal(
    await page.locator("[data-mobile-hand-preview] .mobile-hand__preview-hint").textContent(),
    "Relâchez pour annuler",
);
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
    2,
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

const [firstMinion] = await getPlayerBoardUuids();
assert(firstMinion?.uuid, "The first minion must be present on the board");

await setCaption("Plateau occupé : placer un serviteur à gauche");
const leftMinion = await pressAndBrowseTo(3);
const liftedLeftMinion = await liftCard(leftMinion.start);
await moveMinionToInsertionZone(liftedLeftMinion, 0);
await page.mouse.up();
await pause(1800);

const boardAfterLeftDrop = await getPlayerBoardUuids();
assert.deepEqual(
    boardAfterLeftDrop.map(({ boardIndex }) => boardIndex),
    [0, 1],
);
assert.equal(boardAfterLeftDrop[1]?.uuid, firstMinion.uuid);
assert.notEqual(boardAfterLeftDrop[0]?.uuid, firstMinion.uuid);

await setCaption("Deux serviteurs : placer un serviteur à droite");
const rightMinion = await pressAndBrowseTo(7);
const liftedRightMinion = await liftCard(rightMinion.start);
await moveMinionToInsertionZone(liftedRightMinion, 2);
await page.mouse.up();
await pause(1800);

const boardAfterRightDrop = await getPlayerBoardUuids();
assert.deepEqual(
    boardAfterRightDrop.map(({ boardIndex }) => boardIndex),
    [0, 1, 2],
);
assert.equal(boardAfterRightDrop[1]?.uuid, firstMinion.uuid);
assert.notEqual(boardAfterRightDrop[2]?.uuid, firstMinion.uuid);

await resetFixture();
await setCaption("Nouveau cas : préparer deux serviteurs sur le terrain");
const middleCaseFirstMinion = await pressAndBrowseTo(0);
const liftedMiddleCaseFirstMinion = await liftCard(middleCaseFirstMinion.start);
await moveMinionToInsertionZone(liftedMiddleCaseFirstMinion, 0);
await page.mouse.up();
await pause(900);

const middleCaseSecondMinion = await pressAndBrowseTo(3);
const liftedMiddleCaseSecondMinion = await liftCard(middleCaseSecondMinion.start);
await moveMinionToInsertionZone(liftedMiddleCaseSecondMinion, 1);
await page.mouse.up();
await pause(1500);

const boardBeforeMiddleDrop = await getPlayerBoardUuids();
assert.equal(boardBeforeMiddleDrop.length, 2);

await setCaption("Deux serviteurs : placer le nouveau au milieu");
const middleMinion = await pressAndBrowseTo(7);
const liftedMiddleMinion = await liftCard(middleMinion.start);
await moveMinionToInsertionZone(liftedMiddleMinion, 1);
await page.mouse.up();
await pause(1800);

const boardAfterMiddleDrop = await getPlayerBoardUuids();
assert.deepEqual(
    boardAfterMiddleDrop.map(({ boardIndex }) => boardIndex),
    [0, 1, 2],
);
assert.equal(boardAfterMiddleDrop[0]?.uuid, boardBeforeMiddleDrop[0]?.uuid);
assert.equal(boardAfterMiddleDrop[2]?.uuid, boardBeforeMiddleDrop[1]?.uuid);
assert.notEqual(boardAfterMiddleDrop[1]?.uuid, boardBeforeMiddleDrop[0]?.uuid);
assert.notEqual(boardAfterMiddleDrop[1]?.uuid, boardBeforeMiddleDrop[1]?.uuid);

await resetFixture();
await setCaption("Sort sans cible : monter puis relâcher");
const spell = await pressAndBrowseTo(1);
const liftedSpell = await liftCard(spell.start);
await moveCardIntoBattlefield(liftedSpell);
await pause(700);
await page.mouse.up();
await pause(1800);
assert.equal(
    await page
        .locator(".card-hand--mobile .playing-card-face__label")
        .filter({ hasText: "Déploiement Réussi" })
        .count(),
    1,
);

await resetFixture();
await setCaption("Sort ciblé : viser son propre héros, colonne chrono comprise");
const selfTargetSpell = await pressAndBrowseTo(7);
const liftedSelfTargetSpell = await liftCard(selfTargetSpell.start);
const playerActionsBox = await page
    .locator(".mobile-bar--player .mobile-bar__actions")
    .boundingBox();
assert(playerActionsBox, "The player actions column must be visible");
const playerHealthBefore = await getPlayerHealth();
// Straight up from the right end of the hand lands on the timer / end turn column,
// which is part of the hero row but not of its target zone.
await moveWithPauses(
    liftedSelfTargetSpell,
    {
        x: playerActionsBox.x + playerActionsBox.width / 2,
        y: playerActionsBox.y + playerActionsBox.height / 2,
    },
    12,
    800,
);
await pause(600);
assert.equal(await targetingArrowHead().count(), 1);
await page.mouse.up();
await pause(1800);
assert.equal(await getPlayerHealth(), playerHealthBefore - 2);
assert.equal(await page.locator("[data-hand-card-index]").count(), 9);
assert.equal(await targetingArrowHead().count(), 0);
// The end turn button below the arrow release point must not have been triggered.
assert.equal(await page.locator(".mobile-bar--player .mobile-bar__actions--hidden").count(), 0);

await resetFixture();
await setCaption("Arme : même geste, équipement immédiat");
const weapon = await pressAndBrowseTo(2);
const liftedWeapon = await liftCard(weapon.start);
await moveCardIntoBattlefield(liftedWeapon);
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
await setCaption("Sort ciblé : relâcher hors cible rend la carte");
const targetedSpell = await pressAndBrowseTo(3);
const liftedTargetedSpell = await liftCard(targetedSpell.start);
const neutralPoint = { x: VIEWPORT.width / 2, y: 390 };
await moveWithPauses(liftedTargetedSpell, neutralPoint, 14, 900);
await page.mouse.up();
await pause(1200);
const cancelTargetButton = page.getByRole("button", {
    name: "Annuler la sélection de cible",
});
assert.equal(await cancelTargetButton.count(), 0);
assert.equal(await targetingArrowHead().count(), 0);
assert.equal(await page.locator("[data-hand-card-index]").count(), 10);

await resetFixture();
await setCaption("Sort ciblé : glisser jusqu’à la cible confirme");
const draggedSpell = await pressAndBrowseTo(3);
const liftedDraggedSpell = await liftCard(draggedSpell.start);
const spellTarget = page
    .locator('[data-target-zone][data-spot-owner="OPPONENT"][data-minion-uuid]')
    .first();
const spellTargetBox = await spellTarget.boundingBox();
assert(spellTargetBox, "The opponent minion must be visible");
await moveWithPauses(
    liftedDraggedSpell,
    {
        x: spellTargetBox.x + spellTargetBox.width / 2,
        y: spellTargetBox.y + spellTargetBox.height / 2,
    },
    14,
    900,
);
assert.equal(await targetingArrowHead().count(), 1);
await page.mouse.up();
await spellTarget.waitFor({ state: "detached", timeout: 10_000 });
assert.equal(
    await page.locator('[data-target-zone][data-spot-owner="OPPONENT"][data-minion-uuid]').count(),
    0,
);
assert.equal(await targetingArrowHead().count(), 0);

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
assert.equal(await targetingArrowHead().count(), 0);
assert.equal(await page.locator("[data-hand-card-index]").count(), 10);
assert.equal(
    await page.locator('[data-target-zone][data-spot-owner="PLAYER"][data-minion-uuid]').count(),
    0,
);

await resetFixture({ combat: true });
await setCaption("Attaque mobile : glisser un serviteur vers sa cible");
const playerAttacker = page
    .locator('[data-target-zone][data-spot-owner="PLAYER"][data-minion-uuid] [data-playing-card]')
    .first();
const opponentTarget = page
    .locator('[data-target-zone][data-spot-owner="OPPONENT"][data-minion-uuid]')
    .first();
await dragAttack({
    attacker: playerAttacker,
    target: opponentTarget,
    getStartPoint: (box) => ({
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
    }),
    getTargetPoint: (box) => ({
        x: box.x + box.width + 8,
        y: box.y + box.height / 2,
    }),
    expectedHint: "Relâchez sur une cible ennemie pour attaquerAnnuler",
});

await resetFixture({ combat: true });
await setCaption("Attaque mobile : glisser le profil armé vers sa cible");
const armedHero = page.locator('.mobile-bar--player [data-target-zone][data-spot-owner="PLAYER"]');
const weaponTarget = page
    .locator('[data-target-zone][data-spot-owner="OPPONENT"][data-minion-uuid]')
    .first();
await dragAttack({
    attacker: armedHero,
    target: weaponTarget,
    getStartPoint: (box) => ({ x: box.x + 24, y: box.y + box.height / 2 }),
    getTargetPoint: (box) => ({
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
    }),
    expectedHint: "Relâchez sur une cible ennemie pour attaquer avec votre armeAnnuler",
});

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
