import type { SpellCard } from "#api_types/game.types";
import { test } from "@japa/runner";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import { playSpell } from "#controllers/games/play_card/play_spell";
import {
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createSpellCard,
} from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { runPlaySpell } from "#tests/helpers/game/run_play_minion";

const TEST_SOCKET_ID = "test-socket";

const createSetupTechniqueCard = () =>
    createSpellCard({
        uuid: "setup-technique",
        cardId: 172,
        label: "Setup Technique",
        cost: 0,
        baseCost: 0,
        spellActions: [createCardActionSnapshot({ type: "NEXT_SPELL_COST_REDUCTION", amount: 2 })],
    });

const createDamageSpell = (cost = 4) =>
    createSpellCard({
        uuid: `damage-spell-${cost}`,
        cardId: 99,
        label: "Test Damage Spell",
        cost,
        baseCost: cost,
        spellActions: [
            createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: false,
                damage: 1,
                target: createHeroTargetSnapshot("OPPONENT"),
            }),
        ],
    });

test.group("Setup Technique", () => {
    test("playing Setup Technique grants nextSpellCostReduction and removes it from hand", async ({
        assert,
    }) => {
        const setupTechnique = createSetupTechniqueCard();

        const { game } = await runPlaySpell(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 5,
                playerOne: {
                    mana: 5,
                    hand: [setupTechnique],
                },
            }),
            setupTechnique,
        );

        assert.equal(game.data.playerOne.nextSpellCostReduction, 2);
        assert.equal(game.data.playerOne.hand.length, 0);
        assert.equal(game.data.playerOne.mana, 5);
    });

    test("the next spell costs 2 less mana", async ({ assert }) => {
        const setupTechnique = createSetupTechniqueCard();
        const followUpSpell = createDamageSpell(4);

        const { game: afterSetup } = await runPlaySpell(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 5,
                playerOne: {
                    mana: 5,
                    hand: [setupTechnique, followUpSpell],
                },
            }),
            setupTechnique,
        );

        assert.equal(afterSetup.data.playerOne.hand.length, 1);
        assert.equal(afterSetup.data.playerOne.hand[0]!.cost, 2);

        const spellToPlay = afterSetup.data.playerOne.hand[0]! as typeof followUpSpell;
        await playSpell({
            card: spellToPlay,
            player: afterSetup.data.playerOne,
            game: afterSetup,
            socketId: TEST_SOCKET_ID,
            owner: "PLAYER",
            boardIndex: null,
        });

        assert.equal(afterSetup.data.playerOne.mana, 3);
        assert.isUndefined(afterSetup.data.playerOne.nextSpellCostReduction);
        assert.equal(afterSetup.data.playerOne.hand.length, 0);
    });

    test("playing two Setup Techniques in a row refreshes the discount", async ({ assert }) => {
        const firstSetup = createSetupTechniqueCard();
        const secondSetup = createSetupTechniqueCard();
        secondSetup.uuid = "setup-technique-2";

        const { game: afterFirst } = await runPlaySpell(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 3,
                playerOne: {
                    mana: 3,
                    hand: [firstSetup, secondSetup],
                },
            }),
            firstSetup,
        );

        assert.equal(afterFirst.data.playerOne.nextSpellCostReduction, 2);

        const secondInHand = afterFirst.data.playerOne.hand[0] as SpellCard;
        await playSpell({
            card: secondInHand,
            player: afterFirst.data.playerOne,
            game: afterFirst,
            socketId: TEST_SOCKET_ID,
            owner: "PLAYER",
            boardIndex: null,
        });

        assert.equal(afterFirst.data.playerOne.nextSpellCostReduction, 2);
        assert.equal(afterFirst.data.playerOne.mana, 3);
        assert.equal(afterFirst.data.playerOne.hand.length, 0);
    });

    test("unused discount is cleared at end of turn", async ({ assert }) => {
        const setupTechnique = createSetupTechniqueCard();
        const game = createInMemoryGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 4,
                playerOne: {
                    mana: 4,
                    hand: [setupTechnique],
                },
            }),
        );

        await playSpell({
            card: setupTechnique,
            player: game.data.playerOne,
            game,
            socketId: TEST_SOCKET_ID,
            owner: "PLAYER",
            boardIndex: null,
        });

        assert.equal(game.data.playerOne.nextSpellCostReduction, 2);

        await performPassTurn(game, game.data.playerOne);

        assert.isUndefined(game.data.playerOne.nextSpellCostReduction);
    });
});
