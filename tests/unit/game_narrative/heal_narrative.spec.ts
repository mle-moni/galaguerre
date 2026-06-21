import type { SocketEventByKey } from "#api_types/socket_events";
import { test } from "@japa/runner";
import { applyHealToHero } from "#galaguerre/action_engine/apply_heal_with_passives";
import { buildPresentationForUser } from "#galaguerre/game_narrative/build_presentation_update";
import { createGameNarrativeRecorder } from "#galaguerre/game_narrative/game_narrative_recorder";
import { runWithNarrativeRecorder } from "#galaguerre/game_narrative/narrative_context";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { triggerPassives } from "#galaguerre/passive_engine/trigger_passives";
import { beginLoggedBeat, endCurrentBeat } from "#galaguerre/game_narrative/narrative_beats";
import {
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createPassiveSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { runPlayMinion } from "#tests/helpers/game/run_play_minion";
import {
    getEmittedEvents,
    installSocketCollector,
    restoreSocketCollector,
} from "#tests/helpers/game/socket_event_collector";

const happinessManagerLikeCard = () =>
    createMinionCard({
        uuid: "happiness-manager",
        cost: 2,
        battlecryActions: [
            createCardActionSnapshot({
                type: "HEAL",
                heal: 4,
                target: createHeroTargetSnapshot("PLAYER"),
            }),
        ],
    });

test.group("heal narrative", () => {
    test("records heal stat change on healed hero spot owner", async ({ assert }) => {
        const recorder = createGameNarrativeRecorder();
        const game = createInMemoryGame(
            createGameData({
                playerOne: { userId: 1, health: 10 },
                playerTwo: { userId: 2, health: 10 },
            }),
        );

        recorder.reset(game.data);
        recorder.beginBeat("TRIGGER");

        runWithNarrativeRecorder(recorder, () => {
            applyHealToHero(game, game.data.playerOne, 4, game.data.playerOne);
        });

        recorder.endBeat(game);

        const presentation = recorder.build(game, "update-1");
        assert.isNotNull(presentation);

        const healEffect = presentation!.beats[0]!.effects.find(
            (effect) => effect.type === "STAT_CHANGE",
        );
        assert.isDefined(healEffect);
        if (healEffect?.type !== "STAT_CHANGE") {
            throw new Error("Expected STAT_CHANGE effect");
        }

        assert.equal(healEffect.healthDelta, 4);
        assert.equal(healEffect.target.type, "HERO");
        assert.equal(healEffect.target.owner, "PLAYER");
    });

    test("remaps heal animation to own hero when player two is healed", async ({ assert }) => {
        const recorder = createGameNarrativeRecorder();
        const game = createInMemoryGame(
            createGameData({
                playerOne: { userId: 1, health: 10 },
                playerTwo: { userId: 2, health: 10 },
            }),
        );

        recorder.reset(game.data);
        recorder.beginBeat("TRIGGER");

        runWithNarrativeRecorder(recorder, () => {
            applyHealToHero(game, game.data.playerTwo, 4, game.data.playerTwo);
        });

        recorder.endBeat(game);

        const raw = recorder.build(game, "update-1");
        assert.isNotNull(raw);

        const rawHeal = raw!.beats[0]!.effects.find((effect) => effect.type === "STAT_CHANGE");
        assert.isDefined(rawHeal);
        if (rawHeal?.type !== "STAT_CHANGE") {
            throw new Error("Expected STAT_CHANGE effect");
        }
        assert.equal(rawHeal.target.owner, "OPPONENT");

        const forPlayerTwo = buildPresentationForUser(raw!, 2);
        const remappedHeal = forPlayerTwo.beats[0]!.effects.find(
            (effect) => effect.type === "STAT_CHANGE",
        );
        assert.isDefined(remappedHeal);
        if (remappedHeal?.type !== "STAT_CHANGE") {
            throw new Error("Expected STAT_CHANGE effect");
        }
        assert.equal(remappedHeal.target.owner, "PLAYER");
    });

    test("happiness manager battlecry heal targets own hero in presentation", async ({
        assert,
    }) => {
        const card = happinessManagerLikeCard();

        installSocketCollector();
        try {
            await runPlayMinion(
                createGameData({
                    isTraining: true,
                    playerOne: { userId: TRAINING_AI_USER_ID },
                    playerTwo: { userId: 2, mana: 10, health: 10, hand: [card] },
                }),
                card,
                { actor: "playerTwo" },
            );
        } finally {
            restoreSocketCollector();
        }

        const viewerUpdate = getEmittedEvents().find(
            (event) => event.event === "game:update" && event.rooms === "users:2",
        );
        assert.isDefined(viewerUpdate);

        const presentation = (viewerUpdate!.data as SocketEventByKey["game:update"]).presentation;
        assert.isDefined(presentation);

        const healEffect = presentation!.beats
            .flatMap((beat) => beat.effects)
            .find((effect) => effect.type === "STAT_CHANGE" && effect.healthDelta === 4);
        assert.isDefined(healEffect);
        if (healEffect?.type !== "STAT_CHANGE") {
            throw new Error("Expected STAT_CHANGE effect");
        }

        assert.equal(healEffect.target.type, "HERO");
        assert.equal(healEffect.target.owner, "PLAYER");
    });

    test("records TURN_END passive heal in pass turn presentation", async ({ assert }) => {
        const healerCard = createMinionCard({
            uuid: "healer",
            passives: [
                createPassiveSnapshot({
                    triggersOn: "TURN_END",
                    action: createCardActionSnapshot({
                        type: "HEAL",
                        heal: 2,
                        target: createMinionTargetSnapshot("PLAYER", { excludeSelf: true }),
                    }),
                }),
            ],
        });
        const allyCard = createMinionCard({ uuid: "ally", health: 3 });

        const recorder = createGameNarrativeRecorder();
        const game = createInMemoryGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: {
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(healerCard)),
                        1,
                        createMinionState(allyCard, { health: 1, maxHealth: 3 }),
                    ),
                },
            }),
        );

        recorder.reset(game.data);

        runWithNarrativeRecorder(recorder, () => {
            beginLoggedBeat(game, "PASS_TURN");
            triggerPassives(game, "TURN_END", game.data.playerOne);
            endCurrentBeat(game);
        });

        const presentation = recorder.build(game, "update-1");
        assert.isNotNull(presentation);

        const passTurnBeat = presentation!.beats.find((beat) => beat.kind === "PASS_TURN");
        assert.isDefined(passTurnBeat);

        const triggerEffect = passTurnBeat!.effects.find((effect) => effect.type === "TRIGGER");
        assert.isDefined(triggerEffect);
        if (triggerEffect?.type !== "TRIGGER") {
            throw new Error("Expected TRIGGER effect");
        }
        assert.equal(triggerEffect.trigger, "PASSIVE");
        assert.equal(triggerEffect.cardUuid, "healer");

        const healEffect = passTurnBeat!.effects.find(
            (effect) => effect.type === "STAT_CHANGE" && effect.healthDelta === 2,
        );
        assert.isDefined(healEffect);
        if (healEffect?.type !== "STAT_CHANGE") {
            throw new Error("Expected STAT_CHANGE effect");
        }
        assert.equal(healEffect.target.type, "MINION");
        if (healEffect.target.type !== "MINION") {
            throw new Error("Expected minion heal target");
        }
        assert.equal(healEffect.target.cardUuid, "ally");
    });
});
