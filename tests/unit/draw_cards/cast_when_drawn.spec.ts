import { test } from "@japa/runner";
import type Game from "#models/game";
import { drawOneCard } from "../../../app/galaguerre/draw_cards.js";
import { MAX_HAND_SIZE } from "../../../app/galaguerre/game_rules.js";
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

const createGame = (data: ReturnType<typeof createGameData>) => ({ data }) as Game;

const createFullHand = (count = MAX_HAND_SIZE) =>
    Array.from({ length: count }, (_, index) =>
        createMinionCard({ uuid: `hand-card-${index}`, cardId: index + 1 }),
    );

const cwdDamageSpell = (overrides: Parameters<typeof createSpellCard>[0] = {}) =>
    createSpellCard({
        castsWhenDrawn: true,
        cost: 5,
        spellActions: [
            createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: false,
                damage: 3,
                target: createHeroTargetSnapshot("OPPONENT"),
            }),
        ],
        ...overrides,
    });

test.group("cast when drawn", () => {
    test("casts spell for free and draws replacement card", ({ assert }) => {
        const cwdSpell = cwdDamageSpell({ uuid: "cwd-spell" });
        const replacement = createMinionCard({ uuid: "replacement" });
        const data = createGameData({
            playerOne: {
                mana: 3,
                deckCards: [cwdSpell, replacement],
                hand: [],
            },
            playerTwo: { health: 20 },
        });
        const game = createGame(data);
        const player = game.data.playerOne;

        drawOneCard(player, null, game);

        assert.equal(player.mana, 3);
        assert.equal(game.data.playerTwo.health, 17);
        assert.equal(player.hand.length, 1);
        assert.equal(player.hand[0]!.uuid, "replacement");
        assert.equal(player.deckCards.length, 0);
        assert.equal(player.stats.cardsDrawn, 1);
        assert.isFalse(player.hand.some((card) => card.uuid === "cwd-spell"));
    });

    test("burns cast-when-drawn spell when hand is full without casting or replacement", ({
        assert,
    }) => {
        const cwdSpell = cwdDamageSpell({ uuid: "cwd-spell" });
        const data = createGameData({
            playerOne: {
                deckCards: [cwdSpell, createMinionCard({ uuid: "never-drawn" })],
                hand: createFullHand(),
            },
            playerTwo: { health: 20 },
        });
        const game = createGame(data);
        const player = game.data.playerOne;

        drawOneCard(player, null, game);

        assert.equal(player.hand.length, MAX_HAND_SIZE);
        assert.equal(game.data.playerTwo.health, 20);
        assert.equal(player.deckCards.length, 1);
        assert.equal(player.deckCards[0]!.uuid, "never-drawn");
        assert.equal(player.stats.cardsDrawn, 0);

        const overdrawEntry = game.data.actionLog.find((entry) => entry.type === "OVERDRAW");
        assert.exists(overdrawEntry);
        assert.equal(overdrawEntry!.card?.uuid, "cwd-spell");

        const castEntry = game.data.actionLog.find((entry) => entry.type === "CAST_WHEN_DRAWN");
        assert.isUndefined(castEntry);
    });

    test("chains consecutive cast-when-drawn spells", ({ assert }) => {
        const first = cwdDamageSpell({
            uuid: "cwd-1",
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 1,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const second = cwdDamageSpell({
            uuid: "cwd-2",
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 2,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const replacement = createMinionCard({ uuid: "replacement" });
        const data = createGameData({
            playerOne: {
                deckCards: [first, second, replacement],
                hand: [],
            },
            playerTwo: { health: 20 },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        assert.equal(game.data.playerTwo.health, 17);
        assert.equal(game.data.playerOne.hand.length, 1);
        assert.equal(game.data.playerOne.hand[0]!.uuid, "replacement");
        assert.equal(game.data.playerOne.stats.cardsDrawn, 1);
    });

    test("picks a random valid target for targeted cast-when-drawn spell", ({ assert }) => {
        const boardMinion = createMinionCard({ uuid: "target-minion", health: 5 });
        const cwdSpell = createSpellCard({
            uuid: "cwd-targeted",
            castsWhenDrawn: true,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: true,
                    damage: 2,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const replacement = createMinionCard({ uuid: "replacement" });
        const data = createGameData({
            playerOne: {
                deckCards: [cwdSpell, replacement],
                hand: [],
            },
            playerTwo: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(boardMinion)),
            },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        assert.equal(game.data.playerTwo.board[0]!.health, 3);
        assert.equal(game.data.playerOne.hand[0]!.uuid, "replacement");
    });

    test("fizzles targeted effects with no valid target but still draws replacement", ({
        assert,
    }) => {
        const cwdSpell = createSpellCard({
            uuid: "cwd-fizzle",
            castsWhenDrawn: true,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: true,
                    damage: 5,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const replacement = createMinionCard({ uuid: "replacement" });
        const data = createGameData({
            playerOne: {
                deckCards: [cwdSpell, replacement],
                hand: [],
            },
            playerTwo: { board: createEmptyBoard() },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        assert.equal(game.data.playerTwo.health, 30);
        assert.equal(game.data.playerOne.hand[0]!.uuid, "replacement");

        const castEntry = game.data.actionLog.find((entry) => entry.type === "CAST_WHEN_DRAWN");
        assert.exists(castEntry);
    });

    test("DRAW passive triggers on replacement draw only", ({ assert }) => {
        const cwdSpell = cwdDamageSpell({ uuid: "cwd-spell" });
        const replacement = createMinionCard({ uuid: "replacement" });
        const passiveMinion = createMinionCard({
            uuid: "passive-minion",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "DRAW",
                    action: createCardActionSnapshot({
                        type: "DAMAGE",
                        damage: 2,
                        target: createHeroTargetSnapshot("OPPONENT"),
                    }),
                }),
            ],
        });
        const data = createGameData({
            state: "PLAYER_ONE_TURN",
            playerOne: {
                board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                deckCards: [cwdSpell, replacement],
                hand: [],
            },
            playerTwo: { health: 20 },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        assert.equal(game.data.playerTwo.health, 15);
    });

    test("PLAY_CARD passive triggers when cast-when-drawn spell resolves", ({ assert }) => {
        const cwdSpell = cwdDamageSpell({ uuid: "cwd-spell" });
        const replacement = createMinionCard({ uuid: "replacement" });
        const passiveMinion = createMinionCard({
            uuid: "pyromancer",
            passives: [
                createPassiveSnapshot({
                    type: "ACTION",
                    triggersOn: "PLAY_CARD",
                    playCardFilter: createCardFilterSnapshot({ type: "SPELL" }),
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
                board: placeMinion(createEmptyBoard(), 0, createMinionState(passiveMinion)),
                deckCards: [cwdSpell, replacement],
                hand: [],
            },
            playerTwo: { health: 20 },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        assert.equal(game.data.playerTwo.health, 16);
    });

    test("does not draw replacement when cast-when-drawn ends the game", ({ assert }) => {
        const cwdSpell = cwdDamageSpell({
            uuid: "cwd-lethal",
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 5,
                    target: createHeroTargetSnapshot("OPPONENT"),
                }),
            ],
        });
        const replacement = createMinionCard({ uuid: "replacement" });
        const data = createGameData({
            playerOne: {
                deckCards: [cwdSpell, replacement],
                hand: [],
            },
            playerTwo: { health: 5 },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        assert.equal(game.data.playerTwo.health, 0);
        assert.equal(game.data.playerOne.hand.length, 0);
        assert.equal(game.data.playerOne.stats.cardsDrawn, 0);
    });

    test("applies spell power to cast-when-drawn damage", ({ assert }) => {
        const cwdSpell = cwdDamageSpell({ uuid: "cwd-spell" });
        const replacement = createMinionCard({ uuid: "replacement" });
        const data = createGameData({
            playerOne: {
                spellPower: 2,
                deckCards: [cwdSpell, replacement],
                hand: [],
            },
            playerTwo: { health: 20 },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        assert.equal(game.data.playerTwo.health, 15);
    });

    test("records CAST_WHEN_DRAWN in action log", ({ assert }) => {
        const cwdSpell = cwdDamageSpell({ uuid: "cwd-spell", label: "Éclair pioché" });
        const replacement = createMinionCard({ uuid: "replacement" });
        const data = createGameData({
            playerOne: {
                deckCards: [cwdSpell, replacement],
                hand: [],
            },
            playerTwo: { health: 20 },
        });
        const game = createGame(data);

        drawOneCard(game.data.playerOne, null, game);

        const castEntry = game.data.actionLog.find((entry) => entry.type === "CAST_WHEN_DRAWN");
        assert.exists(castEntry);
        assert.equal(castEntry!.card?.uuid, "cwd-spell");
        assert.equal(castEntry!.card?.label, "Éclair pioché");
    });
});
