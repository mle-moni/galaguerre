import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import type { GalaguerreTargetTeam } from "../galaguerre.types.js";
import {
    heroEntityRef,
    recordStatChange,
    resolveSpotOwner,
} from "../game_narrative/narrative_effects.js";

const resolveDefeatTargets = (
    targetTeam: GalaguerreTargetTeam,
    player: GamePlayer,
    opponent: GamePlayer,
): GamePlayer[] => {
    switch (targetTeam) {
        case "OPPONENT":
            return [opponent];
        case "ALL":
            return [player, opponent];
        default:
            return [player];
    }
};

export const applyDefeat = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    targetTeam: GalaguerreTargetTeam,
): { gameEnded: boolean } => {
    const targets = resolveDefeatTargets(targetTeam, player, opponent);

    for (const target of targets) {
        if (target.health <= 0) continue;

        const healthDelta = -target.health;
        target.health = 0;
        recordStatChange(heroEntityRef(resolveSpotOwner(game, target)), { healthDelta });
    }

    return { gameEnded: player.health <= 0 || opponent.health <= 0 };
};
