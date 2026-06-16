import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import type Game from "#models/game";
import { getMinionCardTemplateById } from "#galaguerre/card_catalog";
import { triggerPlayCardPassives } from "../../../app/galaguerre/passive_engine/trigger_play_card_passives.js";
import { triggerSummonPassives } from "../../../app/galaguerre/passive_engine/trigger_summon_passives.js";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createEmptyBoard,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardSpot, assertPlayerHealth } from "#tests/helpers/game/assertions";
import { runPlayMinion, runPlaySpell } from "#tests/helpers/game/run_play_minion";

const createGame = (data: ReturnType<typeof createGameData>) => ({ data }) as Game;

const spellPlayCardFilter = createCardFilterSnapshot({ type: "SPELL" });
const minionSummonFilter = createCardFilterSnapshot({ type: "MINION" });

test.group("passive PLAY_CARD triggers", () => {
    test("SPELL filter deals damage to all minions after a spell is played (Pyromancer)", ({
        assert,
    }) => {
        const passiveMinion = createMinionCard({
            uuid: "pyromancer",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "PLAY_CARD",
                    playCardFilter: spellPlayCardFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createMinionTargetSnapshot("ALL"),
                    }),
                }),
            ],
        });
        const boardMinion = createMinionCard({ uuid: "board-minion", health: 3 });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
            },
            playerTwo: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(boardMinion)),
            },
        });

        const game = createGame(data);
        const spell = createSpellCard({ uuid: "fireball", cost: 0 });

        triggerPlayCardPassives(game, game.data.playerOne, spell);

        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { health: 2 });
    });

    test("MINION PLAY_CARD filter does not trigger on minion summon (uses SUMMON trigger instead)", ({
        assert,
    }) => {
        const passiveMinion = createMinionCard({
            uuid: "knife-juggler",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "PLAY_CARD",
                    playCardFilter: minionSummonFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        triggerSummonPassives(
            game,
            game.data.playerOne,
            createMinionCard({ uuid: "summoned-minion", cost: 1 }),
        );

        assertPlayerHealth(assert, game, "playerTwo", 15);
    });

    test("MINION PLAY_CARD filter does not trigger when a spell is played", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "knife-juggler",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "PLAY_CARD",
                    playCardFilter: minionSummonFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        triggerPlayCardPassives(game, game.data.playerOne, createSpellCard({ cost: 0 }));

        assertPlayerHealth(assert, game, "playerTwo", 15);
    });

    test("SPELL filter does not trigger when a minion is played", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "pyromancer",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "PLAY_CARD",
                    playCardFilter: spellPlayCardFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        triggerPlayCardPassives(
            game,
            game.data.playerOne,
            createMinionCard({ uuid: "played-minion", cost: 1 }),
        );

        assertPlayerHealth(assert, game, "playerTwo", 15);
    });

    test("opponent passive does not trigger when the other player plays a card", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "opponent-passive",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "PLAY_CARD",
                    playCardFilter: null,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: { health: 15 },
            playerTwo: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
            },
        });

        const game = createGame(data);
        triggerPlayCardPassives(
            game,
            game.data.playerOne,
            createMinionCard({ uuid: "played-minion", cost: 1 }),
        );

        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("null playCardFilter triggers on spell plays", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "generic-watcher",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "PLAY_CARD",
                    playCardFilter: null,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const baseData = {
            playerOne: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(passiveMinion)),
            },
            playerTwo: { health: 15 },
        };

        const gameAfterSpell = createGame(createGameData(baseData));
        triggerPlayCardPassives(
            gameAfterSpell,
            gameAfterSpell.data.playerOne,
            createSpellCard({ cost: 0 }),
        );
        assertPlayerHealth(assert, gameAfterSpell, "playerTwo", 14);
    });

    test("silenced minion SUMMON passive does not trigger", ({ assert }) => {
        const passiveMinion = createMinionCard({
            uuid: "silenced-watcher",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "SUMMON",
                    summonFilter: null,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", {
                    ...createMinionState(passiveMinion),
                    isSilenced: true,
                }),
            },
            playerTwo: { health: 15 },
        });

        const game = createGame(data);
        triggerSummonPassives(
            game,
            game.data.playerOne,
            createMinionCard({ uuid: "summoned-minion", cost: 1 }),
        );

        assertPlayerHealth(assert, game, "playerTwo", 15);
    });

    test("Alternant Surmotivé gains +1 attack when a spell is played", ({ assert }) => {
        const alternantTemplate = getMinionCardTemplateById(117)!;
        const alternant = { ...alternantTemplate, uuid: "alternant-surmotive" };

        const data = createGameData({
            playerOne: {
                board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(alternant)),
            },
        });

        const game = createGame(data);
        triggerPlayCardPassives(game, game.data.playerOne, createSpellCard({ cost: 0 }));

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { attack: 2 });
    });

    test("Alternant Surmotivé gains +1 attack through playSpell flow", async ({ assert }) => {
        const alternantTemplate = getMinionCardTemplateById(117)!;
        const alternant = { ...alternantTemplate, uuid: "alternant-surmotive" };
        const spell = createSpellCard({ uuid: "test-spell", cost: 0 });

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(alternant)),
                },
            }),
            spell,
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_1", { attack: 2 });
    });

    test("SUMMON passive does not trigger on self when played from hand", async ({ assert }) => {
        const officeManagerTemplate = getMinionCardTemplateById(116)!;
        const officeManager = { ...officeManagerTemplate, uuid: "office-manager-devoue" };

        const { game } = await runPlayMinion(
            createGameData({
                playerOne: {
                    mana: 10,
                    health: 10,
                    hand: [officeManager],
                },
            }),
            officeManager,
            { spotId: "SPOT_1" },
        );

        assertPlayerHealth(assert, game, "playerOne", 10);
    });

    test("SUMMON passive triggers on the next minion played", async ({ assert }) => {
        const officeManagerTemplate = getMinionCardTemplateById(116)!;
        const officeManager = { ...officeManagerTemplate, uuid: "office-manager-devoue" };
        const playedMinion = createMinionCard({ uuid: "played-minion", cost: 1 });

        const { game } = await runPlayMinion(
            createGameData({
                playerOne: {
                    mana: 10,
                    health: 10,
                    hand: [playedMinion],
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_2",
                        createMinionState(officeManager),
                    ),
                },
            }),
            playedMinion,
            { spotId: "SPOT_1" },
        );

        assertPlayerHealth(assert, game, "playerOne", 12);
    });

    test("Alternant Surmotivé does not gain attack when a minion is played", async ({ assert }) => {
        const alternantTemplate = getMinionCardTemplateById(117)!;
        const alternant = { ...alternantTemplate, uuid: "alternant-surmotive" };
        const playedMinion = createMinionCard({ uuid: "played-minion", cost: 1 });

        const { game } = await runPlayMinion(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [playedMinion],
                    board: placeMinion(createEmptyBoard(), "SPOT_2", createMinionState(alternant)),
                },
            }),
            playedMinion,
            { spotId: "SPOT_1" },
        );

        assertBoardSpot(assert, game, "playerOne", "SPOT_2", { attack: 1 });
    });

    test("triggers after spell effect when playing a spell", async ({ assert }) => {
        const watcher = createMinionCard({
            uuid: "pyromancer",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "PLAY_CARD",
                    playCardFilter: spellPlayCardFilter,
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 1,
                        target: createMinionTargetSnapshot("ALL"),
                    }),
                }),
            ],
        });
        const boardMinion = createMinionCard({ uuid: "enemy-minion", health: 3 });
        const spell = createSpellCard({
            uuid: "fireball",
            cost: 0,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    damage: 2,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    board: placeMinion(createEmptyBoard(), "SPOT_1", createMinionState(watcher)),
                },
                playerTwo: {
                    health: 20,
                    board: placeMinion(
                        createEmptyBoard(),
                        "SPOT_1",
                        createMinionState(boardMinion),
                    ),
                },
            }),
            spell,
        );

        assertPlayerHealth(assert, game, "playerTwo", 18);
        assertBoardSpot(assert, game, "playerTwo", "SPOT_1", { health: 2 });
    });
});
