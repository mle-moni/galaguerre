import type { SpotOwner } from "#api_types/game.types";
import type { NarrativeEffect } from "#api_types/game_narrative.types";

export const remapSpotOwnerForUser = (
    owner: SpotOwner,
    forUserId: number,
    playerOneUserId: number,
): SpotOwner => {
    const viewerIsPlayerOne = forUserId === playerOneUserId;
    if (viewerIsPlayerOne) return owner;

    return owner === "PLAYER" ? "OPPONENT" : "PLAYER";
};

const remapEntityRef = (
    ref: Extract<NarrativeEffect, { type: "STAT_CHANGE" }>["target"],
    forUserId: number,
    playerOneUserId: number,
) => ({
    ...ref,
    owner: remapSpotOwnerForUser(ref.owner, forUserId, playerOneUserId),
});

export const remapEffectForUser = (
    effect: NarrativeEffect,
    forUserId: number,
    playerOneUserId: number,
): NarrativeEffect => {
    switch (effect.type) {
        case "MOVE_CARD":
            return {
                ...effect,
                owner: remapSpotOwnerForUser(effect.owner, forUserId, playerOneUserId),
                to:
                    effect.to.type === "BOARD" || effect.to.type === "HERO_WEAPON"
                        ? {
                              ...effect.to,
                              owner: remapSpotOwnerForUser(
                                  effect.to.owner,
                                  forUserId,
                                  playerOneUserId,
                              ),
                          }
                        : effect.to,
            };
        case "SPEND_MANA":
        case "GAIN_MANA":
        case "DRAW":
        case "FATIGUE":
            return {
                ...effect,
                owner: remapSpotOwnerForUser(effect.owner, forUserId, playerOneUserId),
            };
        case "ATTACK_LUNGE":
            return {
                ...effect,
                attackerOwner: remapSpotOwnerForUser(
                    effect.attackerOwner,
                    forUserId,
                    playerOneUserId,
                ),
                target: remapEntityRef(effect.target, forUserId, playerOneUserId),
            };
        case "COMBAT_DAMAGE":
        case "STAT_CHANGE":
            return {
                ...effect,
                target: remapEntityRef(effect.target, forUserId, playerOneUserId),
            };
        case "ABILITY_IMPACT":
            return {
                ...effect,
                source: remapEntityRef(effect.source, forUserId, playerOneUserId),
                targets: effect.targets.map((target) =>
                    remapEntityRef(target, forUserId, playerOneUserId),
                ),
                zones: effect.zones?.map((zone) => ({
                    ...zone,
                    owner: remapSpotOwnerForUser(zone.owner, forUserId, playerOneUserId),
                })),
            };
        case "TRIGGER":
        case "KILL":
        case "SILENCE":
        case "BREAK_WEAPON":
        case "SUMMON":
            return {
                ...effect,
                owner: remapSpotOwnerForUser(effect.owner, forUserId, playerOneUserId),
            };
        case "MIND_CONTROL":
            return {
                ...effect,
                fromOwner: remapSpotOwnerForUser(effect.fromOwner, forUserId, playerOneUserId),
                toOwner: remapSpotOwnerForUser(effect.toOwner, forUserId, playerOneUserId),
            };
        case "RETURN_TO_HAND":
            return {
                ...effect,
                owner: remapSpotOwnerForUser(effect.owner, forUserId, playerOneUserId),
            };
        case "TURN_BANNER": {
            const remappedOwner = remapSpotOwnerForUser(effect.owner, forUserId, playerOneUserId);
            return {
                ...effect,
                owner: remappedOwner,
                label: remappedOwner === "PLAYER" ? "Votre tour" : "Tour adverse",
            };
        }
        default:
            return effect;
    }
};
