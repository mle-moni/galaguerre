import type {
    CardActionFieldsSnapshot,
    CardActionSnapshot,
    GamePlayer,
    MinionState,
    SpotOwner,
    TargetSnapshot,
} from "#api_types/game.types";
import type { AdjacencyContext } from "#api_types/adjacent_targeting";
import { getActionTarget } from "#api_types/action_fields_utils";
import {
    ABILITY_IMPACT_KINDS,
    type AbilityImpactDelivery,
    type AbilityImpactKind,
    type AbilityImpactZone,
    type NarrativeEntityRef,
} from "#api_types/game_narrative.types";
import { hasRandomLimitedTarget } from "#api_types/target_matching";
import type Game from "#models/game";
import { collectMatchingMinionTargets } from "../action_engine/apply_mass_minion_effects.js";
import type { ResolvedTarget } from "../action_engine/resolve_selected_target.js";
import { resolveHeroTargets } from "../action_engine/resolve_hero_target.js";
import { withNarrativeRecorder } from "./narrative_context.js";
import { heroEntityRef, minionEntityRef, resolveSpotOwner } from "./narrative_effects.js";

const isAbilityImpactKind = (type: string): type is AbilityImpactKind =>
    (ABILITY_IMPACT_KINDS as readonly string[]).includes(type);

export const getAbilityImpactKind = (
    action: CardActionFieldsSnapshot | CardActionSnapshot,
): AbilityImpactKind | null => {
    if (!isAbilityImpactKind(action.type)) return null;
    return action.type;
};

export const resolveAbilityImpactSource = (
    game: Game,
    player: GamePlayer,
    sourceMinion?: MinionState,
): NarrativeEntityRef => {
    if (sourceMinion) {
        return minionEntityRef(sourceMinion, resolveSpotOwner(game, player));
    }

    return heroEntityRef(resolveSpotOwner(game, player));
};

export const resolveAbilityImpactDelivery = (
    kind: AbilityImpactKind,
    mode: "targeted" | "random_multi" | "aoe",
): AbilityImpactDelivery => {
    if (kind === "RECONVERSION") return "CLOUD";
    if (mode === "targeted") return "PROJECTILE";
    if (mode === "random_multi") return "MULTI_PROJECTILE";
    return "AOE";
};

export const resolveAbilityImpactZones = (
    target: TargetSnapshot,
    game: Game,
    player: GamePlayer,
): AbilityImpactZone[] => {
    const allyOwner = resolveSpotOwner(game, player);
    const enemyOwner: SpotOwner = allyOwner === "PLAYER" ? "OPPONENT" : "PLAYER";

    const owners: SpotOwner[] =
        target.targetTeam === "ALL"
            ? ["PLAYER", "OPPONENT"]
            : target.targetTeam === "PLAYER"
              ? [allyOwner]
              : [enemyOwner];

    const zones: AbilityImpactZone[] = [];

    for (const owner of owners) {
        if (target.type === "MINION" || target.type === "ALL") {
            zones.push({ type: "BOARD", owner });
        }
        if (target.type === "HERO" || target.type === "ALL") {
            zones.push({ type: "HERO", owner });
        }
    }

    return zones;
};

export const resolvedTargetToEntityRef = (
    resolved: ResolvedTarget,
    game: Game,
): NarrativeEntityRef => {
    if (resolved.type === "HERO") {
        return heroEntityRef(resolveSpotOwner(game, resolved.player));
    }

    return minionEntityRef(resolved.minion, resolveSpotOwner(game, resolved.owner));
};

export const collectMassAbilityTargets = (
    target: TargetSnapshot,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    sourceMinion?: MinionState,
    adjacencyContext?: AdjacencyContext,
): NarrativeEntityRef[] => {
    const targets: NarrativeEntityRef[] = [];

    for (const hero of resolveHeroTargets(target, player, opponent)) {
        targets.push(heroEntityRef(resolveSpotOwner(game, hero)));
    }

    if (target.type === "MINION" || target.type === "ALL") {
        for (const { owner, minion } of collectMatchingMinionTargets(
            player,
            opponent,
            target,
            sourceMinion,
            adjacencyContext,
        )) {
            targets.push(minionEntityRef(minion, resolveSpotOwner(game, owner)));
        }
    }

    return targets;
};

export const recordAbilityImpact = (payload: {
    kind: AbilityImpactKind;
    delivery: AbilityImpactDelivery;
    source: NarrativeEntityRef;
    targets: NarrativeEntityRef[];
    zones?: AbilityImpactZone[];
}): void => {
    const hasTargets = payload.targets.length > 0;
    const hasZones = (payload.zones?.length ?? 0) > 0;
    if (!hasTargets && !hasZones) return;

    withNarrativeRecorder((recorder) => {
        recorder.recordEffect({
            type: "ABILITY_IMPACT",
            kind: payload.kind,
            delivery: payload.delivery,
            source: payload.source,
            targets: payload.targets,
            ...(payload.zones !== undefined ? { zones: payload.zones } : {}),
        });
    });
};

export const recordAoeAbilityImpactIfNeeded = (
    action: CardActionFieldsSnapshot,
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    sourceMinion?: MinionState,
    adjacencyContext?: AdjacencyContext,
): void => {
    const kind = getAbilityImpactKind(action);
    if (!kind) return;

    const target = getActionTarget(action);
    if (!target) return;
    if (action.isTargeted) return;
    if (hasRandomLimitedTarget(target)) return;

    recordAbilityImpact({
        kind,
        delivery: resolveAbilityImpactDelivery(kind, "aoe"),
        source: resolveAbilityImpactSource(game, player, sourceMinion),
        targets: collectMassAbilityTargets(
            target,
            game,
            player,
            opponent,
            sourceMinion,
            adjacencyContext,
        ),
        zones: resolveAbilityImpactZones(target, game, player),
    });
};
