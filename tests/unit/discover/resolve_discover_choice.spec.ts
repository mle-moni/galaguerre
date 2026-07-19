import { test } from "@japa/runner";
import {
    CARD_IDS,
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createGameData,
    createMinionCard,
} from "#tests/helpers/game/fixtures";
import { runBattlecry } from "#tests/helpers/game/run_battlecry";
import { resolveDiscoverChoice } from "#galaguerre/discover/resolve_discover_choice";

test.group("resolve_discover_choice", () => {
    test("adds chosen card to hand with generatedBy metadata", ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cardId: 80,
            label: "Source Card",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DISCOVER",
                    discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                    optionCount: 3,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
            }),
            handCard,
        );

        const pending = game.data.pendingDiscover;
        assert.isDefined(pending);
        assert.equal(pending!.playerUserId, game.data.playerOne.userId);
        assert.lengthOf(pending!.options, 3);

        const chosenUuid = pending!.options[0]!.uuid;
        const { gameEnded, discoverPending } = resolveDiscoverChoice(
            game,
            game.data.playerOne,
            chosenUuid,
        );

        assert.isFalse(gameEnded);
        assert.isFalse(discoverPending);
        assert.isUndefined(game.data.pendingDiscover);
        assert.lengthOf(game.data.playerOne.hand, 1);

        const addedCard = game.data.playerOne.hand[0]!;
        assert.equal(addedCard.uuid, chosenUuid);
        assert.deepEqual(addedCard.generatedBy, {
            cardId: handCard.cardId,
            label: handCard.label,
        });
    });

    test("preserves isGolden on chosen discover option", ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cardId: 80,
            label: "Source Card",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DISCOVER",
                    discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                    optionCount: 3,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
            }),
            handCard,
        );

        const pending = game.data.pendingDiscover;
        assert.isDefined(pending);

        const goldenOption = {
            ...pending!.options[0]!,
            isGolden: true,
            goldenVideoUrl: "/card-videos/test.mp4",
        };
        game.data.pendingDiscover = {
            ...pending!,
            options: [goldenOption, ...pending!.options.slice(1)],
        };

        resolveDiscoverChoice(game, game.data.playerOne, goldenOption.uuid);

        const addedCard = game.data.playerOne.hand[0]!;
        assert.isTrue(addedCard.isGolden);
    });

    test("resumes remaining battlecry actions after discover", ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cardId: 80,
            label: "Source Card",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DISCOVER",
                    discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                    optionCount: 3,
                }),
                createCardActionSnapshot({
                    type: "DRAW",
                    drawCount: 1,
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                mana: 10,
                hand: [handCard],
                deckCards: [createMinionCard({ uuid: "deck-1", cardId: 2, label: "Deck Card" })],
            },
        });

        const { game } = runBattlecry(data, handCard);
        const pending = game.data.pendingDiscover;
        assert.isDefined(pending);

        resolveDiscoverChoice(game, game.data.playerOne, pending!.options[0]!.uuid);

        assert.lengthOf(game.data.playerOne.hand, 2);
        assert.isTrue(game.data.playerOne.hand.some((card) => card.uuid === "deck-1"));
    });
});
