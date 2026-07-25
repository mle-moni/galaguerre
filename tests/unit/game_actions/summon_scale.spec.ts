import { countBoardMinionsOnBoard } from "#api_types/board";
import { test } from "@japa/runner";
import { getBattlecryDescription } from "#api_types/minion_card_description";
import { summonCardIdPerOpponentDeckCard } from "#database/seed_data/cards/define_card";
import {
    CARD_IDS,
    createGameData,
    createMinionCard,
    createSpellCard,
} from "#tests/helpers/game/fixtures";
import { runBattlecry } from "#tests/helpers/game/run_battlecry";

const BUG_RETARDEMENT_CARD_ID = 185;
const BUG_EXPLOSIF_CARD_ID = 186;

const createScaledSummonBattlecryCard = () =>
    createMinionCard({
        uuid: CARD_IDS.handMinion,
        cost: 7,
        battlecryActions: [
            summonCardIdPerOpponentDeckCard(BUG_EXPLOSIF_CARD_ID, BUG_RETARDEMENT_CARD_ID),
        ],
    });

const createBugRetardementDeckCard = (uuid: string) =>
    createSpellCard({
        uuid,
        cardId: BUG_RETARDEMENT_CARD_ID,
        cost: 0,
        castsWhenDrawn: true,
    });

test.group("Scaled summon battlecry", () => {
    test("summons nothing when opponent deck has no matching cards", ({ assert }) => {
        const handCard = createScaledSummonBattlecryCard();

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], board: [] },
                playerTwo: { deckCards: [] },
            }),
            handCard,
        );

        assert.equal(countBoardMinionsOnBoard(game.data.playerOne.board), 1);
        assert.equal(countBoardMinionsOnBoard(game.data.playerTwo.board), 0);
    });

    test("summons one token per matching card in opponent deck", ({ assert }) => {
        const handCard = createScaledSummonBattlecryCard();

        const { game } = runBattlecry(
            createGameData({
                playerOne: { hand: [handCard], board: [] },
                playerTwo: {
                    deckCards: [
                        createBugRetardementDeckCard("bug-1"),
                        createBugRetardementDeckCard("bug-2"),
                    ],
                },
            }),
            handCard,
        );

        assert.equal(countBoardMinionsOnBoard(game.data.playerOne.board), 3);
        const summonedMinions = game.data.playerOne.board.slice(1);
        assert.isTrue(
            summonedMinions.every((minion) => minion.originalCard.cardId === BUG_EXPLOSIF_CARD_ID),
        );
    });

    test("generates scaled summon battlecry description", ({ assert }) => {
        const descriptions = getBattlecryDescription([
            summonCardIdPerOpponentDeckCard(BUG_EXPLOSIF_CARD_ID, BUG_RETARDEMENT_CARD_ID),
        ]);

        assert.deepEqual(descriptions, [
            "Cri de guerre : Invoquez un monstre Bug explosif sur votre plateau pour chaque Bug à retardement dans le deck adverse.",
        ]);
    });
});
