import { test } from "@japa/runner";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createGameData,
} from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { hideGameDataForUser } from "#shared/narrative/filter_presentation_for_user";
import { ensureNoPendingDiscover } from "#controllers/games/discover/ensure_no_pending_discover";
import { formatActionDescription } from "#api_types/format_action_description";

test.group("discover guards", () => {
    test("ensureNoPendingDiscover blocks non-discovering player", ({ assert }) => {
        const game = createInMemoryGame(createGameData());
        game.data.pendingDiscover = {
            playerUserId: game.data.playerTwo.userId,
            sourceCardId: 1,
            sourceCardLabel: "Source",
            sourceCardUuid: "source-uuid",
            options: [],
            continuation: {
                remainingActions: [],
                context: {
                    effectKind: "SPELL",
                    damageBonus: 0,
                },
            },
        };

        const allowed = ensureNoPendingDiscover(game, "socket-1", game.data.playerOne.userId);
        assert.isFalse(allowed);
    });

    test("getApiJson hides discover options for opponent", ({ assert }) => {
        const game = createInMemoryGame(createGameData());
        const visibleOption = createCardActionSnapshot({
            type: "DISCOVER",
            discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
        });

        game.data.pendingDiscover = {
            playerUserId: game.data.playerOne.userId,
            sourceCardId: 1,
            sourceCardLabel: "Source",
            sourceCardUuid: "source-uuid",
            options: [
                {
                    uuid: "option-1",
                    cardId: 2,
                    label: "Visible To P1",
                    imageUrl: "https://example.com/card.png",
                    goldenVideoUrl: null,
                    isGolden: false,
                    baseCost: 1,
                    cost: 1,
                    dynamicCost: null,
                    tags: [],
                    labelTags: [],
                    rarity: "COMMON",
                    type: "MINION",
                    attack: 1,
                    health: 1,
                    minionPowers: {
                        hasTaunt: false,
                        hasCharge: false,
                        hasWindfury: false,
                        isPoisonous: false,
                        hasStealth: false,
                        hasDivineShield: false,
                    },
                    effects: [],
                    description: "",
                    battlecryActions: [],
                    comboActions: [],
                    deathrattleActions: [],
                    attackActions: [],
                    passives: [],
                },
            ],
            continuation: {
                remainingActions: [visibleOption],
                context: {
                    effectKind: "SPELL",
                    damageBonus: 0,
                },
            },
        };

        const forDiscoverer = hideGameDataForUser(game.data, game.data.playerOne.userId);
        const forOpponent = hideGameDataForUser(game.data, game.data.playerTwo.userId);

        assert.equal(forDiscoverer.pendingDiscover?.options[0]?.label, "Visible To P1");
        assert.equal(forOpponent.pendingDiscover?.options[0]?.label, "dummy card");
    });

    test("formatActionDescription formats DISCOVER actions", ({ assert }) => {
        const description = formatActionDescription(
            createCardActionSnapshot({
                type: "DISCOVER",
                discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                optionCount: 3,
            }),
            "Cri de guerre",
        );

        assert.equal(description, "Cri de guerre : Découvrez un monstre.");
    });

    test("formatActionDescription formats DISCOVER actions with rarity filter", ({ assert }) => {
        const description = formatActionDescription(
            createCardActionSnapshot({
                type: "DISCOVER",
                discoverCardFilter: createCardFilterSnapshot({
                    type: "MINION",
                    rarity: "LEGENDARY",
                }),
                optionCount: 3,
            }),
            "Cri de guerre",
        );

        assert.equal(description, "Cri de guerre : Découvrez un monstre légendaire.");
    });
});
