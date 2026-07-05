import { test } from "@japa/runner";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createGameData,
    createSpellCard,
} from "#tests/helpers/game/fixtures";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";
import {
    autoResolveAllPendingDiscovers,
    autoResolvePendingDiscover,
} from "#galaguerre/discover/resolve_discover_choice";

const createDoubleDiscoverSpell = () =>
    createSpellCard({
        uuid: "double-discover-spell",
        cardId: 153,
        label: "Zoothérapie",
        cost: 3,
        spellActions: [
            createCardActionSnapshot({
                type: "DISCOVER",
                discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                optionCount: 3,
            }),
            createCardActionSnapshot({
                type: "DISCOVER",
                discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                optionCount: 3,
            }),
        ],
    });

test.group("auto_resolve_pending_discover", () => {
    test("resolves a single discover with a random choice", ({ assert }) => {
        const spell = createSpellCard({
            spellActions: [
                createCardActionSnapshot({
                    type: "DISCOVER",
                    discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                    optionCount: 3,
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: { mana: 10, hand: [spell] },
            }),
            spell,
        );

        assert.isDefined(game.data.pendingDiscover);

        const { gameEnded, discoverPending } = autoResolvePendingDiscover(game);

        assert.isFalse(gameEnded);
        assert.isFalse(discoverPending);
        assert.isUndefined(game.data.pendingDiscover);
        assert.lengthOf(game.data.playerOne.hand, 2);
    });

    test("fully resolves a double discover when called twice", ({ assert }) => {
        const spell = createDoubleDiscoverSpell();

        const { game } = runSpellEffect(
            createGameData({
                playerOne: { mana: 10, hand: [spell] },
            }),
            spell,
        );

        autoResolvePendingDiscover(game);
        autoResolvePendingDiscover(game);

        assert.isUndefined(game.data.pendingDiscover);
        assert.lengthOf(game.data.playerOne.hand, 3);
    });

    test("resolves all discovers in a double discover chain", ({ assert }) => {
        const spell = createDoubleDiscoverSpell();

        const { game } = runSpellEffect(
            createGameData({
                playerOne: { mana: 10, hand: [spell] },
            }),
            spell,
        );

        assert.isDefined(game.data.pendingDiscover);

        const { gameEnded } = autoResolveAllPendingDiscovers(game);

        assert.isFalse(gameEnded);
        assert.isUndefined(game.data.pendingDiscover);
        assert.lengthOf(game.data.playerOne.hand, 3);
    });
});
