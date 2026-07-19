import type {
    AbilityImpactDelivery,
    AbilityImpactKind,
    NarrativeEffect,
} from "#api_types/game_narrative.types";
import { test } from "@japa/runner";
import {
    resolveAbilityImpactDelivery,
    resolveAbilityImpactZones,
} from "#galaguerre/game_narrative/record_ability_impact";
import { createGameData, createMinionTargetSnapshot } from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { remapEffectForUser } from "#shared/narrative/remap_narrative_for_user";

/** Mirrors frontend choreograph_shots lead classification for ability VFX. */
const isAbilityVfxLead = (type: string) =>
    type === "PROJECTILE" ||
    type === "MULTI_PROJECTILE" ||
    type === "EXPLOSION" ||
    type === "CLOUD";

const choreographShotTypes = (types: string[]): string[][] => {
    const phases: string[][] = [];
    let impactBatch: string[] = [];

    const flushImpact = () => {
        if (impactBatch.length === 0) return;
        phases.push(impactBatch);
        impactBatch = [];
    };

    for (const type of types) {
        if (isAbilityVfxLead(type) || type === "ATTACK") {
            flushImpact();
            phases.push([type]);
            continue;
        }
        impactBatch.push(type);
    }

    flushImpact();
    return phases;
};

const shotTypeForDelivery = (
    delivery: AbilityImpactDelivery,
    kind: AbilityImpactKind,
): "PROJECTILE" | "MULTI_PROJECTILE" | "EXPLOSION" | "CLOUD" => {
    if (delivery === "CLOUD" || kind === "RECONVERSION") return "CLOUD";
    if (delivery === "AOE") return "EXPLOSION";
    if (delivery === "MULTI_PROJECTILE") return "MULTI_PROJECTILE";
    return "PROJECTILE";
};

test.group("ability impact shot mapping", () => {
    test("delivery rules match intended shot types", ({ assert }) => {
        assert.equal(resolveAbilityImpactDelivery("DAMAGE", "targeted"), "PROJECTILE");
        assert.equal(resolveAbilityImpactDelivery("DAMAGE", "random_multi"), "MULTI_PROJECTILE");
        assert.equal(resolveAbilityImpactDelivery("DAMAGE", "aoe"), "AOE");
        assert.equal(resolveAbilityImpactDelivery("DESTROY", "aoe"), "AOE");
        assert.equal(resolveAbilityImpactDelivery("HEAL", "targeted"), "PROJECTILE");
        assert.equal(resolveAbilityImpactDelivery("BOOST", "targeted"), "PROJECTILE");
        assert.equal(resolveAbilityImpactDelivery("SILENCE", "aoe"), "AOE");
        assert.equal(resolveAbilityImpactDelivery("RECONVERSION", "targeted"), "CLOUD");
        assert.equal(resolveAbilityImpactDelivery("RECONVERSION", "aoe"), "CLOUD");
        assert.equal(resolveAbilityImpactDelivery("RECONVERSION", "random_multi"), "CLOUD");

        assert.equal(shotTypeForDelivery("PROJECTILE", "DAMAGE"), "PROJECTILE");
        assert.equal(shotTypeForDelivery("MULTI_PROJECTILE", "DAMAGE"), "MULTI_PROJECTILE");
        assert.equal(shotTypeForDelivery("AOE", "DESTROY"), "EXPLOSION");
        assert.equal(shotTypeForDelivery("CLOUD", "RECONVERSION"), "CLOUD");
    });

    test("AOE zones cover ally and enemy boards for ALL minions", ({ assert }) => {
        const game = createInMemoryGame(createGameData());
        const zones = resolveAbilityImpactZones(
            createMinionTargetSnapshot("ALL"),
            game,
            game.data.playerOne,
        );

        assert.deepEqual(zones, [
            { type: "BOARD", owner: "PLAYER" },
            { type: "BOARD", owner: "OPPONENT" },
        ]);
    });

    test("choreographs sequential ability impacts before floating text", ({ assert }) => {
        const phases = choreographShotTypes(["PROJECTILE", "PROJECTILE", "FLOATING_TEXT"]);
        assert.deepEqual(phases, [["PROJECTILE"], ["PROJECTILE"], ["FLOATING_TEXT"]]);
    });

    test("ability VFX leads precede impact reveals in shot order", ({ assert }) => {
        const phases = choreographShotTypes(["EXPLOSION", "DEATH", "FLOATING_TEXT"]);
        assert.deepEqual(phases, [["EXPLOSION"], ["DEATH", "FLOATING_TEXT"]]);
    });

    test("remaps ability impact for opponent viewer", ({ assert }) => {
        const effect: NarrativeEffect = {
            type: "ABILITY_IMPACT",
            kind: "HEAL",
            delivery: "AOE",
            source: { type: "MINION", cardUuid: "src", owner: "PLAYER" },
            targets: [{ type: "MINION", cardUuid: "t", owner: "PLAYER" }],
            zones: [{ type: "BOARD", owner: "PLAYER" }],
        };

        const remapped = remapEffectForUser(effect, 2, 1);
        if (remapped.type !== "ABILITY_IMPACT") throw new Error("Expected ABILITY_IMPACT");

        assert.equal(remapped.source.owner, "OPPONENT");
        assert.equal(remapped.targets[0]!.owner, "OPPONENT");
        assert.equal(remapped.zones?.[0]?.owner, "OPPONENT");
    });
});
