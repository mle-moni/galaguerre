import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { getActualDamage, recordDamageDealt } from "../game_stats/record_player_stats.js";
import { triggerDamagePassives } from "../passive_engine/trigger_damage_passives.js";

export const applyDamageToHero = (
    game: Game,
    target: GamePlayer,
    damage: number,
    sourcePlayer: GamePlayer,
): { gameEnded: boolean } => {
    if (damage <= 0) return { gameEnded: false };

    const damageDealt = getActualDamage(target.health, damage);
    target.health -= damage;
    recordDamageDealt(sourcePlayer, damageDealt);

    if (damageDealt <= 0) return { gameEnded: false };

    return triggerDamagePassives(game, { type: "HERO", affectedPlayer: target });
};
