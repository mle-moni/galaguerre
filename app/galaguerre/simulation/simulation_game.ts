import type { GameData } from "#api_types/game.types";
import type Game from "#models/game";

/**
 * `Game` factice sans base de données, pour rejouer le moteur sur un état cloné.
 *
 * `save()` / `refresh()` sont des no-op ; les autres effets de bord du moteur sont neutralisés par
 * le contexte de simulation (voir `app/utils/simulation_context.ts`).
 */
export const createSimulationGame = (data: GameData, id = -1): Game => {
    const game = {
        id,
        data,
        isFinished: false,
        save: async () => {},
        refresh: async () => {},
        getApiJson: (_forUserId: number) => ({
            id,
            data,
            isFinished: game.isFinished,
        }),
    };

    return game as unknown as Game;
};
