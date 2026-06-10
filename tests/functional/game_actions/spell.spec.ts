import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { CARD_IDS, createGameData, createSpellCard } from "#tests/helpers/game/fixtures";
import { assertPlayCardScenario, runPlayCard } from "#tests/helpers/game/run_play_card";

test.group("game:play_spell", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("applies spellPower bonus to spell damage", async ({ assert }) => {
        const spell = createSpellCard({ cost: 2 });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    spellPower: 2,
                    hand: [spell],
                },
                playerTwo: {
                    health: DEFAULT_HERO_HEALTH,
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 5);
    });
});
