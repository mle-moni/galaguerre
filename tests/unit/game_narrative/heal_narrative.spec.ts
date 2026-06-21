import type { SocketEventByKey } from "#api_types/socket_events";
import { test } from "@japa/runner";
import { applyHealToHero } from "#galaguerre/action_engine/apply_heal_with_passives";
import { buildPresentationForUser } from "#galaguerre/game_narrative/build_presentation_update";
import { createGameNarrativeRecorder } from "#galaguerre/game_narrative/game_narrative_recorder";
import { runWithNarrativeRecorder } from "#galaguerre/game_narrative/narrative_context";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import {
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
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
});
