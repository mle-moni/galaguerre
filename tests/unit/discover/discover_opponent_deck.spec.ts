import { test } from "@japa/runner";
import { formatActionDescription } from "#api_types/format_action_description";
import {
    CARD_IDS,
    createCardActionSnapshot,
    createGameData,
    createGamePlayer,
    createMinionCard,
} from "#tests/helpers/game/fixtures";
import { runBattlecry } from "#tests/helpers/game/run_battlecry";
import { generateOpponentDeckDiscoverOptions } from "#galaguerre/discover/generate_opponent_deck_discover_options";
import { resolveDiscoverChoice } from "#galaguerre/discover/resolve_discover_choice";

test.group("discover opponent deck", () => {
    test("generateOpponentDeckDiscoverOptions returns up to optionCount deck cards", ({
        assert,
    }) => {
        const opponent = createGamePlayer(2, {
            deckCards: [
                createMinionCard({ uuid: "deck-1", cardId: 62, label: "Card 1" }),
                createMinionCard({ uuid: "deck-2", cardId: 63, label: "Card 2" }),
                createMinionCard({ uuid: "deck-3", cardId: 64, label: "Card 3" }),
                createMinionCard({ uuid: "deck-4", cardId: 65, label: "Card 4" }),
            ],
        });

        const options = generateOpponentDeckDiscoverOptions(opponent, 3);

        assert.lengthOf(options, 3);
        assert.isTrue(
            options.every((option) => opponent.deckCards.some((card) => card.uuid === option.uuid)),
        );
    });

    test("generateOpponentDeckDiscoverOptions returns fewer options when deck is smaller", ({
        assert,
    }) => {
        const opponent = createGamePlayer(2, {
            deckCards: [createMinionCard({ uuid: "deck-1", cardId: 62, label: "Card 1" })],
        });

        const options = generateOpponentDeckDiscoverOptions(opponent, 3);

        assert.lengthOf(options, 1);
        assert.equal(options[0]!.uuid, "deck-1");
    });

    test("empty opponent deck does not start discover", ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cardId: 192,
            label: "Spécialiste OSINT",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DISCOVER",
                    discoverSource: "OPPONENT_DECK",
                    enemyDrawsChosenCard: true,
                    discoverCardFilter: null,
                    optionCount: 3,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: { deckCards: [] },
            }),
            handCard,
        );

        assert.isUndefined(game.data.pendingDiscover);
    });

    test("resolveDiscoverChoice gives player a copy and draws chosen card for opponent", ({
        assert,
    }) => {
        const chosenDeckCard = createMinionCard({
            uuid: "opponent-deck-chosen",
            cardId: 62,
            label: "Stagiaire Dev",
        });
        const otherDeckCard = createMinionCard({
            uuid: "opponent-deck-other",
            cardId: 63,
            label: "Dev Front-End",
        });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cardId: 192,
            label: "Spécialiste OSINT",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DISCOVER",
                    discoverSource: "OPPONENT_DECK",
                    enemyDrawsChosenCard: true,
                    discoverCardFilter: null,
                    optionCount: 3,
                }),
            ],
        });

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    deckCards: [chosenDeckCard, otherDeckCard],
                },
            }),
            handCard,
        );

        const pending = game.data.pendingDiscover;
        assert.isDefined(pending);
        assert.equal(pending!.discoverSource, "OPPONENT_DECK");
        assert.isTrue(pending!.enemyDrawsChosenCard);
        assert.equal(pending!.opponentUserId, game.data.playerTwo.userId);

        const chosenOption = pending!.options.find((option) => option.uuid === chosenDeckCard.uuid);
        assert.isDefined(chosenOption);

        resolveDiscoverChoice(game, game.data.playerOne, chosenOption!.uuid);

        assert.lengthOf(game.data.playerOne.hand, 1);
        const addedCard = game.data.playerOne.hand[0]!;
        assert.equal(addedCard.cardId, chosenDeckCard.cardId);
        assert.notEqual(addedCard.uuid, chosenDeckCard.uuid);
        assert.deepEqual(addedCard.generatedBy, {
            cardId: handCard.cardId,
            label: handCard.label,
        });

        assert.isFalse(
            game.data.playerTwo.deckCards.some((card) => card.uuid === chosenDeckCard.uuid),
        );
        assert.isTrue(game.data.playerTwo.hand.some((card) => card.uuid === chosenDeckCard.uuid));
        assert.isTrue(
            game.data.playerTwo.deckCards.some((card) => card.uuid === otherDeckCard.uuid),
        );
    });

    test("resolveDiscoverChoice burns chosen card when opponent hand is full", ({ assert }) => {
        const chosenDeckCard = createMinionCard({
            uuid: "opponent-deck-chosen",
            cardId: 62,
            label: "Stagiaire Dev",
        });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cardId: 192,
            label: "Spécialiste OSINT",
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DISCOVER",
                    discoverSource: "OPPONENT_DECK",
                    enemyDrawsChosenCard: true,
                    discoverCardFilter: null,
                    optionCount: 3,
                }),
            ],
        });

        const fullHand = Array.from({ length: 10 }, (_, index) =>
            createMinionCard({ uuid: `hand-${index}`, cardId: 70 + index, label: `Hand ${index}` }),
        );

        const { game } = runBattlecry(
            createGameData({
                playerOne: { mana: 10, hand: [handCard] },
                playerTwo: {
                    hand: fullHand,
                    deckCards: [chosenDeckCard],
                },
            }),
            handCard,
        );

        const pending = game.data.pendingDiscover;
        assert.isDefined(pending);

        resolveDiscoverChoice(game, game.data.playerOne, pending!.options[0]!.uuid);

        assert.lengthOf(game.data.playerTwo.hand, 10);
        assert.isFalse(game.data.playerTwo.hand.some((card) => card.uuid === chosenDeckCard.uuid));
        assert.isFalse(
            game.data.playerTwo.deckCards.some((card) => card.uuid === chosenDeckCard.uuid),
        );
    });

    test("formats opponent deck discover description", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DISCOVER",
            discoverSource: "OPPONENT_DECK",
            enemyDrawsChosenCard: true,
            discoverCardFilter: null,
            optionCount: 3,
        });

        assert.equal(
            formatActionDescription(action, "Cri de guerre"),
            "Cri de guerre : Découvrez une carte du deck de votre adversaire, votre adversaire la pioche également.",
        );
    });
});
