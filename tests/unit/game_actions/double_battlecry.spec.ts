import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import { applySilenceToMinion } from "#galaguerre/action_engine/apply_silence";
import { executeBattlecries } from "#galaguerre/action_engine/execute_battlecries";
import { getMinionCardTemplateById } from "#galaguerre/card_catalog";
import { refreshAurasAfterMinionPlayed } from "#galaguerre/passive_engine/refresh_passive_auras";
import { assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createEmptyBoard,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { runBattlecry } from "#tests/helpers/game/run_battlecry";

const createBattlecryDamageMinion = (overrides: { uuid?: string; cost?: number } = {}) =>
    createMinionCard({
        uuid: overrides.uuid ?? "battlecry-minion",
        cost: overrides.cost ?? 2,
        battlecryActions: [
            {
                type: "DAMAGE",
                damage: 2,
                isTargeted: false,
                target: createHeroTargetSnapshot("OPPONENT"),
                onTargetResult: null,
                actionCondition: null,
            },
        ],
    });

const createJeanOnBoard = (overrides: { uuid?: string } = {}) => {
    const jeanTemplate = getMinionCardTemplateById(177)!;
    return createMinionCard({
        ...jeanTemplate,
        uuid: overrides.uuid ?? "jean-on-board",
    });
};

test.group("double battlecry", () => {
    test("battlecry triggers once without Jean on board", ({ assert }) => {
        const handCard = createBattlecryDamageMinion();

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            handCard,
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
    });

    test("battlecry triggers twice with Jean on board", ({ assert }) => {
        const jeanOnBoard = createJeanOnBoard();
        const handCard = createBattlecryDamageMinion({ uuid: CARD_IDS.handMinion });

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(jeanOnBoard)),
                },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            handCard,
            { boardIndex: 1 },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 4);
    });

    test("battlecry triggers three times with two Jeans on board", ({ assert }) => {
        const jeanOne = createJeanOnBoard({ uuid: "jean-one" });
        const jeanTwo = createJeanOnBoard({ uuid: "jean-two" });
        const handCard = createBattlecryDamageMinion({ uuid: CARD_IDS.handMinion });

        const board = placeMinion(
            placeMinion(createEmptyBoard(), 0, createMinionState(jeanOne)),
            1,
            createMinionState(jeanTwo),
        );

        const { game } = runBattlecry(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board,
                },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
            handCard,
            { boardIndex: 2 },
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 6);
    });

    test("silencing Jean restores single battlecry trigger", ({ assert }) => {
        const jeanOnBoard = createJeanOnBoard();
        const handCard = createBattlecryDamageMinion({ uuid: CARD_IDS.handMinion });
        const game = createInMemoryGame(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(jeanOnBoard)),
                },
                playerTwo: { health: DEFAULT_HERO_HEALTH },
            }),
        );

        refreshAurasAfterMinionPlayed(game, game.data.playerOne, 0);
        assert.equal(game.data.playerOne.extraBattlecryTriggers, 1);

        applySilenceToMinion(game, game.data.playerOne, 0);
        assert.equal(game.data.playerOne.extraBattlecryTriggers, 0);

        const player = game.data.playerOne;
        player.hand = player.hand.filter((card) => card.uuid !== handCard.uuid);
        player.board.splice(
            1,
            0,
            createMinionState(handCard, { placedAtRound: game.data.currentRound }),
        );

        const { gameEnded, discoverPending } = executeBattlecries(game, player, handCard);
        assert.isFalse(gameEnded);
        assert.isFalse(discoverPending);
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH - 2);
    });

    test("Jean card description mentions double battlecries", ({ assert }) => {
        const jeanTemplate = getMinionCardTemplateById(177)!;
        assert.include(
            jeanTemplate.description,
            "Vos Cris de guerre se déclenchent 1 fois de plus.",
        );
    });
});
