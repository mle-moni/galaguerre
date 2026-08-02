import { test } from "@japa/runner";
import { addCardsToHand } from "../../../app/galaguerre/hand_card_operations.js";
import { MAX_HAND_SIZE } from "../../../app/galaguerre/game_rules.js";
import { getCardPreviewById } from "#api_types/card_preview";
import {
    createCardActionSnapshot,
    createGameData,
    createGamePlayer,
    createMinionCard,
    createSpellCard,
} from "#tests/helpers/game/fixtures";
import { runBattlecry } from "#tests/helpers/game/run_battlecry";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";

const LEGUME_CARD_ID = 121;
const NOUVELLE_RECRUE_CARD_ID = 181;

test.group("hand_card_operations", () => {
    test("addCardsToHand appends copies to hand", ({ assert }) => {
        const existing = createMinionCard({ uuid: "existing", cardId: 1 });
        const player = createGamePlayer(1, { deckCards: [], hand: [existing] });

        addCardsToHand(player, LEGUME_CARD_ID, 2);

        assert.equal(player.hand.length, 3);
        assert.equal(player.hand[0]!.uuid, "existing");
        assert.equal(player.hand[1]!.cardId, LEGUME_CARD_ID);
        assert.equal(player.hand[2]!.cardId, LEGUME_CARD_ID);
        assert.notEqual(player.hand[1]!.uuid, player.hand[2]!.uuid);
    });

    test("addCardsToHand ignores unknown cardId at runtime", ({ assert }) => {
        const player = createGamePlayer(1, { deckCards: [], hand: [] });

        const added = addCardsToHand(player, 999999, 2);

        assert.equal(added, 0);
        assert.equal(player.hand.length, 0);
    });

    test("addCardsToHand overdraws when hand is full", ({ assert }) => {
        const hand = Array.from({ length: MAX_HAND_SIZE }, (_, index) =>
            createMinionCard({ uuid: `hand-${index}` }),
        );
        const player = createGamePlayer(1, { deckCards: [], hand });

        const added = addCardsToHand(player, LEGUME_CARD_ID, 1);

        assert.equal(added, 0);
        assert.equal(player.hand.length, MAX_HAND_SIZE);
    });

    test("addCardsToHand marks golden when target owns golden of that card", ({ assert }) => {
        const template = getCardPreviewById(NOUVELLE_RECRUE_CARD_ID)!;
        assert.isTrue(Boolean(template.goldenVideoUrl));

        const player = createGamePlayer(1, {
            deckCards: [],
            hand: [],
            ownedGoldenCardIds: [NOUVELLE_RECRUE_CARD_ID],
        });

        addCardsToHand(player, NOUVELLE_RECRUE_CARD_ID, 1);

        assert.equal(player.hand.length, 1);
        assert.isTrue(player.hand[0]!.isGolden);
    });
});

test.group("hand_card battlecry", () => {
    test("ADD battlecry adds copies to allied hand", ({ assert }) => {
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "HAND_CARD",
                    handTargetTeam: "PLAYER",
                    cardId: LEGUME_CARD_ID,
                    copyCount: 2,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [] },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.hand.length, 2);
        assert.equal(
            game.data.playerOne.hand.filter((card) => card.cardId === LEGUME_CARD_ID).length,
            2,
        );
        assert.equal(game.data.playerTwo.hand.length, 0);
    });

    test("ADD battlecry targets opponent hand", ({ assert }) => {
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "HAND_CARD",
                    handTargetTeam: "OPPONENT",
                    cardId: LEGUME_CARD_ID,
                    copyCount: 1,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [] },
                playerTwo: { hand: [] },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.hand.length, 0);
        assert.equal(game.data.playerTwo.hand.length, 1);
        assert.equal(game.data.playerTwo.hand[0]!.cardId, LEGUME_CARD_ID);
    });

    test("ADD battlecry with ALL targets both hands", ({ assert }) => {
        const handCard = createMinionCard({
            battlecryActions: [
                createCardActionSnapshot({
                    type: "HAND_CARD",
                    handTargetTeam: "ALL",
                    cardId: LEGUME_CARD_ID,
                    copyCount: 1,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], deckCards: [] },
                playerTwo: { hand: [] },
            }),
            handCard,
        );

        assert.equal(
            game.data.playerOne.hand.filter((card) => card.cardId === LEGUME_CARD_ID).length,
            1,
        );
        assert.equal(
            game.data.playerTwo.hand.filter((card) => card.cardId === LEGUME_CARD_ID).length,
            1,
        );
    });
});

test.group("hand_card spell", () => {
    test("ADD spell effect adds non-collectible card to hand", ({ assert }) => {
        const spell = createSpellCard({
            spellActions: [
                createCardActionSnapshot({
                    type: "HAND_CARD",
                    handTargetTeam: "PLAYER",
                    cardId: LEGUME_CARD_ID,
                    copyCount: 2,
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: { hand: [spell], deckCards: [] },
            }),
            spell,
        );

        assert.equal(
            game.data.playerOne.hand.filter((card) => card.cardId === LEGUME_CARD_ID).length,
            2,
        );
        assert.equal(
            game.data.playerOne.hand.find((card) => card.cardId === LEGUME_CARD_ID)!.label,
            "Légume",
        );
    });
});
