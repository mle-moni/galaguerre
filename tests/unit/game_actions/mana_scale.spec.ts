import { test } from "@japa/runner";
import { getBattlecryDescription } from "#api_types/minion_card_description";
import { manaTemporaryChangePerOpponentMinionAction } from "#database/seed_data/cards/define_card";
import {
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    CARD_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { runBattlecry } from "#tests/helpers/game/run_battlecry";

const createScaledManaBattlecryCard = (amountPer = 1) =>
    createMinionCard({
        uuid: CARD_IDS.handMinion,
        cost: 2,
        battlecryActions: [
            createCardActionSnapshot({
                type: "MANA",
                amount: amountPer,
                amountScale: { source: "OPPONENT_MINION_COUNT", amountPer },
            }),
        ],
    });

const placeOpponentMinions = (count: number) => {
    let board = createEmptyBoard();

    for (let index = 0; index < count; index++) {
        board = placeMinion(
            board,
            index,
            createMinionState(createMinionCard({ uuid: `enemy-minion-${index}` })),
        );
    }

    return board;
};

test.group("Scaled mana battlecry", () => {
    test("grants no mana when opponent board is empty", ({ assert }) => {
        const handCard = createScaledManaBattlecryCard();

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 5, hand: [handCard] },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.mana, 5);
    });

    test("grants 1 mana per opponent minion", ({ assert }) => {
        const handCard = createScaledManaBattlecryCard();

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 5, hand: [handCard] },
                playerTwo: { board: placeOpponentMinions(3) },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.mana, 8);
    });

    test("scales mana gain by amountPer", ({ assert }) => {
        const handCard = createScaledManaBattlecryCard(2);

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 3, hand: [handCard] },
                playerTwo: { board: placeOpponentMinions(2) },
            }),
            handCard,
        );

        assert.equal(game.data.playerOne.mana, 7);
    });

    test("generates scaled mana battlecry description", ({ assert }) => {
        const descriptions = getBattlecryDescription([
            manaTemporaryChangePerOpponentMinionAction(1),
        ]);

        assert.deepEqual(descriptions, [
            "Cri de guerre : Ce tour-ci, gagnez 1 cristal de mana pour chaque monstre adverse.",
        ]);
    });

    test("generates plural scaled mana battlecry description", ({ assert }) => {
        const descriptions = getBattlecryDescription([
            manaTemporaryChangePerOpponentMinionAction(2),
        ]);

        assert.deepEqual(descriptions, [
            "Cri de guerre : Ce tour-ci, gagnez 2 cristaux de mana pour chaque monstre adverse.",
        ]);
    });
});
