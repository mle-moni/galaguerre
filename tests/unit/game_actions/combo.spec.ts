import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import { setupNextGameTurn } from "#controllers/games/setup_next_game_turn";
import { assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createSpellCard,
    createWeaponCard,
} from "#tests/helpers/game/fixtures";
import { runCombo } from "#tests/helpers/game/run_combo";
import {
    runPlayMinion,
    runPlayMinionOnGame,
    runPlaySpellOnGame,
    runPlayWeaponOnGame,
} from "#tests/helpers/game/run_play_minion";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";

const comboDamageCard = (overrides: { isTargeted?: boolean } = {}) =>
    createMinionCard({
        uuid: CARD_IDS.handMinion,
        cost: 1,
        comboActions: [
            createCardActionSnapshot({
                type: "DAMAGE",
                damage: 2,
                isTargeted: overrides.isTargeted ?? false,
                target: createHeroTargetSnapshot("OPPONENT"),
            }),
        ],
    });

test.group("combo", () => {
    test("combo does not trigger on first card played this turn", async ({ assert }) => {
        const comboCard = comboDamageCard();

        const { game } = await runPlayMinion(
            createGameData({
                playerOne: { mana: 10, hand: [comboCard], cardsPlayedThisTurn: 0 },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            comboCard,
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
        assert.equal(game.data.playerOne.cardsPlayedThisTurn, 1);
    });

    test("combo triggers when another card was already played this turn", async ({ assert }) => {
        const spell = createSpellCard({
            uuid: "spell-1",
            cost: 0,
            spellActions: [createCardActionSnapshot({ type: "DRAW", drawCount: 1 })],
        });
        const comboCard = comboDamageCard();

        const game = createInMemoryGame(
            createGameData({
                playerOne: { mana: 10, hand: [spell, comboCard], cardsPlayedThisTurn: 0 },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
        );

        await runPlaySpellOnGame(game, spell);
        assert.equal(game.data.playerOne.cardsPlayedThisTurn, 1);

        await runPlayMinionOnGame(game, comboCard);
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
        assert.equal(game.data.playerOne.cardsPlayedThisTurn, 2);
    });

    test("combo triggers after playing a weapon", async ({ assert }) => {
        const weapon = createWeaponCard({ uuid: CARD_IDS.weapon, cost: 0 });
        const comboCard = comboDamageCard();

        const game = createInMemoryGame(
            createGameData({
                playerOne: { mana: 10, hand: [weapon, comboCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
        );

        await runPlayWeaponOnGame(game, weapon);
        await runPlayMinionOnGame(game, comboCard);

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
    });

    test("executeCombo deals damage when combo is active", ({ assert }) => {
        const comboCard = comboDamageCard();

        const { game } = runCombo(
            createGameData({
                playerOne: { mana: 10, hand: [comboCard], cardsPlayedThisTurn: 1 },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            comboCard,
            { cardsPlayedThisTurn: 1 },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
    });

    test("executeCombo does nothing when called without prior card play context in play flow", async ({
        assert,
    }) => {
        const comboCard = comboDamageCard();

        const { game } = await runPlayMinion(
            createGameData({
                playerOne: { mana: 10, hand: [comboCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            comboCard,
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("cardsPlayedThisTurn resets at the start of a new turn", async ({ assert }) => {
        const game = createInMemoryGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 1,
                playerOne: { mana: 10, cardsPlayedThisTurn: 3 },
            }),
        );

        await setupNextGameTurn(game);

        assert.equal(game.data.playerTwo.cardsPlayedThisTurn, 0);
    });

    test("targeted combo requires a valid target when combo is active", async ({ assert }) => {
        const comboCard = comboDamageCard({ isTargeted: true });
        const spell = createSpellCard({
            uuid: "spell-1",
            cost: 0,
            spellActions: [createCardActionSnapshot({ type: "DRAW", drawCount: 1 })],
        });

        const game = createInMemoryGame(
            createGameData({
                playerOne: { mana: 10, hand: [spell, comboCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
        );

        await runPlaySpellOnGame(game, spell);

        await runPlayMinionOnGame(game, comboCard, {
            actionTarget: { owner: "OPPONENT", minionUuid: null },
        });

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
    });
});
