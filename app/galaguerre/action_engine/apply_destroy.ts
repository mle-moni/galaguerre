import type { GamePlayer, MinionState, TargetSnapshot } from "#api_types/game.types";
import type Game from "#models/game";
import { collectMatchingMinionTargets } from "./apply_mass_minion_effects.js";
import { killMinion } from "./kill_minion.js";

export const applyDestroyToMinion = (
    game: Game,
    owner: GamePlayer,
    minionUuid: string,
): { gameEnded: boolean } => {
    return killMinion(game, owner, minionUuid);
};

export const applyDestroyToAllMinions = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    sourceMinion?: MinionState,
): { gameEnded: boolean } => {
    const targets = collectMatchingMinionTargets(player, opponent, target, sourceMinion);

    for (const { owner, minion } of targets) {
        const { gameEnded } = killMinion(game, owner, minion.uuid);
        if (gameEnded) return { gameEnded: true };
    }

    return { gameEnded: false };
};
